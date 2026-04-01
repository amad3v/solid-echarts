import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { debounce } from "../../src/helpers/primitives";

let timer: ReturnType<typeof vi.useFakeTimers>;
const fn = vi.fn();

beforeEach(() => {
  timer = vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("debounce", () => {
  it("should return a function duplicate", () => {
    const result = debounce(fn, 100);
    expect(typeof result).toStrictEqual("function");
  });

  it("should call the original function after specified delay", () => {
    const debounced = debounce(fn, 100);
    debounced("arg1", 42);
    expect(fn).not.toHaveBeenCalled();
    timer.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("arg1", 42);
  });

  it("should only call the function once if called multiple times within the delay", () => {
    const debounced = debounce(fn, 100);
    debounced(1);
    debounced(2);
    debounced(3);
    timer.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);
  });

  it("should reset the timer on each call", () => {
    const debounced = debounce(fn, 50);
    debounced("first");
    timer.advanceTimersByTime(30);
    debounced("second");
    timer.advanceTimersByTime(30);
    debounced("third");
    timer.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("third");
  });

  it("should handle zero delay", () => {
    const debounced = debounce(fn, 0);
    debounced("zero");
    expect(fn).not.toHaveBeenCalled();
    timer.advanceTimersByTime(0);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("zero");
  });

  it("should handle negative delay by treating it as 0", () => {
    const debounced = debounce(fn, -10);
    debounced("negative");
    timer.advanceTimersByTime(0);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("negative");
  });

  it("should accept multiple argument types", () => {
    const debounced = debounce(fn, 20);
    const symbolArg = Symbol("sym");
    const bigintArg = BigInt(10);
    debounced("string", 123, true, null, undefined, { key: "value" }, [1, 2], symbolArg, bigintArg);
    timer.advanceTimersByTime(20);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(
      "string",
      123,
      true,
      null,
      undefined,
      { key: "value" },
      [1, 2],
      symbolArg,
      bigintArg,
    );
  });

  it("should handle function called without arguments", () => {
    const debounced = debounce(fn, 30);
    debounced();
    timer.advanceTimersByTime(30);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith();
  });

  it("should handle rapid calls with different types", () => {
    const debounced = debounce(fn, 50);
    debounced(1);
    debounced("string");
    debounced(true);
    debounced({ a: 1 });
    timer.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({ a: 1 });
  });

  it("should be type safe when casted to generic", () => {
    const typedFn = (_a: number, _b: string) => {};
    const debounced = debounce(typedFn as (...args: unknown[]) => void, 10);
    expect(() => {
      debounced(1, "ok");
    }).not.toThrow();
  });

  it("should handle multiple independent debounced functions", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const debounced1 = debounce(fn1, 40);
    const debounced2 = debounce(fn2, 40);
    debounced1("a");
    debounced2("b");
    timer.advanceTimersByTime(40);
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn1).toHaveBeenCalledWith("a");
    expect(fn2).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledWith("b");
  });

  it("should not call function if not enough time has passed", () => {
    const debounced = debounce(fn, 100);
    debounced("x");
    timer.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();
  });

  it("should work with delay of 0", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 0);
    debounced();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should work with a very large delay", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 999999);
    debounced();
    vi.advanceTimersByTime(999998);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should allow re-invocation after the debounced function has fired", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced("first");
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    debounced("second");
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("second");
  });

  it("should forward null and undefined arguments", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);
    debounced(null, undefined);
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledWith(null, undefined);
  });

  it("should forward object and array arguments", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);
    const obj = { a: 1 };
    const arr = [1, 2, 3];
    debounced(obj, arr);
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledWith(obj, arr);

    const calls = fn.mock.calls[0];
    expect(calls).toBeDefined();
    expect(calls!.length).toBeGreaterThanOrEqual(2);
    expect(calls![0]).toStrictEqual({ a: 1 });
    expect(calls![1]).toStrictEqual([1, 2, 3]);
  });

  it("should return a function", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    expect(typeof debounced).toStrictEqual("function");
  });

  it("should not call function synchronously (guard against removed setTimeout)", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);
    debounced();
    expect(fn).toHaveBeenCalledTimes(0);
  });

  it("should cancel previous timer (guard against removed clearTimeout)", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced("a");
    vi.advanceTimersByTime(50);
    debounced("b");
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("b");
  });

  it("should not fire at exactly delay-1 ms (boundary precision)", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
