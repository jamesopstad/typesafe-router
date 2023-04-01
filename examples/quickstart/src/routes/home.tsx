import { createLoader } from '../utils';

export const indexLoader = createLoader('/_index', ({ redirect }) => {
	return redirect(':id', { params: { id: '123' } });
});
