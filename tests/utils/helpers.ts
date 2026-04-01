import type { ArraySignature, OptionSignature } from "../../src/types/merge-plan";

/**
 * Builds a minimal valid OptionSignature for use as prevSignature in tests.
 */
export const sig = (overrides: Partial<OptionSignature> = {}): OptionSignature => ({
  optionsLength: 0,
  mediaLength: 0,
  arrays: {},
  objects: [],
  scalars: [],
  ...overrides,
});

export const minMediaOption = { option: {} };
export const minMedia = { media: [minMediaOption] };

/**
 * Shorthand ArraySignature builder.
 */
export const arrSig = (idsSorted: string[], noIdCount: number): ArraySignature => ({
  idsSorted,
  noIdCount,
});
