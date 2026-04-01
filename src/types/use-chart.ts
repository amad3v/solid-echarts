import type { EChartsType } from "echarts/core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EChartFnApi<T extends (...args: any) => any> = (
  ...args: Parameters<T>
) => ReturnType<T> | undefined;

/**
 * Stable proxy for calling ECharts instance methods directly, without null
 * checks, optional chaining, or signal unwrapping.
 *
 * @remarks

 * Every method reads the live instance at call time. When the instance is
 * unavailable (pre-mount, mid-reinit, post-dispose), methods return
 * `undefined` and void methods silently no-op. The one exception is
 * `isDisposed`, it returns `true` when no instance exists, which is
 * semantically correct.
 *
 * Methods already managed by the library are intentionally excluded:
 * `setOption` -> `createChartEffect` / `option` prop,
 * `setTheme` -> `theme` prop,
 * `showLoading`/`hideLoading` -> `loading` prop,
 * `resize` -> `autoResize` / ResizeObserver,
 * `on`/`off` -> `onEvents` / `onSurfaceEvents`,
 * `dispatchAction` -> `dispatch`,
 * `dispose` -> component lifecycle.
 *
 * @see {@link useChart} for how to access this object
 */
export type SolidEChartAPI = {
  // Identity
  /**
   * The ECharts internal instance ID. Useful for debugging, logging, and
   * cross-referencing instances, for example, identifying which chart
   * fired an event when multiple charts share a group.
   */
  getId: () => string | undefined;

  // Dimensions

  /**
   * Current rendered width in CSS pixels.
   */
  getWidth: () => number | undefined;

  /**
   * Current rendered height in CSS pixels.
   */
  getHeight: () => number | undefined;

  /**
   * Device pixel ratio used by the renderer.
   */
  getDevicePixelRatio: () => number | undefined;

  // DOM

  /**
   * The container `HTMLElement` the chart was initialised on.
   * */
  getDom: () => HTMLElement | undefined;

  // State

  /**
   * The current merged ECharts option, includes ECharts' internal defaults
   * and all `setOption` calls. Not the raw user option.
   */
  getOption: EChartFnApi<EChartsType["getOption"]>;

  /**
   * Whether the instance is disposed or unavailable.
   * Returns `true` when no instance is available, semantically correct
   * since a non-existent instance is not currently rendering.
   */
  isDisposed: () => boolean;

  /**
   * Whether the chart was initialised in server-side rendering (SSR) mode.
   * Use to guard canvas-only operations when SSR is active.
   */
  isSSR: () => boolean;
  /**
   * Exports the chart as a base64 data URL.
   * @param opts - `type` ("png"|"jpeg"|"svg"), `pixelRatio`, `backgroundColor`,
   * `excludeComponents`.
   */
  getDataURL: EChartFnApi<EChartsType["getDataURL"]>;

  /**
   * Exports all charts in the same group as a single combined image.
   * Requires `connect`, charts must share a group via the `group` prop.
   */
  getConnectedDataURL: EChartFnApi<EChartsType["getConnectedDataURL"]>;

  /**
   * Renders the chart to an SVG string (SVG renderer only).
   * Useful for SSR and server-side image generation.
   */
  renderToSVGString: EChartFnApi<EChartsType["renderToSVGString"]>;

  /**
   * Renders the chart to an `HTMLCanvasElement` (canvas renderer only).
   *
   * @remarks

   * Unlike `getDataURL` which converts to a base64 string, this returns the
   * raw canvas element, useful for canvas-to-canvas compositing, loading
   * into a WebGL texture, or passing to libraries like fabric.js.
   *
   * Throws if called on a chart using the SVG renderer.
   *
   * @param opts - Optional `backgroundColor` and `pixelRatio` overrides.
   */
  renderToCanvas: EChartFnApi<EChartsType["renderToCanvas"]>;

  // Coordinate conversion

  /**
   * Converts a data coordinate to a pixel coordinate.
   * @param finder - Target coordinate system e.g. `{ seriesIndex: 0 }`.
   * @param value - Data value in the coordinate system's units.
   * @see {@link https://echarts.apache.org/en/api.html#echartsInstance.convertToPixel `echartsInstance.convertToPixel` [external]}
   */
  convertToPixel: EChartFnApi<EChartsType["convertToPixel"]>;

  /**
   * Converts a pixel coordinate back to a data coordinate.
   * @see {@link https://echarts.apache.org/en/api.html#echartsInstance.convertFromPixel `echartsInstance.convertFromPixel` [external]}
   */
  convertFromPixel: EChartFnApi<EChartsType["convertFromPixel"]>;

  /**
   * Converts a data value coordinate into its corresponding layout coordinate
   * @see {@link https://echarts.apache.org/en/api.html#echartsInstance.convertToLayout `echartsInstance.convertToLayout` [external]}
   */
  convertToLayout: EChartFnApi<EChartsType["convertToLayout"]>;

  /**
   * Returns whether a pixel point falls inside a coordinate system or component.
   * @param finder - Target coordinate system or component.
   * @param value - `[x, y]` pixel coordinate to test.
   */
  containPixel: EChartFnApi<EChartsType["containPixel"]>;

  // Visual

  /**
   * Reads a computed visual property from a series or data item.
   * @param finder - Target series/data item.
   * @param visualType - e.g. `'color'`, `'symbol'`, `'symbolSize'`.
   */
  getVisual: EChartFnApi<EChartsType["getVisual"]>;

  // Data

  /**
   * Incrementally appends data to a series without a full `setOption` cycle.
   * Designed for streaming large datasets, pair with manual mode by omitting
   * the `option` prop on `SolidEChart`.
   *
   * @remarks

   * The coordinate system extent must be fixed in the initial `setOption`
   * call, `appendData` does not update axis min/max ranges.
   *
   * @see {@link https://echarts.apache.org/en/api.html#echartsInstance.appendData `echartsInstance.appendData` [external]}
   */
  appendData: EChartFnApi<EChartsType["appendData"]>;

  // Control

  /**
   * Clears all series and components without disposing the instance.
   * The instance remains usable, call `setOption` afterward to render
   * new content.
   */
  clear: () => void;
};
