import { createRouteConfig, initDataCreators, initRenderCreators } from '..';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
	Link,
	NavLink,
	Navigate,
	Outlet,
	RouterProvider,
	createMemoryRouter,
	redirect,
	useLoaderData,
	useParams,
	useRouteLoaderData,
} from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';

function renderRouter(routes: RouteObject[], path = '/') {
	const router = createMemoryRouter(routes, { initialEntries: [path] });

	return {
		rendered: render(<RouterProvider router={router} />),
		user: userEvent.setup(),
	};
}

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
		path: 'one',
	},
	{
		path: 'two/:param',
	},
	{
		path: '*',
	},
] as const);

type RouteConfig = typeof routeConfig;

describe('Basic', () => {
	it('renders a component', () => {
		const dataConfig = routeConfig;
		type DataConfig = typeof dataConfig;

		const { createComponent } = initRenderCreators<DataConfig>().addUtils({});

		const Component = createComponent('/', () => () => {
			return <h1>Component</h1>;
		});

		const routes = dataConfig.addComponents(Component).toRoutes();

		const { rendered } = renderRouter(routes);

		expect(rendered.getByRole('heading').textContent).toBe('Component');
	});
});

describe('params', () => {
	it('returns the correct params', () => {
		const { createLoader } = initDataCreators<RouteConfig>().addUtils({});

		const mock = vi.fn();

		const loader = createLoader('/two/:param', ({ params }) => {
			expectTypeOf(params).toEqualTypeOf<{ param: string }>();

			mock(params);

			return null;
		});

		const dataConfig = routeConfig.addLoaders(loader);

		const routes = dataConfig.toRoutes();

		renderRouter(routes, '/two/123');

		expect(mock).toHaveBeenCalledWith({ param: '123' });
	});
});

describe('redirect', () => {
	it('navigates to a static route', async () => {
		const { createLoader } = initDataCreators<RouteConfig>().addUtils({
			redirect,
		});

		const loader = createLoader('/', ({ redirect }) => {
			return redirect('/one');
		});

		const dataConfig = routeConfig.addLoaders(loader);
		type DataConfig = typeof dataConfig;

		const { createComponent } = initRenderCreators<DataConfig>().addUtils({});

		const End = createComponent('/one', () => () => {
			return <h1>End</h1>;
		});

		const routes = dataConfig.addComponents(End).toRoutes();

		const { rendered } = renderRouter(routes);

		expect((await rendered.findByRole('heading')).textContent).toBe('End');
	});

	it('navigates to a dynamic route', async () => {
		const { createLoader } = initDataCreators<RouteConfig>().addUtils({
			redirect,
		});

		const loader = createLoader('/', ({ redirect }) => {
			return redirect('/two/:param', { params: { param: '123' } });
		});

		const dataConfig = routeConfig.addLoaders(loader);
		type DataConfig = typeof dataConfig;

		const { createComponent } = initRenderCreators<DataConfig>().addUtils({
			useParams,
		});

		const End = createComponent('/two/:param', ({ useParams }) => () => {
			const params = useParams();

			return <h1>{params.param}</h1>;
		});

		const routes = dataConfig.addComponents(End).toRoutes();

		const { rendered } = renderRouter(routes);

		expect((await rendered.findByRole('heading')).textContent).toBe('123');
	});
});

describe('Link', () => {
	it('navigates to a static route', async () => {
		const dataConfig = routeConfig;
		type DataConfig = typeof dataConfig;

		const { createComponent } = initRenderCreators<DataConfig>().addUtils({
			Link,
		});

		const Start = createComponent('/', ({ Link }) => () => {
			return <Link to="/one">Link</Link>;
		});

		const End = createComponent('/one', () => () => {
			return <h1>End</h1>;
		});

		const routes = dataConfig.addComponents(Start, End).toRoutes();

		const { rendered, user } = renderRouter(routes);

		await user.click(rendered.getByRole('link'));

		expect(rendered.getByRole('heading').textContent).toBe('End');
	});

	it('navigates to a dynamic route', async () => {
		const dataConfig = routeConfig;
		type DataConfig = typeof dataConfig;

		const { createComponent } = initRenderCreators<DataConfig>().addUtils({
			Link,
			useParams,
		});

		const Start = createComponent('/', ({ Link }) => () => {
			return (
				<Link to="/two/:param" params={{ param: '123' }}>
					Link
				</Link>
			);
		});

		const End = createComponent('/two/:param', ({ useParams }) => () => {
			const params = useParams();

			return <h1>{params.param}</h1>;
		});

		const routes = dataConfig.addComponents(Start, End).toRoutes();

		const { rendered, user } = renderRouter(routes);

		await user.click(rendered.getByRole('link'));

		expect(rendered.getByRole('heading').textContent).toBe('123');
	});
});

describe('Navigate', () => {
	it('navigates to a static route', () => {
		const dataConfig = routeConfig;
		type DataConfig = typeof dataConfig;

		const { createComponent } = initRenderCreators<DataConfig>().addUtils({
			Navigate,
		});

		const Start = createComponent('/', ({ Navigate }) => () => {
			return <Navigate to="/one" />;
		});

		const End = createComponent('/one', () => () => {
			return <h1>End</h1>;
		});

		const routes = dataConfig.addComponents(Start, End).toRoutes();

		const { rendered } = renderRouter(routes);

		expect(rendered.getByRole('heading').textContent).toBe('End');
	});

	it('navigates to a dynamic route', () => {
		const dataConfig = routeConfig;
		type DataConfig = typeof dataConfig;

		const { createComponent } = initRenderCreators<DataConfig>().addUtils({
			Navigate,
			useParams,
		});

		const Start = createComponent('/', ({ Navigate }) => () => {
			return <Navigate to="/two/:param" params={{ param: '123' }} />;
		});

		const End = createComponent('/two/:param', ({ useParams }) => () => {
			const params = useParams();

			return <h1>{params.param}</h1>;
		});

		const routes = dataConfig.addComponents(Start, End).toRoutes();

		const { rendered } = renderRouter(routes);

		expect(rendered.getByRole('heading').textContent).toBe('123');
	});
});

describe('NavLink', () => {
	it('navigates to a static route', async () => {
		const dataConfig = routeConfig;
		type DataConfig = typeof dataConfig;

		const { createComponent } = initRenderCreators<DataConfig>().addUtils({
			NavLink,
		});

		const Start = createComponent('/', ({ NavLink }) => () => {
			return <NavLink to="/one">Link</NavLink>;
		});

		const End = createComponent('/one', () => () => {
			return <h1>End</h1>;
		});

		const routes = dataConfig.addComponents(Start, End).toRoutes();

		const { rendered, user } = renderRouter(routes);

		await user.click(rendered.getByRole('link'));

		expect(rendered.getByRole('heading').textContent).toBe('End');
	});

	it('navigates to a dynamic route', async () => {
		const dataConfig = routeConfig;
		type DataConfig = typeof dataConfig;

		const { createComponent } = initRenderCreators<DataConfig>().addUtils({
			NavLink,
			useParams,
		});

		const Start = createComponent('/', ({ NavLink }) => () => {
			return (
				<NavLink to="/two/:param" params={{ param: '123' }}>
					Link
				</NavLink>
			);
		});

		const End = createComponent('/two/:param', ({ useParams }) => () => {
			const params = useParams();

			return <h1>{params.param}</h1>;
		});

		const routes = dataConfig.addComponents(Start, End).toRoutes();

		const { rendered, user } = renderRouter(routes);

		await user.click(rendered.getByRole('link'));

		expect(rendered.getByRole('heading').textContent).toBe('123');
	});
});

describe('useLoaderData', () => {
	it('returns the correct loader data', async () => {
		const { createLoader } = initDataCreators<RouteConfig>().addUtils({});

		const loader = createLoader('/', () => {
			return 'loader data' as const;
		});

		const dataConfig = routeConfig.addLoaders(loader);
		type DataConfig = typeof dataConfig;

		const { createComponent } = initRenderCreators<DataConfig>().addUtils({
			useLoaderData,
		});

		const Component = createComponent('/', ({ useLoaderData }) => () => {
			const loaderData = useLoaderData();

			expectTypeOf(loaderData).toEqualTypeOf<'loader data'>();

			return <h1>{loaderData}</h1>;
		});

		const routes = dataConfig.addComponents(Component).toRoutes();

		const { rendered } = renderRouter(routes);

		expect((await rendered.findByRole('heading')).textContent).toBe(
			'loader data'
		);
	});
});

describe('useRouteLoaderData', () => {
	it('returns the correct loader data from a parent route', async () => {
		const { createLoader } = initDataCreators<RouteConfig>().addUtils({});

		const loader = createLoader('/', () => {
			return 'loader data' as const;
		});

		const dataConfig = routeConfig.addLoaders(loader);
		type DataConfig = typeof dataConfig;

		const { createComponent } = initRenderCreators<DataConfig>().addUtils({
			useRouteLoaderData,
		});

		const Parent = createComponent('/', () => () => {
			return <Outlet />;
		});

		const Child = createComponent('/child', ({ useRouteLoaderData }) => () => {
			const loaderData = useRouteLoaderData('/');

			expectTypeOf(loaderData).toEqualTypeOf<'loader data'>();

			return <h1>{loaderData}</h1>;
		});

		const routes = dataConfig.addComponents(Parent, Child).toRoutes();

		const { rendered } = renderRouter(routes, '/child');

		expect((await rendered.findByRole('heading')).textContent).toBe(
			'loader data'
		);
	});

	it('returns the correct loader data from a child route', async () => {
		const { createLoader } = initDataCreators<RouteConfig>().addUtils({});

		const loader = createLoader('/child', () => {
			return 'loader data' as const;
		});

		const dataConfig = routeConfig.addLoaders(loader);
		type DataConfig = typeof dataConfig;

		const { createComponent } = initRenderCreators<DataConfig>().addUtils({
			useRouteLoaderData,
		});

		const Parent = createComponent('/', ({ useRouteLoaderData }) => () => {
			const loaderData = useRouteLoaderData('/child');

			expectTypeOf(loaderData).toEqualTypeOf<'loader data' | undefined>();

			return (
				<>
					<h1>{loaderData}</h1>
					<Outlet />
				</>
			);
		});

		const Child = createComponent('/child', () => () => {
			return null;
		});

		const routes = dataConfig.addComponents(Parent, Child).toRoutes();

		const { rendered } = renderRouter(routes, '/child');

		expect((await rendered.findByRole('heading')).textContent).toBe(
			'loader data'
		);
	});
});

describe('useParams', () => {
	it('returns the correct params for splat routes', () => {
		const dataConfig = routeConfig;
		type DataConfig = typeof dataConfig;

		const { createComponent } = initRenderCreators<DataConfig>().addUtils({
			useParams,
		});

		const mock = vi.fn();

		const Component = createComponent('/*', ({ useParams }) => () => {
			const params = useParams();

			expectTypeOf(params).toEqualTypeOf<{ '*': string }>();

			mock(params);

			return null;
		});

		const routes = dataConfig.addComponents(Component).toRoutes();

		renderRouter(routes, '/123');

		expect(mock).toHaveBeenCalledWith({ '*': '123' });
	});

	it('returns the correct params for dynamic routes', () => {
		const dataConfig = routeConfig;
		type DataConfig = typeof dataConfig;

		const { createComponent } = initRenderCreators<DataConfig>().addUtils({
			useParams,
		});

		const mock = vi.fn();

		const Component = createComponent('/two/:param', ({ useParams }) => () => {
			const params = useParams();

			expectTypeOf(params).toEqualTypeOf<{ param: string }>();

			mock(params);

			return null;
		});

		const routes = dataConfig.addComponents(Component).toRoutes();

		renderRouter(routes, '/two/123');

		expect(mock).toHaveBeenCalledWith({ param: '123' });
	});
});
