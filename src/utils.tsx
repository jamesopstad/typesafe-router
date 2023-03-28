import type { ParamsObject } from './types';
import { generatePath, createSearchParams } from 'react-router-dom';
import type * as $ from 'react-router-dom';

export interface InputDataUtils {
	redirect: $.RedirectFunction;
}

export interface InputRenderUtils {
	useActionData: typeof $.useActionData;
	useLoaderData: typeof $.useLoaderData;
	useNavigate: typeof $.useNavigate;
	useParams: typeof $.useParams;
	useRouteLoaderData: typeof $.useRouteLoaderData;
	useSubmit: typeof $.useSubmit;
	Form: typeof $.Form;
	Link: typeof $.Link;
	NavLink: typeof $.NavLink;
	Navigate: typeof $.Navigate;
}

interface PathOptions {
	params?: ParamsObject;
	searchParams?: $.URLSearchParamsInit;
	hash?: string;
}

function createPath(to: string, options: PathOptions) {
	return `${generatePath(to, options.params)}${
		options.searchParams ? `?${createSearchParams(options.searchParams)}` : ''
	}${options.hash ? `#${options.hash}` : ''}`;
}

function redirect(original: InputDataUtils['redirect']) {
	return (
		to: string,
		options?: { init?: Parameters<InputDataUtils['redirect']>[1] } & PathOptions
	) => {
		if (!options) {
			return original(to);
		}

		return original(createPath(to, options), options.init);
	};
}

function Link(Original: InputRenderUtils['Link']) {
	return ({
		to,
		params,
		searchParams,
		hash,
		relative,
		...rest
	}: Omit<$.LinkProps, 'to'> & {
		to: string;
	} & PathOptions) => (
		<Original {...rest} to={createPath(to, { params, searchParams, hash })} />
	);
}

function NavLink(Original: InputRenderUtils['NavLink']) {
	return ({
		to,
		params,
		searchParams,
		hash,
		relative,
		...rest
	}: Omit<$.NavLinkProps, 'to'> & {
		to: string;
	} & PathOptions) => (
		<Original {...rest} to={createPath(to, { params, searchParams, hash })} />
	);
}

function Navigate(Original: InputRenderUtils['Navigate']) {
	return ({
		to,
		params,
		searchParams,
		hash,
		relative,
		...rest
	}: Omit<$.NavigateProps, 'to'> & {
		to: string;
	} & PathOptions) => (
		<Original {...rest} to={createPath(to, { params, searchParams, hash })} />
	);
}

function useNavigate(original: InputRenderUtils['useNavigate']) {
	return () => {
		const navigate = original();

		return (to: string, options?: $.NavigateOptions & PathOptions) => {
			if (!options) {
				return navigate(to);
			}

			const { params, searchParams, hash, relative, ...rest } = options;

			return navigate(createPath(to, { params, searchParams, hash }), rest);
		};
	};
}

function Form(Original: InputRenderUtils['Form']) {
	return ({
		action = '',
		params,
		relative,
		...rest
	}: $.FormProps & { params?: ParamsObject }) => (
		<Original {...rest} action={createPath(action, { params })} />
	);
}

function useSubmit(original: InputRenderUtils['useSubmit']) {
	return () => {
		const submit = original();

		return (
			target: Parameters<$.SubmitFunction>[0],
			options?: $.SubmitOptions & { params?: ParamsObject }
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

export function enhanceDataUtils(inputUtils: Partial<InputDataUtils>) {
	return {
		...inputUtils,
		redirect: inputUtils.redirect && redirect(inputUtils.redirect),
	};
}

export function enhanceRenderUtils(inputUtils: Partial<InputRenderUtils>) {
	return {
		...inputUtils,
		Link: inputUtils.Link && Link(inputUtils.Link),
		NavLink: inputUtils.NavLink && NavLink(inputUtils.NavLink),
		Navigate: inputUtils.Navigate && Navigate(inputUtils.Navigate),
		useNavigate: inputUtils.useNavigate && useNavigate(inputUtils.useNavigate),
		Form: inputUtils.Form && Form(inputUtils.Form),
		useSubmit: inputUtils.useSubmit && useSubmit(inputUtils.useSubmit),
	};
}
