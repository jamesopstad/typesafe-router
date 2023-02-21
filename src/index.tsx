import { Link as _Link, generatePath, useParams } from 'react-router-dom';
import type * as React from 'react';
import type {
	RouteObject,
	RouteObjectWithId,
	AddIdsToRoutes,
	Param,
	FlattenRoutes,
	Utils,
} from './types';

//#region Function exports

// TODO: map routes to add default ids
export function createRoutes<TRoutes extends readonly RouteObject[]>(
	routes: TRoutes
) {
	return routes as AddIdsToRoutes<TRoutes>;
}

function Link({ to, params, ...rest }: any) {
	return <_Link {...rest} to={generatePath(to, params)}></_Link>;
}

export function createRouteUtils<
	TRoutes extends readonly RouteObjectWithId[]
>() {
	type TFlatRoutes = Extract<
		FlattenRoutes<TRoutes>,
		{ id: string; params: Param }
	>;

	return {
		createRouteComponent: <TId extends TFlatRoutes['id']>(
			id: TId,
			component: (
				utils: Utils<TFlatRoutes, TId>
			) => (...args: any[]) => React.ReactElement | null
		) => component({ Link, useParams } as any),
	};
}

//#endregion
