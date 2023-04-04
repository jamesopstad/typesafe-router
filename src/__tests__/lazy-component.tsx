import { initRenderCreators } from '..';
import type { RouteConfig as DataConfig } from './integration.test';

const { createComponent } = initRenderCreators<DataConfig>().addUtils({});

export const Component = createComponent('/', () => () => {
	return <h1>Component</h1>;
});
