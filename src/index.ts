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
	path: infer TPath;
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

type ExtractRoutes<
	TRoutes extends FlatRouteObject,
	TId extends TRoutes['id']
> = Extract<TRoutes, { id: TId }>;

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
		createRoute: <TId extends TRoutes['id']>(id: TId) => {
			type TRoute = ExtractRoutes<TRoutes, TId>;

			return () => null;
		},
	};
}

//#endregion
