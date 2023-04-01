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

export const { createAction, createLoader } =
	initDataCreators<RouteConfig>().addUtils({
		redirect,
	});

export const { createComponent, createErrorBoundary } =
	initRenderCreators<DataConfig>().addUtils({
		Form,
		Link,
		useActionData,
		useLoaderData,
		useParams,
	});
