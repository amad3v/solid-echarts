import { describe, expect, it } from "vitest";

import { buildSignature, optionMergePlan } from "../../src/helpers/merge-plan";
import type { SolidEChartOption } from "../../src/types/echart";
import type { ArraySignature, OptionSignature } from "../../src/types/merge-plan";
import { arrSig, minMedia, minMediaOption, sig } from "../utils/helpers";

describe("buildSignature", () => {
  describe("empty option", () => {
    it("should return zero lengths and empty collections for an empty option", () => {
      const result = buildSignature({});
      expect(result).toEqual<OptionSignature>({
        optionsLength: 0,
        mediaLength: 0,
        arrays: {},
        objects: [],
        scalars: [],
      });
    });
  });

  describe("options and media length", () => {
    it("should count options array length correctly", () => {
      const result = buildSignature({ options: [{}, {}] });
      expect(result.optionsLength).toStrictEqual(2);
    });
    it("should return 0 for optionsLength when options is not an array", () => {
      // @ts-expect-error for test purposes
      expect(buildSignature({ options: {} }).optionsLength).toStrictEqual(0);
    });

    it("should return 0 for optionsLength when options is absent", () => {
      expect(buildSignature({}).optionsLength).toStrictEqual(0);
    });

    it("should count media array length correctly", () => {
      const result = buildSignature({ media: [minMediaOption, minMediaOption, minMediaOption] });
      expect(result.mediaLength).toStrictEqual(3);
    });

    it("should return 0 for mediaLength when media is not an array", () => {
      // @ts-expect-error for test purposes
      expect(buildSignature({ media: "invalid" }).mediaLength).toStrictEqual(0);
    });

    it("should NOT classify options or media keys in arrays/objects/scalars", () => {
      const result = buildSignature({ options: [{}], media: [minMediaOption] });
      expect(result.arrays).toEqual({});
      expect(result.objects).toStrictEqual([]);
      expect(result.scalars).toStrictEqual([]);
    });
  });

  describe("scalar classification", () => {
    it("should classify a string value as a scalar", () => {
      expect(buildSignature({ backgroundColor: "red" }).scalars).toStrictEqual(["backgroundColor"]);
    });

    it("should classify a number value as a scalar", () => {
      expect(buildSignature({ hoverLayerThreshold: 0 }).scalars).toStrictEqual([
        "hoverLayerThreshold",
      ]);
    });

    it("should classify a boolean value as a scalar", () => {
      expect(buildSignature({ animation: false }).scalars).toStrictEqual(["animation"]);
    });

    it("should classify null values as scalars to track key presence", () => {
      expect(buildSignature({ key: null }).scalars).toStrictEqual(["key"]);
    });

    it("should NOT classify undefined as a scalar", () => {
      expect(buildSignature({ key: undefined }).scalars).toStrictEqual([]);
    });

    it("should sort scalar keys alphabetically when more than one", () => {
      const result = buildSignature({ z: "last", a: "first", m: "mid" });
      expect(result.scalars).toStrictEqual(["a", "m", "z"]);
    });

    it("should not sort when there is only one scalar key", () => {
      const result = buildSignature({ backgroundColor: "red" });
      expect(result.scalars).toStrictEqual(["backgroundColor"]);
    });
  });

  describe("object classification", () => {
    it("should classify a plain object value as an object key", () => {
      expect(buildSignature({ grid: {} }).objects).toStrictEqual(["grid"]);
    });

    it("should NOT classify null as an object", () => {
      expect(buildSignature({ key: null }).objects).toStrictEqual([]);
    });

    it("should NOT classify an array as an object", () => {
      // arrays go into arrays, not objects
      expect(buildSignature({ series: [] }).objects).toStrictEqual([]);
    });

    it("should sort object keys alphabetically when more than one", () => {
      const result = buildSignature({ tooltip: {}, grid: {}, legend: {} });
      expect(result.objects).toStrictEqual(["grid", "legend", "tooltip"]);
    });

    it("should not sort when there is only one object key", () => {
      const result = buildSignature({ grid: { top: 10 } });
      expect(result.objects).toStrictEqual(["grid"]);
    });
  });

  describe("array classification", () => {
    it("should classify an array value under arrays", () => {
      const result = buildSignature({ series: [] });
      expect(result.arrays).toHaveProperty("series");
    });

    it("should return empty idsSorted and zero noIdCount for an empty array", () => {
      const result = buildSignature({ series: [] });
      expect(result.arrays["series"]).toStrictEqual<ArraySignature>({
        idsSorted: [],
        noIdCount: 0,
      });
    });

    it("should count anonymous items (no id field) in noIdCount", () => {
      const result = buildSignature({ series: [{ type: "bar" }, { type: "line" }] });
      expect(result.arrays["series"]?.noIdCount).toStrictEqual(2);
      expect(result.arrays["series"]?.idsSorted).toStrictEqual([]);
    });

    it("should extract string ids into idsSorted", () => {
      const result = buildSignature({
        series: [{ id: "a" }, { id: "b" }, { id: "c" }],
      });
      expect(result.arrays["series"]?.idsSorted).toStrictEqual(["a", "b", "c"]);
      expect(result.arrays["series"]?.noIdCount).toStrictEqual(0);
    });

    it("should stringify numeric ids", () => {
      const result = buildSignature({ series: [{ id: 1 }, { id: 2 }] });
      expect(result.arrays["series"]?.idsSorted).toStrictEqual(["1", "2"]);
    });

    it("should sort idsSorted alphabetically", () => {
      const result = buildSignature({
        series: [{ id: "z" }, { id: "a" }, { id: "m" }],
      });
      expect(result.arrays["series"]?.idsSorted).toStrictEqual(["a", "m", "z"]);
    });

    it("should deduplicate duplicate ids (Set semantics)", () => {
      const result = buildSignature({ series: [{ id: "a" }, { id: "a" }] });
      expect(result.arrays["series"]?.idsSorted).toStrictEqual(["a"]);
    });

    it("should split mixed items: id-bearing into idsSorted, rest into noIdCount", () => {
      const result = buildSignature({
        series: [{ id: "a" }, { type: "bar" }, { id: "b" }, { type: "line" }],
      });
      expect(result.arrays["series"]?.idsSorted).toStrictEqual(["a", "b"]);
      expect(result.arrays["series"]?.noIdCount).toStrictEqual(2);
    });

    it("should ignore array items that are not plain objects (null, string, number)", () => {
      const result = buildSignature({ series: [null, "invalid", 42, [], { id: "ok" }] });
      // null, string, number, array -> noIdCount; { id: "ok" } -> idsSorted
      expect(result.arrays["series"]?.idsSorted).toStrictEqual(["ok"]);
      expect(result.arrays["series"]?.noIdCount).toStrictEqual(4);
    });

    it("should ignore items with invalid id types (boolean, object, NaN)", () => {
      const result = buildSignature({
        series: [{ id: true }, { id: {} }, { id: NaN }, { id: Infinity }],
      });
      expect(result.arrays["series"]?.noIdCount).toStrictEqual(4);
      expect(result.arrays["series"]?.idsSorted).toStrictEqual([]);
    });

    it("should handle multiple array keys independently", () => {
      const result = buildSignature({
        series: [{ id: "s1" }],
        xAxis: [{ id: "x1" }, { type: "value" }],
      });
      expect(result.arrays["series"]).toStrictEqual<ArraySignature>({
        idsSorted: ["s1"],
        noIdCount: 0,
      });
      expect(result.arrays["xAxis"]).toStrictEqual<ArraySignature>({
        idsSorted: ["x1"],
        noIdCount: 1,
      });
    });
  });

  describe("mixed option classification", () => {
    it("should correctly classify a realistic mixed option", () => {
      const option = {
        backgroundColor: "white",
        animation: true,
        grid: { top: 10 },
        tooltip: {},
        series: [{ id: "s1" }, { type: "line" }],
        xAxis: [{}],
        options: [{}, {}],
        media: [minMediaOption],
      } as SolidEChartOption;
      const result = buildSignature(option);
      expect(result.optionsLength).toStrictEqual(2);
      expect(result.mediaLength).toStrictEqual(1);
      expect(result.scalars).toStrictEqual(["animation", "backgroundColor"]);
      expect(result.objects).toStrictEqual(["grid", "tooltip"]);
      expect(result.arrays["series"]).toStrictEqual<ArraySignature>({
        idsSorted: ["s1"],
        noIdCount: 1,
      });
      expect(result.arrays["xAxis"]).toStrictEqual<ArraySignature>({
        idsSorted: [],
        noIdCount: 1,
      });
      expect("options" in result.arrays).toStrictEqual(false);
      expect("media" in result.arrays).toStrictEqual(false);
    });
  });
});

describe("optionMergePlan", () => {
  // see "should classify null values as scalars to track key presence" test
  // The consequence: null -> absent triggers notMerge: true
  it("should trigger notMerge when a null-valued key is removed", () => {
    // @ts-expect-error for test purposes
    const prev = buildSignature({ backgroundColor: null });
    const plan = optionMergePlan(prev, {});
    expect(plan.notMerge).toBe(true);
  });

  describe("return shape invariants", () => {
    it("should always return the same option reference passed in", () => {
      const option = { series: [] as unknown[] };
      const plan = optionMergePlan(null, option);
      expect(plan.option).toBe(option);
    });

    it("should always return a signature object", () => {
      const plan = optionMergePlan(null, {});
      expect(plan.signature).toBeDefined();
      expect(typeof plan.signature).toStrictEqual("object");
    });

    it("should always return a boolean notMerge", () => {
      expect(typeof optionMergePlan(null, {}).notMerge).toStrictEqual("boolean");
    });

    it("should always return an array for replaceMerge", () => {
      expect(Array.isArray(optionMergePlan(null, {}).replaceMerge)).toStrictEqual(true);
    });
  });

  describe("First render (prevSignature is null)", () => {
    it("should return notMerge: false on first render", () => {
      const plan = optionMergePlan(null, {});
      expect(plan.notMerge).toStrictEqual(false);
    });

    it("should return empty replaceMerge on first render", () => {
      const plan = optionMergePlan(null, {});
      expect(plan.replaceMerge).toStrictEqual([]);
    });

    it("should return correct signature on first render with series", () => {
      const option = { series: [{ id: "s1" }] };
      const plan = optionMergePlan(null, option);
      expect(plan.signature.arrays["series"]).toStrictEqual<ArraySignature>({
        idsSorted: ["s1"],
        noIdCount: 0,
      });
    });

    it("should not return notMerge: true even when option has removable-looking data", () => {
      // On first render there is no previous state to diff - never notMerge: true
      const plan = optionMergePlan(null, { series: [], legend: {} });
      expect(plan.notMerge).toStrictEqual(false);
    });

    it("should produce a signature that can be chained as prevSignature", () => {
      const first = optionMergePlan(null, { series: [{ id: "a" }] });
      const second = optionMergePlan(first.signature, { series: [{ id: "a" }] });
      expect(second.notMerge).toStrictEqual(false);
      expect(second.replaceMerge).toStrictEqual([]);
    });
  });

  describe("Options (timeline) array shrank", () => {
    it("should return notMerge: true when options array shrinks", () => {
      const prev = sig({ optionsLength: 3 });
      const plan = optionMergePlan(prev, { options: [{}, {}] });
      expect(plan.notMerge).toStrictEqual(true);
    });

    it("should return empty replaceMerge when notMerge due to timeline shrink", () => {
      const prev = sig({ optionsLength: 3 });
      const plan = optionMergePlan(prev, { options: [{}, {}] });
      expect(plan.replaceMerge).toStrictEqual([]);
    });

    it("should NOT trigger notMerge when options array stays the same size", () => {
      const prev = sig({ optionsLength: 2 });
      const plan = optionMergePlan(prev, { options: [{}, {}] });
      expect(plan.notMerge).toStrictEqual(false);
    });

    it("should NOT trigger notMerge when options array grows", () => {
      const prev = sig({ optionsLength: 1 });
      const plan = optionMergePlan(prev, { options: [{}, {}] });
      expect(plan.notMerge).toStrictEqual(false);
    });

    it("should trigger notMerge when options shrinks from 1 to 0", () => {
      const prev = sig({ optionsLength: 1 });
      const plan = optionMergePlan(prev, {});
      expect(plan.notMerge).toStrictEqual(true);
    });
  });

  describe("Media (responsive) array shrank", () => {
    it("should return notMerge: true when media array shrinks", () => {
      const prev = sig({ mediaLength: 2 });
      const plan = optionMergePlan(prev, minMedia);
      expect(plan.notMerge).toStrictEqual(true);
    });

    it("should return empty replaceMerge when notMerge due to media shrink", () => {
      const prev = sig({ mediaLength: 2 });
      const plan = optionMergePlan(prev, minMedia);
      expect(plan.replaceMerge).toStrictEqual([]);
    });

    it("should NOT trigger notMerge when media stays the same size", () => {
      const prev = sig({ mediaLength: 1 });
      const plan = optionMergePlan(prev, minMedia);
      expect(plan.notMerge).toStrictEqual(false);
    });

    it("should NOT trigger notMerge when media grows", () => {
      const prev = sig({ mediaLength: 1 });
      const plan = optionMergePlan(prev, minMedia);
      expect(plan.notMerge).toStrictEqual(false);
    });

    it("should trigger notMerge when media shrinks from 1 to 0", () => {
      const prev = sig({ mediaLength: 1 });
      const plan = optionMergePlan(prev, {});
      expect(plan.notMerge).toStrictEqual(true);
    });
  });

  describe("Top-level object keys removed", () => {
    it("should return notMerge: true when an object key is removed", () => {
      const prev = sig({ objects: ["grid", "legend"] });
      const plan = optionMergePlan(prev, { legend: {} });
      expect(plan.notMerge).toStrictEqual(true);
    });

    it("should return notMerge: true when all object keys are removed", () => {
      const prev = sig({ objects: ["legend"] });
      const plan = optionMergePlan(prev, {});
      expect(plan.notMerge).toStrictEqual(true);
    });

    it("should NOT trigger notMerge when object keys are unchanged", () => {
      const prev = sig({ objects: ["grid"] });
      const plan = optionMergePlan(prev, { grid: {} });
      expect(plan.notMerge).toStrictEqual(false);
    });

    it("should NOT trigger notMerge when new object keys are added", () => {
      const prev = sig({ objects: ["grid"] });
      const plan = optionMergePlan(prev, { grid: {}, legend: {} });
      expect(plan.notMerge).toStrictEqual(false);
    });

    it("should return empty replaceMerge when notMerge due to removed object key", () => {
      const prev = sig({ objects: ["grid", "legend"] });
      const plan = optionMergePlan(prev, { legend: {} });
      expect(plan.replaceMerge).toStrictEqual([]);
    });
  });

  describe("Top-level scalar keys removed", () => {
    it("should return notMerge: true when a scalar key is removed", () => {
      const prev = sig({ scalars: ["animation", "backgroundColor"] });
      const plan = optionMergePlan(prev, { animation: true });
      expect(plan.notMerge).toStrictEqual(true);
    });

    it("should return notMerge: true when the only scalar key is removed", () => {
      const prev = sig({ scalars: ["backgroundColor"] });
      const plan = optionMergePlan(prev, {});
      expect(plan.notMerge).toStrictEqual(true);
    });

    it("should NOT trigger notMerge when scalar keys are unchanged", () => {
      const prev = sig({ scalars: ["backgroundColor"] });
      const plan = optionMergePlan(prev, { backgroundColor: "blue" });
      expect(plan.notMerge).toStrictEqual(false);
    });

    it("should NOT trigger notMerge when new scalar keys are added", () => {
      const prev = sig({ scalars: ["backgroundColor"] });
      const plan = optionMergePlan(prev, { backgroundColor: "blue", animation: false });
      expect(plan.notMerge).toStrictEqual(false);
    });

    it("should return empty replaceMerge when notMerge due to removed scalar key", () => {
      const prev = sig({ scalars: ["backgroundColor"] });
      const plan = optionMergePlan(prev, {});
      expect(plan.replaceMerge).toStrictEqual([]);
    });
  });

  describe("Array items removed: replaceMerge", () => {
    describe("named items (id-tracked)", () => {
      it("should add key to replaceMerge when a named series item is removed", () => {
        const prev = sig({
          arrays: { series: arrSig(["s1", "s2"], 0) },
        });
        const plan = optionMergePlan(prev, {
          series: [{ id: "s1" }],
        });
        expect(plan.notMerge).toStrictEqual(false);
        expect(plan.replaceMerge).toStrictEqual(["series"]);
      });

      it("should add key to replaceMerge when ALL named items are removed", () => {
        const prev = sig({ arrays: { series: arrSig(["s1"], 0) } });
        const plan = optionMergePlan(prev, { series: [] });
        expect(plan.replaceMerge).toStrictEqual(["series"]);
        expect(plan.notMerge).toStrictEqual(false);
      });

      it("should NOT add key to replaceMerge when named items are only added", () => {
        const prev = sig({ arrays: { series: arrSig(["s1"], 0) } });
        const plan = optionMergePlan(prev, { series: [{ id: "s1" }, { id: "s2" }] });
        expect(plan.replaceMerge).toStrictEqual([]);
      });

      it("should NOT add key when named items are unchanged", () => {
        const prev = sig({ arrays: { series: arrSig(["s1"], 0) } });
        const plan = optionMergePlan(prev, { series: [{ id: "s1" }] });
        expect(plan.replaceMerge).toStrictEqual([]);
      });

      it("should add multiple keys when named items removed in multiple arrays", () => {
        const prev = sig({
          arrays: {
            series: arrSig(["s1", "s2"], 0),
            xAxis: arrSig(["x1", "x2"], 0),
          },
        });
        const plan = optionMergePlan(prev, {
          series: [{ id: "s1" }],
          xAxis: [{ id: "x1" }],
        });
        expect(plan.notMerge).toStrictEqual(false);
        // replaceMerge must be sorted
        expect(plan.replaceMerge).toStrictEqual(["series", "xAxis"]);
      });

      it("should sort replaceMerge keys alphabetically", () => {
        const prev = sig({
          arrays: {
            zAxis: arrSig(["z1", "z2"], 0),
            aAxis: arrSig(["a1", "a2"], 0),
          },
        });
        const plan = optionMergePlan(prev, {
          zAxis: [{ id: "z1" }],
          aAxis: [{ id: "a1" }],
        });
        expect(plan.replaceMerge).toStrictEqual(["aAxis", "zAxis"]);
      });
    });

    describe("anonymous items (noIdCount-tracked)", () => {
      it("should add key to replaceMerge when anonymous series count decreases", () => {
        const prev = sig({ arrays: { series: arrSig([], 3) } });
        const plan = optionMergePlan(prev, {
          series: [{ type: "bar" }, { type: "line" }],
        });
        expect(plan.replaceMerge).toStrictEqual(["series"]);
        expect(plan.notMerge).toStrictEqual(false);
      });

      it("should add key to replaceMerge when all anonymous items removed", () => {
        const prev = sig({ arrays: { series: arrSig([], 2) } });
        const plan = optionMergePlan(prev, { series: [] });
        expect(plan.replaceMerge).toStrictEqual(["series"]);
      });

      it("should NOT add key when anonymous count stays the same", () => {
        const prev = sig({ arrays: { series: arrSig([], 2) } });
        const plan = optionMergePlan(prev, {
          series: [{ type: "bar" }, { type: "line" }],
        });
        expect(plan.replaceMerge).toStrictEqual([]);
      });

      it("should NOT add key when anonymous count increases", () => {
        const prev = sig({ arrays: { series: arrSig([], 1) } });
        const plan = optionMergePlan(prev, {
          series: [{ type: "bar" }, { type: "line" }],
        });
        expect(plan.replaceMerge).toStrictEqual([]);
      });
    });

    describe("array key removed entirely", () => {
      it("should add key to replaceMerge when array key with named items disappears entirely", () => {
        const prev = sig({ arrays: { series: arrSig(["s1"], 0) } });
        const plan = optionMergePlan(prev, {});
        expect(plan.replaceMerge).toStrictEqual(["series"]);
        expect(plan.notMerge).toStrictEqual(false);
      });

      it("should add key to replaceMerge when array key with anonymous items disappears entirely", () => {
        const prev = sig({ arrays: { series: arrSig([], 2) } });
        const plan = optionMergePlan(prev, {});
        expect(plan.replaceMerge).toStrictEqual(["series"]);
        expect(plan.notMerge).toStrictEqual(false);
      });

      it("should NOT add key when empty array key disappears entirely (was empty, still gone)", () => {
        // If prev had series: [] (idsSorted=[], noIdCount=0), removing it entirely
        // means there were no items to replace, no replaceMerge needed.
        const prev = sig({ arrays: { series: arrSig([], 0) } });
        const plan = optionMergePlan(prev, {});
        expect(plan.replaceMerge).toStrictEqual([]);
      });

      it("should add key for id-bearing items and NOT add for empty-array key in same plan", () => {
        const prev = sig({
          arrays: {
            series: arrSig(["s1"], 0),
            emptyAxis: arrSig([], 0),
          },
        });
        const plan = optionMergePlan(prev, {});
        expect(plan.replaceMerge).toStrictEqual(["series"]);
      });
    });

    describe("mixed named and anonymous in same array", () => {
      it("should trigger replaceMerge when named items removed but anonymous unchanged", () => {
        const prev = sig({ arrays: { series: arrSig(["s1", "s2"], 1) } });
        const plan = optionMergePlan(prev, {
          series: [{ id: "s1" }, { type: "bar" }],
        });
        expect(plan.replaceMerge).toStrictEqual(["series"]);
      });

      it("should trigger replaceMerge when anonymous removed but named unchanged", () => {
        const prev = sig({ arrays: { series: arrSig(["s1"], 2) } });
        const plan = optionMergePlan(prev, {
          series: [{ id: "s1" }, { type: "bar" }],
        });
        expect(plan.replaceMerge).toStrictEqual(["series"]);
      });

      it("should NOT trigger replaceMerge when both named and anonymous are unchanged", () => {
        const prev = sig({ arrays: { series: arrSig(["s1"], 1) } });
        const plan = optionMergePlan(prev, {
          series: [{ id: "s1" }, { type: "bar" }],
        });
        expect(plan.replaceMerge).toStrictEqual([]);
      });
    });
  });

  describe("Standard merge when no removals detected", () => {
    it("should return notMerge: false and empty replaceMerge for an identical option", () => {
      const first = optionMergePlan(null, {
        series: [{ id: "s1" }],
        grid: {},
        backgroundColor: "red",
      });
      const second = optionMergePlan(first.signature, {
        series: [{ id: "s1" }],
        grid: {},
        backgroundColor: "red",
      });
      expect(second.notMerge).toStrictEqual(false);
      expect(second.replaceMerge).toStrictEqual([]);
    });

    it("should return notMerge: false when only values change, no structural removals", () => {
      const first = optionMergePlan(null, { series: [{ id: "s1", value: 1 }] });
      const second = optionMergePlan(first.signature, { series: [{ id: "s1", value: 99 }] });
      expect(second.notMerge).toStrictEqual(false);
      expect(second.replaceMerge).toStrictEqual([]);
    });

    it("should return notMerge: false and empty replaceMerge for an empty-to-empty option", () => {
      const first = optionMergePlan(null, {});
      const second = optionMergePlan(first.signature, {});
      expect(second.notMerge).toStrictEqual(false);
      expect(second.replaceMerge).toStrictEqual([]);
    });
  });

  describe("signature chaining across multiple renders", () => {
    it("should correctly chain three renders: add -> remove item -> standard", () => {
      // Render 1: first mount
      const r1 = optionMergePlan(null, { series: [{ id: "a" }, { id: "b" }] });
      expect(r1.notMerge).toStrictEqual(false);
      expect(r1.replaceMerge).toStrictEqual([]);

      // Render 2: remove series "b"
      const r2 = optionMergePlan(r1.signature, { series: [{ id: "a" }] });
      expect(r2.notMerge).toStrictEqual(false);
      expect(r2.replaceMerge).toStrictEqual(["series"]);

      // Render 3: no structural change
      const r3 = optionMergePlan(r2.signature, { series: [{ id: "a" }] });
      expect(r3.notMerge).toStrictEqual(false);
      expect(r3.replaceMerge).toStrictEqual([]);
    });

    it("should reset correctly after notMerge and re-apply without replaceMerge", () => {
      // Render 1: with legend
      const r1 = optionMergePlan(null, { legend: {}, series: [{ id: "s1" }] });

      // Render 2: legend removed -> notMerge: true
      const r2 = optionMergePlan(r1.signature, { series: [{ id: "s1" }] });
      expect(r2.notMerge).toStrictEqual(true);

      // Render 3: no change from r2 -> standard merge
      const r3 = optionMergePlan(r2.signature, { series: [{ id: "s1" }] });
      expect(r3.notMerge).toStrictEqual(false);
      expect(r3.replaceMerge).toStrictEqual([]);
    });

    it("should return the new signature even when notMerge is true", () => {
      const prev = sig({ optionsLength: 3 });
      const option = { options: [{}, {}] };
      const plan = optionMergePlan(prev, option);
      expect(plan.signature.optionsLength).toStrictEqual(2);
    });

    it("should return correct signature to use as next prevSignature after replaceMerge", () => {
      const r1 = optionMergePlan(null, { series: [{ id: "a" }, { id: "b" }] });
      const r2 = optionMergePlan(r1.signature, { series: [{ id: "a" }] });

      // r2.signature should reflect only id "a" is now present
      expect(r2.signature.arrays["series"]).toStrictEqual<ArraySignature>({
        idsSorted: ["a"],
        noIdCount: 0,
      });
    });
  });

  describe("priority ordering", () => {
    it("should prefer 'timeline' over 'replaceMerge'", () => {
      // Both a timeline shrink and a series removal, notMerge: true
      const prev = sig({
        optionsLength: 3,
        arrays: { series: arrSig(["s1", "s2"], 0) },
      });
      const plan = optionMergePlan(prev, {
        options: [{}, {}],
        series: [{ id: "s1" }],
      });
      expect(plan.notMerge).toStrictEqual(true);
      expect(plan.replaceMerge).toStrictEqual([]);
    });

    it("should prefer 'media' over 'replaceMerge'", () => {
      const prev = sig({
        mediaLength: 2,
        arrays: { series: arrSig(["s1", "s2"], 0) },
      });
      const plan = optionMergePlan(prev, {
        ...minMedia,
        series: [{ id: "s1" }],
      });
      expect(plan.notMerge).toStrictEqual(true);
      expect(plan.replaceMerge).toStrictEqual([]);
    });

    it("should prefer 'removed object key' over 'replaceMerge'", () => {
      const prev = sig({
        objects: ["legend"],
        arrays: { series: arrSig(["s1", "s2"], 0) },
      });
      const plan = optionMergePlan(prev, { series: [{ id: "s1" }] });
      expect(plan.notMerge).toStrictEqual(true);
      expect(plan.replaceMerge).toStrictEqual([]);
    });

    it("should prefer 'removed scalar key' over 'replaceMerge'", () => {
      const prev = sig({
        scalars: ["backgroundColor"],
        arrays: { series: arrSig(["s1", "s2"], 0) },
      });
      const plan = optionMergePlan(prev, { series: [{ id: "s1" }] });
      expect(plan.notMerge).toStrictEqual(true);
      expect(plan.replaceMerge).toStrictEqual([]);
    });

    it("should apply only when all higher-priority rules pass", () => {
      // No timeline/media/object/scalar removals - only series item removed
      const prev = sig({ arrays: { series: arrSig(["s1", "s2"], 0) } });
      const plan = optionMergePlan(prev, { series: [{ id: "s1" }] });
      expect(plan.notMerge).toStrictEqual(false);
      expect(plan.replaceMerge).toStrictEqual(["series"]);
    });
  });

  describe("mutation resistance", () => {
    it("should not mutate the input option object", () => {
      const option = Object.freeze({ series: [{ id: "s1" }] });
      expect(() => optionMergePlan(null, option as Record<string, unknown>)).not.toThrow();
    });

    it("should not return notMerge: true when no previous state (null must be first-render path)", () => {
      // Guard: if the null check were inverted, this would incorrectly fire
      const plan = optionMergePlan(null, { series: [] });
      expect(plan.notMerge).toStrictEqual(false);
    });

    it("should not return replaceMerge when named items are only shuffled (same ids, different order)", () => {
      // ids are stored as a sorted Set, order is irrelevant, only presence matters
      const prev = sig({ arrays: { series: arrSig(["a", "b", "c"], 0) } });
      const plan = optionMergePlan(prev, {
        series: [{ id: "c" }, { id: "a" }, { id: "b" }],
      });
      expect(plan.replaceMerge).toStrictEqual([]);
    });

    it("should treat equal optionsLength as no timeline shrink (boundary === case)", () => {
      // nextSignature.optionsLength === prevSignature.optionsLength must NOT trigger
      const prev = sig({ optionsLength: 2 });
      expect(optionMergePlan(prev, { options: [{}, {}] }).notMerge).toStrictEqual(false);
    });

    it("should treat equal mediaLength as no media shrink (boundary === case)", () => {
      const prev = sig({ mediaLength: 2 });
      expect(
        optionMergePlan(prev, { media: [minMediaOption, minMediaOption] }).notMerge,
      ).toStrictEqual(false);
    });

    it("should treat equal noIdCount as no anonymous removal", () => {
      const prev = sig({ arrays: { series: arrSig([], 2) } });
      const plan = optionMergePlan(prev, {
        series: [{ type: "bar" }, { type: "line" }],
      });
      expect(plan.replaceMerge).toStrictEqual([]);
    });

    it("should distinguish string id '1' from number id 1 in source - both normalise to '1'", () => {
      // Both normalise to the same string key so the Set deduplicates them
      const prev = sig({ arrays: { series: arrSig(["1"], 0) } });
      const plan = optionMergePlan(prev, { series: [{ id: 1 }] });
      expect(plan.replaceMerge).toStrictEqual([]);
    });
  });

  describe("realistic scenarios", () => {
    it("should handle a full dashboard lifecycle: init -> add series -> remove series", () => {
      const optionA = {
        backgroundColor: "#ffffff",
        grid: { top: 10 },
        series: [{ id: "revenue", type: "bar", data: [1, 2, 3] }],
      };
      const r1 = optionMergePlan(null, optionA);
      expect(r1.notMerge).toStrictEqual(false);

      const optionB = {
        backgroundColor: "#ffffff",
        grid: { top: 10 },
        series: [
          { id: "revenue", type: "bar", data: [4, 5, 6] },
          { id: "cost", type: "line", data: [1, 1, 1] },
        ],
      };
      const r2 = optionMergePlan(r1.signature, optionB);
      expect(r2.notMerge).toStrictEqual(false);
      expect(r2.replaceMerge).toStrictEqual([]);

      const optionC = {
        backgroundColor: "#ffffff",
        grid: { top: 10 },
        series: [{ id: "revenue", type: "bar", data: [7, 8, 9] }],
      };
      const r3 = optionMergePlan(r2.signature, optionC);
      expect(r3.notMerge).toStrictEqual(false);
      expect(r3.replaceMerge).toStrictEqual(["series"]);
    });

    it("should handle removing a top-level tooltip object after having it", () => {
      const r1 = optionMergePlan(null, { tooltip: {}, series: [{ id: "s1" }] });
      const r2 = optionMergePlan(r1.signature, { series: [{ id: "s1" }] });
      expect(r2.notMerge).toStrictEqual(true);
      expect(r2.replaceMerge).toStrictEqual([]);
    });

    it("should handle theme toggle (backgroundColor scalar removal) as notMerge", () => {
      const r1 = optionMergePlan(null, { backgroundColor: "dark", series: [] });
      const r2 = optionMergePlan(r1.signature, { series: [] }); // backgroundColor removed
      expect(r2.notMerge).toStrictEqual(true);
    });

    it("should handle xAxis and yAxis as separate replaceMerge keys", () => {
      const r1 = optionMergePlan(null, {
        xAxis: [{ id: "x1" }, { id: "x2" }],
        yAxis: [{ id: "y1" }, { id: "y2" }],
        series: [{ id: "s1" }],
      });
      const r2 = optionMergePlan(r1.signature, {
        xAxis: [{ id: "x1" }],
        yAxis: [{ id: "y1" }],
        series: [{ id: "s1" }],
      });
      expect(r2.notMerge).toStrictEqual(false);
      expect(r2.replaceMerge).toStrictEqual(["xAxis", "yAxis"]);
    });

    it("should handle timeline option shrink independently of series", () => {
      const r1 = optionMergePlan(null, {
        options: [{}, {}, {}],
        series: [{ id: "s1" }],
      });
      // timeline shrank AND series unchanged - notMerge: true
      const r2 = optionMergePlan(r1.signature, {
        options: [{}, {}],
        series: [{ id: "s1" }],
      });
      expect(r2.notMerge).toStrictEqual(true);
      expect(r2.replaceMerge).toStrictEqual([]);
    });
  });
});
