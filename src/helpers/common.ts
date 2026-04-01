import type { Accessor } from "solid-js";

import type { MaybeAccessor } from "@type/common";

export const DARK_THEME = "dark";
export const DEFAULT_THEME = "default";

const isAccessor = <T>(value: MaybeAccessor<T>): value is Accessor<T> => {
  return typeof value === "function";
};

/**
 * Normalises a {@link MaybeAccessor} to a stable `Accessor<T>`.
 *
 * Use this when you need to store or pass a `MaybeAccessor` as a tracked
 * reactive dependency,e.g. inside `createEffect`.
 *
 * @param value - A plain value or an accessor (function) returning `T`.
 * @returns A stable `Accessor<T>`.
 *
 * @example
 * ```ts
 * const theme = toAccessor(props.theme); // always Accessor<string>
 * createEffect(() => console.log(theme()));
 * ```
 */
export const toAccessor = <T>(value: MaybeAccessor<T>): Accessor<T> => {
  return isAccessor(value) ? value : () => value;
};

/**
 * Resolves a {@link MaybeAccessor} to its current value.
 *
 * Always call this inside a lazy lambda, never at construction time.
 * Calling it eagerly snapshots the value and breaks reactivity:
 *
 * ```ts
 * // ✗ eager - snapshots props.theme once, never updates
 * const theme = resolveMaybeAccessor(props.theme);
 *
 * // ✓ lazy - reads through SolidJS reactive proxy on every call
 * const theme = () => resolveMaybeAccessor(props.theme);
 * ```
 *
 * @param value - A plain value or an accessor (function) returning `T`.
 * @returns The current value of `T`.
 *
 * @example
 * ```ts
 * // Inside SolidEChartProvider, each config accessor is a lazy lambda
 * theme: () => props.theme === undefined
 *   ? parentConfig.theme()
 *   : resolveMaybeAccessor(props.theme),
 * ```
 */
export const resolveMaybeAccessor = <T>(value: MaybeAccessor<T>): T => {
  return isAccessor(value) ? value() : value;
};
