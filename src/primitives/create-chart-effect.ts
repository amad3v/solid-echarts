import { createEffect, on, untrack, type Accessor } from "solid-js";

import type { SolidEChartOption } from "@type/echart";
import type { OptionSignature } from "@type/merge-plan";
import type { CreateChartEffectOptions } from "@type/primitives";
import { toAccessor } from "@utils/common";
import { optionMergePlan } from "@utils/merge-plan";
import type { EChartsType, SetOptionOpts } from "echarts/core";

/**
 * Reactive `setOption` bridge - calls `chart.setOption` whenever `instance`
 * or `option` changes.
 *
 * @remarks
 *
 * Both `instance` and `option` are explicit tracked dependencies via `on()`:
 *
 * - **`option` changes**: calls `setOption` with the new option on the
 *   current instance. The normal reactive update path.
 * - **`instance` changes**: fires on both transitions of a reinit cycle:
 *   `chart -> null` (early return, no call on a disposed instance) and
 *   `null -> newChart` (applies the current option to the fresh instance).
 *
 * **`autoMerge` mode**
 *
 * When `autoMerge: true`, explicit `notMerge` and `replaceMerge` options
 * are ignored. Instead, {@link optionMergePlan} analyses the structural diff
 * between the previous and new option and automatically picks the minimal
 * correct merge strategy, eliminating the need to manually reason about
 * `notMerge` and `replaceMerge`.
 *
 * Note: on instance reinit the signature is reset so the first `setOption`
 * on the new instance always uses `notMerge: false`.
 * A fresh instance has no previous state to diff against.
 *
 * When `autoMerge: false` (default), merge strategy params (`notMerge`,
 * `replaceMerge`, `lazyUpdate`, `silent`) are read with `untrack`, they
 * configure the call but are not tracked as dependencies. A change to merge
 * strategy alone does not trigger a redundant `setOption` call.
 *
 * SSR-safe: no-ops on the server.
 *
 * @param instance - ECharts instance accessor from {@link createChart} or
 * {@link useChart}.
 * @param option - Reactive accessor returning the full ECharts option object.
 * Must be an accessor - passing a plain object snapshots at call time and
 * never updates.
 * @param opts - Optional merge strategy. See {@link CreateChartEffectOptions}.
 *
 * @example
 * ```tsx
 * // Basic usage - explicit merge strategy (default)
 * createChartEffect(instance, option);
 *
 * // With replaceMerge - targeted series replacement
 * createChartEffect(instance, option, { replaceMerge: ['series'] });
 *
 * // With autoMerge - library infers the correct strategy automatically
 * createChartEffect(instance, option, { autoMerge: true });
 * ```
 *
 * @see {@link createChart} for instance creation
 * @see {@link optionMergePlan} for the autoMerge inference logic
 * @see {@link SolidEChart} for the component API that wires this automatically
 * @see {@link https://echarts.apache.org/en/api.html#echartsInstance.setOption `echartsInstance.setOption` [external]}
 */
export const createChartEffect = (
  instance: Accessor<EChartsType | null>,
  option: Accessor<SolidEChartOption | undefined>,
  opts: CreateChartEffectOptions = {},
): void => {
  if (typeof window === "undefined") return;

  // Defensive normalisation of merge-strategy fields.
  // `SolidEChart` wires these, but `createChartEffect` is also a
  // public primitive and can be called directly; keeping `??` defaults here
  // ensures `opts.*` omissions never propagate `undefined` into `toAccessor`.
  const autoMerge = toAccessor(opts.autoMerge ?? false);
  const notMerge = toAccessor(opts.notMerge ?? false);
  const replaceMerge = toAccessor(opts.replaceMerge ?? []);
  const lazyUpdate = toAccessor(opts.lazyUpdate ?? false);
  const silent = toAccessor(opts.silent ?? false);

  // Tracks the structural signature of the last applied option.
  // Only used when autoMerge is active. Reset to null on instance reinit
  // (null -> newChart transition) so the first setOption on a fresh instance
  // always starts without a previous signature to diff against.
  let lastSignature: OptionSignature | null = null;

  // Explicit dependency tracking via `on` prevents accidental signal reads
  // inside the callback from becoming unintended dependencies.
  // `defer: false`: the first run applies the initial option to the instance.
  createEffect(
    on(
      [instance, option],
      ([chart, currentOption]) => {
        // Skip when option is undefined, happens when the component is
        // used in manual mode (no option prop) and `createChartEffect` is wired
        // unconditionally. The effect will re-run when option becomes defined.
        if (!chart || chart.isDisposed() || currentOption === undefined) {
          lastSignature = null;
          return;
        }

        if (untrack(autoMerge)) {
          // `optionMergePlan` compares the current option against the last signature
          // and returns the minimal correct merge strategy. The signature is
          // updated after every successful setOption call.
          //
          // When instance is a new chart (reinit), `lastSignature` was reset
          // to null on the previous cleanup, `optionMergePlan` treats null as first
          // render and returns `notMerge: false`, for a fresh instance with no prior state.
          const plan = optionMergePlan(lastSignature, currentOption as Record<string, unknown>);
          const opts = {
            notMerge: plan.notMerge,
            replaceMerge: plan.replaceMerge.length > 0 ? plan.replaceMerge : undefined,
            lazyUpdate: untrack(lazyUpdate),
            silent: untrack(silent),
          } as SetOptionOpts;

          chart.setOption(plan.option, opts);

          lastSignature = plan.signature;
        } else {
          // Merge strategy params are untracked, they configure the call
          // without becoming reactive dependencies. The next natural trigger
          // (instance or option change) will pick up any updated values.
          chart.setOption(currentOption, {
            notMerge: untrack(notMerge),
            replaceMerge: untrack(replaceMerge),
            lazyUpdate: untrack(lazyUpdate),
            silent: untrack(silent),
          });
        }
      },
      { defer: false },
    ),
  );
};
