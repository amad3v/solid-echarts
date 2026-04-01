import type { Accessor } from "solid-js";

import type { DARK_THEME, DEFAULT_THEME } from "@utils/common";
import type { EChartsInitOpts } from "echarts/core";

export type MaybeAccessor<T> = Accessor<T> | T;

/**
 * Wraps all properties of `T` in {@link MaybeAccessor}, making each property
 * accept either a plain value or a reactive accessor (signal).
 *
 * @remarks
 *
 * Used to derive config types that support both static and reactive usage
 * without repeating `MaybeAccessor<...>` on every property manually.
 *
 * @typeParam T - The base type whose properties will be wrapped.
 *
 * @example
 * ```ts
 * type ChartConfig = {
 *   theme?: string;
 *   renderer?: 'canvas' | 'svg';
 * }
 *
 * type ReactiveConfig = WithMaybeAccessor<ChartConfig>;
 * // Equivalent to:
 * { theme?: MaybeAccessor<string>; renderer?: MaybeAccessor<'canvas' | 'svg'> }
 * ```
 *
 * @internal
 */
export type WithMaybeAccessor<T extends object> = {
  [K in keyof T]: MaybeAccessor<T[K]>;
};

/**
 * Wraps all properties of `T` in `Accessor<T[K]>`, making each property
 * a reactive accessor rather than a plain value.
 *
 * @remarks
 *
 * Used to derive context value types where every field must be a live
 * accessor so consuming components stay reactive to changes.
 *
 * @typeParam T - The base type whose properties will be wrapped.
 *
 * @example
 * ```ts
 * type Config = {
 *   theme: string;
 *   renderer: 'canvas' | 'svg';
 * }
 *
 * type ReactiveConfig = WithAccessor<Config>;
 * // Equivalent to:
 * { theme: Accessor<string>; renderer: Accessor<'canvas' | 'svg'> }
 * ```
 */
export type WithAccessor<T> = {
  [K in keyof T]-?: Accessor<T[K]>;
};

/**
 * The rendering backend for an ECharts instance.
 *
 * @remarks
 *
 * - `"canvas"` - default. Better performance for large datasets and
 *   frequent updates. Recommended for most use cases.
 * - `"svg"` - better for server-side rendering, accessibility (screen
 *   readers can traverse the SVG DOM), and high-DPI displays without
 *   blur. Recommended when SEO or accessibility is a priority.
 *
 * Changing the renderer after mount triggers a full dispose -> reinit
 * cycle on the chart instance.
 *
 * @see {@link https://echarts.apache.org/handbook/en/best-practices/canvas-vs-svg ECharts Canvas vs SVG guide [external]}
 */
export type EChartRenderer = NonNullable<EChartsInitOpts["renderer"]>;

export type LocaleOption = EChartsInitOpts["locale"];
export type PresetTheme = typeof DEFAULT_THEME | typeof DARK_THEME;
export type EChartTheme = PresetTheme | string | object | undefined;
