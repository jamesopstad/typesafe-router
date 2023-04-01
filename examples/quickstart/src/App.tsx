import { routes } from './routes';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';

const router = createBrowserRouter(routes);

export function App() {
	return <RouterProvider router={router} />;
}

if (import.meta.hot) {
	import.meta.hot.dispose(() => router.dispose());
}
