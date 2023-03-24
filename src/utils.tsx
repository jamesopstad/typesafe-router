import type { ParamsObject } from './types';
import {
	Link,
	NavLink,
	Navigate,
	Form,
	useSubmit,
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
	LinkProps,
	NavLinkProps,
	NavigateProps,
	FormProps,
	SubmitFunction,
	SubmitOptions,
} from 'react-router-dom';

export interface Utils {
	redirect: RedirectFunction;
	Link: typeof Link;
	NavLink: typeof NavLink;
	Navigate: typeof Navigate;
	Form: typeof Form;
	useSubmit: typeof useSubmit;
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
	}: Omit<LinkProps, 'to'> & {
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
	}: Omit<NavLinkProps, 'to'> & {
		to: string;
	} & PathOptions) => (
		<Original {...rest} to={createPath(to, { params, searchParams, hash })} />
	);
}

function _Navigate(Original: Utils['Navigate']) {
	return ({
		to,
		params,
		searchParams,
		hash,
		relative,
		...rest
	}: Omit<NavigateProps, 'to'> & {
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

function _Form(Original: Utils['Form']) {
	return ({
		action = '',
		params,
		relative,
		...rest
	}: FormProps & { params?: ParamsObject }) => (
		<Original {...rest} action={createPath(action, { params })} />
	);
}

function _useSubmit(original: Utils['useSubmit']) {
	return () => {
		const submit = original();

		return (
			target: Parameters<SubmitFunction>[0],
			options?: SubmitOptions & { params?: ParamsObject }
		) => {
			if (!options) {
				return submit(target);
			}

			const { action = '', params, relative, ...rest } = options;

			return submit(target, {
				...rest,
				action: createPath(action, { params }),
			});
		};
	};
}

export function enhanceUtils(utils: Partial<Utils>) {
	return {
		...utils,
		redirect: utils.redirect && _redirect(utils.redirect),
		Link: utils.Link && _Link(utils.Link),
		NavLink: utils.NavLink && _NavLink(utils.NavLink),
		Navigate: utils.Navigate && _Navigate(utils.Navigate),
		useNavigate: utils.useNavigate && _useNavigate(utils.useNavigate),
		Form: utils.Form && _Form(utils.Form),
		useSubmit: utils.useSubmit && _useSubmit(utils.useSubmit),
	};
}
