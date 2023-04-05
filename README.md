# Typesafe Router

## Intro

A tiny wrapper library for [React Router](https://reactrouter.com/) that dramatically improves type safety.

### Features

- Static types and autocompletion
- Builder API
- Zero dependencies and tiny footprint
- No code generation
- Supports lazy loading

### Caveats

- Pre 1.0 (expect additional features and API changes)
- React Fast Refresh is currently not supported

## Quickstart

Jump right in with a quickstart example:

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/fork/github/jamesopstad/typesafe-router/tree/main/examples/quickstart?file=src/routes.tsx)

## Installation

Requires `react-router-dom` version 6.9 or above

```sh
npm install typesafe-router
```

## Tutorial

Typesafe Router splits your route definitions into 3 sections:

- Path matching fields such as `path`, `index` and `children`
- Data loading/submitting fields such as `loader` and `action`
- Rendering fields such as `Component` and `ErrorBoundary`

This approach unlocks great benefits, both in terms of type safety and lazy-loading.

> These definitions borrow from Matt Brophy's excellent blog post on the new React Router lazy-loading features (https://remix.run/blog/lazy-loading-routes)

### Create the route config, using just the path matching fields, and then export the type

```ts
// routes.ts
import { createRouteConfig } from 'typesafe-router';

const routeConfig = createRouteConfig([
  {
    path: '/',
    children: [
      {
        path: 'child',
      },
    ],
  },
  {
    path: 'another-route',
  },
] as const);

export type RouteConfig = typeof routeConfig;
```

> **NOTE:** Make sure to include `as const` after the array. This requirement will be removed once TypeScript 5 is more widely adopted.

### Initialise the data creator functions and add the React Router utils that will be used in your actions and loaders

```ts
// utils.ts
import { initDataCreators } from 'typesafe-router';
import { redirect } from 'react-router-dom';
import type { RouteConfig } from './routes';

export const { createAction, createLoader } =
  initDataCreators<RouteConfig>().addUtils({ redirect });
```

### Use the exported `createAction` and `createLoader` functions to create your actions and loaders

```ts
// exampleRoute.tsx
import { createAction, createLoader } from './utils';

export const exampleAction = createAction('/', ({ params, redirect }) => {
  return 'a string';
});

export const exampleLoader = createLoader('/', ({ params, redirect }) => {
  return 123;
});
```

> **NOTE:** The first argument is the route ID. Route IDs are automatically generated from your paths, with '\_' segments added for pathless routes and '\_index' segments added for index routes. You can also provide your own IDs in the route config if you prefer.

### Create the data config by adding your actions and loaders to the route config and then export the type

```ts
// routes.ts
/* existing imports */
import { exampleAction, exampleLoader } from './exampleRoute';

/* existing code */

const dataConfig = routeConfig
  .addActions(exampleAction)
  .addLoaders(exampleLoader);

export type DataConfig = typeof dataConfig;
```

### Initialise the render creator functions and add the React Router utils that will be used in your components and error boundaries

```ts
// utils.ts
/* existing imports */
import { initRenderCreators } from 'typesafe-router';
import {
  Link,
  useActionData,
  useLoaderData,
  useParams,
} from 'react-router-dom';
import type { DataConfig } from './routes';

/* existing code */

export const { createComponent, createErrorBoundary } =
  initRenderCreators<DataConfig>().addUtils({
    Link,
    useActionData,
    useLoaderData,
    useParams,
  });
```

### Use the exported `createComponent` and `createErrorBoundary` functions to create your components

```ts
// exampleRoute.tsx
/* existing imports */
import { createComponent, createErrorBoundary } from './utils';

export const exampleComponent = createComponent(
  '/',
  ({ useLoaderData, Link }) =>
    () => {
      const loaderData = useLoaderData();

      return (
        <>
          <p>The data is: {loaderData}</p>
          <Link to="/another-route">Link</Link>
        </>
      );
    }
);

export const exampleErrorBoundary = createErrorBoundary('/', () => () => {
  return <p>Error text</p>;
});
```

### Create the routes by adding the components and error boundaries to the data config and calling `toRoutes()`

```ts
// routes.ts
/* existing imports */
import { exampleComponent, exampleErrorBoundary } from './exampleRoute';

/* existing code */

export const routes = dataConfig
  .addComponents(exampleComponent)
  .addErrorBoundaries(exampleErrorBoundary)
  .toRoutes();
```

### Use the exported routes to create the router

```ts
// main.tsx
import { routes } from './routes';
import { createBrowserRouter } from 'react-router-dom';

const router = createBrowserRouter(routes);
```

## BONUS: adding a lazy-loaded route component

### Create a new file and component

```ts
// another-route.tsx
import { createComponent } from './utils';

export const Component = createComponent('/another-route', () => () => {
  return <h2>Lazy-loaded route component</h2>;
});
```

### Import the `lazy` function and use it to add a dynamic import for the new route component

```ts
// routes.ts
/* existing imports */
import { lazy } from 'typesafe-router';

/* existing code */

export const routes = dataConfig
  .addComponents(
    exampleComponent,
    lazy('/another-route', () => import('./another-route'))
  )
  .addErrorBoundaries(exampleErrorBoundary)
  .toRoutes();
```

> **TIP:** `lazy` can also be used to import loaders, actions and error boundaries. If you are combining lazy and static imports (e.g. a static loader and a lazy component) make sure they are in different files.

## API

### React Router imports

Typesafe Router currently supports the following React Router utils.

- redirect
- Form (initial support)
- Link
- NavLink
- Navigate
- useActionData
- useLoaderData
- useNavigate
- useParams
- useRouteLoaderData
- useSubmit (initial support)
- _more coming soon..._

This guide will highlight any differences from their React Router equivalents.

> **NOTE:** Paths are defined as string literals and the possible relative and absolute values are inferred. If the path includes dynamic segments then these are required and defined in a `params` object. A `searchParams` object and/or `hash` string can also be defined. For components (`<Link>` etc.) these objects are provided as props. For hooks (`useNavigate` etc.) they are provided as properties of the second argument.

#### redirect

The path is inferred (see note above).

#### Link

The path is inferred (see note above)

#### Navigate

The path is inferred (see note above)

#### NavLink

The path is inferred (see note above)

#### useActionData

The return type is inferred from the action function defined on the route.

#### useLoaderData

The return type is inferred from the loader function defined on the route.

#### useNavigate

The path is inferred (see note above).

#### useParams

The params are inferred. The type is the union of all the possible combinations for the current route. Params set higher in the route hierarchy are always available whereas params set lower can be accessed by narrowing the type.

#### useRouteLoaderData

The return type is inferred from the loader function with the given ID. IDs are restricted to routes that have loaders and could be rendered at the same time as the current route. If the loader is lower in the route hierarchy then the return type is a union with undefined.
