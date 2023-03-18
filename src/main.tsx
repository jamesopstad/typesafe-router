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
	RouteProp,
	Loader,
	Action,
	Component,
	Config,
} from './types';
import { generatePath, createSearchParams } from 'react-router-dom';
import type {
	ActionFunction,
	ActionFunctionArgs,
	LoaderFunction,
	LoaderFunctionArgs,
	RedirectFunction,
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

export function finalize(
	routes: readonly Route[],
	config: {
		loaders: Record<string, any>;
		actions: Record<string, any>;
		components: Record<string, any>;
	}
) {
	return routes.map((route): any => {
		return {
			...route,
			loader: config.loaders[route.id],
			Component: config.components[route.id],
			children: route.children && finalize(route.children, config),
		};
	});
}

function toObject<TInput extends RouteProp<TSymbol>[], TSymbol extends symbol>(
	input: TInput,
	symbol: TSymbol
) {
	return input.reduce((acc, curr) => {
		if (curr.type !== symbol) {
			throw Error(`${curr} is not a valid ${symbol.description}`);
		}

		if (acc[curr.id]) {
			throw Error(
				`Multiple ${symbol.description}s found for route '${curr.id}'`
			);
		}

		acc[curr.id] = curr.value;

		return acc;
	}, {} as any) as {
		[K in TInput[number] as K['id']]: K['value'];
	};
}

function configFn(config: {
	routes: Route[];
	utils: {};
	loaders: Record<string, any>;
	actions: Record<string, any>;
	components: Record<string, any>;
}) {
	return {
		addComponents<TComponents extends Component[]>(...components: TComponents) {
			const componentsObject = toObject(components, symbols.component);

			return finalize(config.routes, {
				...config,
				components: componentsObject,
			});
		},
	};
}

function initialConfigFn<TConfig extends Config>(config: {
	routes: Route[];
	utils: {};
	loaders: {};
	actions: {};
}) {
	return {
		config: configFn({
			...config,
			components: {},
		}),
		createComponent<TId extends TConfig['routes']['id']>(
			id: TId,
			component: (
				args: ComponentWrapperArgs<TConfig, TId>
			) => React.ComponentType | null
		) {
			return {
				type: symbols.component,
				id,
				value: component(config.utils as any),
			} as const;
		},
		addLoaders<TLoaders extends Loader[]>(...loaders: TLoaders) {
			const loadersObject = toObject(loaders, symbols.loader);

			return initialConfigFn<
				Omit<TConfig, 'loaders'> & { loaders: TLoaders[number] }
			>({
				...config,
				loaders: loadersObject,
			});
		},
		addActions<TActions extends Action[]>(...actions: TActions) {
			const actionsObject = toObject(actions, symbols.action);

			return initialConfigFn<
				Omit<TConfig, 'actions'> & { actions: TActions[number] }
			>({
				...config,
				actions: actionsObject,
			});
		},
	};
}

// ADD INIT
function redirect(redirectFunction: RedirectFunction) {
	return (
		to: string,
		options?: {
			params?: Record<string, string>;
			searchParams?: Record<string, string>;
		}
	) =>
		redirectFunction(
			`${generatePath(to, options?.params)}${
				options?.searchParams
					? `?${createSearchParams(options.searchParams)}`
					: ''
			}`
		);
}

function enhanceUtils(utils: Utils) {
	return {
		...utils,
		redirect: utils.redirect && redirect(utils.redirect),
	};
}

export function createRoutes<
	TRoutes extends readonly RouteInput[],
	TUtils extends Utils
>(routes: TRoutes, utils: TUtils) {
	type Routes = TransformRoutes<TRoutes>;
	type FlatRoutes = Extract<FlattenRoutes<Routes>, { id: string; params: {} }>;

	const enhancedUtils = enhanceUtils(utils);

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
					return loader({ ...args, redirect: enhancedUtils.redirect } as any);
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
					return action({ ...args, redirect: enhancedUtils.redirect } as any);
				},
			} as const;
		},
		initialConfig: initialConfigFn<{
			routes: FlatRoutes;
			utils: TUtils;
			loaders: never;
			actions: never;
		}>({
			routes: transformRoutes(routes),
			utils: enhancedUtils,
			loaders: {},
			actions: {},
		}),
	};
}
