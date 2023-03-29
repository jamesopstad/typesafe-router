import type { ParamsObject } from './types';
import { forwardRef } from 'react';
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
	Navigate: typeof $.Navigate;
	NavLink: typeof $.NavLink;
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

function createRedirect(original: InputDataUtils['redirect']) {
	return (
		to = '',
		options?: { init?: Parameters<InputDataUtils['redirect']>[1] } & PathOptions
	) => {
		if (!options) {
			return original(to);
		}

		return original(createPath(to, options), options.init);
	};
}

function createUseNavigate(original: InputRenderUtils['useNavigate']) {
	return () => {
		const navigate = original();

		return (to = '', options?: $.NavigateOptions & PathOptions) => {
			if (!options) {
				return navigate(to);
			}

			const { params, searchParams, hash, relative, ...rest } = options;

			return navigate(createPath(to, { params, searchParams, hash }), rest);
		};
	};
}

function createUseSubmit(original: InputRenderUtils['useSubmit']) {
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

function createForm(Original: InputRenderUtils['Form']) {
	return forwardRef<HTMLFormElement, $.FormProps & { params?: ParamsObject }>(
		function Form({ action = '', params, relative, ...rest }, ref) {
			return (
				<Original {...rest} action={createPath(action, { params })} ref={ref} />
			);
		}
	);
}

// function Form(Original: InputRenderUtils['Form']) {
// 	return ({
// 		action = '',
// 		params,
// 		relative,
// 		...rest
// 	}: $.FormProps & { params?: ParamsObject }) => (
// 		<Original {...rest} action={createPath(action, { params })} />
// 	);
// }

function createLink(Original: InputRenderUtils['Link']) {
	return forwardRef<
		HTMLAnchorElement,
		Omit<$.LinkProps, 'to'> & { to?: string } & PathOptions
	>(function Link(
		{ to = '', params, searchParams, hash, relative, ...rest },
		ref
	) {
		return (
			<Original
				{...rest}
				to={createPath(to, { params, searchParams, hash })}
				ref={ref}
			/>
		);
	});
}

function createNavigate(Original: InputRenderUtils['Navigate']) {
	return ({
		to = '',
		params,
		searchParams,
		hash,
		relative,
		...rest
	}: Omit<$.NavigateProps, 'to'> & {
		to?: string;
	} & PathOptions) => (
		<Original {...rest} to={createPath(to, { params, searchParams, hash })} />
	);
}

function createNavLink(Original: InputRenderUtils['NavLink']) {
	return forwardRef<
		HTMLAnchorElement,
		Omit<$.NavLinkProps, 'to'> & { to?: string } & PathOptions
	>(function Link(
		{ to = '', params, searchParams, hash, relative, ...rest },
		ref
	) {
		return (
			<Original
				{...rest}
				to={createPath(to, { params, searchParams, hash })}
				ref={ref}
			/>
		);
	});
}

export function enhanceDataUtils(inputUtils: Partial<InputDataUtils>) {
	return {
		...inputUtils,
		redirect: inputUtils.redirect && createRedirect(inputUtils.redirect),
	};
}

export function enhanceRenderUtils(inputUtils: Partial<InputRenderUtils>) {
	return {
		...inputUtils,
		useNavigate:
			inputUtils.useNavigate && createUseNavigate(inputUtils.useNavigate),
		useSubmit: inputUtils.useSubmit && createUseSubmit(inputUtils.useSubmit),
		Form: inputUtils.Form && createForm(inputUtils.Form),
		Link: inputUtils.Link && createLink(inputUtils.Link),
		Navigate: inputUtils.Navigate && createNavigate(inputUtils.Navigate),
		NavLink: inputUtils.NavLink && createNavLink(inputUtils.NavLink),
	};
}
