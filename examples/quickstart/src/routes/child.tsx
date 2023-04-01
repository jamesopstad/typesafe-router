import { createAction, createComponent } from '../utils';

export const childAction = createAction('/:id', async ({ request }) => {
	const formData = await request.formData();
	const q = formData.get('q');

	if (typeof q !== 'string') return '';

	return q;
});

export const Child = createComponent(
	'/:id',
	({ Form, useActionData, useParams }) =>
		() => {
			const params = useParams();
			const actionData = useActionData();

			return (
				<>
					<h2>Child route</h2>
					<p>The ID param is: {params.id}</p>
					<p>The action data is: {actionData}</p>
					<Form>
						<input />
						<button type="submit">Submit</button>
					</Form>
				</>
			);
		}
);
