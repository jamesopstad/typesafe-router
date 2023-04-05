import type { DataConfig, RouteConfig } from './routes';
import {
	Form,
	Link,
	redirect,
	useActionData,
	useLoaderData,
	useParams,
} from 'react-router-dom';
import { initDataCreators, initRenderCreators } from 'typesafe-router';

// initialise the data creators by passing in the RouteConfig type and adding the React Router utils that will be used in your actions and loaders
export const { createAction, createLoader } =
	initDataCreators<RouteConfig>().addUtils({
		redirect,
	});

// initialise the render creators by passing in the DataConfig type and adding the React Router utils that will be used in your components and error boundaries
export const { createComponent, createErrorBoundary } =
	initRenderCreators<DataConfig>().addUtils({
		Form,
		Link,
		useActionData,
		useLoaderData,
		useParams,
	});
