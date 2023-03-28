import * as symbols from './symbols';
import type * as $ from 'react-router-dom';

export type ComponentType = React.ComponentType | null;

export interface Wrapper<
	TId extends string = string,
	TType extends symbol = symbol,
	TValue = unknown
> {
	id: TId;
	type: TType;
	value: TValue;
}

export type ActionWrapper<TId extends string = string> = Wrapper<
	TId,
	typeof symbols.action,
	(args: $.ActionFunctionArgs) => unknown
>;

export type LoaderWrapper<TId extends string = string> = Wrapper<
	TId,
	typeof symbols.loader,
	(args: $.LoaderFunction) => unknown
>;

export type ComponentWrapper<TId extends string = string> = Wrapper<
	TId,
	typeof symbols.Component,
	ComponentType
>;

export type ErrorBoundaryWrapper<TId extends string = string> = Wrapper<
	TId,
	typeof symbols.ErrorBoundary,
	ComponentType
>;

export type LazyValue<
	TProp extends string = string,
	TValue extends Wrapper = Wrapper
> = () => Promise<Record<TProp, TValue>>;

export type LazyWrapper<TId extends string, TValue extends LazyValue> = Wrapper<
	TId,
	typeof symbols.lazy,
	TValue
>;

export type RouteProps = 'action' | 'loader' | 'Component' | 'ErrorBoundary';

export type EagerOrLazy<
	TProp extends RouteProps = RouteProps,
	TId extends string = string,
	TValue extends Wrapper<TId> = {
		action: ActionWrapper<TId>;
		loader: LoaderWrapper<TId>;
		Component: ComponentWrapper<TId>;
		ErrorBoundary: ErrorBoundaryWrapper<TId>;
	}[TProp]
> = TValue | LazyWrapper<TId, LazyValue<TProp, TValue>>;

export type UnwrapEagerOrLazy<
	TEagerOrLazy extends Wrapper,
	TWrapper extends Wrapper
> = TEagerOrLazy extends LazyWrapper<
	string,
	LazyValue<string, infer T extends TWrapper>
>
	? T
	: TEagerOrLazy extends TWrapper
	? TEagerOrLazy
	: never;
