import type { Accessor, JSX, Setter } from "solid-js";

import type { EChartsOption } from "echarts";
import type { EChartsInitOpts, EChartsType, ElementEvent } from "echarts/core";

import type { EChartTheme, WithMaybeAccessor } from "./common";
import type { CreateChartEffectOptions } from "./primitives";

/**
 * All valid ECharts event names, mouse events and chart lifecycle events.
 *
 * @remarks

 * Two categories:
 *
 * **Mouse events**: fired when the user interacts with chart elements.
 * Available on any chart element: `click`, `dblclick`, `mousedown`,
 * `mouseup`, `mouseover`, `mouseout`, `mousemove`, `contextmenu`, `globalout`.
 *
 * **Chart events**: fired in response to interactions with built-in
 * components or internal state changes: `highlight`, `downplay`,
 * `selectchanged`, `legendselectchanged`, `legendselected`,
 * `legendunselected`, `legendscroll`, `datazoom`, `datarangeselected`,
 * `graphroam`, `georoam`, `treeroam`, `sankeyroam`,
 * `timelinechanged`, `timelineplaychanged`, `restore`, `rendered`,
 * `finished`, `brush`, `brushEnd`, `brushselected`, `globalcursortaken`,
 * `axisareaselected`, `showtip`, `hidetip`, `updateaxispointer`,
 * `focusnodeadjacency`, `unfocusnodeadjacency`, `dragnode`,
 * `treeexpandandcollapse`, `changeaxisorder`.
 *
 * `rendered` and `finished` do not carry {@link EventParams}, see
 * {@link SolidEChartEventMap}.
 *
 * Pass as keys of the `onEvents` prop on {@link SolidEChart}:
 * ```tsx
 * <SolidEChart
 *   option={option}
 *   onEvents={{
 *     click: (params, instance) => console.log(params.dataIndex),
 *     datazoom: (params) => console.log(params),
 *   }}
 * />
 * ```
 *
 * @see {@link https://echarts.apache.org/handbook/en/concepts/event `events` Handbook [external]}
 * @see {@link https://echarts.apache.org/en/api.html#events `events` API [external]}
 *
 * @internal
 */
export type SolidEChartEventName =
  // Mouse events
  | "click"
  | "dblclick"
  | "mousedown"
  | "mousemove"
  | "mouseup"
  | "mouseover"
  | "mouseout"
  | "globalout"
  | "contextmenu"
  // Interaction events
  | "highlight"
  | "selectchanged"
  | "legendselectchanged"
  | "legendselected"
  | "legendunselected"
  | "legendinverseselect"
  | "legendselectall"
  | "legendscroll"
  | "axisbreakchanged"
  | "datazoom"
  | "datarangeselected"
  | "graphroam"
  | "georoam"
  | "treeroam"
  | "sankeyroam"
  | "timelinechanged"
  | "timelineplaychanged"
  | "restore"
  | "dataviewchanged"
  | "magictypechanged"
  | "geoselectchanged"
  | "geoselected"
  | "geounselected"
  | "axisareaselected"
  | "brush"
  | "brushEnd"
  | "brushselected"
  | "globalcursortaken"
  | "showtip"
  | "hidetip"
  | "updateaxispointer"
  | "focusnodeadjacency"
  | "unfocusnodeadjacency"
  | "dragnode"
  | "treeexpandandcollapse"
  | "changeaxisorder"
  | "finished"
  | "downplay"
  | "rendered";

/**
 * @see {@link https://echarts.apache.org/en/api.html#echartsInstance.showLoading `echartsInstance.showLoading` [external]}
 */
export type LoadingOptions = {
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  lineWidth?: number;
  maskColor?: string;
  showSpinner?: boolean;
  spinnerRadius?: number;
  text?: string;
  textColor?: string;
  zlevel?: number;
};

/**
 * Parameters passed to ECharts event handlers.
 *
 * @remarks

 * Not all fields are present on every event - availability depends on
 * `componentType` and the chart type. Mouse events on series elements
 * populate most fields. Events on non-series components (`legend`, `dataZoom`)
 * may only populate `componentType` and component-specific fields.
 *
 * Received as the first argument of every handler in `onEvents`, and as
 * the first argument of handlers passed to {@link useChart `dispatch`}
 * via the `onEvents` prop.
 *
 * @see {@link https://echarts.apache.org/handbook/en/concepts/event ECharts `event [external]}
 */
export type EventParams = {
  /**
   * The type of component that triggered the event - `"series"`,
   * `"markLine"`, `"markPoint"`, `"timeLine"`, etc.
   */
  componentType: string;

  /**
   * Series type (`"line"`, `"bar"`, `"pie"`, etc.).
   * Only meaningful when `componentType` is `"series"`.
   */
  seriesType: string;

  /**
   * Index of the series in `option.series`.
   * Only meaningful when `componentType` is `"series"`.
   */
  seriesIndex: number;

  /** Series name.
   * Only meaningful when `componentType` is `"series"`.
   */
  seriesName: string;

  /**
   * Name of the data item (category label).
   */
  name: string;

  /**
   * Index of the data item in the `data` array.
   */
  dataIndex: number;

  /**
   * The raw data item as defined in `option.series[n].data`.
   */
  data: object;

  /**
   * Data type for charts with multiple data types (e.g. `"sankey"`, `"graph"`).
   * `"node"` or `"edge"` for graph charts. Meaningless for single-type charts.
   */
  dataType: string;

  /**
   * The data value at the event position.
   */
  value: number | Array<unknown>;

  /**
   * Fill color of the shape. Only meaningful when `componentType` is `"series"`.
   */
  color: string;

  /**
   * Which part of the element fired the event. `"line"` or `"area"` on a
   * line series (ECharts 6.1+), `"breadcrumb"` on a treemap breadcrumb.
   * Absent otherwise.
   */
  selfType?: "line" | "area" | "breadcrumb";
};

/**
 * Parameters passed to `rendered` event handlers.
 */
export type RenderedEventParams = {
  /** Time spent rendering the frame, in milliseconds. */
  elapsedTime: number;
};

/**
 * Events whose first handler argument is not {@link EventParams}.
 * `finished` is triggered without any argument.
 *
 * @internal
 */
type LifecycleEventParamsMap = {
  rendered: RenderedEventParams;
  finished: undefined;
};

/**
 * Event handler for ECharts events. Receives the event params and the live
 * chart instance so actions can be dispatched without a separate ref.
 *
 * @typeParam P - Type of the event params. Defaults to {@link EventParams}.
 * @param params - Event data. See {@link EventParams}.
 * @param instance - The live `EChartsType` instance that fired the event.
 *
 * @see {@link SolidEChart} `onEvents` prop
 *
 * @internal
 */
export type SolidEChartEventHandler<P = EventParams> = (params: P, instance: EChartsType) => void;

/**
 * Map of ECharts event names to their handlers. All entries are optional,
 * only the events you care about need to be provided.
 *
 * Handlers receive {@link EventParams}, except `rendered`
 * ({@link RenderedEventParams}) and `finished` (`undefined`).
 */
export type SolidEChartEventMap = {
  [K in SolidEChartEventName]?: SolidEChartEventHandler<
    K extends keyof LifecycleEventParamsMap ? LifecycleEventParamsMap[K] : EventParams
  >;
};

/**
 * Event handler for chart surface events - events that fire anywhere on the
 * chart canvas or SVG surface, including blank areas with no data elements.
 *
 * @remarks

 * Unlike `SolidEChartEventHandler` which fires only when the pointer
 * is over a data graphic element, surface handlers fire everywhere on the
 * rendering surface. Use `event.target` to check whether the pointer was
 * over a graphic element or blank space:
 *
 * ```ts
 * const handleSurfaceClick: SolidEChartSurfaceHandler = (event) => {
 *   if (!event.target) {
 *     // Clicked on blank area - no graphic element under the pointer
 *   }
 * };
 * ```
 *
 * The `offsetX` and `offsetY` fields carry canvas-relative coordinates,
 * useful for custom tooltip positioning, overlay drawing, or hit testing.
 *
 * @see {@link ElementEvent} for the full event object shape
 */
export type SolidEChartSurfaceHandler = (event: ElementEvent) => void;

export type ElementEventName = ElementEvent["type"];

/**
 * Map of surface event names to their handlers.
 * Uses `ElementEventName` which includes events not available on ECharts
 * elements: `'mousewheel'`, `'drag'`, `'dragstart'`, `'dragend'`, etc.
 */
export type SolidEChartSurfaceEventMap = Partial<
  Record<ElementEventName, SolidEChartSurfaceHandler>
>;

/**
 * The reactive subset of {@link SolidEChartProps} - all properties here
 * accept either a plain value or a reactive accessor via `WithMaybeAccessor`.
 *
 * Kept separate so `WithMaybeAccessor` can be applied cleanly without
 * touching props that must remain plain values or have a different shape
 * (`option`, `onInit`, `onDispose`, `ref`, `style`, `class`).
 *
 * @internal
 */
type SolidEChartMaybeProps = EChartsInitOpts & {
  autoMerge: boolean;

  /**
   * Controls how `setOption` merges the new option with the existing one. When `true`, the new option fully replaces the existing - no merging. Defaults to `false`.
   */
  notMerge: boolean;

  /**
   * Targeted component replacement. Named components are fully replaced rather than merged. E.g. `['series']` replaces all series without affecting axes or grid.
   */
  replaceMerge: string | string[];

  /**
   * When `true`, defers rendering until the next animation frame. Useful for batching multiple `setOption` calls.
   */
  lazyUpdate: boolean;

  /**
   * When `true`, suppresses all events triggered by this `setOption` call.
   */
  silent: boolean;

  /**
   * Theme name or inline theme object. Overrides the nearest {@link SolidEChartProvider} value.
   */
  theme: EChartTheme | undefined;

  /**
   * Group ID for connected charts. Charts sharing the same group sync datazoom and tooltip.
   */
  group: string | undefined;

  /**
   * Attaches a `ResizeObserver` to call `chart.resize` on container dimension changes.
   */
  autoResize: boolean;

  /**
   * Debounce delay in milliseconds for `autoResize` callbacks. Set to `0` to disable.
   */
  resizeDebounce: number;

  /**
   * When `true`, shows the ECharts loading overlay. When `false`, hides it.
   */
  loading: boolean;

  /**
   * Options passed to `chart.showLoading()`. Only used when `loading` is `true`.
   */
  loadingOptions: LoadingOptions;

  /**
   *  @see {@link SolidEChartEventMap}
   */
  onEvents: SolidEChartEventMap;

  /**
   *  @see {@link SolidEChartEventMap}
   */
  onEventsOnce: SolidEChartEventMap;

  /**
   *  @see {@link SolidEChartSurfaceEventMap}
   */
  onSurfaceEvents: SolidEChartSurfaceEventMap;

  /**
   *  @see {@link SolidEChartSurfaceEventMap}
   */
  onSurfaceEventsOnce: SolidEChartSurfaceEventMap;

  /**
   * @see {@link CreateChartEffectOptions}
   */
  updateOptions: CreateChartEffectOptions;
};

export type EchartsRef = ((instance: EChartsType | null) => void) | Setter<EChartsType | null>;

/**
 * Props for the {@link SolidEChart} component.
 *
 * @remarks

 * All properties in `SolidEChartMaybeProps` accept both plain values
 * and reactive accessors (signals) via `WithMaybeAccessor`.
 *
 * `option` must always be an `Accessor<EChartsOption>`, passing a plain
 * object is intentionally a compile-time error. A plain object would snapshot
 * at mount time and never update reactively.
 *
 * Props that match {@link SolidEChartConfig} fields override the nearest
 * {@link SolidEChartProvider} ancestor for this chart only.
 *
 * **Inline callback type inference**
 *
 * TypeScript's contextual typing does not flow callback parameter types through
 * mapped types (`WithMaybeAccessor`) or union types (`MaybeAccessor`). Inline
 * arrow functions passed to `onInit`, `onDispose`, `ref`, and `onEvents` handlers
 * may show implicit `any` errors for their parameters.
 *
 * The recommended pattern is to extract handlers to explicitly typed variables.
 * 
 * @example
 * ```tsx
 * const handleInit = (chart: EChartsType) => { ... };
 * const handleClick = (params: EventParams) => { ... };
 *
 * <SolidEChart onInit={handleInit} onEvents={{ click: handleClick }} />
 * ```
 *
 * Alternatively, annotate inline.
 * 
 * @example
 * ```tsx
 * <SolidEChart
 *   onInit={(chart: EChartsType) => { ... }}
 *   onEvents={{ click: (params: EventParams) => { ... } }}
 * />
 * ```
 *
 * @see {@link SolidEChart}
 * @see {@link SolidEChartProvider}
 * @see {@link SolidEChartConfig}
 */
export type SolidEChartProps = Partial<WithMaybeAccessor<SolidEChartMaybeProps>> &
  Omit<JSX.HTMLAttributes<HTMLDivElement>, "ref" | "style" | "class" | "onResize"> & {
    /**
     * The full ECharts option object. Optional.
     *
     * **Reactive mode**: pass an `Accessor<EChartsOption>` (signal or memo).
     * `createChartEffect` is wired automatically and calls `setOption` whenever
     * the accessor's value changes. Never pass a plain object, it would
     * snapshot at mount time and never update reactively.
     *
     * **Manual mode**: omit `option` entirely. No reactive binding is wired.
     * Use `ref` or `useChart` to call `setOption`, `appendData`, or any
     * other instance method directly. Useful for streaming large datasets or
     * custom render loops where reactive overhead is undesirable.
     *
     * @example
     * ```tsx
     * // Reactive mode
     * const option = () => ({ series: [{ type: 'bar', data: data() }] });
     * <SolidEChart option={option} />
     *
     * // Manual mode - setOption called imperatively in onInit
     * <SolidEChart onInit={(chart) => chart.setOption(initialOption)} />
     * ```
     */
    option?: Accessor<EChartsOption>;

    /**
     * Called on the first instance creation only. Receives the fresh
     * `EChartsType` instance. For subsequent instance creations caused by a
     * renderer reinit, see {@link SolidEChartProps} for `onReInit`.
     *
     * @remarks
     *
     * `onInit` is intentionally limited to the first creation so callers
     * can perform one-time setup (e.g. registering maps, installing plugins)
     * without guarding against re-entry. Use `onReInit` when you need to
     * react to every instance creation including reinits.
     */
    onInit?: (instance: EChartsType) => void;

    /**
     * Called on every instance creation after the first, triggered by a
     * renderer prop change which causes a dispose -> reinit cycle.
     * Receives the fresh `EChartsType` instance.
     *
     * @remarks
     *
     * Separating reinit from init allows callers to distinguish
     * "first mount setup" from "reattach state after reinit" without
     * introducing entry-count tracking in user code.
     */
    onReInit?: (instance: EChartsType) => void;

    /**
     * Called before each dispose - including mid-session renderer reinits,
     * not only on final component unmount.
     */
    onDispose?: () => void;

    /**
     * Forwards the raw `EChartsType` instance. Accepts a plain callback or
     * a SolidJS signal setter (`Setter<EChartsType | null>`).
     * Receives `null` when the instance is disposed.
     *
     * @example
     * ```tsx
     * // Plain callback
     * let chartRef: EChartsType | null = null;
     * <SolidEChart ref={el => { chartRef = el; }} option={option} />
     *
     * // Signal setter
     * const [chart, setChart] = createSignal<EChartsType | null>(null);
     * <SolidEChart ref={setChart} option={option} />
     * ```
     */
    ref?: EchartsRef;

    /**
     * CSS styles applied to the chart container `<div>`.
     */
    style?: JSX.CSSProperties | string;

    /**
     * CSS class applied to the chart container `<div>`.
     */
    class?: string;

    /**
     * Called after every successful `chart.resize()` triggered by the
     * `ResizeObserver`. Not called when resize is skipped by Guard 1
     * (unchanged dimensions on first observation) or Guard 2 (zero-sized
     * container).
     *
     * Static: read once at init time.
     *
     * Natural use case: read post-resize dimensions to sync external UI.
     *
     * @example
     * ```tsx
     * <SolidEChart
     *   option={option}
     *   onResize={() => setPixels(`${chart.getWidth()} × ${chart.getHeight()}`)}
     * />
     * ```
     */
    onResize?: () => void;
  };

/**
 * The ECharts option type for `SolidEChart`. Extracted directly from
 * `EChartsType['setOption']` so it stays in sync with the installed
 * ECharts version without importing from `echarts/option`.
 *
 * @example
 * ```ts
 * const option = (): SolidEChartOption => ({
 *   xAxis: { type: 'category', data: ['A', 'B', 'C'] },
 *   yAxis: { type: 'value' },
 *   series: [{ type: 'bar', data: [1, 2, 3] }],
 * });
 * ```
 */
export type SolidEChartOption = Parameters<EChartsType["setOption"]>[0];

export type SolidEChartOptionOpts = EChartsType["setOption"] extends {
  // oxlint-disable-next-line typescript/no-explicit-any
  (option: infer _O, opts?: infer Opts): any;
}
  ? Opts
  : never;

export type EventHandler = (...args: unknown[]) => void;
