import type { SolidEChartOption } from "./echart";

/**
 * Signature of an array component in the option (e.g. `series`, `xAxis`).
 *
 * @internal
 */
export type ArraySignature = {
  /**
   * Sorted array of id strings from items that carry an `id` field.
   */
  idsSorted: string[];

  /**
   *  Count of items without an `id` field - matched by index during merge.
   */
  noIdCount: number;
};

/**
 * Structural signature of an ECharts option object.
 * Only top-level keys are inspected, deep diffing is intentionally avoided
 * for performance and to keep the diff semantics predictable.
 */
export type OptionSignature = {
  /**
   * Length of `option.options` array (timeline).
   */
  optionsLength: number;

  /**
   *  Length of `option.media` array (responsive).
   */
  mediaLength: number;

  /**
   * Map of array-valued top-level keys to their item signature.
   * Tracks both id-bearing items and anonymous (no-id) items separately
   * because ECharts resolves them differently during merge.
   */
  arrays: Record<string, ArraySignature>;

  /**
   * Sorted list of object-valued top-level keys (e.g. `'grid'`, `'legend'`).
   * */
  objects: string[];

  /**
   *  Sorted list of scalar-valued top-level keys (e.g. `'backgroundColor'`).
   */
  scalars: string[];
};

/**
 * The result of {@link optionMergePlan}, a merge strategy plus the (possibly
 * normalised) option to pass to `setOption`.
 */
export type MergePlan = {
  /**
   * The option to pass to `setOption`. May differ from the input when normalisation is needed.
   */
  option: SolidEChartOption;

  /**
   * The signature of the normalised option.
   * Store this and pass it as `prevSignature` on the next call.
   */
  signature: OptionSignature;

  /**
   * Whether to pass `notMerge: true` to `setOption`.
   */
  notMerge: boolean;

  /**
   * Component keys to pass as `replaceMerge` to `setOption`.
   * Empty array means no targeted replacement needed.
   */
  replaceMerge: string[];
};
