import type { ParamsObject } from './types';
import {
	Link,
	NavLink,
	useParams,
	useLoaderData,
	useActionData,
	useRouteLoaderData,
	generatePath,
	createSearchParams,
} from 'react-router-dom';
import type { RedirectFunction, URLSearchParamsInit } from 'react-router-dom';

export interface Utils {
	redirect: RedirectFunction;
	Link: typeof Link;
	NavLink: typeof NavLink;
	useParams: typeof useParams;
	useActionData: typeof useActionData;
	useLoaderData: typeof useLoaderData;
	useRouteLoaderData: typeof useRouteLoaderData;
}

function createPath(
	to: string,
	options: { params?: ParamsObject; searchParams?: URLSearchParamsInit }
) {
	return `${generatePath(to, options.params)}${
		options.searchParams ? `?${createSearchParams(options.searchParams)}` : ''
	}`;
}

function _redirect(original: RedirectFunction) {
	return (
		to: string,
		options?: { init?: Parameters<Utils['redirect']>[1] } & {
			params?: ParamsObject;
			searchParams?: URLSearchParamsInit;
		}
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
		relative,
		...rest
	}: Omit<Parameters<Utils['Link']>[0], 'to'> & {
		to: string;
		params?: ParamsObject;
		searchParams?: URLSearchParamsInit;
	}) => <Original {...rest} to={createPath(to, { params, searchParams })} />;
}

function _NavLink(Original: Utils['NavLink']) {
	return ({
		to,
		params,
		searchParams,
		relative,
		...rest
	}: Omit<Parameters<Utils['NavLink']>[0], 'to'> & {
		to: string;
		params?: ParamsObject;
		searchParams: URLSearchParamsInit;
	}) => <Original {...rest} to={createPath(to, { params, searchParams })} />;
}

export function enhanceUtils(utils: Partial<Utils>) {
	return {
		...utils,
		redirect: utils.redirect && _redirect(utils.redirect),
		Link: utils.Link && _Link(utils.Link),
		NavLink: utils.NavLink && _NavLink(utils.NavLink),
	};
}
