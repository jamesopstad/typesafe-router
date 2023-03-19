import type { ParamsObject } from './types';
import {
	Link,
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

function _redirect(originalRedirect: RedirectFunction) {
	return (
		to: string,
		options?: { init?: Parameters<Utils['redirect']>[1] } & {
			params?: ParamsObject;
			searchParams?: URLSearchParamsInit;
		}
	) => {
		if (!options) {
			return originalRedirect(to);
		}

		return originalRedirect(createPath(to, options), options.init);
	};
}

function _Link(OriginalLink: Utils['Link']) {
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
	}) => (
		<OriginalLink {...rest} to={createPath(to, { params, searchParams })} />
	);
}

export function enhanceUtils(utils: Partial<Utils>) {
	return {
		...utils,
		redirect: utils.redirect && _redirect(utils.redirect),
		Link: utils.Link && _Link(utils.Link),
	};
}
