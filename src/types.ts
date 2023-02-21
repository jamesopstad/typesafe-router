import type * as React from 'react';
import type { LoaderFunction, ActionFunction } from 'react-router-dom';
import type { Prettify } from './utils';

//#region input types

export interface RouteObject {
	path?: string;
	id?: string;
	loader?: LoaderFunction;
	action?: ActionFunction;
	index?: boolean;
	children?: readonly RouteObject[];
	element?: React.ReactNode | null;
}

//#endregion

//#region Add default ids to routes

export interface RouteObjectWithId extends RouteObject {
	id: string;
}

type IdSegment<TRoute extends RouteObject> = TRoute extends {
	path: infer TPath extends string;
}
	? TPath
	: TRoute extends { index: true }
	? 'index'
	: '_';

type _AddIdsToRoutes<
	TRoute extends RouteObject,
	TParentId extends string,
	TId extends string = `${[TParentId] extends [never]
		? ''
		: TParentId extends '/'
		? '/'
		: `${TParentId}/`}${IdSegment<TRoute>}`
> = Omit<TRoute, 'children'> &
	(TRoute extends { id: string } ? {} : { readonly id: TId }) &
	(TRoute extends { children: infer TChildren extends readonly RouteObject[] }
		? { readonly children: AddIdsToRoutes<TChildren, TId> }
		: {});

export type AddIdsToRoutes<
	TRoutes extends readonly RouteObject[],
	TParentId extends string = never
> = {
	[K in keyof TRoutes]: _AddIdsToRoutes<TRoutes[K], TParentId>;
};

//#endregion

//#region Flatten routes into a union

export type Param<TParam extends string = string> = Record<TParam, string>;

type OptionalParam<TParam extends string> = Partial<Param<TParam>>;

interface FlatRouteObject extends RouteObjectWithId {
	params: Param;
	parentId?: string;
	childIds?: string;
}

type RemoveLeadingSlash<TPath extends string> = TPath extends `/${infer TRest}`
	? TRest
	: TPath;

type RemoveTrailingSlash<TPath extends string> = TPath extends `${infer TRest}/`
	? TRest
	: TPath;

type AddLeadingSlash<TPath extends string> = TPath extends ''
	? ''
	: `/${TPath}`;

type OptionalFinalSegment<TPath extends string> =
	TPath extends `${infer L}/${infer R}`
		? `${L}${AddLeadingSlash<OptionalFinalSegment<R>>}`
		: '' | TPath;

type _ConvertOptionalPathSegments<TPath extends string> =
	TPath extends `${infer L}?${infer R}`
		? `${OptionalFinalSegment<L>}${_ConvertOptionalPathSegments<R>}`
		: TPath;

// TODO: add support for '/optional?' path at root
type ConvertOptionalPathSegments<TPath extends string> = RemoveLeadingSlash<
	_ConvertOptionalPathSegments<TPath>
>;

type _GetParams<TPath extends string> = TPath extends `${infer L}/${infer R}`
	? _GetParams<L> & _GetParams<R>
	: TPath extends `:${infer TParam}`
	? TParam extends `${infer TOptionalParam}?`
		? OptionalParam<TOptionalParam>
		: Param<TParam>
	: {};

type GetParams<TPath extends string> = TPath extends '*'
	? Param<'*'>
	: TPath extends `${infer TRest}/*`
	? Param<'*'> & _GetParams<TRest>
	: _GetParams<TPath>;

type _FlattenRoutes<
	TRoute extends RouteObjectWithId,
	TParentId extends string,
	TPath extends string = TRoute extends { path: infer TPath extends string }
		? RemoveTrailingSlash<RemoveLeadingSlash<TPath>>
		: never
> =
	| (Omit<TRoute, 'path' | 'children'> &
			([TPath] extends [never]
				? { params: {} }
				: {
						path: ConvertOptionalPathSegments<TPath>;
						params: GetParams<TPath>;
				  }) &
			([TParentId] extends [never] ? {} : { parentId: TParentId }) &
			(TRoute extends {
				children: infer TChildren extends readonly RouteObjectWithId[];
			}
				? { childIds: TChildren[number]['id'] }
				: {}))
	| (TRoute extends {
			children: infer TChildren extends readonly RouteObjectWithId[];
	  }
			? FlattenRoutes<TChildren, TRoute['id']>
			: never);

export type FlattenRoutes<
	TRoutes extends readonly RouteObjectWithId[],
	TParentId extends string = never
> = {
	[K in keyof TRoutes]: _FlattenRoutes<TRoutes[K], TParentId>;
}[number];

//#endregion

// #region Link types

type ExtractRoutes<
	TRoutes extends FlatRouteObject,
	TId extends TRoutes['id']
> = Extract<TRoutes, { id: TId }>;

// TODO: add support for optional segments
type _DescendantPaths<
	TRoutes extends FlatRouteObject,
	TRoute extends FlatRouteObject,
	TParentPath extends string,
	TCumulativePath extends string = `${TParentPath}${TRoute extends {
		path: infer TPath extends string;
	}
		? `${TParentPath extends '' ? '' : '/'}${TPath}`
		: ''}`
> =
	| (TCumulativePath extends '' ? never : TCumulativePath)
	| DescendantPaths<TRoutes, TRoute, TCumulativePath>;

type DescendantPaths<
	TRoutes extends FlatRouteObject,
	TRoute extends FlatRouteObject,
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

type AncestorPaths<
	TRoutes extends FlatRouteObject,
	TRoute extends FlatRouteObject,
	TPathPrefix extends string = '..',
	TParentRoute = TRoute extends {
		parentId: infer TParentId extends TRoutes['id'];
	}
		? ExtractRoutes<TRoutes, TParentId>
		: never
> = TParentRoute extends FlatRouteObject
	? TParentRoute extends { path: string }
		?
				| TPathPrefix
				| DescendantPaths<TRoutes, TParentRoute, TPathPrefix>
				| AncestorPaths<TRoutes, TParentRoute, `../${TPathPrefix}`>
		: AncestorPaths<TRoutes, TParentRoute, TPathPrefix>
	: never;

type _AbsolutePaths<
	TRoutes extends FlatRouteObject,
	TRoute extends FlatRouteObject,
	TRootPath extends string = TRoute extends { path: infer TPath extends string }
		? TPath
		: never
> = [TRootPath] extends [never]
	? TRoute extends { childIds: infer TChildIds extends TRoutes['id'] }
		? AbsolutePaths<TRoutes, TChildIds>
		: never
	: `/${TRootPath | DescendantPaths<TRoutes, TRoute, TRootPath>}`;

type AbsolutePaths<
	TRoutes extends FlatRouteObject,
	TRootRouteIds extends TRoutes['id'] = Exclude<
		TRoutes,
		{ parentId: string }
	>['id']
> = {
	[TId in TRootRouteIds]: _AbsolutePaths<TRoutes, ExtractRoutes<TRoutes, TId>>;
}[TRootRouteIds];

type _PathParams<TPath extends string> = TPath extends `${infer L}/${infer R}`
	? _PathParams<L> | _PathParams<R>
	: TPath extends `:${infer TParam}`
	? TParam extends `${infer TOptionalParam}?`
		? TOptionalParam
		: TParam
	: never;

type PathParams<TPath extends string> = TPath extends '*'
	? '*'
	: TPath extends `${infer TRest}/*`
	? '*' | _PathParams<TRest>
	: _PathParams<TPath>;

type LinkParams<
	TPath extends string,
	TPathParams extends string = PathParams<TPath>
> = [TPathParams] extends [never]
	? {}
	: { params: Record<TPathParams, string> };

type LinkComponent<
	TRoutes extends FlatRouteObject,
	TRoute extends FlatRouteObject
> = <
	TPath extends
		| AbsolutePaths<TRoutes>
		| AncestorPaths<TRoutes, TRoute>
		| DescendantPaths<TRoutes, TRoute>
>(
	props: {
		to: TPath;
		children?: React.ReactNode;
	} & LinkParams<TPath>
) => React.ReactElement | null;

//#endregion

//#region useParam types

type _AncestorParams<
	TRoutes extends FlatRouteObject,
	TRoute extends FlatRouteObject
> = TRoute['params'] & AncestorParams<TRoutes, TRoute>;

type AncestorParams<
	TRoutes extends FlatRouteObject,
	TRoute extends FlatRouteObject
> = TRoute extends { parentId: infer TParentId extends TRoutes['id'] }
	? _AncestorParams<TRoutes, ExtractRoutes<TRoutes, TParentId>>
	: {};

type _DescendantParams<
	TRoutes extends FlatRouteObject,
	TRoute extends FlatRouteObject,
	TParams extends Param
> =
	| TParams
	| (TParams & TRoute['params'] & DescendantParams<TRoutes, TRoute, TParams>);

type DescendantParams<
	TRoutes extends FlatRouteObject,
	TRoute extends FlatRouteObject,
	TParams extends Param
> = TRoute extends { childIds: infer TChildIds extends TRoutes['id'] }
	?
			| {
					[TChildId in TChildIds]: _DescendantParams<
						TRoutes,
						ExtractRoutes<TRoutes, TChildId>,
						TParams
					>;
			  }[TChildIds]
	: {};

type UseParams<
	TRoutes extends FlatRouteObject,
	TRoute extends FlatRouteObject,
	TParams extends Param = AncestorParams<TRoutes, TRoute> & TRoute['params']
> = () => Prettify<TParams & DescendantParams<TRoutes, TRoute, TParams>>;

//#endregion

//#region Route utils

export interface Utils<
	TRoutes extends FlatRouteObject,
	TId extends TRoutes['id'],
	TRoute extends FlatRouteObject = ExtractRoutes<TRoutes, TId>
> {
	Link: LinkComponent<TRoutes, TRoute>;
	useParams: UseParams<TRoutes, TRoute>;
}

//#endregion
