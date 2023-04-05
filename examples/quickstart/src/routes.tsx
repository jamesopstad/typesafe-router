import { Child, childAction } from './routes/child';
import { indexLoader } from './routes/home';
import { Root, RootErrorBoundary, rootLoader } from './routes/root';
import { createRouteConfig, lazy } from 'typesafe-router';

// create the route config, using just the path matching fields
const routeConfig = createRouteConfig([
	{
		path: '/',
		children: [
			{
				index: true,
			},
			{
				path: ':id',
			},
			{
				path: 'lazy-route',
			},
		],
	},
] as const);

// export the RouteConfig type (this is used in utils.tsx to initialise the data creators)
export type RouteConfig = typeof routeConfig;

// build the dataConfig by adding any actions or loaders to the routeConfig
const dataConfig = routeConfig
	.addActions(childAction)
	.addLoaders(rootLoader, indexLoader);

// export the DataConfig type (this is used in utils.tsx to initialise the render creators)
export type DataConfig = typeof dataConfig;

// build and export the routes by adding any components or error boundaries to the dataConfig and calling toRoutes()
export const routes = dataConfig
	.addComponents(
		Root,
		Child,
		lazy('/lazy-route', () => import('./routes/lazy-route'))
	)
	.addErrorBoundaries(RootErrorBoundary)
	.toRoutes();
