import type * as React from 'react';
import type { LoaderFunction, ActionFunction } from 'react-router-dom';
import type { Prettify } from './utils';

interface BaseRouteObject {
	id?: string;
}

interface IndexRouteObject extends BaseRouteObject {
	index: true;
	children?: undefined;
}

interface NonIndexRouteObject extends BaseRouteObject {
	path?: string;
	index?: false;
	children?: readonly RouteObject[];
}

export type RouteObject = IndexRouteObject | NonIndexRouteObject;

interface NormalizedIndexRouteObject extends IndexRouteObject {
	id: string;
}

interface NormalizedNonIndexRouteObject extends NonIndexRouteObject {
	id: string;
	children?: readonly NormalizedRouteObject[];
}

export type NormalizedRouteObject =
	| NormalizedIndexRouteObject
	| NormalizedNonIndexRouteObject;

export interface AnyRouteObject {
	path?: string;
	id?: string;
	index?: boolean;
	children?: AnyRouteObject[];
}

type RemoveLeadingSlashes<TPath extends string> =
	TPath extends `/${infer TRest}` ? RemoveLeadingSlashes<TRest> : TPath;

type RemoveTrailingSlashes<TPath extends string> =
	TPath extends `${infer TRest}/` ? RemoveTrailingSlashes<TRest> : TPath;

export type NormalizePath<TRoute extends RouteObject> = Omit<TRoute, 'path'> &
	(TRoute extends { path: infer TPath extends string }
		? { path: RemoveTrailingSlashes<RemoveLeadingSlashes<TPath>> }
		: {});

export type SetIdSegment<TRoute extends RouteObject> = TRoute extends {
	path: infer TPath extends string;
}
	? TPath
	: TRoute extends { index: true }
	? '_index'
	: '_';

type SetId<
	TRoute extends RouteObject,
	TParentRoute extends RouteObject
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

type _TransformRoutes<TRoute extends RouteObject> = Omit<TRoute, 'children'> &
	(TRoute extends { children: infer TChildren extends readonly RouteObject[] }
		? { readonly children: TransformRoutes<TChildren, TRoute> }
		: {});

export type TransformRoutes<
	TRoutes extends readonly RouteObject[],
	TParentRoute extends RouteObject = {}
> = {
	[K in keyof TRoutes]: _TransformRoutes<
		SetId<NormalizePath<TRoutes[K]>, TParentRoute>
	>;
};
