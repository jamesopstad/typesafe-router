import * as symbols from './symbols';
import type { Prettify } from './utils';
import type {
	RedirectFunction,
	LoaderFunctionArgs,
	ActionFunctionArgs,
} from 'react-router-dom';

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

type _TransformRoutes<TRoute extends RouteInput> = Omit<TRoute, 'children'> &
	(TRoute extends { children: infer TChildren extends readonly RouteInput[] }
		? { readonly children: TransformRoutes<TChildren, TRoute> }
		: {});

export type TransformRoutes<
	TRoutes extends readonly RouteInput[],
	TParentRoute extends RouteInput = {}
> = {
	[K in keyof TRoutes]: _TransformRoutes<
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

export type ExtractRoutes<
	TRoutes extends FlatRoute,
	TId extends TRoutes['id']
> = Extract<TRoutes, { id: TId }>;

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
				ExtractRoutes<TRoutes, TChildId>,
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
		? ExtractRoutes<TRoutes, TParentId>
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
	[TId in TRootRouteIds]: _AbsolutePaths<TRoutes, ExtractRoutes<TRoutes, TId>>;
}[TRootRouteIds];

export type Paths<
	TRoutes extends FlatRoute,
	TRoute extends FlatRoute,
	TRouteOrParent extends FlatRoute = TRoute extends {
		index: true;
		parentId: infer TParentId extends TRoutes['id'];
	}
		? ExtractRoutes<TRoutes, TParentId>
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
	? _AncestorParams<TRoutes, ExtractRoutes<TRoutes, TParentId>>
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
				ExtractRoutes<TRoutes, TChildId>,
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

//#region loader data

//#endregion

export interface Utils {
	redirect?: RedirectFunction;
	useParams?: () => Record<string, string | undefined>;
}

type ExtractUtils<T, U> = Pick<T, Extract<keyof T, keyof U>>;

interface RedirectParameters<TUrl extends string>
	extends Parameters<RedirectFunction> {
	0: TUrl;
}

interface DataFunctionUtils<
	TRoutes extends FlatRoute,
	TRoute extends FlatRoute
> {
	redirect(
		...args: RedirectParameters<Paths<TRoutes, TRoute>>
	): ReturnType<RedirectFunction>;
}

export type LoaderWrapperArgs<
	TRoutes extends FlatRoute = FlatRoute,
	TUtils extends Utils = Utils,
	TId extends string = string,
	TRoute extends FlatRoute = ExtractRoutes<TRoutes, TId>
> = Omit<LoaderFunctionArgs, 'params'> & {
	params: Params<TRoutes, TRoute>;
} & ExtractUtils<DataFunctionUtils<TRoutes, TRoute>, TUtils>;

export type ActionWrapperArgs<
	TRoutes extends FlatRoute = FlatRoute,
	TUtils extends Utils = Utils,
	TId extends string = string,
	TRoute extends FlatRoute = ExtractRoutes<TRoutes, TId>
> = Omit<ActionFunctionArgs, 'params'> & {
	params: Params<TRoutes, TRoute>;
} & ExtractUtils<DataFunctionUtils<TRoutes, TRoute>, TUtils>;

interface RouteProp<TType extends symbol> {
	type: TType;
	id: string;
	value: any;
}

export type Loader = RouteProp<typeof symbols.loader>;
export type Action = RouteProp<typeof symbols.action>;

export interface Config {
	routes: FlatRoute;
	utils: Utils;
	loaders: Loader;
	actions: Action;
}

interface ComponentUtils<TConfig extends Config, TRoute extends FlatRoute> {
	useParams: () => Params<TConfig['routes'], TRoute>;
}

export type ComponentWrapperArgs<
	TConfig extends Config = Config,
	TId extends string = string,
	TRoute extends FlatRoute = ExtractRoutes<TConfig['routes'], TId>
> = ExtractUtils<ComponentUtils<TConfig, TRoute>, TConfig['utils']>;
