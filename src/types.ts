import type * as React from 'react';
import type { LoaderFunction, ActionFunction } from 'react-router-dom';
import type { Prettify } from './utils';

interface BaseRouteInput {
	id?: string;
}

interface IndexRouteInput extends BaseRouteInput {
	path?: undefined;
	index: true;
	children?: undefined;
}

interface NonIndexRouteInput extends BaseRouteInput {
	path?: string;
	index?: false;
	children?: readonly RouteInput[];
}

export type RouteInput = IndexRouteInput | NonIndexRouteInput;

export interface Route {
	id: string;
	path?: string;
	index?: boolean;
	children?: readonly Route[];
}

type RemoveLeadingSlashes<TPath extends string> =
	TPath extends `/${infer TRest}` ? RemoveLeadingSlashes<TRest> : TPath;

type RemoveTrailingSlashes<TPath extends string> =
	TPath extends `${infer TRest}/` ? RemoveTrailingSlashes<TRest> : TPath;

export type NormalizePath<TRoute extends RouteInput> = Omit<TRoute, 'path'> &
	(TRoute extends { path: infer TPath extends string }
		? { path: RemoveTrailingSlashes<RemoveLeadingSlashes<TPath>> }
		: {});

export type SetIdSegment<TRoute extends RouteInput> = TRoute extends {
	path: infer TPath extends string;
}
	? TPath
	: TRoute extends { index: true }
	? '_index'
	: '_';

type SetId<
	TRoute extends RouteInput,
	TParentRoute extends RouteInput
> = TRoute &
	(TRoute extends { readonly id: string }
		? {}
		: {
				readonly id: `${TParentRoute extends {
					id: infer TParentId extends string;
				}
					? TParentId extends '/'
						? ''
						: TParentId
					: ''}/${SetIdSegment<TRoute>}`;
		  });

type _TransformRoutes<TRoute extends RouteInput> = Omit<TRoute, 'children'> &
	(TRoute extends { children: infer TChildren extends readonly RouteInput[] }
		? { readonly children: TransformRoutes<TChildren, TRoute> }
		: {});

export type TransformRoutes<
	TRoutes extends readonly RouteInput[],
	TParentRoute extends RouteInput = {}
> = {
	[K in keyof TRoutes]: _TransformRoutes<
		SetId<NormalizePath<TRoutes[K]>, TParentRoute>
	>;
};
