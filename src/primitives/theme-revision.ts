import type { Accessor } from "solid-js";

import type { EChartsType } from "echarts/core";

/**
 * Theme revision of every instance created by {@link createChart}.
 *
 * @remarks
 *
 * ECharts' `setTheme` rebuilds the model from the option its option manager
 * backed up at the first `setOption` (later merges are not recorded), so after
 * a theme switch the chart shows that first option. `createChart` bumps the
 * instance's revision after each `setTheme`; {@link createChartEffect} tracks
 * it and reapplies the latest option. `createChart` owns the theme and
 * `createChartEffect` the option, and the instance is all they share, so the
 * revision is looked up by instance.
 *
 * A `WeakMap`, so a disposed instance is not kept alive by the registry.
 *
 * @internal
 */
const themeRevisions = new WeakMap<EChartsType, Accessor<number>>();

/**
 * Registers the theme revision accessor of an instance created by
 * {@link createChart}.
 *
 * @internal
 */
export const registerThemeRevision = (chart: EChartsType, revision: Accessor<number>): void => {
  themeRevisions.set(chart, revision);
};

/**
 * Reads (and tracks, inside a reactive scope) the theme revision of an
 * instance. `undefined` for an instance not created by {@link createChart}.
 *
 * @internal
 */
export const readThemeRevision = (chart: EChartsType): number | undefined =>
  themeRevisions.get(chart)?.();
