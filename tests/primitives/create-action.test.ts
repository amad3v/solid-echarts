import type { Accessor } from "solid-js";
import { createRoot, createSignal } from "solid-js";

import type { EChartsType } from "echarts/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAction } from "../../src/primitives/create-action";
import type { ActionPayload, DispatchOpt } from "../../src/types/actions";
import { createMockInstance } from "../mocks/echarts";

let disposeRoot: (() => void) | undefined;

afterEach(() => {
  disposeRoot?.();
  disposeRoot = undefined;
});

const setupAction = (
  instance: Accessor<EChartsType | null>,
  action: Accessor<ActionPayload>,
  opt?: DispatchOpt,
): void => {
  createRoot((dispose) => {
    disposeRoot = dispose;
    createAction(instance, action, opt);
  });
};

describe("SSR guard", () => {
  it("should be a no-op and not throw when window is undefined", () => {
    vi.stubGlobal("window", undefined);

    expect(() => {
      const [instance] = createSignal<EChartsType | null>(null);
      const [action] = createSignal<ActionPayload>({ type: "restore" });
      setupAction(instance, action);
    }).not.toThrow();
  });
});

describe("defer: true - first synchronous evaluation is skipped", () => {
  it("should not not dispatch during setup", () => {
    const chart = createMockInstance();

    const [instance] = createSignal<EChartsType | null>(null);
    const [action] = createSignal<ActionPayload>({ type: "restore" });

    setupAction(instance, action);

    expect(chart.dispatchAction).not.toHaveBeenCalled();
  });

  it("should not dispatch if no signal has changed after setup", async () => {
    const chart = createMockInstance();
    const [instance] = createSignal<EChartsType | null>(chart);
    const [action] = createSignal<ActionPayload>({ type: "restore" });

    setupAction(instance, action);

    // defer:true: first eval subscribes but skips fn - no dispatch on init
    expect(chart.dispatchAction).not.toHaveBeenCalled();
  });
});

describe("dispatches on signal changes", () => {
  it("should dispatch when instance transitions null -> chart", async () => {
    const chart = createMockInstance();
    const [instance, setInstance] = createSignal<EChartsType | null>(null);
    const [action] = createSignal<ActionPayload>({ type: "highlight" });

    setupAction(instance, action);
    setInstance(chart);

    expect(chart.dispatchAction).toHaveBeenCalledTimes(1);
    expect(chart.dispatchAction).toHaveBeenCalledWith({ type: "highlight" }, undefined);
  });

  it("should dispatch when action signal changes with a live instance", async () => {
    const chart = createMockInstance();
    const [instance, setInstance] = createSignal<EChartsType | null>(null);
    const [action, setAction] = createSignal<ActionPayload>({
      type: "highlight",
    });

    setupAction(instance, action);

    setInstance(chart);

    setAction({ type: "downplay" });

    expect(chart.dispatchAction).toHaveBeenCalledTimes(2);
    expect(chart.dispatchAction).toHaveBeenNthCalledWith(2, { type: "downplay" }, undefined);
  });

  it("should dispatch the latest payload on each action change", async () => {
    const chart = createMockInstance();
    const [instance, setInstance] = createSignal<EChartsType | null>(null);
    const [action, setAction] = createSignal<ActionPayload>({
      type: "restore",
    });

    setupAction(instance, action);

    setInstance(chart);

    setAction({ type: "highlight" });

    setAction({ type: "downplay" });

    const calls = vi.mocked(chart.dispatchAction).mock.calls;

    expect(calls.at(-1)?.[0]).toStrictEqual({ type: "downplay" });
  });

  it("should forward opt as second argument to dispatchAction", async () => {
    const chart = createMockInstance();
    const [instance, setInstance] = createSignal<EChartsType | null>(null);
    const [action] = createSignal<ActionPayload>({ type: "restore" });
    const opt = { silent: true };

    setupAction(instance, action, opt);

    setInstance(chart);

    expect(chart.dispatchAction).toHaveBeenCalledWith({ type: "restore" }, opt);
  });
});

describe("null instance guard", () => {
  it("should not dispatch when instance is null and action changes", async () => {
    const chart = createMockInstance();
    const [instance] = createSignal<EChartsType | null>(null);
    const [action, setAction] = createSignal<ActionPayload>({
      type: "restore",
    });

    setupAction(instance, action);

    setAction({ type: "highlight" });

    expect(chart.dispatchAction).not.toHaveBeenCalled();
  });

  it("should not dispatch after instance transitions chart -> null", async () => {
    const chart = createMockInstance();
    const [instance, setInstance] = createSignal<EChartsType | null>(null);
    const [action, setAction] = createSignal<ActionPayload>({
      type: "restore",
    });

    setupAction(instance, action);

    setInstance(chart);

    const callsBefore = vi.mocked(chart.dispatchAction).mock.calls.length;

    setInstance(null);

    setAction({ type: "highlight" });

    expect(chart.dispatchAction).toHaveBeenCalledTimes(callsBefore);
  });
});

describe("disposed instance guard", () => {
  it("should not dispatch when instance isDisposed returns true", async () => {
    let isDisposed = false;
    const chart = createMockInstance({
      isDisposed: vi.fn(() => isDisposed),
    });
    const [instance, setInstance] = createSignal<EChartsType | null>(null);
    const [action, setAction] = createSignal<ActionPayload>({
      type: "restore",
    });

    setupAction(instance, action);

    setInstance(chart);

    isDisposed = true;
    setAction({ type: "highlight" });

    expect(chart.dispatchAction).toHaveBeenCalledTimes(1);
    expect(chart.dispatchAction).toHaveBeenCalledWith({ type: "restore" }, undefined);
  });
});

describe("cleanup on root dispose", () => {
  it("should not dispatch after the reactive root is disposed", async () => {
    const chart = createMockInstance();
    const [instance, setInstance] = createSignal<EChartsType | null>(null);
    const [action, setAction] = createSignal<ActionPayload>({
      type: "restore",
    });

    setupAction(instance, action);

    setInstance(chart);

    const callsBefore = vi.mocked(chart.dispatchAction).mock.calls.length;

    disposeRoot?.();
    disposeRoot = undefined;

    setAction({ type: "highlight" });

    expect(chart.dispatchAction).toHaveBeenCalledTimes(callsBefore);
  });
});
