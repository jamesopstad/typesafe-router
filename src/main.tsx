import * as symbols from './symbols';
import type {
	RouteInput,
	TransformRoutes,
	Route,
	FlattenRoutes,
	Utils,
	LoaderWrapperArgs,
	ActionWrapperArgs,
	ComponentWrapperArgs,
	Loader,
	Action,
	Config,
} from './types';
import type {
	ActionFunction,
	ActionFunctionArgs,
	LoaderFunction,
	LoaderFunctionArgs,
} from 'react-router-dom';

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

function fn<TConfig extends Config>(config: {
	routes: Route[];
	utils: Utils;
	loaders: Loader[];
	actions: Action[];
}) {
	return {
		createComponent<TId extends TConfig['routes']['id']>(
			id: TId,
			component: (
				args: ComponentWrapperArgs<TConfig, TId>
			) => () => React.ComponentType | null
		) {
			return {
				type: symbols.component,
				id,
				value() {
					return component(config.utils as any);
				},
			} as const;
		},
		addLoaders<TLoaders extends Loader[]>(...loaders: TLoaders) {
			return fn<
				Omit<TConfig, 'loaders'> & {
					loaders: TConfig['loaders'] & TLoaders[number];
				}
			>({
				...config,
				loaders: [...config.loaders, ...loaders],
			});
		},
		addActions<TActions extends Action[]>(...actions: TActions) {
			return fn<
				Omit<TConfig, 'actions'> & {
					actions: TConfig['actions'] & TActions[number];
				}
			>({
				...config,
				actions: [...config.actions, ...actions],
			});
		},
	};
}

export function createRoutes<
	TRoutes extends readonly RouteInput[],
	TUtils extends Partial<Utils>
>(routes: TRoutes, utils: TUtils) {
	type Routes = TransformRoutes<TRoutes>;
	type FlatRoutes = Extract<FlattenRoutes<Routes>, { id: string; params: {} }>;

	return {
		createLoader<
			TId extends FlatRoutes['id'],
			TReturn extends ReturnType<LoaderFunction>
		>(
			id: TId,
			loader: (args: LoaderWrapperArgs<FlatRoutes, TUtils, TId>) => TReturn
		) {
			return {
				type: symbols.loader,
				id,
				value(args: LoaderFunctionArgs) {
					return loader({ ...args, redirect: utils.redirect } as any);
				},
			} as const;
		},
		createAction<
			TId extends FlatRoutes['id'],
			TReturn extends ReturnType<ActionFunction>
		>(
			id: TId,
			action: (args: ActionWrapperArgs<FlatRoutes, TUtils, TId>) => TReturn
		) {
			return {
				type: symbols.action,
				id,
				value(args: ActionFunctionArgs) {
					return action({ ...args, redirect: utils.redirect } as any);
				},
			} as const;
		},
		initialConfig: fn<{
			routes: FlatRoutes;
			utils: TUtils;
			loaders: never;
			actions: never;
		}>({
			routes: transformRoutes(routes),
			utils,
			loaders: [],
			actions: [],
		}),
	};
}
