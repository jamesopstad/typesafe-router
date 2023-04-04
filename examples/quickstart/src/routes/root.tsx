import { createComponent, createErrorBoundary, createLoader } from '../utils';
import { Outlet } from 'react-router-dom';

export const rootLoader = createLoader('/', () => {
	return 'some loader data';
});

export const Root = createComponent('/', ({ Link, useLoaderData }) => () => {
	const loaderData = useLoaderData();

	return (
		<>
			<h1>Root component</h1>
			<p>The loader data is: {loaderData}</p>
			<Link to="lazy-route">Link to lazy-loaded route component</Link>
			<Outlet />
		</>
	);
});

export const RootErrorBoundary = createErrorBoundary('/', () => () => {
	return <h1>Error boundary</h1>;
});