import { createComponent } from '../utils';

export const Component = createComponent('/lazy-route', () => () => {
	return <h2>Lazy-loaded route component</h2>;
});
