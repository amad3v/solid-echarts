import type { Accessor } from "solid-js";
import { createEffect, on } from "solid-js";

import type { ActionPayload, DispatchOpt } from "@type/actions";
import type { EChartsType } from "echarts/core";

/**
 * Reactive `dispatchAction` binding, fires whenever the action accessor
 * returns a new payload. Conceptually identical to `createEffect` but
 * purpose-built for actions: instead of running an arbitrary side effect,
 * it calls `chart.dispatchAction`.
 *
 * @remarks
 *
 * Unlike {@link useChart `dispatch`} which is imperative ("fire this action now"),
 * `createAction` is declarative - "keep this action in sync with this state".
 *
 * Built-in guards make it safe to call at any time:
 * - Before the instance is ready - silently waits
 * - After the instance is disposed - silently no-ops
 * - After a renderer reinit - re-fires automatically on the new instance
 *   because both `instance` and `action` are tracked dependencies
 *
 * The first run is deferred intentionally, dispatching before the chart
 * has rendered its first frame causes actions like `highlight` and `showTip`
 * to silently no-op since the model isn't ready yet.
 *
 * @param instance - ECharts instance accessor, typically from {@link createChart}
 * or {@link useChart}
 * @param action - Accessor returning the {@link ActionPayload} to dispatch.
 * Re-evaluated whenever its reactive dependencies change.
 * @param opt - Optional dispatch options passed to every `dispatchAction` call.
 *
 * @example
 * ```tsx
 * // Highlight follows a hovered table row - both states in one accessor
 * const [hoveredRow, setHoveredRow] = createSignal<number | null>(null);
 *
 * createAction(instance, () =>
 *   hoveredRow() !== null
 *     ? seActions.highlight({ seriesIndex: 0, dataIndex: hoveredRow()! })
 *     : seActions.downplay({})
 * );
 *
 * // ...
 * // Table rows update the signal - chart reacts automatically
 * <tr onMouseEnter={() => setHoveredRow(i)} onMouseLeave={() => setHoveredRow(null)}>
 * ```
 *
 * @see {@link useChart} for the imperative `dispatch` alternative
 * @see {@link seActions} for typed action payload factories
 */
export const createAction = (
  instance: Accessor<EChartsType | null>,
  action: Accessor<ActionPayload>,
  opt?: DispatchOpt,
): void => {
  if (typeof window === "undefined") return;

  createEffect(
    on(
      [instance, action],
      ([chart, payload]) => {
        if (!chart || chart.isDisposed()) return;
        chart.dispatchAction(payload, opt);
      },
      // `defer: true`: skip the first run until both instance and action
      // have settled. Dispatching on the very first synchronous evaluation
      // before the chart has rendered its first frame causes highlight/tip
      // actions to silently no-op since the model isn't ready yet.
      // The first meaningful dispatch happens on the first actual change.
      { defer: true },
    ),
  );
};
