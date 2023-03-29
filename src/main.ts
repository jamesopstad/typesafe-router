import * as symbols from './symbols';
import type {
	ActionFunctionArgs,
	ComponentFunctionArgs,
	Config,
	FlattenRoutes,
	LoaderFunctionArgs,
	NormalizeRoutes,
	Route,
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

export function createRouteConfig<TRoutes extends readonly RouteInput[]>(
	routes: TRoutes
): Builder<{
	routes: Extract<
		FlattenRoutes<NormalizeRoutes<TRoutes>>,
		{ id: string; params: {} }
	>;
	actions: never;
	loaders: never;
}> {
	return builder(normalizeRoutes(routes), {
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

type Builder<
	TConfig extends Config,
	TOmit extends string = never,
	TIds extends string = TConfig['routes']['id']
> = Omit<
	{
		addActions<TActions extends EagerOrLazy<'action', TIds>[]>(
			...actions: TActions
		): Builder<
			Omit<TConfig, 'actions'> & {
				actions: {
					[K in keyof TActions]: UnwrapEagerOrLazy<TActions[K], ActionWrapper>;
				}[number];
			},
			TOmit | 'addActions'
		>;
		addLoaders<TLoaders extends EagerOrLazy<'loader', TIds>[]>(
			...loaders: TLoaders
		): Builder<
			Omit<TConfig, 'loaders'> & {
				loaders: {
					[K in keyof TLoaders]: UnwrapEagerOrLazy<TLoaders[K], LoaderWrapper>;
				}[number];
			},
			TOmit | 'addLoaders'
		>;
		addComponents<TComponents extends EagerOrLazy<'Component', TIds>[]>(
			...components: TComponents
		): Builder<TConfig, TOmit | 'addActions' | 'addLoaders' | 'addComponents'>;
		toRoutes(): $.RouteObject[];
	},
	TOmit
>;

function builder(routes: Route[], config: InputDataConfig) {
	return {
		addActions(...actions: EagerOrLazy<'action'>[]) {
			return builder(routes, {
				...config,
				action: toObject('action', actions),
			});
		},
		addLoaders(...loaders: EagerOrLazy<'loader'>[]) {
			return builder(routes, {
				...config,
				loader: toObject('loader', loaders),
			});
		},
		addComponents(...components: EagerOrLazy<'Component'>[]) {
			return builder(routes, {
				...config,
				Component: toObject('Component', components),
			});
		},
		toRoutes() {
			return toRoutes(routes, config);
		},
	};
}

function dataCreators<
	TConfig extends Config,
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

export function initDataCreators<TBuilder extends Builder<Config>>() {
	type TConfig = TBuilder extends Builder<infer T extends Config> ? T : never;

	return {
		addUtils<TUtils extends Partial<InputDataUtils>>(utils: TUtils) {
			return dataCreators<TConfig, TUtils>(utils);
		},
	};
}

function renderCreators<
	TConfig extends Config,
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

export function initRenderCreators<
	TBuilder extends Partial<Builder<Config>>
>() {
	type TConfig = TBuilder extends Partial<Builder<infer T extends Config>>
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
