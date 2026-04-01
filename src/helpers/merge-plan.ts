/**
 * Automatic merge strategy inference for ECharts `setOption` calls.
 *
 * Analyses the structural diff between the previous and new option and
 * produces the minimal merge strategy, eliminating the need to
 * reason about `notMerge` and `replaceMerge`.
 *
 * @remarks
 *
 * This module is intentionally dependency-free, no ECharts, no SolidJS.
 * It is a pure data transformation: signature -> plan. This makes it
 * independently testable and reusable outside the reactive layer.
 *
 * **The problem it solves**
 *
 * ECharts' default merge mode (`notMerge: false`) keeps existing components
 * that are absent from the new option. Practical consequences:
 * - Remove a series from the array -> the old series lingers visually
 * - Remove a top-level key like `legend` -> it stays rendered
 * - Replace series by position -> old items at removed positions persist
 *
 * Without this module, `notMerge: true` must passed manually (full
 * replacement, loses animations) or `replaceMerge: ['series']` (targeted,
 * but requires knowing which keys changed), both require deep ECharts
 * knowledge to apply correctly.
 *
 * **What is intentionally excluded**
 *
 * Undocumented ECharts preprocessor behaviour is excluded here until
 * it can be verified against the ECharts source as a stable contract.
 *
 * @see {@link optionMergePlan} for the main entry point
 * @see {@link https://echarts.apache.org/en/api.html#echartsInstance.setOption `echartsInstance.setOption` [external]}
 */

import type { SolidEChartOption } from "@type/echart";
import type { ArraySignature, MergePlan, OptionSignature } from "@type/merge-plan";

/**
 * Reads an item's `id` field as a normalised string.
 *
 * Only accepts string or number - other types are ignored so that
 * inconsistent data surfaces early rather than producing silent mismatches.
 */
const readItemId = (item: unknown): string | undefined => {
  if (item === null || typeof item !== "object" || Array.isArray(item)) return undefined;
  const raw = (item as Record<string, unknown>)["id"];
  if (typeof raw === "string") return raw;
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  return undefined;
};

/**
 * Returns the keys present in `prev` that are missing from `next`.
 * Both arrays are assumed to be sorted - a `Set` lookup keeps this O(n).
 */
const missingKeys = (prev: string[], next: string[]): string[] => {
  if (prev.length === 0) return [];
  if (next.length === 0) return prev.slice();
  const nextSet = new Set(next);
  return prev.filter((key) => !nextSet.has(key));
};

/**
 * Returns `true` if any id present in `prevIds` is absent from `nextIds`.
 * Signals that a previously-tracked item has been removed.
 */
const hasRemovedIds = (prevIds: string[], nextIds: string[]): boolean => {
  if (prevIds.length === 0) return false;
  if (nextIds.length === 0) return true;
  const nextSet = new Set(nextIds);
  return prevIds.some((id) => !nextSet.has(id));
};

/**
 * Builds a structural signature from a top-level ECharts option object.
 * The signature captures only the shape - not the values - of the option.
 * Shape changes (removed keys, removed array items) are what drive merge
 * strategy decisions; value changes are handled by ECharts' normal merge.
 *
 * @param option - The ECharts option object to inspect.
 * @returns A lightweight {@link OptionSignature} for diffing.
 */
export const buildSignature = (option: SolidEChartOption): OptionSignature => {
  const optionsLength = Array.isArray(option.options) ? option.options.length : 0;
  const mediaLength = Array.isArray(option.media) ? option.media.length : 0;

  // Use `Object.create(null)` instead of `{}` because this object is keyed by user-supplied option
  // property names. A plain `{}` inherits keys from `Object.prototype` (`toString`, `constructor`,
  // `valueOf`, etc.), so a lookup like `arrays["constructor"]` would return an inherited function
  // instead of `undefined`, corrupting the signature diff. `Object.create(null)` has no prototype
  // chain, every key either exists, or is `undefined`. No inherited names, no collisions.
  const arrays = Object.create(null) as Record<string, ArraySignature>;
  const objects: string[] = [];
  const scalars: string[] = [];

  for (const key of Object.keys(option)) {
    // options and media are handled separately via their lengths
    if (key === "options" || key === "media") continue;

    const value = option[key];

    if (Array.isArray(value)) {
      const ids = new Set<string>();
      let noIdCount = 0;

      for (const item of value) {
        const id = readItemId(item);

        if (id === undefined) {
          noIdCount++;
        } else {
          ids.add(id);
        }
      }

      arrays[key] = {
        idsSorted: ids.size > 0 ? Array.from(ids).toSorted() : [],
        noIdCount,
      };
    } else if (value !== null && typeof value === "object") {
      objects.push(key);
    } else if (value !== undefined) {
      scalars.push(key);
    }
  }

  // Sort for stable comparison - order of key enumeration is not guaranteed
  if (objects.length > 1) objects.sort();
  if (scalars.length > 1) scalars.sort();

  return { optionsLength, mediaLength, arrays, objects, scalars };
};

/**
 * Produces the minimal correct `setOption` merge strategy by diffing the
 * previous option signature against the new option.
 *
 * **Decision logic (in priority order):**
 *
 * 1. No previous signature (first render) -> `notMerge: false`
 * 2. `options` array shrank (timeline steps removed) -> `notMerge: true`
 * 3. `media` array shrank (responsive breakpoints removed) -> `notMerge: true`
 * 4. Top-level object/scalar keys removed -> `notMerge: true`
 *    (ECharts merge cannot reliably remove missing top-level components/settings)
 * 5. Array items removed (by tracked id or anonymous count) -> `replaceMerge: [key]`
 *    (targeted replacement removes the stale items without resetting everything)
 * 6. Otherwise -> `notMerge: false` (standard merge, no removals detected)
 *
 * @param prevSignature - Signature from the previous `setOption` call.
 *   Pass `null` on first render. Use the `signature` from the previous
 *   {@link MergePlan} return value on subsequent calls.
 * @param option - The new ECharts option to apply.
 * @returns An {@link MergePlan} with the merge strategy and normalised option.
 *
 * @example
 * ```ts
 * let lastSignature: OptionSignature | null = null;
 *
 * createEffect(on([instance, option], ([chart, currentOption]) => {
 *   if (!chart || chart.isDisposed()) return;
 *
 *   const plan = planUpdate(lastSignature, currentOption);
 *   lastSignature = plan.signature;
 *
 *   chart.setOption(plan.option, {
 *     notMerge:     plan.notMerge,
 *     replaceMerge: plan.replaceMerge.length > 0 ? plan.replaceMerge : undefined,
 *   });
 * }));
 * ```
 */
export const optionMergePlan = (
  prevSignature: OptionSignature | null,
  option: SolidEChartOption,
): MergePlan => {
  const nextSignature = buildSignature(option);

  const genMergPlan = (optionSignature: OptionSignature, notMerge: boolean): MergePlan => ({
    option,
    signature: optionSignature,
    notMerge,
    replaceMerge: [],
  });

  // First render - no previous state to diff against
  if (!prevSignature) {
    return genMergPlan(nextSignature, false);
  }

  // Timeline: fewer steps than before -> full reset
  if (nextSignature.optionsLength < prevSignature.optionsLength) {
    return genMergPlan(nextSignature, true);
  }

  // Responsive: fewer media breakpoints -> full reset
  if (nextSignature.mediaLength < prevSignature.mediaLength) {
    return genMergPlan(nextSignature, true);
  }

  // Top-level object/scalar keys removed -> full reset
  // ECharts merge keeps absent top-level components/settings from previous
  // options. If a key disappeared entirely, a full reset is the safe path.
  const removedObjects = missingKeys(prevSignature.objects, nextSignature.objects);
  if (removedObjects.length > 0) {
    return genMergPlan(nextSignature, true);
  }

  // ECharts cannot remove scalar top-level keys (e.g. backgroundColor) via
  // merge, once set they persist until `notMerge: true` clears the model.
  const removedScalars = missingKeys(prevSignature.scalars, nextSignature.scalars);
  if (removedScalars.length > 0) {
    return genMergPlan(nextSignature, true);
  }

  // Array items removed -> targeted `replaceMerge`
  // For each array-valued key, check whether items were removed.
  // `replaceMerge` on that key tells ECharts: "treat this array as a full
  // replacement rather than a merge", only id-matched items are kept,
  // everything else is removed. This avoids resetting the entire chart.
  const keysNeedingReplace: string[] = [];

  for (const key of Object.keys(prevSignature.arrays)) {
    const prev = prevSignature.arrays[key];
    if (!prev) continue;

    const next = nextSignature.arrays[key];

    // Key removed entirely - treat as empty array replacement
    if (!next) {
      if (prev.idsSorted.length > 0 || prev.noIdCount > 0) {
        keysNeedingReplace.push(key);
      }
      continue;
    }

    // Named items (with id) removed
    if (hasRemovedIds(prev.idsSorted, next.idsSorted)) {
      keysNeedingReplace.push(key);
      continue;
    }

    // Anonymous items (no id) - matched by index, fewer means some were removed
    if (next.noIdCount < prev.noIdCount) {
      keysNeedingReplace.push(key);
    }
  }

  return {
    option,
    signature: nextSignature,
    notMerge: false,
    replaceMerge: keysNeedingReplace.length > 0 ? keysNeedingReplace.toSorted() : [],
  };
};
