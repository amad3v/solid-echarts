import type { Accessor } from "solid-js";

import { describe, expect, it } from "vitest";

import { resolveMaybeAccessor, toAccessor } from "../../src/helpers/common";

describe("toAccessor", () => {
  describe("when value is not a function", () => {
    it("wraps number into accessor", () => {
      const acc = toAccessor(42);
      expect(acc()).toBe(42);
    });

    it("wraps string into accessor", () => {
      const acc = toAccessor("test");
      expect(acc()).toBe("test");
    });

    it("wraps boolean into accessor", () => {
      const acc = toAccessor(true);
      expect(acc()).toBe(true);
    });

    it("wraps null into accessor", () => {
      const acc = toAccessor(null);
      expect(acc()).toBe(null);
    });

    it("wraps undefined into accessor", () => {
      const acc = toAccessor(undefined);
      expect(acc()).toBe(undefined);
    });

    it("wraps object into accessor (preserves reference)", () => {
      const obj = { a: 1 };
      const acc = toAccessor(obj);
      expect(acc()).toBe(obj);
    });

    it("wraps array into accessor (preserves reference)", () => {
      const arr = [1, 2, 3];
      const acc = toAccessor(arr);
      expect(acc()).toBe(arr);
    });

    it("wraps symbol into accessor", () => {
      const sym = Symbol("x");
      const acc = toAccessor(sym);
      expect(acc()).toBe(sym);
    });

    it("wraps bigint into accessor", () => {
      const val = BigInt(10);
      const acc = toAccessor(val);
      expect(acc()).toBe(val);
    });
  });

  describe("when value is a function (treated as accessor)", () => {
    it("returns the same function reference", () => {
      const fn: Accessor<number> = () => 123;
      const acc = toAccessor(fn);
      expect(acc).toBe(fn);
    });

    it("executes original accessor correctly", () => {
      const fn: Accessor<number> = () => 456;
      const acc = toAccessor(fn);
      expect(acc()).toBe(456);
    });

    it("treats non-accessor function as accessor (false positive)", () => {
      const fn = (x: number) => x * 2;
      // @ts-expect-error for test purposes
      const acc = toAccessor(fn);

      // No args passed -> runtime behavior reflects misuse
      expect(() => acc()).not.toThrow();
    });

    it("accepts async function", async () => {
      const fn = async () => 42;
      const acc = toAccessor(fn);
      await expect(acc()).resolves.toBe(42);
    });

    it("accepts class constructor as function", () => {
      class Test {
        value = 1;
      }
      const acc = toAccessor(Test);
      expect(acc).toBe(Test);
    });

    it("accepts proxy-wrapped function", () => {
      const fn = new Proxy(() => 1, {});
      const acc = toAccessor(fn);
      expect(acc()).toBe(1);
    });
  });

  describe("referential behavior", () => {
    it("creates a new function each time for non-functions", () => {
      const a = toAccessor(1);
      const b = toAccessor(1);
      expect(a).not.toBe(b);
    });

    it("preserves reference for functions", () => {
      const fn = () => 1;
      const a = toAccessor(fn);
      const b = toAccessor(fn);
      expect(a).toBe(b);
    });
  });

  describe("lazy evaluation semantics", () => {
    it("returns latest value from wrapped mutable reference", () => {
      let value = 1;
      const acc = toAccessor(value);

      expect(acc()).toBe(1);

      // oxlint-disable-next-line no-useless-assignment
      value++;
      // still 1 because value was captured at creation
      expect(acc()).toBe(1);
    });

    it("delegates execution for accessor (dynamic)", () => {
      let value = 1;
      const fn = () => value;

      const acc = toAccessor(fn);

      expect(acc()).toBe(1);

      value = 2;
      expect(acc()).toBe(2);
    });
  });

  describe("edge semantic limitation", () => {
    it("cannot distinguish function as value vs accessor", () => {
      const fn = () => 123;

      const acc = toAccessor(fn);

      // It is treated as accessor, not wrapped
      expect(acc).toBe(fn);
      expect(acc()).toBe(123);
    });
  });
});

describe("resolveMaybeAccessor", () => {
  describe("non-function values (returned as-is)", () => {
    it("returns number", () => {
      expect(resolveMaybeAccessor(42)).toBe(42);
    });

    it("returns string", () => {
      expect(resolveMaybeAccessor("test")).toBe("test");
    });

    it("returns boolean", () => {
      expect(resolveMaybeAccessor(true)).toBe(true);
    });

    it("returns null", () => {
      expect(resolveMaybeAccessor(null)).toBe(null);
    });

    it("returns undefined", () => {
      expect(resolveMaybeAccessor(undefined)).toBe(undefined);
    });

    it("returns object (same reference)", () => {
      const obj = { a: 1 };
      expect(resolveMaybeAccessor(obj)).toBe(obj);
    });

    it("returns array (same reference)", () => {
      const arr = [1, 2, 3];
      expect(resolveMaybeAccessor(arr)).toBe(arr);
    });

    it("returns symbol", () => {
      const sym = Symbol("x");
      expect(resolveMaybeAccessor(sym)).toBe(sym);
    });

    it("returns bigint", () => {
      const val = BigInt(10);
      expect(resolveMaybeAccessor(val)).toBe(val);
    });
  });

  describe("function values (treated as accessor)", () => {
    it("executes function returning primitive", () => {
      const fn = () => 123;
      expect(resolveMaybeAccessor(fn)).toBe(123);
    });

    it("executes function returning object", () => {
      const obj = { a: 1 };
      const fn = () => obj;
      expect(resolveMaybeAccessor(fn)).toBe(obj);
    });

    it("executes function returning undefined", () => {
      const fn = () => undefined;
      expect(resolveMaybeAccessor(fn)).toBe(undefined);
    });

    it("executes function returning null", () => {
      const fn = () => null;
      expect(resolveMaybeAccessor(fn)).toBe(null);
    });

    it("executes async function (returns Promise)", async () => {
      const fn = async () => 42;
      const result = resolveMaybeAccessor(fn);
      await expect(result).resolves.toBe(42);
    });

    it("executes function with side effects", () => {
      let count = 0;
      const fn = () => {
        count++;
        return count;
      };

      expect(resolveMaybeAccessor(fn)).toBe(1);
      expect(resolveMaybeAccessor(fn)).toBe(2);
    });
  });

  describe("edge cases", () => {
    it("treats any function as accessor (false positive)", () => {
      const fn = (x: number) => x * 2;

      // called with no args -> undefined * 2 = NaN
      expect(resolveMaybeAccessor(fn as unknown)).toBeNaN();
    });

    it("throws if function expects args and cannot handle undefined", () => {
      const fn = (x?: number) => {
        if (x === undefined) throw new Error("invalid");
        return x;
      };

      expect(() => resolveMaybeAccessor(fn as unknown)).toThrow();
    });

    it("treats class constructor as accessor and throws", () => {
      class Test {}

      expect(() => resolveMaybeAccessor(Test as unknown)).toThrow();
    });

    it("works with proxy-wrapped function", () => {
      const fn = new Proxy(() => 1, {});
      expect(resolveMaybeAccessor(fn)).toBe(1);
    });
  });

  describe("evaluation semantics", () => {
    it("evaluates function each call (not memoized)", () => {
      let value = 1;
      const fn = () => value;

      expect(resolveMaybeAccessor(fn)).toBe(1);

      value = 2;
      expect(resolveMaybeAccessor(fn)).toBe(2);
    });

    it("does not evaluate non-function multiple times", () => {
      const obj = { a: 1 };

      expect(resolveMaybeAccessor(obj)).toBe(obj);
      expect(resolveMaybeAccessor(obj)).toBe(obj);
    });
  });

  describe("function-as-value limitation", () => {
    it("cannot return function itself (always invokes it)", () => {
      const fn = () => 123;

      // impossible to get fn itself back
      expect(resolveMaybeAccessor(fn)).toBe(123);
    });

    it("nested function requires double wrapping to preserve", () => {
      const fn = () => () => 123;

      const result = resolveMaybeAccessor<() => number>(fn);
      expect(typeof result).toBe("function");
      expect(result()).toBe(123);
    });
  });
});
