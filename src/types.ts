import * as symbols from './symbols';
import type { Utils } from './utils';
import type { ActionWrapper, LoaderWrapper, LazyOrStatic } from './wrappers';
import type {
	RedirectFunction,
	ActionFunctionArgs as _ActionFunctionArgs,
	LoaderFunctionArgs as _LoaderFunctionArgs,
	URLSearchParamsInit,
	LinkProps,
	NavLinkProps,
	NavigateProps,
	NavigateOptions,
	FormMethod,
	FormProps,
	SubmitFunction,
	SubmitOptions,
} from 'react-router-dom';

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

//#region Transform input routes

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

type Param<TParam extends string> = Record<TParam, string>;

type OptionalParam<TParam extends string = string> = Partial<Param<TParam>>;

export interface FlatRoute extends Route {
	params: {};
	parentId?: string;
	childIds?: string;
}

type _SetParams<TPath extends string> = TPath extends `${infer L}/${infer R}`
	? _SetParams<L> & _SetParams<R>
	: TPath extends `:${infer TParam}`
	? TParam extends `${infer TOptionalParam}?`
		? OptionalParam<TOptionalParam>
		: Param<TParam>
	: {};

export type SetParams<TPath extends string> = TPath extends '*'
	? Param<'*'>
	: TPath extends `${infer TRest}/*`
	? Param<'*'> & _SetParams<TRest>
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

type FilterPathById<
	TRouteId extends string,
	TFilterIds extends string,
	TPath extends string
> = TRouteId extends TFilterIds ? TPath : never;

type _DescendantPaths<
	TRoutes extends FlatRoute,
	TRoute extends FlatRoute,
	TFilterIds extends string,
	TParentPath extends string,
	TCumulativePath extends string = `${TParentPath}${TRoute extends {
		path: infer TPath extends string;
	}
		? `${TParentPath extends '' ? '' : '/'}${TPath}`
		: ''}`
> =
	| FilterPathById<
			TRoute['id'],
			TFilterIds,
			TCumulativePath extends '' ? never : TCumulativePath
	  >
	| DescendantPaths<TRoutes, TRoute, TFilterIds, TCumulativePath>;

export type DescendantPaths<
	TRoutes extends FlatRoute,
	TRoute extends FlatRoute,
	TFilterIds extends string = string,
	TParentPath extends string = ''
> = TRoute extends { childIds: infer TChildIds extends TRoutes['id'] }
	? {
			[TChildId in TChildIds]: _DescendantPaths<
				TRoutes,
				ExtractById<TRoutes, TChildId>,
				TFilterIds,
				TParentPath
			>;
	  }[TChildIds]
	: never;

export type AncestorPaths<
	TRoutes extends FlatRoute,
	TRoute extends FlatRoute,
	TFilterIds extends string = string,
	TPathPrefix extends string = '..',
	TParentRoute = TRoute extends {
		parentId: infer TParentId extends TRoutes['id'];
	}
		? ExtractById<TRoutes, TParentId>
		: never
> = TParentRoute extends FlatRoute
	? TParentRoute extends { path: string }
		?
				| FilterPathById<TRoute['id'], TFilterIds, TPathPrefix>
				| DescendantPaths<TRoutes, TParentRoute, TFilterIds, TPathPrefix>
				| AncestorPaths<TRoutes, TParentRoute, TFilterIds, `../${TPathPrefix}`>
		: AncestorPaths<TRoutes, TParentRoute, TFilterIds, TPathPrefix>
	: never;

type _AbsolutePaths<
	TRoutes extends FlatRoute,
	TRoute extends FlatRoute,
	TFilterIds extends string,
	TRootPath extends string = TRoute extends { path: infer TPath extends string }
		? TPath
		: never
> = [TRootPath] extends [never]
	? TRoute extends { childIds: infer TChildIds extends TRoutes['id'] }
		? AbsolutePaths<TRoutes, TFilterIds, TChildIds>
		: never
	: `/${
			| FilterPathById<TRoute['id'], TFilterIds, TRootPath>
			| DescendantPaths<TRoutes, TRoute, TFilterIds, TRootPath>}`;

export type AbsolutePaths<
	TRoutes extends FlatRoute,
	TFilterIds extends string = string,
	TRootRouteIds extends TRoutes['id'] = Exclude<
		TRoutes,
		{ parentId: string }
	>['id']
> = {
	[TId in TRootRouteIds]: _AbsolutePaths<
		TRoutes,
		ExtractById<TRoutes, TId>,
		TFilterIds
	>;
}[TRootRouteIds];

export type Paths<
	TRoutes extends FlatRoute,
	TRoute extends FlatRoute,
	TFilterIds extends string = string,
	TRouteOrParent extends FlatRoute = TRoute extends {
		index: true;
		parentId: infer TParentId extends TRoutes['id'];
	}
		? ExtractById<TRoutes, TParentId>
		: TRoute
> =
	| AbsolutePaths<TRoutes, TFilterIds>
	| AncestorPaths<TRoutes, TRouteOrParent, TFilterIds>
	| DescendantPaths<TRoutes, TRouteOrParent, TFilterIds>;

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
	TParams extends OptionalParam
> =
	| TParams
	| (TParams & TRoute['params'] & DescendantParams<TRoutes, TRoute, TParams>);

export type DescendantParams<
	TRoutes extends FlatRoute,
	TRoute extends FlatRoute,
	TParams extends OptionalParam
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
	TParams extends OptionalParam = AncestorParams<TRoutes, TRoute> &
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

export type ParamsObject<TParams extends string = string> = Record<
	TParams,
	string
>;

type LinkOptions<TBaseOptions> = Omit<TBaseOptions, 'to' | 'relative'> & {
	searchParams?: URLSearchParamsInit;
	hash?: string;
};

type _LinkProps<
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

//#region Config

// export interface RouteProp<TType extends symbol, TId extends string = string> {
// 	type: TType;
// 	id: TId;
// 	value: any;
// }

// export type Loader<TId extends string = string> = RouteProp<
// 	typeof symbols.loader,
// 	TId
// >;
// export type Action = RouteProp<typeof symbols.action>;
// export type Component = RouteProp<typeof symbols.component>;
// export type ErrorBoundary = RouteProp<typeof symbols.errorBoundary>;

// export interface Config {
// 	routes: FlatRoute;
// 	utils: Partial<Utils>;
// 	actions: LazyOrStatic<'action'>;
// 	loaders: LazyOrStatic<'loader'>;
// }

export interface Config {
	routes: FlatRoute;
	utils: Partial<Utils>;
	actions: ActionWrapper;
	loaders: LoaderWrapper;
}

//#endregion

//#region Data functions

type Redirect<TPaths extends string = string> = <TPath extends TPaths>(
	...args: LinkParams<TPath, { init?: Parameters<Utils['redirect']>[1] }>
) => ReturnType<RedirectFunction>;

interface DataFunctionUtils<
	TConfig extends Config,
	TRoute extends FlatRoute,
	TPaths extends string = Paths<TConfig['routes'], TRoute>
> {
	redirect: Redirect<TPaths>;
}

export type LoaderFunctionArgs<
	TConfig extends Config,
	TId extends string,
	TRoute extends FlatRoute = ExtractById<TConfig['routes'], TId>
> = Omit<_LoaderFunctionArgs, 'params'> & {
	params: Params<TConfig['routes'], TRoute>;
} & ExtractUtils<DataFunctionUtils<TConfig, TRoute>, TConfig['utils']>;

export type ActionFunctionArgs<
	TConfig extends Config,
	TId extends string,
	TRoute extends FlatRoute = ExtractById<TConfig['routes'], TId>
> = Omit<_ActionFunctionArgs, 'params'> & {
	params: Params<TConfig['routes'], TRoute>;
} & ExtractUtils<DataFunctionUtils<TConfig, TRoute>, TConfig['utils']>;

//#endregion

//#region Components

type Link<TPaths extends string> = <TPath extends TPaths>(
	props: _LinkProps<TPath, LinkProps>
) => ReturnType<Utils['Link']>;

type NavLink<TPaths extends string> = <TPath extends TPaths>(
	props: _LinkProps<TPath, NavLinkProps>
) => ReturnType<Utils['NavLink']>;

type Navigate<TPaths extends string> = <TPath extends TPaths>(
	props: _LinkProps<TPath, NavigateProps>
) => ReturnType<Utils['Navigate']>;

interface NavigateFunction<TPaths extends string> {
	<TPath extends TPaths>(...args: LinkParams<TPath, NavigateOptions>): void;
	(delta: number): void;
}

type _SubmitOptions<
	TMethod extends FormMethod,
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

type Form<
	TGetPaths extends string,
	TActionPaths extends string,
	TAction extends ActionWrapper
> = <
	TPaths extends [TMethod] extends ['get' | never] ? TGetPaths : TActionPaths,
	TPath extends TPaths = never,
	TMethod extends FormMethod = never
>(
	props: _SubmitOptions<TMethod, TPath, TAction, FormProps>
) => ReturnType<Utils['Form']>;

type _SubmitFunction<
	TGetPaths extends string,
	TActionPaths extends string,
	TAction extends ActionWrapper
> = <
	TPaths extends [TMethod] extends ['get' | never] ? TGetPaths : TActionPaths,
	TPath extends TPaths = never,
	TMethod extends FormMethod = never
>(
	target: Parameters<SubmitFunction>[0],
	options?: _SubmitOptions<TMethod, TPath, TAction, SubmitOptions>
) => void;

type ActionData<TActionWrapper extends ActionWrapper> = Awaited<
	ReturnType<TActionWrapper['value']>
>;

// ADD SUPPORT FOR DEFER ETC.
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

interface ComponentUtils<
	TConfig extends Config,
	TRoute extends FlatRoute,
	TAction extends ActionWrapper = ExtractById<TConfig['actions'], TRoute['id']>,
	TLoader extends LoaderWrapper = ExtractById<TConfig['loaders'], TRoute['id']>,
	TPaths extends string = Paths<TConfig['routes'], TRoute>,
	TActionPaths extends string = Paths<
		TConfig['routes'],
		TRoute,
		TConfig['actions']['id']
	>
> {
	Link: Link<TPaths>;
	NavLink: NavLink<TPaths>;
	Navigate: Navigate<TPaths>;
	Form: Form<TPaths, TActionPaths, TAction>;
	useSubmit: () => _SubmitFunction<TPaths, TActionPaths, TAction>;
	useNavigate: () => NavigateFunction<TPaths>;
	useParams: () => Params<TConfig['routes'], TRoute>;
	useActionData: () => ActionData<TAction>;
	useLoaderData: () => LoaderData<TLoader>;
	useRouteLoaderData: UseRouteLoaderData<TConfig, TRoute>;
}

export type ComponentFunctionArgs<
	TConfig extends Config,
	TId extends string,
	TRoute extends FlatRoute = ExtractById<TConfig['routes'], TId>
> = ExtractUtils<ComponentUtils<TConfig, TRoute>, TConfig['utils']>;

//#endregion
