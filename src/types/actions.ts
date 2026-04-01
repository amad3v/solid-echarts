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
  focusNodeAdjacency: FocusNodeAdjacencyPayload;
  unfocusNodeAdjacency: UnfocusNodeAdjacencyPayload;
};

export type ActionKind = keyof ActionPayloadMap;

/**
 * Derived type for the full `seActions` object.
 * Each entry is a factory: optional input (no `type` field) -> complete payload.
 */
export type SeActions = {
  [K in ActionKind]: (payload?: PayloadInput<ActionPayloadMap[K]>) => ActionPayloadMap[K];
};

export type ActionCreator<K extends ActionKind> = (
  payload?: PayloadInput<ActionPayloadMap[K]>,
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
  seriesIndex?: number | number[];
  /** Target series by its `id`. Accepts an array for multiple series. */
  seriesId?: string | string[];
  /** Target series by its `name`. Accepts an array for multiple series. */
  seriesName?: string | string[];
  /** Target a data item by its index in `series.data`. Accepts an array for bulk operations. */
  dataIndex?: number | number[];
  /** Target a data item by its inside index. */
  dataIndexInside?: number;
  /** Target a data item by its `name`. Accepts an array for bulk operations. */
  name?: string | string[];
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
 * @typeParam T - A payload type with a `type: string` field.
 *
 * @example
 * ```ts
 * // Used internally by seActions factories:
 * highlight: (payload: PayloadInput<HighlightPayload>) =>
 *   ({ type: 'highlight', ...payload }) as HighlightPayload
 * ```
 */
export type PayloadInput<T extends { type: ActionKind }> = Omit<T, "type">;

// Action payload types
export type HighlightPayload = TypedPayload<"highlight", { notBlur?: boolean }>;

export type DownplayPayload = TypedPayload<"downplay">;

export type SelectPayload = TypedPayload<"select">;

export type UnselectPayload = TypedPayload<"unselect">;

export type ToggleSelectPayload = TypedPayload<"toggleSelect">;

export type ShowTipPayload = SimplePayload<
  "showTip",
  {
    seriesIndex?: number;
    dataIndex?: number;
    name?: string;
    position?: string | number[] | ((...args: unknown[]) => unknown);
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
    /** Targets a specific dataZoom component by index. */
    dataZoomIndex?: number;
    /** Percentage-based range start (0–100). */
    start?: number;
    /** Percentage-based range end (0–100). */
    end?: number;
    /** Data value-based range start. */
    startValue?: number;
    /** Data value-based range end. */
    endValue?: number;
  }
>;

export type RestorePayload = SimplePayload<"restore">;

export type BrushPayload = SimplePayload<
  "brush",
  {
    areas: Array<{
      brushType?: BrushType;
      coordRange?: unknown[];
      range?: number[][];
    }>;
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

export type GeoRoamPayload = SimplePayload<
  "geoRoam",
  {
    /** Targets a specific geo component by name. */
    name?: string;
  }
>;

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
  | FocusNodeAdjacencyPayload
  | UnfocusNodeAdjacencyPayload
  // Escape hatch - custom actions registered via registerAction
  | Payload;
