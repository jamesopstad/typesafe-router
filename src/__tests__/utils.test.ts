import { createPath } from '../utils';

describe('createPath', () => {
	it('returns the correct string for an empty path', () => {
		expect(createPath('', {})).toBe('');
	});

	it('returns the correct string for a static path', () => {
		expect(createPath('base', {})).toBe('base');
	});

	it('returns the correct string for a path with params', () => {
		expect(
			createPath(':paramA/:paramB', {
				params: { paramA: 'one', paramB: 'two' },
			})
		).toBe('one/two');

		expect(
			createPath('base/:paramA/:paramB', {
				params: { paramA: 'one', paramB: 'two' },
			})
		).toBe('base/one/two');
	});

	it('returns the correct string for a path with search params', () => {
		expect(
			createPath('', { searchParams: { searchA: 'one', searchB: 'two' } })
		).toBe('?searchA=one&searchB=two');

		expect(
			createPath('base', { searchParams: { searchA: 'one', searchB: 'two' } })
		).toBe('base?searchA=one&searchB=two');
	});

	it('returns the correct string for a path with a hash', () => {
		expect(createPath('', { hash: 'hashString' })).toBe('#hashString');

		expect(createPath('base', { hash: 'hashString' })).toBe('base#hashString');
	});

	it('returns the correct string for a path with all options', () => {
		expect(
			createPath('base/:paramA/:paramB', {
				params: { paramA: 'one', paramB: 'two' },
				searchParams: { searchA: 'one', searchB: 'two' },
				hash: 'hashString',
			})
		).toBe('base/one/two?searchA=one&searchB=two#hashString');
	});
});
