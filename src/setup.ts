import type { Setup } from "@type/setup";
import { use } from "echarts/core";

/**
 * Registers ECharts charts, components, and renderers once at the app root.
 *
 * Must be called before any `SolidEChart` component mounts. Internally calls
 * ECharts' `use` - safe to call multiple times, subsequent calls are no-ops
 * for already-registered extensions.
 *
 * @param extensions - Array of ECharts chart types, components, and renderers to register.
 * Passed directly to `echarts.use`. Only registered extensions are included in the bundle,
 * tree-shaking sees through the re-exports.
 *
 * @example
 * ```ts
 * import {
 *   seSetup,
 *   BarChart,
 *   LineChart,
 *   GridComponent,
 *   TooltipComponent,
 *   CanvasRenderer,
 * } from 'solid-echarts';
 *
 * seSetup([BarChart, LineChart, GridComponent, TooltipComponent, CanvasRenderer]);
 * ```
 *
 * @see {@link https://echarts.apache.org/en/api.html#echarts.use `echarts.use` API [external]}
 */
export const seSetup: Setup = (extensions) => {
  use(extensions);
};
