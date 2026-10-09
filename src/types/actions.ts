import type { DataZoomComponentOption, TooltipComponentOption } from "echarts/components";
import type { Payload } from "echarts/core";

/**
 * Single source of truth. Drives both `actionFactory`'s return type and the `SeActions` mapped type
 * Adding a new action kind requires only one entry here.
 */
export type ActionPayloadMap = {
  highlight: HighlightPayload;
  downplay: DownplayPayload;
  select: SelectPayload;
  unselect: UnselectPayload;
  toggleSelect: ToggleSelectPayload;
  showTip: ShowTipPayload;
  hideTip: HideTipPayload;
  legendToggleSelect: LegendToggleSelectPayload;
  legendSelect: LegendSelectPayload;
  legendUnSelect: LegendUnSelectPayload;
  legendAllSelect: LegendAllSelectPayload;
  legendInverseSelect: LegendInverseSelectPayload;
  dataZoom: DataZoomPayload;
  restore: RestorePayload;
  brush: BrushPayload;
  timelineChange: TimelineChangePayload;
  timelinePlayChange: TimelinePlayChangePayload;
  geoRoam: GeoRoamPayload;
  graphRoam: GraphRoamPayload;
  treeRoam: TreeRoamPayload;
  sankeyRoam: SankeyRoamPayload;
  focusNodeAdjacency: FocusNodeAdjacencyPayload;
  unfocusNodeAdjacency: UnfocusNodeAdjacencyPayload;
  treeExpandAndCollapse: TreeExpandAndCollapsePayload;
  dragNode: DragNodePayload;
};

export type ActionKind = keyof ActionPayloadMap;

/**
 * Derived type for the full `seActions` object.
 * Each entry is an {@link ActionCreator}.
 */
export type SeActions = {
  [K in ActionKind]: ActionCreator<K>;
};

/**
 * Names of the explicitly declared, non-optional properties of `T`.
 * Index signatures are ignored.
 */
type RequiredKeys<T> = keyof {
  [
    K in keyof T as string extends K
      ? never
      : number extends K
        ? never
        : object extends Pick<T, K>
          ? never
          : K
  ]: never;
};

/**
 * Factory for one action kind: input (no `type` field) -> complete payload.
 * The input is mandatory when the payload has required fields, optional otherwise.
 */
export type ActionCreator<K extends ActionKind> = (
  ...args: [RequiredKeys<PayloadInput<ActionPayloadMap[K]>>] extends [never]
    ? [payload?: PayloadInput<ActionPayloadMap[K]>]
    : [payload: PayloadInput<ActionPayloadMap[K]>]
) => ActionPayloadMap[K];

/**
 * Valid brush selection types for the {@link BrushPayload} `areas` field.
 *
 * - `"rect"` - rectangular selection
 * - `"polygon"` - freeform polygon selection
 * - `"lineX"` - horizontal range selection
 * - `"lineY"` - vertical range selection
 */
export type BrushType = "polygon" | "rect" | "lineX" | "lineY";

/**
 * Base type for action payloads that target series data.
 * Intersects {@link Payload}, {@link SeriesTarget}, and a `type` literal
 * with optional extra fields.
 *
 * @typeParam T - The ECharts action type string literal (e.g. `"highlight"`).
 * @typeParam Extra - Additional payload fields specific to the action. Defaults to `object`.
 */
export type TypedPayload<T extends ActionKind, Extra extends object = object> = Payload &
  SeriesTarget & { type: T } & Extra;

/**
 * Base type for action payloads that do not target series data.
 * Intersects {@link Payload} and a `type` literal with optional extra fields.
 *
 * @typeParam T - The ECharts action type string literal (e.g. `"legendSelect"`).
 * @typeParam Extra - Additional payload fields specific to the action. Defaults to `object`.
 */
export type SimplePayload<T extends ActionKind, Extra extends object = object> = Payload & {
  type: T;
} & Extra;

/**
 * Selects components by index, as ECharts resolves `xxxIndex` payload fields.
 * `"all"` selects every component, `"none"` and `false` select nothing.
 */
export type ComponentIndexQuery = number | number[] | "all" | "none" | false;

/**
 * Selects components by `id` or `name`, as ECharts resolves `xxxId` and
 * `xxxName` payload fields. ECharts accepts numbers as well as strings.
 */
export type ComponentIdQuery = string | number | (string | number)[];

/**
 * Fields common to actions that target series data elements.
 *
 * @remarks
 *
 * All fields are optional - omitting all of them targets the entire series.
 * Fields are resolved in order: `seriesIndex` / `seriesId` / `seriesName`
 * identify the series, then `dataIndex` / `name` identify the data item.
 *
 * `dataIndex` and `name` accept arrays for bulk targeting.
 */
export type SeriesTarget = {
  /** Target series by index in `option.series`. Accepts an array for multiple series. */
  seriesIndex?: ComponentIndexQuery;
  /** Target series by its `id`. Accepts an array for multiple series. */
  seriesId?: ComponentIdQuery;
  /** Target series by its `name`. Accepts an array for multiple series. */
  seriesName?: ComponentIdQuery;
  /** Target a data item by its index in `series.data`. Accepts an array for bulk operations. */
  dataIndex?: number | number[];
  /** Target a data item by its inside index. */
  dataIndexInside?: number | number[];
  /** Target a data item by its `name`. Accepts an array for bulk operations. */
  name?: ComponentIdQuery;
};

/**
 * Options passed as the second argument to {@link useChart `dispatch`}
 * and {@link createAction}, forwarded directly to `chart.dispatchAction`.
 *
 * @see {@link https://echarts.apache.org/en/api.html#echartsInstance.dispatchAction `echartsInstance.dispatchAction`  [external]}
 */
export type DispatchOpt = {
  /** When `true`, suppresses events triggered by this action. */
  silent?: boolean;
  /**
   * When `true`, flushes the ZRender canvas synchronously after dispatch.
   * When `false`, skips the flush.
   */
  flush?: boolean;
};

/**
 * Derives the input type for an {@link seActions} factory by omitting
 * the `type` field - which is always injected by the factory itself.
 *
 * Implemented as a key-remapping mapped type: `Omit` would drop every declared
 * field, because `Payload` carries an index signature.
 *
 * @typeParam T - A payload type with a `type: string` field.
 *
 * @example
 * ```ts
 * // Used internally by seActions factories:
 * highlight: (payload: PayloadInput<HighlightPayload>) =>
 *   ({ type: 'highlight', ...payload }) as HighlightPayload
 * ```
 */
export type PayloadInput<T extends { type: ActionKind }> = {
  [K in keyof T as Exclude<K, "type">]: T[K];
};

// Action payload types
export type HighlightPayload = TypedPayload<"highlight", { notBlur?: boolean }>;

export type DownplayPayload = TypedPayload<"downplay", { notBlur?: boolean }>;

export type SelectPayload = TypedPayload<"select">;

export type UnselectPayload = TypedPayload<"unselect">;

export type ToggleSelectPayload = TypedPayload<"toggleSelect">;

export type ShowTipPayload = SimplePayload<
  "showTip",
  {
    seriesIndex?: number;
    dataIndex?: number;
    name?: string;
    /** Horizontal pixel coordinate to show the tooltip at. */
    x?: number;
    /** Vertical pixel coordinate to show the tooltip at. */
    y?: number;
    position?: TooltipComponentOption["position"];
  }
>;

export type HideTipPayload = SimplePayload<"hideTip">;

export type LegendToggleSelectPayload = SimplePayload<
  "legendToggleSelect",
  {
    name: string;
  }
>;

export type LegendSelectPayload = SimplePayload<
  "legendSelect",
  {
    name: string;
  }
>;

export type LegendUnSelectPayload = SimplePayload<
  "legendUnSelect",
  {
    name: string;
  }
>;

export type LegendAllSelectPayload = SimplePayload<"legendAllSelect">;

export type LegendInverseSelectPayload = SimplePayload<"legendInverseSelect">;

export type DataZoomPayload = SimplePayload<
  "dataZoom",
  {
    /** Targets dataZoom components by index. */
    dataZoomIndex?: ComponentIndexQuery;
    /** Targets dataZoom components by `id`. */
    dataZoomId?: ComponentIdQuery;
    /** Percentage-based range start (0–100). */
    start?: number;
    /** Percentage-based range end (0–100). */
    end?: number;
    /** Data value-based range start. */
    startValue?: DataZoomComponentOption["startValue"];
    /** Data value-based range end. */
    endValue?: DataZoomComponentOption["endValue"];
  }
>;

export type RestorePayload = SimplePayload<"restore">;

/**
 * One selection area of a {@link BrushPayload}.
 *
 * @remarks
 *
 * Give `range` for pixel coordinates or `coordRange` for data coordinates.
 * Any other field (`xAxisIndex`, `geoIndex`, `panelId`, ...) selects the
 * coordinate system the area belongs to.
 */
export type BrushArea = {
  brushType: BrushType;
  /** Range in data coordinates. */
  coordRange?: unknown[];
  /** Range in pixels: `[min, max]` for `lineX` / `lineY`, a list of pairs otherwise. */
  range?: number[] | number[][];
  [coordinateSystemQuery: string]: unknown;
};

export type BrushPayload = SimplePayload<
  "brush",
  {
    /**
     * Selection areas. An empty array removes all areas, omitting the field
     * keeps the current ones.
     */
    areas?: BrushArea[];
  }
>;

export type TimelineChangePayload = SimplePayload<
  "timelineChange",
  {
    /** Zero-based index of the timeline step to jump to. */
    currentIndex: number;
  }
>;

export type TimelinePlayChangePayload = SimplePayload<
  "timelinePlayChange",
  {
    /** `true` to play, `false` to pause. */
    playState: boolean;
  }
>;

/**
 * Pan and zoom fields shared by ECharts roam actions.
 *
 * @remarks
 *
 * Both are relative to the current view. A payload with neither a pan
 * (`dx` + `dy`) nor a zoom (`zoom` + `originX` + `originY`) changes nothing.
 */
export type RoamDelta = {
  /** Horizontal pan distance in pixels. Applied only together with `dy`. */
  dx?: number;
  /** Vertical pan distance in pixels. Applied only together with `dx`. */
  dy?: number;
  /**
   * Zoom factor relative to the current zoom, not an absolute zoom level.
   * Requires `originX` and `originY`.
   */
  zoom?: number;
  /** Horizontal pixel coordinate the zoom is anchored to. */
  originX?: number;
  /** Vertical pixel coordinate the zoom is anchored to. */
  originY?: number;
};

/**
 * Fields that narrow an action to specific series, without targeting data items.
 */
export type SeriesQuery = Pick<SeriesTarget, "seriesIndex" | "seriesId" | "seriesName">;

/**
 * Base type for roam actions of series that own their view (`graph`, `tree`,
 * `sankey`). Omitting all {@link SeriesQuery} fields roams every series of
 * that type.
 *
 * @typeParam T - The ECharts roam action type string literal (e.g. `"graphRoam"`).
 */
export type SeriesRoamPayload<T extends ActionKind> = SimplePayload<T, RoamDelta & SeriesQuery>;

/**
 * Payload of the `geoRoam` action.
 *
 * @remarks
 *
 * Targets geo components when any of `geoId` / `geoIndex` / `geoName` is set.
 * Otherwise targets map series, narrowed by `seriesId` / `seriesIndex` /
 * `seriesName`.
 */
export type GeoRoamPayload = SimplePayload<
  "geoRoam",
  RoamDelta &
    SeriesQuery & {
      /** Target geo component by its `id`. */
      geoId?: ComponentIdQuery;
      /** Target geo component by index in `option.geo`. */
      geoIndex?: ComponentIndexQuery;
      /** Target geo component by its `name`. */
      geoName?: ComponentIdQuery;
    }
>;

export type GraphRoamPayload = SeriesRoamPayload<"graphRoam">;

export type TreeRoamPayload = SeriesRoamPayload<"treeRoam">;

export type SankeyRoamPayload = SeriesRoamPayload<"sankeyRoam">;

export type FocusNodeAdjacencyPayload = SimplePayload<
  "focusNodeAdjacency",
  {
    seriesIndex?: number;
    dataIndex?: number;
  }
>;

export type UnfocusNodeAdjacencyPayload = SimplePayload<
  "unfocusNodeAdjacency",
  {
    seriesIndex?: number;
  }
>;

/**
 * Payload of the `treeExpandAndCollapse` action: toggles a node of a tree
 * series between expanded and collapsed. Fires `treeexpandandcollapse`.
 *
 * @remarks
 *
 * {@link SeriesQuery} fields narrow the tree series; omitting them toggles the
 * node with that `dataIndex` in every tree series.
 */
export type TreeExpandAndCollapsePayload = SimplePayload<
  "treeExpandAndCollapse",
  SeriesQuery & {
    /** Data index of the node to toggle. */
    dataIndex: number;
  }
>;

/**
 * Payload of the `dragNode` action: moves a node of a **sankey** series
 * (ECharts registers `dragNode` for sankey only, not for graph). Fires
 * `dragnode`.
 *
 * @remarks
 *
 * `localX` / `localY` are fractions of the series layout size, not pixels:
 * ECharts places the node at `localX * width`, `localY * height`, the values
 * its own drag handler dispatches.
 */
export type DragNodePayload = SimplePayload<
  "dragNode",
  SeriesQuery & {
    /** Raw data index of the node. */
    dataIndex: number;
    /** Horizontal position as a fraction of the layout width (`0` to `1`). */
    localX: number;
    /** Vertical position as a fraction of the layout height (`0` to `1`). */
    localY: number;
  }
>;

/**
 * Union of all built-in ECharts action payloads accepted by
 * {@link useChart `dispatch`} and {@link createAction}.
 *
 * @remarks
 *
 * Covers every action registered by ECharts core and its built-in
 * components. The final `Payload` member is an escape hatch for custom
 * actions registered via `registerAction` - it accepts any object with
 * a `type: string` field.
 *
 * Use {@link seActions} factories to construct payloads with full type
 * safety and autocomplete rather than building raw objects manually.
 *
 * @example
 * ```ts
 * // Typed via seActions factory - preferred
 * dispatch(seActions.highlight({ seriesIndex: 0, dataIndex: 2 }));
 *
 * // Raw object - valid but no autocomplete on fields
 * dispatch({ type: 'highlight', seriesIndex: 0, dataIndex: 2 });
 *
 * // Custom action via escape hatch
 * dispatch({ type: 'myCustomAction', data: { foo: 'bar' } });
 * ```
 *
 * @see {@link seActions} for typed payload factories
 * @see {@link useChart} for imperative dispatch
 * @see {@link createAction} for reactive action bindings
 * @see {@link https://echarts.apache.org/en/api.html#action ECharts `action` API [external]}
 */
export type ActionPayload =
  | HighlightPayload
  | DownplayPayload
  | SelectPayload
  | UnselectPayload
  | ToggleSelectPayload
  | ShowTipPayload
  | HideTipPayload
  | LegendToggleSelectPayload
  | LegendSelectPayload
  | LegendUnSelectPayload
  | LegendAllSelectPayload
  | LegendInverseSelectPayload
  | DataZoomPayload
  | RestorePayload
  | BrushPayload
  | TimelineChangePayload
  | TimelinePlayChangePayload
  | GeoRoamPayload
  | GraphRoamPayload
  | TreeRoamPayload
  | SankeyRoamPayload
  | FocusNodeAdjacencyPayload
  | UnfocusNodeAdjacencyPayload
  | TreeExpandAndCollapsePayload
  | DragNodePayload
  // Escape hatch - custom actions registered via registerAction
  | Payload;
