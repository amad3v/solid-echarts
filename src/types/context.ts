import type { Accessor } from "solid-js";

import type { EChartsInitOpts, EChartsType } from "echarts/core";

import type { ActionPayload, DispatchOpt } from "./actions";
import type { EChartTheme, WithAccessor, WithMaybeAccessor } from "./common";
import type { CreateChartEffectOptions } from "./primitives";
import type { SolidEChartAPI } from "./use-chart";

/**
 * The raw ECharts configuration shape - plain values, all optional.
 * Used as the base for {@link SolidEChartConfig} via `WithMaybeAccessor`.
 *
 * @remarks
 *
 * - `theme`: registered theme name or inline theme object.
 *   `"default"` and `"dark"` are always available. Register custom themes
 *   via `registerTheme` before use.
 * - `renderer`: `"canvas"` (default, better performance for large datasets)
 *   or `"svg"` (better for SSR, accessibility, and high-DPI without blur).
 *   Changing this after mount triggers a full dispose -> reinit cycle.
 * - `locale`: ECharts locale string (e.g. `"EN"`, `"ZH"`). Init-time:
 *   read when an instance is created, a change applies to the next one.
 * - `group`: group ID for connected charts. Charts sharing the same group
 *   sync datazoom and tooltip automatically via `echarts.connect`.
 * - `devicePixelRatio`: overrides `window.devicePixelRatio`. Init-time.
 * - `useDirtyRect`: enables dirty rectangle rendering optimisation.
 *   Improves performance for charts with frequent partial updates. Init-time.
 * - `autoResize`: attaches a `ResizeObserver` to call `chart.resize`
 *   when the container dimensions change. Defaults to `true`.
 * - `resizeDebounce`: debounce delay in milliseconds for `autoResize`
 *   callbacks. Defaults to `100`. Set to `0` to disable debouncing.
 *   Read when the `ResizeObserver` is attached.
 * - `initOnVisible`: creates the instance only once the container first
 *   enters the viewport. Defaults to `false`. Static.
 *
 * @internal
 */
type ChartConfig = Required<EChartsInitOpts> & {
  theme: EChartTheme | undefined;
  group: string | undefined;
  autoResize: boolean;
  resizeDebounce: number;
  initOnVisible: boolean;
  /**
   * Provider-level defaults for `setOption` merge behaviour.
   * Accepts a static object or a reactive accessor.
   * Per-chart `notMerge`, `replaceMerge`, `lazyUpdate`, `silent`, and
   * `autoMerge` props always override the corresponding field here.
   */
  updateOptions: CreateChartEffectOptions;
};

/**
 * Shared configuration for `SolidEChart` instances. All properties accept
 * both static values and reactive accessors (signals).
 *
 * @remarks
 *
 * Provided via {@link SolidEChartProvider} to set shared defaults across
 * a subtree, or directly on `SolidEChart` to configure a single instance.
 * Per-chart props always override provider values.
 *
 * The `echarts.init` options (`locale`, `devicePixelRatio`, `useDirtyRect`,
 * `useCoarsePointer`, `pointerSize`, `ssr`, `width`, `height`) are read when
 * an instance is created: a change never touches the live chart, the next
 * instance (renderer change, delayed `initOnVisible` init) uses the current
 * value. `initOnVisible` is read once. See {@link CreateChartOptions}.
 *
 * @see {@link SolidEChartProvider} for subtree-level configuration
 * @see {@link SolidEChartProps} for the full component prop surface
 */
export type SolidEChartConfig = Partial<WithMaybeAccessor<ChartConfig>>;

/**
 * The resolved shape of the ECharts configuration - plain values without
 * `Accessor` wrapping. Used as the base for {@link SolidEChartConfigContextValue}.
 *
 * @internal
 */
export type ChartConfigContextValue =
  // fields that have real defaults are required
  Required<
    Pick<EChartsInitOpts, "renderer" | "locale" | "devicePixelRatio" | "useDirtyRect" | "ssr">
  > &
    // fields left to ECharts' own defaults remain optional
    Pick<EChartsInitOpts, "width" | "height" | "useCoarsePointer" | "pointerSize"> & {
      theme: EChartTheme | undefined;
      group: string | undefined;
      autoResize: boolean;
      resizeDebounce: number;
      initOnVisible: boolean;
      updateOptions: CreateChartEffectOptions;
    };

/**
 * The value shape of `SolidEChartsConfigContext`. Every property is a
 * reactive `Accessor` so `SolidEChart` stays reactive to provider changes
 * without subscribing to the entire config object.
 *
 * @remarks
 *
 * Derived from {@link ChartConfigContextValue} via {@link WithAccessor},
 * each plain value becomes `Accessor<T>`. Consumed by `SolidEChart` to
 * resolve inherited defaults and by {@link SolidEChartProvider} to publish
 * lazily-evaluated config accessors.
 *
 * @internal
 */
export type SolidEChartConfigContextValue = WithAccessor<ChartConfigContextValue>;

/**
 * The value shape of {@link EChartsInstanceContext}. Carries the live
 * ECharts instance from `SolidEChart` down to {@link useChart}.
 *
 * @remarks
 *
 * `instance` is `null` before the chart mounts, during a renderer reinit,
 * and after dispose. Consumers must always guard against null before
 * calling instance methods, {@link useChart `dispatch`} does this automatically.
 *
 * @internal
 */
export type SolidEChartInstanceContextValue = {
  instance: Accessor<EChartsType | null>;
};

/**
 * Return type of {@link useCharts}
 *
 * @internal
 */
export type UseChart = {
  /**
   * Reactive `Accessor<EChartsType | null>`. Used in reactive
   * contexts (`createEffect`, `createMemo`) where tracking instance
   * changes matters.
   */
  instance: Accessor<EChartsType | null>;
  /**
   * Safe `dispatchAction` wrapper with built-in null and
   * dispose guards. Use {@link seActions} for typed payloads.
   *
   * @param payload
   * @param opt
   */
  dispatch: (payload: ActionPayload, opt?: DispatchOpt) => void;

  /**
   * Stable proxy for calling instance methods imperatively,
   * without null checks or signal unwrapping.
   */
  chart: SolidEChartAPI;
};
