import type { LoaderFunction, ActionFunction } from 'react-router-dom';
import type { Prettify } from './utils';

interface RouteObject {
	path?: string;
	index?: boolean;
	children?: readonly RouteObject[];
	id?: string;
	loader?: LoaderFunction;
	action?: ActionFunction;
}

//#region Add default ids

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

type RouteWithId<
	TRoute extends RouteObject,
	TParentId extends string = never,
	TId extends string = `${[TParentId] extends [never]
		? ''
		: `${TParentId}/`}${IdSegment<TRoute>}`
> = Prettify<
	Omit<TRoute, 'children'> &
		(TRoute extends { id: string } ? {} : { readonly id: TId }) &
		(TRoute extends { children: infer TChildren extends readonly RouteObject[] }
			? { readonly children: RoutesWithIds<TChildren, TId> }
			: {})
>;

type RoutesWithIds<
	TRoutes extends readonly RouteObject[],
	TParentId extends string = never
> = {
	[K in keyof TRoutes]: RouteWithId<TRoutes[K], TParentId>;
};

//#endregion

//#region Function exports

// TODO: map routes to add default ids
export function createRoutes<TRoutes extends readonly RouteObject[]>(
	routes: TRoutes
) {
	return routes as RoutesWithIds<TRoutes>;
}

//#endregion
