import { createAction, createComponent } from '../utils';

export const childAction = createAction('/:id', async ({ request }) => {
	const formData = await request.formData();
	const q = formData.get('q');

	if (typeof q !== 'string') return '';

	if (q === 'error') {
		throw Error();
	}

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
					<p>
						The ID param is: <strong>{params.id}</strong>
					</p>
					<p>
						The action data is: <strong>{actionData}</strong>
					</p>
					<Form method="post">
						<input name="q" />
						<button type="submit">Submit</button>
					</Form>
					<p>(try submitting 'error' to trigger the error boundary)</p>
				</>
			);
		}
);
