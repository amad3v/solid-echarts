// Default is null - reading useChart() outside an <SolidECharts /> tree

import { createContext } from "solid-js";

import type { SolidEChartInstanceContextValue } from "@type/context";

/**
 * Carries the live ECharts instance down the component
 * tree. Published by `SolidEChart` and consumed by {@link useChart}.
 *
 * @remarks
 *
 * Defaults to `{ instance: () => null }` so {@link useChart} always returns
 * a stable accessor outside a `SolidEChart` tree, never throws, never
 * requires a null context guard at the call site.
 *
 * @internal
 */
export const EChartsInstanceContext = createContext<SolidEChartInstanceContextValue>({
  instance: () => null,
});
