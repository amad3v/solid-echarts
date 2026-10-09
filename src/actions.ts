import type {
  ActionCreator,
  // ActionFactory,
  ActionKind,
  ActionPayloadMap,
  PayloadInput,
  SeActions,
} from "@type/actions";

/**
 * Creates an action factory for a specific action kind.
 *
 * Generic over `K`, the literal action kind. It automatically infers `K` from the string argument,
 * so no need to explicitly pass the type parameter.
 * The payload type is resolved via `PayloadInput<ActionPayloadMap[K]>`.
 *
 * The returned factory function:
 * - If the action kind has a payload type (non-empty object), it requires a payload argument.
 * - If the action kind has no payload (empty object), the payload argument is optional.
 *
 * @template K - The action kind literal type (inferred from `kind` argument)
 * @param {K} kind - The action type string (must be one of the keys in `ActionPayloadMap`)
 * @returns {(payload?: PayloadInput<ActionPayloadMap[K]>) => ActionPayloadMap[K]}
 *   A function that takes the payload (if any) and returns a fully typed action object
 *   with `type` and payload properties.
 *
 * @example
 * ```ts
 * const highlightAction = actionFactory("highlight");
 * const action = highlightAction({ color: "red" });
 *
 * const downplayAction = actionFactory("downplay");
 * const action2 = downplayAction();
 * ```
 */
const actionFactory =
  <K extends ActionKind>(kind: K): ActionCreator<K> =>
  (payload?: PayloadInput<ActionPayloadMap[K]>): ActionPayloadMap[K] =>
    ({ type: kind, ...(payload ?? {}) }) as ActionPayloadMap[K];

/**
 * Typed factory functions for all built-in ECharts `dispatchAction` payloads.
 *
 * Each factory takes the action fields (excluding `type` which is injected
 * automatically) and returns a correctly shaped payload. Use with
 * {@link useChart dispatch} for imperative actions or {@link createAction}
 * for reactive bindings.
 *
 * @remarks
 *
 * Factories are pure - no runtime logic, no side effects. They exist solely
 * to provide type safety and autocomplete over raw `{ type: '...', ... }` objects.
 *
 * `type` is always injected by the factory - never pass it manually.
 *
 * @example
 * ```ts
 * // Imperative, fire once in response to an event
 * const { dispatch } = useChart();
 * dispatch(seActions.highlight({ seriesIndex: 0, dataIndex: 2 }));
 * dispatch(seActions.dataZoom({ start: 20, end: 80 }));
 * dispatch(seActions.legendToggleSelect({ name: "Revenue" }));
 *
 * // Declarative, keep action in sync with a signal
 * createAction(instance, () =>
 *   hoveredRow() !== null
 *     ? seActions.highlight({ seriesIndex: 0, dataIndex: hoveredRow()! })
 *     : seActions.downplay({})
 * );
 * ```
 *
 * @see {@link useChart} for `dispatch`
 * @see {@link createAction} for reactive action bindings
 * @see {@link https://echarts.apache.org/en/api.html#action ECharts `action` API [external]}
 */
export const seActions = {
  /**
   * Highlights specified data graphics. Other elements are blurred unless
   * `notBlur` is `true`.
   *
   * @param payload - Target by `seriesIndex`/`seriesId`/`seriesName` +
   * `dataIndex`/`name`. All fields optional - omitting all highlights
   * the entire series.
   *
   * @example
   * ```ts
   * // Highlight a single bar
   * dispatch(seActions.highlight({ seriesIndex: 0, dataIndex: 3 }));
   *
   * // Highlight without blurring others
   * dispatch(seActions.highlight({ seriesIndex: 0, dataIndex: 3, notBlur: true }));
   * ```
   */
  highlight: actionFactory("highlight"),

  /**
   * Reverses a highlight - restores all elements to their normal state.
   *
   * @param payload - Optional. Omitting all fields downplays the entire chart.
   *
   * @example
   * ```ts
   * // Downplay a specific item
   * dispatch(seActions.downplay({ seriesIndex: 0, dataIndex: 3 }));
   *
   * // Downplay everything
   * dispatch(seActions.downplay({}));
   * ```
   */
  downplay: actionFactory("downplay"),

  /**
   * Selects specified data. Requires `selectedMode` on the series option
   * (`"single"`, `"multiple"`, or `true`) - without it the action fires
   * but has no visual effect.
   *
   * @param payload - Target by `seriesIndex` + `dataIndex` or `name`.
   * `dataIndex` accepts an array for bulk selection.
   *
   * @example
   * ```ts
   * dispatch(seActions.select({ seriesIndex: 0, dataIndex: 2 }));
   *
   * // Bulk select
   * dispatch(seActions.select({ seriesIndex: 0, dataIndex: [0, 1, 2] }));
   * ```
   */
  select: actionFactory("select"),

  /**
   * Clears selection on specified data. `dataIndex` accepts an array
   * for bulk unselect - pass all indices to clear the entire series.
   *
   * @param payload - Optional. Target by `seriesIndex` + `dataIndex` or `name`.
   *
   * @example
   * ```ts
   * // Unselect all items in a series
   * dispatch(seActions.unselect({ seriesIndex: 0, dataIndex: [...data.keys()] }));
   * ```
   */
  unselect: actionFactory("unselect"),

  /**
   * Toggles selection state on specified data. Selects if unselected,
   * deselects if selected. Requires `selectedMode` on the series.
   *
   * @param payload - Target by `seriesIndex` + `dataIndex` or `name`.
   *
   * @example
   * ```ts
   * dispatch(seActions.toggleSelect({ seriesIndex: 0, dataIndex: 5 }));
   * ```
   */
  toggleSelect: actionFactory("toggleSelect"),

  /**
   * Shows the tooltip at a specific data point or pixel coordinate.
   *
   * @param payload - Use `seriesIndex` + `dataIndex` to position at a data
   * point, or `x` + `y` for pixel coordinates.
   *
   * @example
   * ```ts
   * // Show at data point
   * dispatch(seActions.showTip({ seriesIndex: 0, dataIndex: 3 }));
   *
   * // Show at pixel coordinates
   * dispatch(seActions.showTip({ x: 100, y: 200 }));
   * ```
   */
  showTip: actionFactory("showTip"),

  /**
   * Hides the tooltip.
   *
   * @example
   * ```ts
   * dispatch(seActions.hideTip());
   * ```
   */
  hideTip: actionFactory("hideTip"),

  /**
   * Toggles the selected state of a legend item by name.
   *
   * @param payload - `name` must match a series name exactly.
   *
   * @example
   * ```ts
   * dispatch(seActions.legendToggleSelect({ name: 'Revenue' }));
   * ```
   */
  legendToggleSelect: actionFactory("legendToggleSelect"),

  /**
   * Selects (shows) a legend item by name.
   *
   * @param payload - `name` must match a series name exactly.
   *
   * @example
   * ```ts
   * dispatch(seActions.legendSelect({ name: 'Revenue' }));
   * ```
   */
  legendSelect: actionFactory("legendSelect"),

  /**
   * Unselects (hides) a legend item by name.
   *
   * @param payload - `name` must match a series name exactly.
   *
   * @example
   * ```ts
   * dispatch(seActions.legendUnSelect({ name: 'Expenses' }));
   * ```
   */
  legendUnSelect: actionFactory("legendUnSelect"),

  /**
   * Selects all legend items - makes all series visible.
   *
   * @example
   * ```ts
   * dispatch(seActions.legendAllSelect());
   * ```
   */
  legendAllSelect: actionFactory("legendAllSelect"),

  /**
   * Inverts the selected state of all legend items.
   *
   * @example
   * ```ts
   * dispatch(seActions.legendInverseSelect());
   * ```
   */
  legendInverseSelect: actionFactory("legendInverseSelect"),

  /**
   * Programmatically sets the dataZoom range.
   *
   * @param payload - Use `start`/`end` for percentage-based range (0–100),
   * or `startValue`/`endValue` for data value-based range.
   * `dataZoomIndex` targets a specific dataZoom component.
   *
   * @example
   * ```ts
   * // Percentage range
   * dispatch(seActions.dataZoom({ start: 20, end: 80 }));
   *
   * // Reset to full range
   * dispatch(seActions.dataZoom({ start: 0, end: 100 }));
   * ```
   */
  dataZoom: actionFactory("dataZoom"),

  /**
   * Resets the chart to its initial state - reverses all user interactions
   * including zoom, legend selections, and data selections.
   *
   * @example
   * ```ts
   * dispatch(seActions.restore());
   * ```
   */
  restore: actionFactory("restore"),

  /**
   * Sets brush selection areas programmatically.
   *
   * @param payload - `areas` defines the selection regions, each with a
   * mandatory `brushType`. An empty array clears the selection. Requires the
   * `BrushComponent` to be registered via {@link seSetup}.
   *
   * @example
   * ```ts
   * dispatch(seActions.brush({ areas: [{ brushType: 'rect', range: [[10, 50], [20, 60]] }] }));
   * ```
   */
  brush: actionFactory("brush"),

  /**
   * Changes the current timeline index.
   *
   * @param payload - `currentIndex` is the zero-based index to jump to.
   *
   * @example
   * ```ts
   * dispatch(seActions.timelineChange({ currentIndex: 2 }));
   * ```
   */
  timelineChange: actionFactory("timelineChange"),

  /**
   * Sets the timeline play state.
   *
   * @param payload - `playState` - `true` to play, `false` to pause.
   *
   * @example
   * ```ts
   * dispatch(seActions.timelinePlayChange({ playState: true }));
   * ```
   */
  timelinePlayChange: actionFactory("timelinePlayChange"),

  /**
   * Pans or zooms a geo component or a map series, relative to its current view.
   *
   * @param payload - `dx` + `dy` pan by pixels, `zoom` + `originX` + `originY`
   * zoom around a pixel. `geoId` / `geoIndex` / `geoName` target geo components,
   * otherwise map series are targeted.
   *
   * @example
   * ```ts
   * // Pan the first geo component
   * dispatch(seActions.geoRoam({ geoIndex: 0, dx: 40, dy: 0 }));
   *
   * // Zoom in 2x around a pixel
   * dispatch(seActions.geoRoam({ geoIndex: 0, zoom: 2, originX: 200, originY: 150 }));
   * ```
   */
  geoRoam: actionFactory("geoRoam"),

  /**
   * Pans or zooms a graph series, relative to its current view.
   *
   * @param payload - `dx` + `dy` pan by pixels, `zoom` + `originX` + `originY`
   * zoom around a pixel. `seriesId` / `seriesIndex` / `seriesName` narrow the
   * target, omitting them roams every graph series.
   *
   * @example
   * ```ts
   * dispatch(seActions.graphRoam({ seriesIndex: 0, dx: 40, dy: 0 }));
   * dispatch(seActions.graphRoam({ seriesIndex: 0, zoom: 2, originX: 200, originY: 150 }));
   * ```
   */
  graphRoam: actionFactory("graphRoam"),

  /**
   * Pans or zooms a tree series, relative to its current view.
   *
   * @param payload - Same fields as `seActions.graphRoam`.
   *
   * @example
   * ```ts
   * dispatch(seActions.treeRoam({ seriesIndex: 0, dx: 0, dy: -30 }));
   * ```
   */
  treeRoam: actionFactory("treeRoam"),

  /**
   * Pans or zooms a sankey series, relative to its current view.
   *
   * @param payload - Same fields as `seActions.graphRoam`.
   *
   * @example
   * ```ts
   * dispatch(seActions.sankeyRoam({ seriesIndex: 0, zoom: 1.5, originX: 200, originY: 150 }));
   * ```
   */
  sankeyRoam: actionFactory("sankeyRoam"),

  /**
   * Highlights the adjacency of a node in a graph series.
   *
   * @param payload - `seriesIndex` + `dataIndex` identify the node.
   *
   * @example
   * ```ts
   * dispatch(seActions.focusNodeAdjacency({ seriesIndex: 0, dataIndex: 3 }));
   * ```
   */
  focusNodeAdjacency: actionFactory("focusNodeAdjacency"),

  /**
   * Clears the adjacency highlight on a graph series node.
   *
   * @param payload - Optional. `seriesIndex` targets a specific graph series.
   *
   * @example
   * ```ts
   * dispatch(seActions.unfocusNodeAdjacency({ seriesIndex: 0 }));
   * ```
   */
  unfocusNodeAdjacency: actionFactory("unfocusNodeAdjacency"),

  /**
   * Toggles a tree series node between expanded and collapsed.
   *
   * @param payload - `dataIndex` (required) identifies the node.
   * `seriesId` / `seriesIndex` / `seriesName` narrow the tree series.
   *
   * @example
   * ```ts
   * dispatch(seActions.treeExpandAndCollapse({ seriesIndex: 0, dataIndex: 1 }));
   * ```
   */
  treeExpandAndCollapse: actionFactory("treeExpandAndCollapse"),

  /**
   * Moves a sankey series node. ECharts registers `dragNode` for sankey only.
   *
   * @param payload - `dataIndex`, `localX` and `localY` (all required).
   * `localX` / `localY` are fractions of the layout width and height, not
   * pixels. `seriesId` / `seriesIndex` / `seriesName` narrow the series.
   *
   * @example
   * ```ts
   * dispatch(seActions.dragNode({ seriesIndex: 0, dataIndex: 1, localX: 0.5, localY: 0.25 }));
   * ```
   */
  dragNode: actionFactory("dragNode"),
} satisfies SeActions;
