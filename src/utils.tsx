import type { ParamsObject } from './types';
import {
	Link,
	NavLink,
	Navigate,
	useNavigate,
	useParams,
	useLoaderData,
	useActionData,
	useRouteLoaderData,
	generatePath,
	createSearchParams,
} from 'react-router-dom';
import type {
	RedirectFunction,
	URLSearchParamsInit,
	NavigateOptions,
} from 'react-router-dom';

export interface Utils {
	redirect: RedirectFunction;
	Link: typeof Link;
	NavLink: typeof NavLink;
	Navigate: typeof Navigate;
	useNavigate: typeof useNavigate;
	useParams: typeof useParams;
	useActionData: typeof useActionData;
	useLoaderData: typeof useLoaderData;
	useRouteLoaderData: typeof useRouteLoaderData;
}

interface PathOptions {
	params?: ParamsObject;
	searchParams?: URLSearchParamsInit;
	hash?: string;
}

function createPath(to: string, options: PathOptions) {
	return `${generatePath(to, options.params)}${
		options.searchParams ? `?${createSearchParams(options.searchParams)}` : ''
	}${options.hash ? `#${options.hash}` : ''}`;
}

function _redirect(original: RedirectFunction) {
	return (
		to: string,
		options?: { init?: Parameters<Utils['redirect']>[1] } & PathOptions
	) => {
		if (!options) {
			return original(to);
		}

		return original(createPath(to, options), options.init);
	};
}

function _Link(Original: Utils['Link']) {
	return ({
		to,
		params,
		searchParams,
		hash,
		relative,
		...rest
	}: Omit<Parameters<Utils['Link']>[0], 'to'> & {
		to: string;
	} & PathOptions) => (
		<Original {...rest} to={createPath(to, { params, searchParams, hash })} />
	);
}

function _NavLink(Original: Utils['NavLink']) {
	return ({
		to,
		params,
		searchParams,
		hash,
		relative,
		...rest
	}: Omit<Parameters<Utils['NavLink']>[0], 'to'> & {
		to: string;
	} & PathOptions) => (
		<Original {...rest} to={createPath(to, { params, searchParams, hash })} />
	);
}

function _useNavigate(original: Utils['useNavigate']) {
	return () => {
		const navigate = original();

		return (to: string, options?: NavigateOptions & PathOptions) => {
			if (!options) {
				return navigate(to);
			}

			const { params, searchParams, hash, relative, ...rest } = options;

			return navigate(createPath(to, { params, searchParams, hash }), rest);
		};
	};
}

export function enhanceUtils(utils: Partial<Utils>) {
	return {
		...utils,
		redirect: utils.redirect && _redirect(utils.redirect),
		Link: utils.Link && _Link(utils.Link),
		NavLink: utils.NavLink && _NavLink(utils.NavLink),
		useNavigate: utils.useNavigate && _useNavigate(utils.useNavigate),
	};
}
