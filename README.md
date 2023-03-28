# Typesafe Router

## Intro

A wrapper library for [React Router](https://reactrouter.com/) that dramatically improves type safety.

### Features

- Static type safety and autocompletion
- Builder API
- Zero dependencies and tiny footprint
- No code generation
- Supports lazy loading

## Installation

```sh
npm install typesafe-router
```

## Documentation

Typesafe Router splits your route definitions into 3 sections:

- Path matching fields such as `path`, `index` and `children`
- Data loading/submitting fields such as `loader` and `action`
- Rendering fields such as `Component` and `ErrorBoundary`

This approach unlocks great benefits, both in terms of type safety and lazy-loading.

(These definitions borrow from Matt Brophy's excellent blogpost on the new React Router lazy-loading features).

Let's get started!

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
    path: 'another',
  },
] as const);

export type RouteConfig = typeof routeConfig;
```

### Initialise the data creator functions and provide any React Router utils you intend to use

```ts
// utils.ts
import { redirect } from 'react-router-dom';
import { initDataCreators } from 'typesafe-router';
import type { RouteConfig } from './routes';

export const { createAction, createLoader } =
  initDataCreators<RouteConfig>().addUtils({ redirect });
```

### Use the exported `createAction` and `createLoader` functions to create your actions and loaders

```ts
// exampleRoute.tsx
import { createAction, createLoader } from './utils'

export const exampleAction = createAction('/', ({ params, redirect }) => {
	return 'a string'
}

export const exampleLoader = createLoader('/', ({ params, redirect }) => {
	return 123
})
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

### Initialise the render creator functions and provide any React Router utils you intend to use

```ts
// utils.ts
/* existing imports */
import { initDataCreators } from 'typesafe-router';
import {
  useActionData,
  useLoaderData,
  useParams,
  Link,
} from 'react-router-dom';
import type { DataConfig } from './routes';

/* existing code */

export const { createComponent, createErrorBoundary } =
  initRenderCreators<DataConfig>().addUtils({
    useActionData,
    useLoaderData,
    useParams,
    Link,
  });
```

### Use the exported `createComponent` and `createErrorBoundary` functions to create your components

```ts
// exampleRoute.tsx

/* existing import */
import { createComponent, createErrorBoundary } from './utils';

export const exampleComponent = createComponent(
  '/',
  ({ useLoaderData, Link }) =>
    () => {
      const loaderData = useLoaderData();

      return (
        <>
          <p>The data is: {loaderData}</p>
          <Link to="/another">Link</Link>
        </>
      );
    }
);

export const exampleErrorBoundary = createErrorBoundary('/', () => () => {
	return {
		<p>Error text</p>
	}
})
```

### Create the routes by adding the components and error boundaries to the data config and calling `toRoutes`

```ts
// routes.ts
/* existing imports */
import { exampleComponent, exampleErrorBoundary } from './exampleRoute';

/* existing code */

export const routes = dataConfig
  .addComponents(exampleComponent)
  .addErrorBoundary(exampleErrorBoundary)
  .toRoutes();
```

### Use the exported routes to create the router

```ts
// main.tsx
import { routes } from './routes';
import { createBrowserRouter } from 'react-router-dom';

const router = createBrowserRouter(routes);
```

## API

Typesafe Router currently supports the following React Router utils.

- redirect
- useActionData
- useLoaderData
- useNavigate
- useParams
- useRouteLoaderData
- useSubmit (initial support)
- Form (initial support)
- Link
- NavLink
- Navigate
- _more coming soon..._

This guide will highlight any differences from their React Router equivalents.

> **NOTE:** Paths are defined as string literals and the possible relative and absolute values are inferred. If the path includes dynamic segments then these are required and defined in a `params` object. A `searchParams` object can also be defined. For components (`<Link>`, `<Form>` etc.) these objects are provided as props. For hooks (`useNavigate`, `useSubmit` etc.) they are provided as properties of the second argument.

### redirect

The path is inferred (see note above).

### useActionData

The return type is inferred from the action function defined on the route.

### useLoaderData

The return type is inferred from the loader function defined on the route.

### useNavigate

The path is inferred (see note above).

### useParams

The params are inferred. The type is the union of all the possible combinations for the current route. Params set higher in the route hierarchy are always available whereas params set lower can be accessed by narrowing the type.

### useRouteLoaderData

The return type is inferred from the loader function with the given ID. IDs are restricted to routes that have loaders and could be rendered at the same time as the current route. If the loader is lower in the route hierarchy then the return type is a union with undefined.

### Link

The path is inferred (see note above)

### Navigate

The path is inferred (see note above)

### NavLink

The path is inferred (see note above)
