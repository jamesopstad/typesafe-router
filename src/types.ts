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
	caseSensitive?: boolean;
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
	(TRoute extends { id: string }
		? {}
		: {
				id: `${TParentRoute extends {
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
						path: ConvertOptionalPathSegments<TPath>;
						params: SetParams<TPath>;
				  }
				: { params: {} }) &
			([TParentId] extends [never] ? {} : { parentId: TParentId }) &
			(TRoute extends { children: infer TChildren extends readonly Route[] }
				? { childIds: TChildren[number]['id'] }
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

// Will incorrectly infer that there are no params if there is only a single route
type ParamsIfPath<
	TPaths extends string,
	TPath extends string
> = TPaths extends TPath ? never : PathParams<TPath>;

type LinkProps<
	TBaseOptions,
	TPath extends string,
	TPathParams extends string,
	TOptions = LinkOptions<TBaseOptions>
> = { to?: TPath } & TOptions &
	([TPathParams] extends [never] ? {} : { params: ParamsObject<TPathParams> });

type LinkParams<
	TBaseOptions,
	TPath extends string,
	TPathParams extends string,
	TOptions = LinkOptions<TBaseOptions>
> = [TPathParams] extends [never]
	? [to?: TPath, options?: TOptions]
	: [to: TPath, options: TOptions & { params: ParamsObject<TPathParams> }];

//#endregion

//#region Data functions

export interface Config {
	routes: FlatRoute;
	actions: ActionWrapper;
	loaders: LoaderWrapper;
}

type RedirectFunction<TPaths extends string = string> = <TPath extends TPaths>(
	...args: LinkParams<
		{ init?: Parameters<InputDataUtils['redirect']>[1] },
		TPath,
		ParamsIfPath<TPaths, TPath>
	>
) => ReturnType<InputDataUtils['redirect']>;

interface DataUtils<
	TConfig extends Config = Config,
	TRoute extends FlatRoute = FlatRoute,
	TPaths extends string = Paths<TConfig['routes'], TRoute>
> {
	redirect: RedirectFunction<TPaths>;
}

export type ActionFunctionArgs<
	TConfig extends Config,
	TId extends string,
	TInputUtils extends Partial<InputDataUtils>,
	TRoute extends FlatRoute = ExtractById<TConfig['routes'], TId>
> = Omit<$.ActionFunctionArgs, 'params'> & {
	params: Params<TConfig['routes'], TRoute>;
} & ExtractUtils<DataUtils<TConfig, TRoute>, TInputUtils>;

export type LoaderFunctionArgs<
	TConfig extends Config,
	TId extends string,
	TInputUtils extends Partial<InputDataUtils>,
	TRoute extends FlatRoute = ExtractById<TConfig['routes'], TId>
> = Omit<$.LoaderFunctionArgs, 'params'> & {
	params: Params<TConfig['routes'], TRoute>;
} & ExtractUtils<DataUtils<TConfig, TRoute>, TInputUtils>;

//#endregion

//#region Render functions

type Link<TPaths extends string> = <TPath extends TPaths>(
	props: LinkProps<$.LinkProps, TPath, ParamsIfPath<TPaths, TPath>> &
		React.RefAttributes<HTMLAnchorElement>
) => ReturnType<InputRenderUtils['Link']>;

type NavLink<TPaths extends string> = <TPath extends TPaths>(
	props: LinkProps<$.NavLinkProps, TPath, ParamsIfPath<TPaths, TPath>> &
		React.RefAttributes<HTMLAnchorElement>
) => ReturnType<InputRenderUtils['NavLink']>;

type Navigate<TPaths extends string> = <TPath extends TPaths>(
	props: LinkProps<$.NavigateProps, TPath, ParamsIfPath<TPaths, TPath>>
) => ReturnType<InputRenderUtils['Navigate']>;

interface NavigateFunction<TPaths extends string> {
	<TPath extends TPaths>(
		...args: LinkParams<$.NavigateOptions, TPath, ParamsIfPath<TPaths, TPath>>
	): void;
	(delta: number): void;
}

// TODO: add support for narrowing paths by available actions (needs to support index routes)
type SubmitOptions<
	TBaseOptions,
	TMethod extends $.FormMethod,
	TPath extends string,
	TPathParams extends string,
	TActionWrapper extends ActionWrapper
> = Omit<TBaseOptions, 'method' | 'action' | 'relative'> & {
	method?: TMethod;
} & ('get' extends TMethod
		? { action?: TPath }
		: [TActionWrapper] extends [never]
		? { action: TPath }
		: { action?: TPath }) &
	([TPathParams] extends [never] ? {} : { params: ParamsObject<TPathParams> });

type Form<TPaths extends string, TActionWrapper extends ActionWrapper> = <
	TMethod extends $.FormMethod,
	TPath extends TPaths
>(
	props: SubmitOptions<
		$.FormProps,
		TMethod,
		TPath,
		ParamsIfPath<TPaths, TPath>,
		TActionWrapper
	> &
		React.RefAttributes<HTMLFormElement>
) => ReturnType<InputRenderUtils['Form']>;

type SubmitFunction<TPaths extends string, TAction extends ActionWrapper> = <
	TMethod extends $.FormMethod,
	TPath extends TPaths
>(
	target: Parameters<$.SubmitFunction>[0],
	options?: SubmitOptions<
		$.SubmitOptions,
		TMethod,
		TPath,
		ParamsIfPath<TPaths, TPath>,
		TAction
	>
) => void;

type ActionData<TActionWrapper extends ActionWrapper> = Awaited<
	ReturnType<TActionWrapper['value']>
>;

// TODO: add support for defer etc.
type LoaderData<TLoaderWrapper extends LoaderWrapper> = Awaited<
	ReturnType<TLoaderWrapper['value']>
>;

type UseRouteLoaderData<
	TConfig extends Config,
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
	TConfig extends Config,
	TRoute extends FlatRoute,
	TPaths extends string = Paths<TConfig['routes'], TRoute>,
	TAction extends ActionWrapper = ExtractById<TConfig['actions'], TRoute['id']>,
	TLoader extends LoaderWrapper = ExtractById<TConfig['loaders'], TRoute['id']>
> {
	Form: Form<TPaths, TAction>;
	Link: Link<TPaths>;
	NavLink: NavLink<TPaths>;
	Navigate: Navigate<TPaths>;
	useActionData: () => ActionData<TAction> | undefined;
	useLoaderData: () => LoaderData<TLoader>;
	useNavigate: () => NavigateFunction<TPaths>;
	useParams: () => Params<TConfig['routes'], TRoute>;
	useRouteLoaderData: UseRouteLoaderData<TConfig, TRoute>;
	useSubmit: () => SubmitFunction<TPaths, TAction>;
}

export type ComponentFunctionArgs<
	TConfig extends Config,
	TId extends string,
	TInputUtils extends Partial<InputRenderUtils>,
	TRoute extends FlatRoute = ExtractById<TConfig['routes'], TId>
> = ExtractUtils<RenderUtils<TConfig, TRoute>, TInputUtils>;

//#endregion
