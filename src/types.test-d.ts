import { describe, it, expectTypeOf } from 'vitest';
import type {
	NormalizePath,
	SetIdSegment,
	TransformRoutes,
	SetParams,
	ConvertOptionalPathSegments,
	FlattenRoutes,
	ExtractRoutes,
	DescendantPaths,
	AncestorPaths,
	AbsolutePaths,
	PathParams,
} from './types';

type TestRoutes = [
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
						path: ':2-1';
					}
				];
			}
		];
	},
	{
		path: '3?/3-1';
	}
];

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
	type TransformedRoutes = TransformRoutes<TestRoutes>;

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
									id: '/2/:2-1';
									path: ':2-1';
								}
							];
						}
					];
				},
				{
					id: '/3?/3-1';
					path: '3?/3-1';
				}
			]
		>();
	});
});

describe('SetParams', () => {
	it('returns the correct type for paths with no params', () => {
		expectTypeOf<SetParams<'one/two/three'>>().toEqualTypeOf<{}>();
	});

	it('returns the correct type for paths with catch-all segments', () => {
		expectTypeOf<SetParams<'*'>>().toEqualTypeOf<{ '*': string }>();

		expectTypeOf<SetParams<'one/two/*'>>().toEqualTypeOf<{ '*': string }>();

		expectTypeOf<SetParams<'one/:two/*'>>().toEqualTypeOf<{
			two: string;
			'*': string;
		}>();

		expectTypeOf<SetParams<':one?/:two/*'>>().toEqualTypeOf<{
			one?: string;
			two: string;
			'*': string;
		}>();
	});

	it('returns the correct type for paths with dynamic segments', () => {
		expectTypeOf<SetParams<':one/two/three'>>().toEqualTypeOf<{
			one: string;
		}>();

		expectTypeOf<SetParams<'one/:two/three'>>().toEqualTypeOf<{
			two: string;
		}>();

		expectTypeOf<SetParams<'one/two/:three'>>().toEqualTypeOf<{
			three: string;
		}>();

		expectTypeOf<SetParams<':one/:two/three'>>().toEqualTypeOf<{
			one: string;
			two: string;
		}>();

		expectTypeOf<SetParams<':one/two/:three'>>().toEqualTypeOf<{
			one: string;
			three: string;
		}>();

		expectTypeOf<SetParams<'one/:two/:three'>>().toEqualTypeOf<{
			two: string;
			three: string;
		}>();
	});

	it('returns the correct type for paths with optional segments', () => {
		expectTypeOf<SetParams<':one?/two/three'>>().toEqualTypeOf<{
			one?: string;
		}>();

		expectTypeOf<SetParams<'one/:two?/three'>>().toEqualTypeOf<{
			two?: string;
		}>();

		expectTypeOf<SetParams<'one/two/:three?'>>().toEqualTypeOf<{
			three?: string;
		}>();

		expectTypeOf<SetParams<':one?/:two?/three'>>().toEqualTypeOf<{
			one?: string;
			two?: string;
		}>();

		expectTypeOf<SetParams<':one?/two/:three?'>>().toEqualTypeOf<{
			one?: string;
			three?: string;
		}>();

		expectTypeOf<SetParams<'one/:two?/:three?'>>().toEqualTypeOf<{
			two?: string;
			three?: string;
		}>();
	});

	it('returns the correct type for paths with dynamic and optional segments', () => {
		expectTypeOf<SetParams<':one/:two?/three'>>().toEqualTypeOf<{
			one: string;
			two?: string;
		}>();

		expectTypeOf<SetParams<':one?/two/:three'>>().toEqualTypeOf<{
			one?: string;
			three: string;
		}>();

		expectTypeOf<SetParams<'one/:two/:three?'>>().toEqualTypeOf<{
			two: string;
			three?: string;
		}>();
	});
});

describe('ConvertOptionalPathSegments', () => {
	it('returns the original path if the path contains no optional segments', () => {
		expectTypeOf<
			ConvertOptionalPathSegments<'one/two/three'>
		>().toEqualTypeOf<'one/two/three'>();
	});

	it('returns the correct union for paths with optional segments', () => {
		expectTypeOf<ConvertOptionalPathSegments<'one?/two/three'>>().toEqualTypeOf<
			'one/two/three' | 'two/three'
		>();

		expectTypeOf<ConvertOptionalPathSegments<'one/two?/three'>>().toEqualTypeOf<
			'one/two/three' | 'one/three'
		>();

		expectTypeOf<ConvertOptionalPathSegments<'one/two/three?'>>().toEqualTypeOf<
			'one/two/three' | 'one/two'
		>();

		expectTypeOf<
			ConvertOptionalPathSegments<'one?/two?/three'>
		>().toEqualTypeOf<'one/two/three' | 'one/three' | 'two/three' | 'three'>();

		expectTypeOf<
			ConvertOptionalPathSegments<'one?/two/three?'>
		>().toEqualTypeOf<'one/two/three' | 'one/two' | 'two/three' | 'two'>();

		expectTypeOf<
			ConvertOptionalPathSegments<'one/two?/three?'>
		>().toEqualTypeOf<'one/two/three' | 'one/two' | 'one/three' | 'one'>();

		expectTypeOf<
			ConvertOptionalPathSegments<'one?/two?/three?'>
		>().toEqualTypeOf<
			| 'one/two/three'
			| 'one/two'
			| 'one/three'
			| 'two/three'
			| 'one'
			| 'two'
			| 'three'
			| ''
		>();
	});
});

describe('Paths', () => {
	type TransformedRoutes = TransformRoutes<TestRoutes>;
	type Routes = FlattenRoutes<TransformedRoutes>;

	it('returns the correct descendant paths', () => {
		type Route = ExtractRoutes<Routes, '/'>;

		expectTypeOf<DescendantPaths<Routes, Route>>().toEqualTypeOf<
			'1' | '1/1-1' | '1/1-1/1-1-1' | '1/1-2' | '2' | '2/:2-1'
		>();
	});

	it('returns the correct ancestor paths', () => {
		type Route = ExtractRoutes<Routes, '/1/1-1/1-1-1'>;

		expectTypeOf<AncestorPaths<Routes, Route>>().toEqualTypeOf<
			| '..'
			| '../1-1-1'
			| '../..'
			| '../../1-1'
			| '../../1-1/1-1-1'
			| '../../1-2'
			| '../../..'
			| '../../../1'
			| '../../../1/1-1'
			| '../../../1/1-1/1-1-1'
			| '../../../1/1-2'
			| '../../../2'
			| '../../../2/:2-1'
		>();
	});

	it('returns the correct absolute paths', () => {
		expectTypeOf<AbsolutePaths<Routes>>().toEqualTypeOf<
			| '/'
			| '/1'
			| '/1/1-1'
			| '/1/1-1/1-1-1'
			| '/1/1-2'
			| '/2'
			| '/2/:2-1'
			| '/3/3-1'
			| '/3-1'
		>();
	});
});

describe('PathParams', () => {
	it('returns never for paths with no params', () => {
		expectTypeOf<PathParams<'one/two/three'>>().toEqualTypeOf<never>();
	});

	it('returns the correct type for paths with catch-all segments', () => {
		expectTypeOf<PathParams<'*'>>().toEqualTypeOf<'*'>();

		expectTypeOf<PathParams<'one/two/*'>>().toEqualTypeOf<'*'>();

		expectTypeOf<PathParams<'one/:two/*'>>().toEqualTypeOf<'two' | '*'>();
	});

	it('returns the correct type for paths with dynamic segments', () => {
		expectTypeOf<PathParams<':one/two/three'>>().toEqualTypeOf<'one'>();

		expectTypeOf<PathParams<'one/:two/three'>>().toEqualTypeOf<'two'>();

		expectTypeOf<PathParams<'one/two/:three'>>().toEqualTypeOf<'three'>();

		expectTypeOf<PathParams<':one/:two/three'>>().toEqualTypeOf<
			'one' | 'two'
		>();

		expectTypeOf<PathParams<':one/two/:three'>>().toEqualTypeOf<
			'one' | 'three'
		>();

		expectTypeOf<PathParams<'one/:two/:three'>>().toEqualTypeOf<
			'two' | 'three'
		>();
	});
});
