import type { AnyRouteObject } from './types';

export function normalizePath(route: AnyRouteObject) {
	return typeof route.path === 'string'
		? {
				...route,
				path: route.path.replace(/^\/+/, '').replace(/\/+$/, ''),
		  }
		: route;
}

export function setIdSegment({ path, index }: AnyRouteObject) {
	return typeof path === 'string' ? path : index ? '_index' : '_';
}

export function setId(route: AnyRouteObject, parentRoute?: AnyRouteObject) {
	return route.id
		? route
		: {
				...route,
				id: `${
					parentRoute && parentRoute.id !== '/' ? parentRoute.id : ''
				}/${setIdSegment(route)}`,
		  };
}

export function transformRoutes(
	routes: AnyRouteObject[],
	parentRoute?: AnyRouteObject
) {
	return routes.map((routeInput): AnyRouteObject => {
		const route = [normalizePath, setId].reduce(
			(acc, curr) => curr(acc, parentRoute),
			routeInput
		);

		return {
			...route,
			children: route.children && transformRoutes(route.children, route),
		};
	});
}
