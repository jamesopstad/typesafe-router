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
			<p>
				The loader data is: <strong>{loaderData}</strong>
			</p>
			<nav>
				<ul>
					<li>
						<Link to="/">Home</Link>
					</li>
					<li>
						<Link to="lazy-route">Lazy-loaded route component</Link>
					</li>
				</ul>
			</nav>
			<Outlet />
		</>
	);
});

export const RootErrorBoundary = createErrorBoundary('/', ({ Link }) => () => {
	return (
		<>
			<h1>Error boundary</h1>
			<Link to="/">Home</Link>
		</>
	);
});
