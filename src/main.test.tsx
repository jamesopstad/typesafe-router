import { describe, it, expect } from 'vitest';
import { normalizePath, setIdSegment, setId, transformRoutes } from './main';

describe('normalizePath', () => {
	it('removes leading slashes', () => {
		expect(normalizePath({ path: '///path' })).toEqual({ path: 'path' });
	});

	it('removes trailing slashes', () => {
		expect(normalizePath({ path: 'path///' })).toEqual({ path: 'path' });
	});

	it('leaves intermediary slashes', () => {
		expect(normalizePath({ path: 'segment1/segment2' })).toEqual({
			path: 'segment1/segment2',
		});
	});
});

describe('setIdSegment', () => {
	it('returns the path if the path is a string', () => {
		expect(setIdSegment({ path: 'path' })).toBe('path');
	});

	it('returns `_index` if the route is an index route', () => {
		expect(setIdSegment({ index: true })).toBe('_index');
	});

	it('returns `_` if the route is a non-index pathless route', () => {
		expect(setIdSegment({})).toBe('_');
	});
});

describe('transformRoutes', () => {
	const transformedRoutes = transformRoutes([
		{
			path: '/',
			children: [
				{
					path: '1',
					children: [
						{
							path: '1-1',
							children: [
								{
									path: '1-1-1',
								},
							],
						},
						{
							path: '1-2',
						},
					],
				},
				{
					path: '2',
					children: [
						{
							path: '2-1',
						},
					],
				},
			],
		},
		{
			path: '3/3-1',
		},
	]);

	it('correctly transforms paths and ids', () => {
		expect(transformedRoutes).toEqual([
			{
				id: '/',
				path: '',
				children: [
					{
						id: '/1',
						path: '1',
						children: [
							{
								id: '/1/1-1',
								path: '1-1',
								children: [
									{
										id: '/1/1-1/1-1-1',
										path: '1-1-1',
									},
								],
							},
							{
								id: '/1/1-2',
								path: '1-2',
							},
						],
					},
					{
						id: '/2',
						path: '2',
						children: [
							{
								id: '/2/2-1',
								path: '2-1',
							},
						],
					},
				],
			},
			{
				id: '/3/3-1',
				path: '3/3-1',
			},
		]);
	});
});
