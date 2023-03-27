import * as symbols from './symbols';
import type {
	RouteInput,
	NormalizeRoutes,
	Route,
	FlattenRoutes,
	ActionFunctionArgs,
	LoaderFunctionArgs,
	ComponentFunctionArgs,
	Config,
} from './types';
import { enhanceUtils } from './utils';
import {
	Wrapper,
	ActionWrapper,
	LoaderWrapper,
	ComponentWrapper,
	ErrorBoundaryWrapper,
	LazyValue,
	RouteProps,
	LazyOrStatic,
	UnwrapLazyOrStatic,
} from './wrappers';
import type {
	ActionFunction, // ActionFunctionArgs,
	LoaderFunction,
	RouteObject,
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

export const initRouter = {
	addUtils<TUtils extends Config['utils']>(utils: TUtils) {
		return addRoutes(utils);
	},
};

function addRoutes<TUtils extends Config['utils']>(utils: TUtils) {
	return {
		addRoutes<TRoutes extends readonly RouteInput[]>(routes: TRoutes) {
			interface TConfig {
				routes: Extract<
					FlattenRoutes<NormalizeRoutes<TRoutes>>,
					{ id: string; params: {} }
				>;
				utils: TUtils;
				loaders: never;
				actions: never;
			}

			type TIds = TConfig['routes']['id'];

			const enhancedUtils = enhanceUtils(utils);

			return {
				createAction<
					TId extends TIds,
					TReturn extends ReturnType<ActionFunction>
				>(
					id: TId,
					action: (args: ActionFunctionArgs<TConfig, TId>) => TReturn
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
					TReturn extends ReturnType<LoaderFunction>
				>(
					id: TId,
					loader: (args: LoaderFunctionArgs<TConfig, TId>) => TReturn
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
				initialConfig: setInitialConfig<TConfig>(normalizeRoutes(routes), {
					utils: enhancedUtils,
					actions: {},
					loaders: {},
				}),
			};
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

function toObject<TType extends RouteProps>(
	type: TType,
	items: LazyOrStatic<TType>[]
) {
	const output: any = {};

	for (const item of items) {
		if (![symbols[type], symbols.lazy].includes(item.type)) {
			throw Error(`${item} is not a valid ${type} or lazy ${type}`);
		}

		if (output[item.id]) {
			throw Error(`Multiple ${type} entries found for route '${item.id}`);
		}

		output[item.id] = item;
	}

	return output;
}

interface InitialConfig {
	actions: Record<string, LazyOrStatic<'action'>>;
	loaders: Record<string, LazyOrStatic<'loader'>>;
	utils: {};
}

function setInitialConfig<TConfig extends Config, TOmit extends string = never>(
	routes: Route[],
	config: InitialConfig
) {
	type TIds = TConfig['routes']['id'];

	const output = {
		addActions<TActions extends LazyOrStatic<'action', TIds>[]>(
			...actions: TActions
		) {
			return setInitialConfig<
				Omit<TConfig, 'actions'> & {
					actions: {
						[K in keyof TActions]: UnwrapLazyOrStatic<
							TActions[K],
							ActionWrapper
						>;
					}[number];
				},
				TOmit | 'addActions'
			>(routes, {
				...config,
				actions: toObject('action', actions),
			});
		},
		addLoaders<TLoaders extends LazyOrStatic<'loader', TIds>[]>(
			...loaders: TLoaders
		) {
			return setInitialConfig<
				Omit<TConfig, 'loaders'> & {
					loaders: {
						[K in keyof TLoaders]: UnwrapLazyOrStatic<
							TLoaders[K],
							LoaderWrapper
						>;
					}[number];
				},
				TOmit | 'addLoaders'
			>(routes, {
				...config,
				loaders: toObject('loader', loaders),
			});
		},
		createComponent<TId extends TIds>(
			id: TId,
			component: (
				args: ComponentFunctionArgs<TConfig, TId>
			) => React.ComponentType | null
		) {
			return {
				type: symbols.Component,
				id,
				value: component(config.utils as any),
			} as const;
		},
		createErrorBoundary<TId extends TIds>(
			id: TId,
			errorBoundary: () => React.ComponentType | null
		) {
			return {
				type: symbols.ErrorBoundary,
				id,
				value: errorBoundary(),
			} as const;
		},
		config: setFinalConfig<TConfig>(routes, {
			...config,
			components: {},
			errorBoundaries: {},
		}),
	};

	return output as Omit<typeof output, TOmit>;
}

interface FinalConfig extends InitialConfig {
	components: Record<string, LazyOrStatic<'Component'>>;
	errorBoundaries: Record<string, LazyOrStatic<'ErrorBoundary'>>;
}

function toRoutes(routes: readonly Route[], config: FinalConfig) {
	const map = {
		action: config.actions,
		loader: config.loaders,
		Component: config.components,
		ErrorBoundary: config.errorBoundaries,
	} as const;

	return routes.map((route): unknown => {
		const eager: Partial<Record<RouteProps, unknown>> = {};
		const lazy: Partial<Record<RouteProps, LazyValue>> = {};

		for (const prop of [
			'action',
			'loader',
			'Component',
			'ErrorBoundary',
		] as const) {
			const item = map[prop][route.id];

			if (!item) continue;

			if (item.type === symbols.lazy) {
				lazy[prop] = item.value;
			} else {
				eager[prop] = item.value;
			}
		}

		return {
			...route,
			...eager,
			async lazy() {
				const modules = await Promise.all(
					Object.values(lazy).map((value) => value())
				);

				return Object.keys(lazy).reduce((acc, curr, i) => {
					acc[curr] = modules[i]![curr]?.value;

					return acc;
				}, {} as any);
			},
			children: route.children && toRoutes(route.children, config),
		};
	}) as RouteObject[];
}

function setFinalConfig<TConfig extends Config, TOmit extends string = never>(
	routes: Route[],
	config: FinalConfig
) {
	type TIds = TConfig['routes']['id'];

	const output = {
		addComponents<TComponents extends LazyOrStatic<'Component', TIds>[]>(
			...components: TComponents
		) {
			return setFinalConfig<TConfig, TOmit | 'addComponents'>(routes, {
				...config,
				components: toObject('Component', components),
			});
		},
		addErrorBoundaries<
			TErrorBoundaries extends LazyOrStatic<'ErrorBoundary', TIds>[]
		>(...errorBoundaries: TErrorBoundaries) {
			return setFinalConfig<TConfig, TOmit | 'addErrorBoundaries'>(routes, {
				...config,
				errorBoundaries: toObject('ErrorBoundary', errorBoundaries),
			});
		},
		toRoutes() {
			return toRoutes(routes, config);
		},
	};

	return output as Omit<typeof output, TOmit>;
}
