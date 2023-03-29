import { normalizePath, normalizeRoutes, setIdSegment } from './main';
import { describe, expect, it } from 'vitest';

const testRoutes = [
	{
		path: '/',
		children: [
			{
				path: ':1',
				children: [
					{
						children: [
							{
								path: ':1-1',
								children: [
									{
										path: ':1-1-1',
									},
								],
							},
						],
					},
					{
						path: '1-2/:1-2-1?',
					},
				],
			},
			{
				path: '2',
				children: [
					{
						index: true,
					},
					{
						path: ':2-1',
					},
				],
			},
		],
	},
	{
		path: '3?/3-1',
	},
];

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

describe('normalizeRoutes', () => {
	const normalizedRoutes = normalizeRoutes(testRoutes);

	it('correctly normalizes paths and ids', () => {
		expect(normalizedRoutes).toEqual([
			{
				id: '/',
				path: '',
				children: [
					{
						id: '/:1',
						path: ':1',
						children: [
							{
								id: '/:1/_',
								children: [
									{
										id: '/:1/_/:1-1',
										path: ':1-1',
										children: [
											{
												id: '/:1/_/:1-1/:1-1-1',
												path: ':1-1-1',
											},
										],
									},
								],
							},
							{
								id: '/:1/1-2/:1-2-1?',
								path: '1-2/:1-2-1?',
							},
						],
					},
					{
						id: '/2',
						path: '2',
						children: [
							{
								id: '/2/_index',
								index: true,
							},
							{
								id: '/2/:2-1',
								path: ':2-1',
							},
						],
					},
				],
			},
			{
				id: '/3?/3-1',
				path: '3?/3-1',
			},
		]);
	});
});
