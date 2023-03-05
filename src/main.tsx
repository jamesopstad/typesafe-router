import type {
	RouteInput,
	Route,
	TransformRoutes,
	FlattenRoutes,
	OptionalParam,
	LoaderUtils,
} from './types';

export function normalizePath(route: RouteInput) {
	return typeof route.path === 'string'
		? {
				...route,
				path: route.path.replace(/^\/+/, '').replace(/\/+$/, ''),
		  }
		: route;
}

export function setIdSegment({ path, index }: RouteInput) {
	return typeof path === 'string' ? path : index ? '_index' : '_';
}

export function setId(route: RouteInput, parentRoute?: RouteInput) {
	return {
		...route,
		id:
			route.id ||
			`${
				parentRoute && parentRoute.id !== '/' ? parentRoute.id : ''
			}/${setIdSegment(route)}`,
	};
}

export function transformRoutes(
	routes: readonly RouteInput[],
	parentRoute?: RouteInput
) {
	return routes.map((routeInput): Route => {
		const route = setId(normalizePath(routeInput), parentRoute);

		return {
			...route,
			children: route.children && transformRoutes(route.children, route),
		};
	});
}

export function createRoutes<TRoutes extends readonly RouteInput[]>(
	routes: TRoutes
) {
	type Routes = TransformRoutes<TRoutes>;
	type FlatRoutes = Extract<
		FlattenRoutes<Routes>,
		{ id: string; params: OptionalParam }
	>;

	return {
		createLoader: <TId extends FlatRoutes['id']>(
			id: TId,
			loader: (utils: LoaderUtils<FlatRoutes, TId>) => any
		) => {},
		getRouteId: (id: FlatRoutes['id']) => id,
		initialConfig: transformRoutes(routes) as Routes,
	};
}
