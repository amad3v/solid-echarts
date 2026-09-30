import type { Accessor } from "solid-js";

import type { EChartsInitOpts, EChartsType } from "echarts/core";

import type { EChartRenderer, EChartTheme, MaybeAccessor, WithMaybeAccessor } from "./common";

/**
 * The reactive subset of {@link CreateChartOptions}. All properties here
 * accept either a plain value or a reactive accessor via `WithMaybeAccessor`.
 *
 * Kept separate so static init-time options can be typed as plain values
 * in the final {@link CreateChartOptions} intersection.
 *
 * @internal
 */
type CreateChartMaybeOptions = {
  /**
   * Rendering backend. Changing this after mount triggers a full
   * dispose -> reinit cycle - the only option with no in-place update path.
   */
  renderer: EChartRenderer;

  /**
   * Theme name or inline theme object. Updated in place via `setTheme`.
   * ECharts then rebuilds the chart from the first option set on the
   * instance; {@link createChartEffect} applies the latest option again.
   */
  theme: EChartTheme | undefined;

  /**
   * Group ID for connected charts. Updated in place, calls `connect`
   * after assigning `chart.group`. Charts sharing the same group sync
   * datazoom and tooltip automatically.
   */
  group: string | undefined;

  /**
   * When `true`, attaches a debounced `ResizeObserver` that calls
   * `chart.resize` on container dimension changes. Toggled reactively
   * without touching the instance.
   */
  autoResize: boolean;
};

/**
 * Options for {@link createChart}.
 *
 * @remarks

 * Reactive options (in CreateChartMaybeOptions) accept both plain
 * values and accessors. Static options are plain values only - they are
 * read once at init time and changes after mount have no effect.
 *
 * **Reactive - updated in place after mount:**
 * - `renderer` - reinits the instance (only option that does)
 * - `theme` - calls `setTheme`; {@link createChartEffect} then applies the latest option again
 * - `group` - updates `chart.group` and calls `connect`
 * - `autoResize` - attaches or detaches the `ResizeObserver`
 *
 * **Static - read at init time only:**
 * - `locale`, `devicePixelRatio`, `useDirtyRect`, `resizeDebounce`, `initOnVisible`
 *
 * @see {@link createChart}
 */
export type CreateChartOptions = Partial<WithMaybeAccessor<CreateChartMaybeOptions>> &
  Omit<EChartsInitOpts, "renderer"> & {
    /**
     * Debounce delay in milliseconds for `ResizeObserver` callbacks.
     * Defaults to `100`. Set to `0` to call `chart.resize` on every
     * observation without debouncing. Static.
     */
    resizeDebounce?: number;

    /**
     * When `true`, the instance is created only once the container first
     * enters the viewport (`IntersectionObserver`), instead of as soon as the
     * container mounts. `instance` stays `null` until then. The chart is not
     * disposed when it leaves the viewport again. Falls back to immediate
     * init where `IntersectionObserver` is not available. Defaults to
     * `false`. Static.
     */
    initOnVisible?: boolean;

    /**
     * Called after every successful `chart.resize` triggered by the
     * `ResizeObserver`. Not called when resize is skipped (zero-sized
     * container or unchanged dimensions on first observation). Static.
     *
     * @example
     * ```ts
     * createChart(container, {
     *   autoResize: true,
     *   onResize: () => console.log('chart resized'),
     * });
     * ```
     */
    onResize?: () => void;
  };

/**
 * Return value of {@link createChart}.
 *
 * @remarks

 * `instance` is `null` before the container mounts, during a renderer
 * reinit, and after dispose. Always guard against null before calling
 * instance methods directly - or use {@link useChart} `dispatch` which
 * handles this automatically.
 */
export type CreateChartResult = {
  /** Reactive accessor for the live `EChartsType` instance. */
  instance: Accessor<EChartsType | null>;
};

/**
 * Options for {@link createChartEffect} - controls how `setOption` merges
 * the new option with the existing chart state.
 *
 * @remarks

 * All options accept both plain values and reactive accessors. They are
 * read with `untrack` inside the effect - a change to merge strategy alone
 * does not trigger a redundant `setOption` call. The new values are picked
 * up on the next natural trigger (instance or option change).
 *
 * @see {@link https://echarts.apache.org/en/api.html#echartsInstance.setOption `echartsInstance.setOption` [external]}
 */
export type CreateChartEffectOptions = {
  /**
   * When `true`, {@link optionMergePlan} automatically infers the correct merge
   * strategy by diffing the previous and new option structure. Explicit
   * `notMerge` and `replaceMerge` options are ignored when this is active.
   *
   * Eliminates the need to manually reason about `notMerge` and `replaceMerge`
   * when series or components are added or removed. Defaults to `false`.
   */
  autoMerge?: MaybeAccessor<boolean>;

  /**
   * When `true`, the new option fully replaces the existing - no merging.
   * Defaults to `false`.
   */
  notMerge?: MaybeAccessor<boolean>;

  /**
   * Targeted component replacement. Named components are fully replaced
   * rather than merged. E.g. `['series']` replaces all series without
   * affecting axes or grid.
   */
  replaceMerge?: MaybeAccessor<string | string[]>;

  /**
   * When `true`, defers rendering until the next animation frame.
   * Useful for batching multiple `setOption` calls. Defaults to `false`.
   */
  lazyUpdate?: MaybeAccessor<boolean>;

  /**
   * When `true`, suppresses all events triggered by this `setOption` call.
   * Defaults to `false`.
   */
  silent?: MaybeAccessor<boolean>;
};
