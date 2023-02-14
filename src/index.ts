import { Link } from 'react-router-dom';
import type * as React from 'react';
import type { LoaderFunction, ActionFunction } from 'react-router-dom';

interface RouteObject {
	path?: string;
	id?: string;
	loader?: LoaderFunction;
	action?: ActionFunction;
	index?: boolean;
	children?: readonly RouteObject[];
	element?: React.ReactNode | null;
}

//#region Add default ids to routes

interface RouteObjectWithId extends RouteObject {
	id: string;
}

type IdSegment<TRoute extends RouteObject> = TRoute extends {
	path: infer TPath extends string;
}
	? TPath
	: TRoute extends { index: true }
	? 'index'
	: '_';

type AddIdToRoute<
	TRoute extends RouteObject,
	TParentId extends string = never,
	TId extends string = `${[TParentId] extends [never]
		? ''
		: `${TParentId}/`}${IdSegment<TRoute>}`
> = Omit<TRoute, 'children'> &
	(TRoute extends { id: string } ? {} : { readonly id: TId }) &
	(TRoute extends { children: infer TChildren extends readonly RouteObject[] }
		? { readonly children: AddIdsToRoutes<TChildren, TId> }
		: {});

type AddIdsToRoutes<
	TRoutes extends readonly RouteObject[],
	TParentId extends string = never
> = {
	[K in keyof TRoutes]: AddIdToRoute<TRoutes[K], TParentId>;
};

//#endregion

//#region Flatten routes into a union

interface FlatRouteObject extends RouteObjectWithId {
	parentId?: string;
	childIds?: string;
}

type FlattenRoute<
	TRoute extends RouteObjectWithId,
	TParentId extends string = never
> =
	| (Omit<TRoute, 'children'> &
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

type FlattenRoutes<
	TRoutes extends readonly RouteObjectWithId[],
	TParentId extends string = never
> = {
	[K in keyof TRoutes]: FlattenRoute<TRoutes[K], TParentId>;
}[number];

//#endregion

//#region Type utilities

type ExtractRoutes<
	TRoutes extends FlatRouteObject,
	TId extends TRoutes['id']
> = Extract<TRoutes, { id: TId }>;

//#endregion

//#region Link types

// TODO: add support for optional segments
type DescendantPath<
	TRoutes extends FlatRouteObject,
	TRoute extends FlatRouteObject,
	TParentPath extends string,
	TCumulativePath extends string = `${TParentPath}${TRoute extends {
		path: infer TPath extends string;
	}
		? `${TParentPath extends '' ? '' : '/'}${TPath}`
		: ''}`
> = TCumulativePath | DescendantPaths<TRoutes, TRoute, TCumulativePath>;

type DescendantPaths<
	TRoutes extends FlatRouteObject,
	TRoute extends FlatRouteObject,
	TParentPath extends string = ''
> = TRoute extends { childIds: infer TChildIds extends TRoutes['id'] }
	? {
			[TChildId in TChildIds]: DescendantPath<
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
	TParentRoute extends FlatRouteObject = TRoute extends {
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

type AbsolutePath<
	TRoutes extends FlatRouteObject,
	TRoute extends FlatRouteObject,
	TRootPath extends string = TRoute extends { path: infer TPath extends string }
		? `/${TPath}`
		: never
> = [TRootPath] extends [never]
	? TRoute extends { childIds: infer TChildIds extends TRoutes['id'] }
		? AbsolutePaths<TRoutes, ExtractRoutes<TRoutes, TChildIds>>
		: never
	: TRootPath | DescendantPaths<TRoutes, TRoute, TRootPath>;

type AbsolutePaths<
	TRoutes extends FlatRouteObject,
	TRootRoutes extends FlatRouteObject = Exclude<TRoutes, { parentId: string }>
> = {
	[TId in TRootRoutes['id']]: AbsolutePath<
		TRoutes,
		ExtractRoutes<TRoutes, TId>
	>;
}[TRootRoutes['id']];

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
		children: React.ReactNode;
	} & LinkParams<TPath>
) => React.ReactElement | null;

//#endregion

//#region Route utils

type Utils<
	TRoutes extends FlatRouteObject,
	TId extends TRoutes['id'],
	TRoute extends FlatRouteObject = ExtractRoutes<TRoutes, TId>
> = {
	Link: LinkComponent<TRoutes, TRoute>;
};

//#endregion

//#region Function exports

// TODO: map routes to add default ids
export function createRoutes<TRoutes extends readonly RouteObject[]>(
	routes: TRoutes
) {
	return routes as AddIdsToRoutes<TRoutes>;
}

export function createRouteUtils<
	TRoutesInput extends readonly RouteObjectWithId[]
>() {
	type TRoutes = Extract<FlattenRoutes<TRoutesInput>, { id: string }>;

	return {
		createRoute: <TId extends TRoutes['id']>(
			id: TId,
			component: (utils: Utils<TRoutes, TId>) => () => any
		) => component({ Link } as any),
	};
}

//#endregion
