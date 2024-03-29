import type {
	AbsolutePaths,
	AncestorParams,
	AncestorPaths,
	ConvertOptionalPathSegments,
	DescendantParams,
	DescendantPaths,
	ExtractById,
	FlattenRoutes,
	NormalizePath,
	NormalizeRoutes,
	Params,
	PathParams,
	Paths,
	SetIdSegment,
	SetParams,
} from '../types';

type TestRoutes = [
	{
		path: '/';
		children: [
			{
				path: ':1';
				children: [
					{
						children: [
							{
								path: ':1-1';
								children: [
									{
										path: ':1-1-1';
									}
								];
							}
						];
					},
					{
						path: '1-2/:1-2-1?';
					}
				];
			},
			{
				path: '2';
				children: [
					{
						index: true;
					},
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

describe('NormalizeRoutes', () => {
	type NormalizedRoutes = NormalizeRoutes<TestRoutes>;

	it('correctly normalizes paths and ids', () => {
		expectTypeOf<NormalizedRoutes>().toEqualTypeOf<
			[
				{
					id: '/';
					path: '';
					children: [
						{
							id: '/:1';
							path: ':1';
							children: [
								{
									id: '/:1/_';
									children: [
										{
											id: '/:1/_/:1-1';
											path: ':1-1';
											children: [
												{
													id: '/:1/_/:1-1/:1-1-1';
													path: ':1-1-1';
												}
											];
										}
									];
								},
								{
									id: '/:1/1-2/:1-2-1?';
									path: '1-2/:1-2-1?';
								}
							];
						},
						{
							id: '/2';
							path: '2';
							children: [
								{
									id: '/2/_index';
									index: true;
								},
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
	type NormalizedRoutes = NormalizeRoutes<TestRoutes>;
	type Routes = FlattenRoutes<NormalizedRoutes>;
	type AbsolutePathsResult = AbsolutePaths<Routes>;

	it('returns the correct descendant paths', () => {
		type Route = ExtractById<Routes, '/'>;

		expectTypeOf<DescendantPaths<Routes, Route>>().toEqualTypeOf<
			| ':1'
			| ':1/:1-1'
			| ':1/:1-1/:1-1-1'
			| ':1/1-2/:1-2-1'
			| ':1/1-2'
			| '2'
			| '2/:2-1'
		>();
	});

	it('returns the correct ancestor paths', () => {
		type Route = ExtractById<Routes, '/:1/_/:1-1/:1-1-1'>;

		expectTypeOf<AncestorPaths<Routes, Route>>().toEqualTypeOf<
			| '..'
			| '../:1-1-1'
			| '../..'
			| '../../:1-1'
			| '../../:1-1/:1-1-1'
			| '../../1-2'
			| '../../1-2/:1-2-1'
			| '../../..'
			| '../../../:1'
			| '../../../:1/:1-1'
			| '../../../:1/:1-1/:1-1-1'
			| '../../../:1/1-2'
			| '../../../:1/1-2/:1-2-1'
			| '../../../2'
			| '../../../2/:2-1'
		>();
	});

	it('returns the correct absolute paths', () => {
		expectTypeOf<AbsolutePathsResult>().toEqualTypeOf<
			| '/'
			| '/:1'
			| '/:1/:1-1'
			| '/:1/:1-1/:1-1-1'
			| '/:1/1-2'
			| '/:1/1-2/:1-2-1'
			| '/2'
			| '/2/:2-1'
			| '/3/3-1'
			| '/3-1'
		>();
	});

	it('returns the correct combined paths', () => {
		type Route = ExtractById<Routes, '/:1/_/:1-1'>;

		expectTypeOf<Paths<Routes, Route>>().toEqualTypeOf<
			| AbsolutePathsResult
			| ':1-1-1'
			| '..'
			| '../:1-1'
			| '../:1-1/:1-1-1'
			| '../1-2'
			| '../1-2/:1-2-1'
			| '../..'
			| '../../:1'
			| '../../:1/:1-1'
			| '../../:1/:1-1/:1-1-1'
			| '../../:1/1-2'
			| '../../:1/1-2/:1-2-1'
			| '../../2'
			| '../../2/:2-1'
		>();
	});

	it('returns the correct combined paths for index routes', () => {
		type Route = ExtractById<Routes, '/2/_index'>;

		expectTypeOf<Paths<Routes, Route>>().toEqualTypeOf<
			| AbsolutePathsResult
			| ':2-1'
			| '..'
			| '../:1'
			| '../:1/:1-1'
			| '../:1/:1-1/:1-1-1'
			| '../:1/1-2'
			| '../:1/1-2/:1-2-1'
			| '../2'
			| '../2/:2-1'
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

describe('Params', () => {
	type TransformedRoutes = NormalizeRoutes<TestRoutes>;
	type Routes = FlattenRoutes<TransformedRoutes>;

	it('returns the correct current params', () => {
		type Route = ExtractById<Routes, '/:1/_/:1-1/:1-1-1'>;

		expectTypeOf<Route['params']>().toEqualTypeOf<{ '1-1-1': string }>();
	});

	it('returns the correct ancestor params', () => {
		type Route = ExtractById<Routes, '/:1/_/:1-1/:1-1-1'>;

		expectTypeOf<AncestorParams<Routes, Route>>().toEqualTypeOf<{
			'1': string;
			'1-1': string;
		}>();
	});

	it('returns the correct descendant params', () => {
		type Route = ExtractById<Routes, '/'>;

		expectTypeOf<DescendantParams<Routes, Route, {}>>().toEqualTypeOf<
			| {}
			| { '1': string }
			| { '1': string; '1-1': string }
			| { '1': string; '1-1': string; '1-1-1': string }
			| { '1': string; '1-2-1'?: string }
			| { '2-1': string }
		>();
	});

	it('returns the correct combined params', () => {
		type Route = ExtractById<Routes, '/:1/_/:1-1'>;

		expectTypeOf<Params<Routes, Route>>().toEqualTypeOf<
			| { '1': string; '1-1': string }
			| { '1': string; '1-1': string; '1-1-1': string }
		>();
	});
});
