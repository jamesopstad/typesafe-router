import { describe, it, expectTypeOf } from 'vitest';
import type { NormalizePath, SetIdSegment, TransformRoutes } from './types';

describe('NormalizePath', () => {
	it('removes leading slashes', () => {
		expectTypeOf<NormalizePath<{ path: '///path' }>>()
			.toHaveProperty('path')
			.toEqualTypeOf<'path'>();
	});

	it('removes trailing slashes', () => {
		expectTypeOf<NormalizePath<{ path: 'path///' }>>()
			.toHaveProperty('path')
			.toEqualTypeOf<'path'>();
	});

	it('leaves intermediary slashes', () => {
		expectTypeOf<NormalizePath<{ path: 'segment1/segment2' }>>()
			.toHaveProperty('path')
			.toEqualTypeOf<'segment1/segment2'>();
	});
});

describe('SetIdSegment', () => {
	it('returns the path if the path is a string', () => {
		expectTypeOf<SetIdSegment<{ path: 'path' }>>().toEqualTypeOf<'path'>();
	});

	it('returns `_index` if the route is an index route', () => {
		expectTypeOf<SetIdSegment<{ index: true }>>().toEqualTypeOf<'_index'>();
	});

	it('returns `_` if the route is a non-index pathless route', () => {
		expectTypeOf<SetIdSegment<{}>>().toEqualTypeOf<'_'>();
	});
});

describe('TransformRoutes', () => {
	type TransformedRoutes = TransformRoutes<
		[
			{
				path: '/';
				children: [
					{
						path: '1';
						children: [
							{
								path: '1-1';
								children: [
									{
										path: '1-1-1';
									}
								];
							},
							{
								path: '1-2';
							}
						];
					},
					{
						path: '2';
						children: [
							{
								path: '2-1';
							}
						];
					}
				];
			},
			{
				path: '3/3-1';
			}
		]
	>;

	it('correctly transforms paths and ids', () => {
		expectTypeOf<TransformedRoutes>().toEqualTypeOf<
			[
				{
					id: '/';
					path: '';
					children: [
						{
							id: '/1';
							path: '1';
							children: [
								{
									id: '/1/1-1';
									path: '1-1';
									children: [
										{
											id: '/1/1-1/1-1-1';
											path: '1-1-1';
										}
									];
								},
								{
									id: '/1/1-2';
									path: '1-2';
								}
							];
						},
						{
							id: '/2';
							path: '2';
							children: [
								{
									id: '/2/2-1';
									path: '2-1';
								}
							];
						}
					];
				},
				{
					id: '/3/3-1';
					path: '3/3-1';
				}
			]
		>();
	});
});
