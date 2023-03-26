import * as symbols from './symbols';
import type { ActionFunction, LoaderFunction } from 'react-router-dom';

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
	ActionFunction
>;

export type LoaderWrapper<TId extends string = string> = Wrapper<
	TId,
	typeof symbols.loader,
	LoaderFunction
>;

export type ComponentWrapper<TId extends string = string> = Wrapper<
	TId,
	typeof symbols.Component,
	React.ComponentType | null
>;

export type ErrorBoundaryWrapper<TId extends string = string> = Wrapper<
	TId,
	typeof symbols.ErrorBoundary,
	React.ComponentType | null
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

export type LazyOrStatic<
	TProp extends RouteProps = RouteProps,
	TId extends string = string,
	TValue extends Wrapper<TId> = {
		action: ActionWrapper<TId>;
		loader: LoaderWrapper<TId>;
		Component: ComponentWrapper<TId>;
		ErrorBoundary: ErrorBoundaryWrapper<TId>;
	}[TProp]
> = TValue | LazyWrapper<TId, LazyValue<TProp, TValue>>;

export type UnwrapLazyOrStatic<
	TLazyOrStatic extends Wrapper,
	TWrapper extends Wrapper
> = TLazyOrStatic extends LazyWrapper<
	string,
	LazyValue<string, infer T extends TWrapper>
>
	? T
	: TLazyOrStatic extends TWrapper
	? TLazyOrStatic
	: never;
