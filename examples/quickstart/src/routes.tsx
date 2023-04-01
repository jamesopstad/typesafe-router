import { Child, childAction } from './routes/child';
import { indexLoader } from './routes/home';
import { Root, RootErrorBoundary, rootLoader } from './routes/root';
import { createRouteConfig, lazy } from 'typesafe-router';

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

const dataConfig = routeConfig
	.addActions(childAction)
	.addLoaders(rootLoader, indexLoader);

export const routes = dataConfig
	.addComponents(
		Root,
		Child,
		lazy('/lazy-route', () => import('./routes/lazy-route'))
	)
	.addErrorBoundaries(RootErrorBoundary)
	.toRoutes();

export type RouteConfig = typeof routeConfig;
export type DataConfig = typeof dataConfig;
