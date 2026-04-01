import { createContext } from "solid-js";

import type { SolidEChartConfigContextValue } from "@type/context";
import { DEFAULT_THEME } from "@utils/common";

/**
 * Default configuration values for the ECharts config context.
 *
 * With these defaults `SolidEChart` behaves predictably  without a
 * `SolidEChartProvider` ancestor. Any value explicitly set on a
 * provider or per-chart prop overrides the corresponding default.
 */
const defaultConfigContextValue: SolidEChartConfigContextValue = {
  theme: () => DEFAULT_THEME,
  renderer: () => "canvas",
  locale: () => "EN",
  //oxlint-disable-next-line no-useless-undefined
  group: () => undefined,
  devicePixelRatio: () => (typeof window === "undefined" ? 1 : window.devicePixelRatio),
  useDirtyRect: () => false,
  useCoarsePointer: () => false,
  pointerSize: () => 0,
  ssr: () => false,
  width: () => undefined,
  height: () => undefined,
  autoResize: () => true,
  resizeDebounce: () => 100,
  updateOptions: () => ({}),
};

/**
 * SolidJS context that carries shared ECharts configuration down the component
 * tree. Consumed by `SolidEChart` to resolve inherited defaults.
 *
 * @internal
 */
export const SolidEChartsConfigContext =
  createContext<SolidEChartConfigContextValue>(defaultConfigContextValue);
