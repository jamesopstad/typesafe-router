import * as symbols from './symbols';
import type {
	ActionFunctionArgs,
	ComponentFunctionArgs,
	DataConfig,
	FlattenRoutes,
	LoaderFunctionArgs,
	NormalizeRoutes,
	Route,
	RouteConfig,
	RouteInput,
} from './types';
import { enhanceDataUtils, enhanceRenderUtils } from './utils';
import type { InputDataUtils, InputRenderUtils } from './utils';
import type {
	ActionWrapper,
	ComponentType,
	EagerOrLazy,
	LazyValue,
	LoaderWrapper,
	RouteProps,
	UnwrapEagerOrLazy,
	Wrapper,
} from './wrappers';
import type * as $ from 'react-router-dom';

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

export function normalizeRoutes(
	routes: readonly RouteInput[],
	parentRoute?: RouteInput
) {
	return routes.map((routeInput): Route => {
		const route = setId(normalizePath(routeInput), parentRoute);

		return {
			...route,
			children: route.children && normalizeRoutes(route.children, route),
		};
	});
}

type Container<
	TConfig,
	TCreator = unknown,
	TOmit extends string = never
> = Omit<TCreator, TOmit>;

export function createRouteConfig<TRoutes extends readonly RouteInput[]>(
	routes: TRoutes
) {
	interface TConfig {
		routes: Extract<
			FlattenRoutes<NormalizeRoutes<TRoutes>>,
			{ id: string; params: {} }
		>;
		actions: never;
		loaders: never;
	}

	return createDataConfig<TConfig>(normalizeRoutes(routes), {
		action: {},
		loader: {},
		Component: {},
		ErrorBoundary: {},
	});
}

function toObject<TType extends RouteProps>(
	type: TType,
	items: EagerOrLazy<TType>[]
) {
	return items.reduce((output, item) => {
		if (![symbols[type], symbols.lazy].includes(item.type)) {
			throw Error(`${item} is not a valid ${type} or lazy ${type}`);
		}

		if (output[item.id]) {
			throw Error(`Multiple ${type} entries found for route '${item.id}`);
		}

		output[item.id] = item;

		return output;
	}, {} as Record<string, EagerOrLazy<TType>>);
}

function toRoutes(routes: readonly Route[], config: InputDataConfig) {
	return routes.map((route): unknown => {
		const eager: Partial<Record<RouteProps, unknown>> = {};
		const lazy: Partial<Record<RouteProps, LazyValue>> = {};

		for (const prop of [
			'action',
			'loader',
			'Component',
			'ErrorBoundary',
		] as const) {
			const item = config[prop][route.id];

			if (!item) continue;

			if (item.type === symbols.lazy) {
				lazy[prop] = item.value;
			} else {
				eager[prop] = item.value;
			}
		}

		const lazyModules = Object.values(lazy);

		return {
			...route,
			...eager,
			lazy: lazyModules.length
				? async () => {
						const modules = await Promise.all(
							lazyModules.map((value) => value())
						);

						return Object.keys(lazy).reduce((acc, curr, i) => {
							acc[curr] = modules[i]?.[curr]?.value;

							return acc;
						}, {} as any);
				  }
				: undefined,
			children: route.children && toRoutes(route.children, config),
		};
	}) as $.RouteObject[];
}

type InputDataConfig = {
	[K in RouteProps]: Record<string, EagerOrLazy<K>>;
};

function createDataConfig<
	TConfig extends DataConfig,
	TOmit extends string = never
>(routes: Route[], config: InputDataConfig) {
	type TIds = TConfig['routes']['id'];

	const output = {
		addActions<TActions extends EagerOrLazy<'action', TIds>[]>(
			...actions: TActions
		) {
			return createDataConfig<
				Omit<TConfig, 'actions'> & {
					actions: {
						[K in keyof TActions]: UnwrapEagerOrLazy<
							TActions[K],
							ActionWrapper
						>;
					}[number];
				},
				TOmit | 'addActions'
			>(routes, {
				...config,
				action: toObject('action', actions),
			});
		},
		addLoaders<TLoaders extends EagerOrLazy<'loader', TIds>[]>(
			...loaders: TLoaders
		) {
			return createDataConfig<
				Omit<TConfig, 'loaders'> & {
					loaders: {
						[K in keyof TLoaders]: UnwrapEagerOrLazy<
							TLoaders[K],
							LoaderWrapper
						>;
					}[number];
				},
				TOmit | 'addLoaders'
			>(routes, {
				...config,
				loader: toObject('loader', loaders),
			});
		},
		addComponents<TComponents extends EagerOrLazy<'Component', TIds>[]>(
			...components: TComponents
		) {
			return createDataConfig<
				TConfig,
				TOmit | 'addActions' | 'addLoaders' | 'addComponents'
			>(routes, {
				...config,
				Component: toObject('Component', components),
			});
		},
		toRoutes() {
			return toRoutes(routes, config);
		},
	};

	return output as Container<TConfig, typeof output, TOmit>;
}

function dataCreators<
	TConfig extends RouteConfig,
	TUtils extends Partial<InputDataUtils>
>(utils: TUtils) {
	type TIds = TConfig['routes']['id'];

	const enhancedUtils = enhanceDataUtils(utils);

	return {
		createAction<
			TId extends TIds,
			TReturn extends ReturnType<$.ActionFunction>
		>(
			id: TId,
			action: (args: ActionFunctionArgs<TConfig, TId, TUtils>) => TReturn
		) {
			return {
				type: symbols.action,
				id,
				value(args: any) {
					return action({
						...args,
						redirect: enhancedUtils.redirect,
					});
				},
			} as const;
		},
		createLoader<
			TId extends TIds,
			TReturn extends ReturnType<$.LoaderFunction>
		>(
			id: TId,
			loader: (args: LoaderFunctionArgs<TConfig, TId, TUtils>) => TReturn
		) {
			return {
				type: symbols.loader,
				id,
				value(args: any) {
					return loader({
						...args,
						redirect: enhancedUtils.redirect,
					});
				},
			} as const;
		},
	};
}

export function initDataCreators<TContainer extends Container<RouteConfig>>() {
	type TConfig = TContainer extends Container<infer T extends RouteConfig>
		? T
		: never;

	return {
		addUtils<TUtils extends Partial<InputDataUtils>>(utils: TUtils) {
			return dataCreators<TConfig, TUtils>(utils);
		},
	};
}

function renderCreators<
	TConfig extends DataConfig,
	TUtils extends Partial<InputRenderUtils>
>(utils: TUtils) {
	type TIds = TConfig['routes']['id'];

	const enhancedUtils = enhanceRenderUtils(utils);

	return {
		createComponent<TId extends TIds>(
			id: TId,
			component: (
				args: ComponentFunctionArgs<TConfig, TId, TUtils>
			) => ComponentType
		) {
			return {
				type: symbols.Component,
				id,
				value: component(enhancedUtils as any),
			} as const;
		},
		createErrorBoundary<TId extends TIds>(
			id: TIds,
			errorBoundary: (
				args: ComponentFunctionArgs<TConfig, TId, TUtils>
			) => ComponentType
		) {
			return {
				type: symbols.ErrorBoundary,
				id,
				value: errorBoundary(enhancedUtils as any),
			} as const;
		},
	};
}

export function initRenderCreators<TContainer extends Container<DataConfig>>() {
	type TConfig = TContainer extends Container<infer T extends DataConfig>
		? T
		: never;

	return {
		addUtils<TUtils extends Partial<InputRenderUtils>>(utils: TUtils) {
			return renderCreators<TConfig, TUtils>(utils);
		},
	};
}

export function lazy<
	TId extends string,
	TValue extends LazyValue<string, Wrapper<TId>>
>(id: TId, value: TValue) {
	return {
		id,
		type: symbols.lazy,
		value,
	} as const;
}
