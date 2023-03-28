import type { InputDataUtils, InputRenderUtils } from './utils';
import type { ActionWrapper, LoaderWrapper } from './wrappers';
import type * as $ from 'react-router-dom';

//#region Utils

type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

export type ExtractById<
	T extends { id: string },
	TId extends T['id']
> = Extract<T, { id: TId }>;

type ExtractUtils<T, U> = Pick<T, Extract<keyof T, keyof U>>;

//#endregion

//#region Normalize input routes

interface BaseRouteInput {
	id?: string;
}

interface IndexRouteInput extends BaseRouteInput {
	path?: undefined;
	index: true;
	children?: undefined;
}

interface NonIndexRouteInput extends BaseRouteInput {
	path?: string;
	index?: false;
	children?: readonly RouteInput[];
}

export type RouteInput = IndexRouteInput | NonIndexRouteInput;

type RemoveLeadingSlashes<TPath extends string> =
	TPath extends `/${infer TRest}` ? RemoveLeadingSlashes<TRest> : TPath;

type RemoveTrailingSlashes<TPath extends string> =
	TPath extends `${infer TRest}/` ? RemoveTrailingSlashes<TRest> : TPath;

export type NormalizePath<TRoute extends RouteInput> = Omit<TRoute, 'path'> &
	(TRoute extends { path: infer TPath extends string }
		? { path: RemoveTrailingSlashes<RemoveLeadingSlashes<TPath>> }
		: {});

export type SetIdSegment<TRoute extends RouteInput> = TRoute extends {
	path: infer TPath extends string;
}
	? TPath
	: TRoute extends { index: true }
	? '_index'
	: '_';

type SetId<
	TRoute extends RouteInput,
	TParentRoute extends RouteInput
> = TRoute &
	(TRoute extends { readonly id: string }
		? {}
		: {
				readonly id: `${TParentRoute extends {
					id: infer TParentId extends string;
				}
					? TParentId extends '/'
						? ''
						: TParentId
					: ''}/${SetIdSegment<TRoute>}`;
		  });

type _NormalizeRoutes<TRoute extends RouteInput> = Omit<TRoute, 'children'> &
	(TRoute extends { children: infer TChildren extends readonly RouteInput[] }
		? { readonly children: NormalizeRoutes<TChildren, TRoute> }
		: {});

export type NormalizeRoutes<
	TRoutes extends readonly RouteInput[],
	TParentRoute extends RouteInput = {}
> = {
	[K in keyof TRoutes]: _NormalizeRoutes<
		SetId<NormalizePath<TRoutes[K]>, TParentRoute>
	>;
};

export interface Route {
	id: string;
	path?: string;
	index?: boolean;
	children?: readonly Route[];
}

//#endregion

//#region Transform routes and flatten into a union

export type ParamsObject<TParam extends string = string> = Record<
	TParam,
	string
>;

type OptionalParamsObject<TParam extends string = string> = Partial<
	ParamsObject<TParam>
>;

export interface FlatRoute extends Route {
	params: {};
	parentId?: string;
	childIds?: string;
}

type _SetParams<TPath extends string> = TPath extends `${infer L}/${infer R}`
	? _SetParams<L> & _SetParams<R>
	: TPath extends `:${infer TParam}`
	? TParam extends `${infer TOptionalParam}?`
		? OptionalParamsObject<TOptionalParam>
		: ParamsObject<TParam>
	: {};

export type SetParams<TPath extends string> = TPath extends '*'
	? ParamsObject<'*'>
	: TPath extends `${infer TRest}/*`
	? ParamsObject<'*'> & _SetParams<TRest>
	: _SetParams<TPath>;

type AddLeadingSlash<TPath extends string> = TPath extends ''
	? ''
	: `/${TPath}`;

type ConvertOptionalFinalSegment<TPath extends string> =
	TPath extends `${infer L}/${infer R}`
		? `${L}${AddLeadingSlash<ConvertOptionalFinalSegment<R>>}`
		: '' | TPath;

type _ConvertOptionalPathSegments<TPath extends string> =
	TPath extends `${infer L}?${infer R}`
		? `${ConvertOptionalFinalSegment<L>}${_ConvertOptionalPathSegments<R>}`
		: TPath;

export type ConvertOptionalPathSegments<TPath extends string> =
	RemoveLeadingSlashes<_ConvertOptionalPathSegments<TPath>>;

type _FlattenRoutes<TRoute extends Route, TParentId extends string> =
	| (Omit<TRoute, 'path' | 'children'> &
			(TRoute extends { path: infer TPath extends string }
				? {
						readonly path: ConvertOptionalPathSegments<TPath>;
						readonly params: SetParams<TPath>;
				  }
				: { readonly params: {} }) &
			([TParentId] extends [never] ? {} : { readonly parentId: TParentId }) &
			(TRoute extends { children: infer TChildren extends readonly Route[] }
				? { readonly childIds: TChildren[number]['id'] }
				: {}))
	| (TRoute extends { children: infer TChildren extends readonly Route[] }
			? FlattenRoutes<TChildren, TRoute['id']>
			: never);

export type FlattenRoutes<
	TRoutes extends readonly Route[],
	TParentId extends string = never
> = {
	[K in keyof TRoutes]: _FlattenRoutes<TRoutes[K], TParentId>;
}[number];

//#endregion

//#region Paths

type _DescendantPaths<
	TRoutes extends FlatRoute,
	TRoute extends FlatRoute,
	TParentPath extends string,
	TCumulativePath extends string = `${TParentPath}${TRoute extends {
		path: infer TPath extends string;
	}
		? `${TParentPath extends '' ? '' : '/'}${TPath}`
		: ''}`
> =
	| (TCumulativePath extends '' ? never : TCumulativePath)
	| DescendantPaths<TRoutes, TRoute, TCumulativePath>;

export type DescendantPaths<
	TRoutes extends FlatRoute,
	TRoute extends FlatRoute,
	TParentPath extends string = ''
> = TRoute extends { childIds: infer TChildIds extends TRoutes['id'] }
	? {
			[TChildId in TChildIds]: _DescendantPaths<
				TRoutes,
				ExtractById<TRoutes, TChildId>,
				TParentPath
			>;
	  }[TChildIds]
	: never;

export type AncestorPaths<
	TRoutes extends FlatRoute,
	TRoute extends FlatRoute,
	TPathPrefix extends string = '..',
	TParentRoute = TRoute extends {
		parentId: infer TParentId extends TRoutes['id'];
	}
		? ExtractById<TRoutes, TParentId>
		: never
> = TParentRoute extends FlatRoute
	? TParentRoute extends { path: string }
		?
				| TPathPrefix
				| DescendantPaths<TRoutes, TParentRoute, TPathPrefix>
				| AncestorPaths<TRoutes, TParentRoute, `../${TPathPrefix}`>
		: AncestorPaths<TRoutes, TParentRoute, TPathPrefix>
	: never;

type _AbsolutePaths<
	TRoutes extends FlatRoute,
	TRoute extends FlatRoute,
	TRootPath extends string = TRoute extends { path: infer TPath extends string }
		? TPath
		: never
> = [TRootPath] extends [never]
	? TRoute extends { childIds: infer TChildIds extends TRoutes['id'] }
		? AbsolutePaths<TRoutes, TChildIds>
		: never
	: `/${TRootPath | DescendantPaths<TRoutes, TRoute, TRootPath>}`;

export type AbsolutePaths<
	TRoutes extends FlatRoute,
	TRootRouteIds extends TRoutes['id'] = Exclude<
		TRoutes,
		{ parentId: string }
	>['id']
> = {
	[TId in TRootRouteIds]: _AbsolutePaths<TRoutes, ExtractById<TRoutes, TId>>;
}[TRootRouteIds];

export type Paths<
	TRoutes extends FlatRoute,
	TRoute extends FlatRoute,
	TRouteOrParent extends FlatRoute = TRoute extends {
		index: true;
		parentId: infer TParentId extends TRoutes['id'];
	}
		? ExtractById<TRoutes, TParentId>
		: TRoute
> =
	| AbsolutePaths<TRoutes>
	| AncestorPaths<TRoutes, TRouteOrParent>
	| DescendantPaths<TRoutes, TRouteOrParent>;

type _PathParams<TPath extends string> = TPath extends `${infer L}/${infer R}`
	? _PathParams<L> | _PathParams<R>
	: TPath extends `:${infer TParam}`
	? TParam
	: never;

export type PathParams<TPath extends string> = TPath extends '*'
	? '*'
	: TPath extends `${infer TRest}/*`
	? '*' | _PathParams<TRest>
	: _PathParams<TPath>;

//#endregion

//#region Params

type _AncestorParams<
	TRoutes extends FlatRoute,
	TRoute extends FlatRoute
> = TRoute['params'] & AncestorParams<TRoutes, TRoute>;

export type AncestorParams<
	TRoutes extends FlatRoute,
	TRoute extends FlatRoute
> = TRoute extends { parentId: infer TParentId extends TRoutes['id'] }
	? _AncestorParams<TRoutes, ExtractById<TRoutes, TParentId>>
	: {};

type _DescendantParams<
	TRoutes extends FlatRoute,
	TRoute extends FlatRoute,
	TParams extends OptionalParamsObject
> =
	| TParams
	| (TParams & TRoute['params'] & DescendantParams<TRoutes, TRoute, TParams>);

export type DescendantParams<
	TRoutes extends FlatRoute,
	TRoute extends FlatRoute,
	TParams extends OptionalParamsObject
> = TRoute extends { childIds: infer TChildIds extends TRoutes['id'] }
	? {
			[TChildId in TChildIds]: _DescendantParams<
				TRoutes,
				ExtractById<TRoutes, TChildId>,
				TParams
			>;
	  }[TChildIds]
	: {};

export type Params<
	TRoutes extends FlatRoute,
	TRoute extends FlatRoute,
	TParams extends OptionalParamsObject = AncestorParams<TRoutes, TRoute> &
		TRoute['params']
> = Prettify<TParams & DescendantParams<TRoutes, TRoute, TParams>>;

//#endregion

//#region IDs

type _AncestorIds<TRoutes extends FlatRoute, TRoute extends FlatRoute> =
	| TRoute['id']
	| AncestorIds<TRoutes, TRoute>;

type AncestorIds<
	TRoutes extends FlatRoute,
	TRoute extends FlatRoute
> = TRoute extends { parentId: infer TParentId extends TRoutes['id'] }
	? _AncestorIds<TRoutes, ExtractById<TRoutes, TParentId>>
	: never;

type _DescendantIds<TRoutes extends FlatRoute, TRoute extends FlatRoute> =
	| TRoute['id']
	| DescendantIds<TRoutes, TRoute>;

type DescendantIds<
	TRoutes extends FlatRoute,
	TRoute extends FlatRoute
> = TRoute extends { childIds: infer TChildIds extends TRoutes['id'] }
	? {
			[TChildId in TChildIds]: _DescendantIds<
				TRoutes,
				ExtractById<TRoutes, TChildId>
			>;
	  }[TChildIds]
	: never;

//#endregion

//#region Links

type LinkOptions<TBaseOptions> = Omit<TBaseOptions, 'to' | 'relative'> & {
	searchParams?: $.URLSearchParamsInit;
	hash?: string;
};

type LinkProps<
	TPath extends string,
	TBaseOptions,
	TPathParams extends string = PathParams<TPath>,
	TOptions = LinkOptions<TBaseOptions>
> = { to: TPath } & TOptions &
	([TPathParams] extends [never] ? {} : { params: ParamsObject<TPathParams> });

type LinkParams<
	TPath extends string,
	TBaseOptions,
	TPathParams extends string = PathParams<TPath>,
	TOptions = LinkOptions<TBaseOptions>
> = [TPathParams] extends [never]
	? [to: TPath, options?: TOptions]
	: [to: TPath, options: TOptions & { params: ParamsObject<TPathParams> }];

//#endregion

//#region Data functions

export interface RouteConfig {
	routes: FlatRoute;
}

type RedirectFunction<TPaths extends string = string> = <TPath extends TPaths>(
	...args: LinkParams<
		TPath,
		{ init?: Parameters<InputDataUtils['redirect']>[1] }
	>
) => ReturnType<InputDataUtils['redirect']>;

interface DataUtils<
	TConfig extends RouteConfig = RouteConfig,
	TRoute extends FlatRoute = FlatRoute,
	TPaths extends string = Paths<TConfig['routes'], TRoute>
> {
	redirect: RedirectFunction<TPaths>;
}

export type ActionFunctionArgs<
	TConfig extends RouteConfig,
	TId extends string,
	TInputUtils extends Partial<InputDataUtils>,
	TRoute extends FlatRoute = ExtractById<TConfig['routes'], TId>
> = Omit<$.ActionFunctionArgs, 'params'> & {
	params: Params<TConfig['routes'], TRoute>;
} & ExtractUtils<DataUtils<TConfig, TRoute>, TInputUtils>;

export type LoaderFunctionArgs<
	TConfig extends RouteConfig,
	TId extends string,
	TInputUtils extends Partial<InputDataUtils>,
	TRoute extends FlatRoute = ExtractById<TConfig['routes'], TId>
> = Omit<$.LoaderFunctionArgs, 'params'> & {
	params: Params<TConfig['routes'], TRoute>;
} & ExtractUtils<DataUtils<TConfig, TRoute>, TInputUtils>;

//#endregion

//#region Render functions

export interface DataConfig extends RouteConfig {
	actions: ActionWrapper;
	loaders: LoaderWrapper;
}

type Link<TPaths extends string> = <TPath extends TPaths>(
	props: LinkProps<TPath, $.LinkProps>
) => ReturnType<InputRenderUtils['Link']>;

type NavLink<TPaths extends string> = <TPath extends TPaths>(
	props: LinkProps<TPath, $.NavLinkProps>
) => ReturnType<InputRenderUtils['NavLink']>;

type Navigate<TPaths extends string> = <TPath extends TPaths>(
	props: LinkProps<TPath, $.NavigateProps>
) => ReturnType<InputRenderUtils['Navigate']>;

interface NavigateFunction<TPaths extends string> {
	<TPath extends TPaths>(...args: LinkParams<TPath, $.NavigateOptions>): void;
	(delta: number): void;
}

// Add support for narrowing paths by available actions (needs to support index routes)
type SubmitOptions<
	TMethod extends $.FormMethod,
	TPath extends string,
	TAction extends ActionWrapper,
	TBaseOptions,
	TPathParams extends string = PathParams<TPath>
> = Omit<TBaseOptions, 'method' | 'action' | 'relative'> & {
	method?: TMethod;
} & ([TMethod] extends ['get' | never]
		? { action?: TPath }
		: [TAction] extends [never]
		? { action: TPath }
		: { action?: TPath }) &
	([TPathParams] extends [never] ? {} : { params: ParamsObject<TPathParams> });

type Form<TPaths extends string, TAction extends ActionWrapper> = <
	TMethod extends $.FormMethod = never,
	TPath extends TPaths = never
>(
	props: SubmitOptions<TMethod, TPath, TAction, $.FormProps>
) => ReturnType<InputRenderUtils['Form']>;

type SubmitFunction<TPaths extends string, TAction extends ActionWrapper> = <
	TMethod extends $.FormMethod = never,
	TPath extends TPaths = never
>(
	target: Parameters<$.SubmitFunction>[0],
	options?: SubmitOptions<TMethod, TPath, TAction, $.SubmitOptions>
) => void;

type ActionData<TActionWrapper extends ActionWrapper> = Awaited<
	ReturnType<TActionWrapper['value']>
>;

// ADD SUPPORT FOR DEFER ETC.
type LoaderData<TLoaderWrapper extends LoaderWrapper> = Awaited<
	ReturnType<TLoaderWrapper['value']>
>;

type UseRouteLoaderData<
	TConfig extends DataConfig,
	TRoute extends FlatRoute,
	TRequiredIds extends TConfig['routes']['id'] =
		| AncestorIds<TConfig['routes'], TRoute>
		| TRoute['id'],
	TOptionalIds extends TConfig['routes']['id'] = DescendantIds<
		TConfig['routes'],
		TRoute
	>
> = <
	TId extends Extract<TConfig['loaders']['id'], TRequiredIds | TOptionalIds>
>(
	id: TId
) =>
	| LoaderData<ExtractById<TConfig['loaders'], TId>>
	| (TId extends TOptionalIds ? undefined : never);

interface RenderUtils<
	TConfig extends DataConfig,
	TRoute extends FlatRoute,
	TPaths extends string = Paths<TConfig['routes'], TRoute>,
	TAction extends ActionWrapper = ExtractById<TConfig['actions'], TRoute['id']>,
	TLoader extends LoaderWrapper = ExtractById<TConfig['loaders'], TRoute['id']>
> {
	useActionData: () => ActionData<TAction> | undefined;
	useLoaderData: () => LoaderData<TLoader>;
	useNavigate: () => NavigateFunction<TPaths>;
	useParams: () => Params<TConfig['routes'], TRoute>;
	useRouteLoaderData: UseRouteLoaderData<TConfig, TRoute>;
	useSubmit: () => SubmitFunction<TPaths, TAction>;
	Form: Form<TPaths, TAction>;
	Link: Link<TPaths>;
	Navigate: Navigate<TPaths>;
	NavLink: NavLink<TPaths>;
}

export type ComponentFunctionArgs<
	TConfig extends DataConfig,
	TId extends string,
	TInputUtils extends Partial<InputRenderUtils>,
	TRoute extends FlatRoute = ExtractById<TConfig['routes'], TId>
> = ExtractUtils<RenderUtils<TConfig, TRoute>, TInputUtils>;

//#endregion
