import type { Accessor } from "solid-js";
import { createRoot, createSignal } from "solid-js";

import type { EChartsType } from "echarts/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createChartEffect } from "../../src/primitives/create-chart-effect";
import type { SolidEChartOption } from "../../src/types/echart";
import type { CreateChartEffectOptions } from "../../src/types/primitives";
import { createMockInstance } from "../mocks/echarts";

let disposeRoot: (() => void) | undefined;

afterEach(() => {
  disposeRoot?.();
  disposeRoot = undefined;
});

const setupChartEffect = (
  instance: Accessor<EChartsType | null>,
  option: Accessor<SolidEChartOption | undefined>,
  opts?: CreateChartEffectOptions,
): void => {
  createRoot((dispose) => {
    disposeRoot = dispose;
    createChartEffect(instance, option, opts);
  });
};

describe("SSR guard", () => {
  it("should be a no-op when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    expect(() => {
      const [instance] = createSignal<EChartsType | null>(null);
      const [option] = createSignal<SolidEChartOption>({ series: [] });
      setupChartEffect(instance, option);
    }).not.toThrow();
  });
});

describe("defer: false - fires on first microtask", () => {
  it("should call setOption after one nextTick when instance is non-null", async () => {
    const chart = createMockInstance();
    const [instance] = createSignal<EChartsType | null>(chart);
    const [option] = createSignal<SolidEChartOption>({ series: [] });

    // Effect with defer:false: initial eval runs inside createRoot's runEffects,
    // calling setOption synchronously before createRoot returns.
    // A nextTick ensures any queued microtasks also settle.
    setupChartEffect(instance, option);

    expect(chart.setOption).toHaveBeenCalledTimes(1);
  });

  it("should not call setOption when instance is null", async () => {
    const chart = createMockInstance();
    const [instance] = createSignal<EChartsType | null>(null);
    const [option] = createSignal<SolidEChartOption>({ series: [] });

    setupChartEffect(instance, option);

    expect(chart.setOption).not.toHaveBeenCalled();
  });

  it("should not call setOption when option is undefined", async () => {
    const chart = createMockInstance();
    const [instance] = createSignal<EChartsType | null>(chart);
    const [option] = createSignal<SolidEChartOption | undefined>(undefined);

    setupChartEffect(instance, option);

    expect(chart.setOption).not.toHaveBeenCalled();
  });
});

describe("reactive option updates", () => {
  it("should call setOption again when option signal changes", async () => {
    const chart = createMockInstance();
    const [instance] = createSignal<EChartsType | null>(chart);
    const [option, setOption] = createSignal<SolidEChartOption>({
      series: [],
    });

    setupChartEffect(instance, option);

    setOption({ series: [{ type: "bar" }] });

    expect(chart.setOption).toHaveBeenCalledTimes(2);
    expect(chart.setOption).toHaveBeenNthCalledWith(
      2,
      { series: [{ type: "bar" }] },
      expect.any(Object),
    );
  });

  it("should call setOption when instance transitions null -> chart", async () => {
    const chart = createMockInstance();
    const [instance, setInstance] = createSignal<EChartsType | null>(null);
    const [option] = createSignal<SolidEChartOption>({ series: [] });

    setupChartEffect(instance, option);

    expect(chart.setOption).not.toHaveBeenCalled();

    setInstance(chart);

    expect(chart.setOption).toHaveBeenCalledTimes(1);
  });

  it("should not call setOption when instance transitions chart -> null", async () => {
    const chart = createMockInstance();
    const [instance, setInstance] = createSignal<EChartsType | null>(chart);
    const [option] = createSignal<SolidEChartOption>({ series: [] });

    setupChartEffect(instance, option);

    const callsBefore = vi.mocked(chart.setOption).mock.calls.length;

    setInstance(null);

    expect(chart.setOption).toHaveBeenCalledTimes(callsBefore);
  });

  it("should not call setOption when instance is disposed", async () => {
    let isDisposed = false;
    const chart = createMockInstance({ isDisposed: vi.fn(() => isDisposed) });
    const [instance, setInstance] = createSignal<EChartsType | null>(null);
    const [option] = createSignal<SolidEChartOption>({ series: [] });

    setupChartEffect(instance, option);
    isDisposed = true;
    setInstance(chart);

    expect(chart.setOption).not.toHaveBeenCalled();
  });

  it("should call setOption when option transitions undefined -> defined", async () => {
    const chart = createMockInstance();
    const [instance] = createSignal<EChartsType | null>(chart);
    const [option, setOption] = createSignal<SolidEChartOption | undefined>();

    setupChartEffect(instance, option);

    expect(chart.setOption).not.toHaveBeenCalled();

    setOption({ series: [] });

    expect(chart.setOption).toHaveBeenCalledTimes(1);
  });
});

describe("explicit merge strategy (autoMerge: false, default)", () => {
  it("should call setOption with notMerge: false by default", async () => {
    const chart = createMockInstance();
    const [instance] = createSignal<EChartsType | null>(chart);
    const [option] = createSignal<SolidEChartOption>({ series: [] });

    setupChartEffect(instance, option);

    expect(chart.setOption).toHaveBeenCalledWith(
      { series: [] },
      expect.objectContaining({ notMerge: false }),
    );
  });

  it("should call setOption with notMerge: true when opt.notMerge is true", async () => {
    const chart = createMockInstance();
    const [instance] = createSignal<EChartsType | null>(chart);
    const [option] = createSignal<SolidEChartOption>({ series: [] });

    setupChartEffect(instance, option, { notMerge: true });

    expect(chart.setOption).toHaveBeenCalledWith(
      { series: [] },
      expect.objectContaining({ notMerge: true }),
    );
  });

  it("should call setOption with replaceMerge when provided", async () => {
    const chart = createMockInstance();
    const [instance] = createSignal<EChartsType | null>(chart);
    const [option] = createSignal<SolidEChartOption>({ series: [] });

    setupChartEffect(instance, option, { replaceMerge: ["series"] });

    expect(chart.setOption).toHaveBeenCalledWith(
      { series: [] },
      expect.objectContaining({ replaceMerge: ["series"] }),
    );
  });

  it("should call setOption with lazyUpdate: true when provided", async () => {
    const chart = createMockInstance();
    const [instance] = createSignal<EChartsType | null>(chart);
    const [option] = createSignal<SolidEChartOption>({ series: [] });

    setupChartEffect(instance, option, { lazyUpdate: true });

    expect(chart.setOption).toHaveBeenCalledWith(
      { series: [] },
      expect.objectContaining({ lazyUpdate: true }),
    );
  });

  it("should call setOption with silent: true when provided", async () => {
    const chart = createMockInstance();
    const [instance] = createSignal<EChartsType | null>(chart);
    const [option] = createSignal<SolidEChartOption>({ series: [] });

    setupChartEffect(instance, option, { silent: true });

    expect(chart.setOption).toHaveBeenCalledWith(
      { series: [] },
      expect.objectContaining({ silent: true }),
    );
  });

  it("should accept a reactive accessor for notMerge", async () => {
    const chart = createMockInstance();
    const [instance] = createSignal<EChartsType | null>(chart);
    const [option] = createSignal<SolidEChartOption>({ series: [] });
    const [notMerge] = createSignal(true);

    setupChartEffect(instance, option, { notMerge });

    expect(chart.setOption).toHaveBeenCalledWith(
      { series: [] },
      expect.objectContaining({ notMerge: true }),
    );
  });

  it("should not re-trigger setOption when only a merge strategy signal changes", async () => {
    const chart = createMockInstance();
    const [instance] = createSignal<EChartsType | null>(chart);
    const [option] = createSignal<SolidEChartOption>({ series: [] });
    const [notMerge, setNotMerge] = createSignal(false);

    setupChartEffect(instance, option, { notMerge });

    const callsBefore = vi.mocked(chart.setOption).mock.calls.length;

    // Merge strategy is read with untrack - changing it must not trigger setOption
    setNotMerge(true);

    expect(chart.setOption).toHaveBeenCalledTimes(callsBefore);
  });
});

describe("autoMerge path", () => {
  it("should call setOption with notMerge: false on first render", async () => {
    const chart = createMockInstance();
    const [instance] = createSignal<EChartsType | null>(chart);
    const [option] = createSignal<SolidEChartOption>({
      series: [{ id: "a" }],
    });

    setupChartEffect(instance, option, { autoMerge: true });

    expect(chart.setOption).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ notMerge: false }),
    );
  });

  it("should call setOption with replaceMerge when a series id is removed", async () => {
    const chart = createMockInstance();
    const [instance] = createSignal<EChartsType | null>(chart);
    const [option, setOption] = createSignal<SolidEChartOption>({
      series: [{ id: "a" }, { id: "b" }],
    });

    setupChartEffect(instance, option, { autoMerge: true });

    setOption({ series: [{ id: "a" }] });

    const calls = vi.mocked(chart.setOption).mock.calls;
    expect(calls.at(-1)?.[1]).toMatchObject({ replaceMerge: ["series"] });
  });

  it("should call setOption with notMerge: true when a top-level object key is removed", async () => {
    const chart = createMockInstance();
    const [instance] = createSignal<EChartsType | null>(chart);
    const [option, setOption] = createSignal<SolidEChartOption>({
      grid: {},
      series: [],
    });

    setupChartEffect(instance, option, { autoMerge: true });

    // grid removed
    setOption({ series: [] });

    const calls = vi.mocked(chart.setOption).mock.calls;
    expect(calls.at(-1)?.[1]).toMatchObject({ notMerge: true });
  });

  it("should reset lastSignature on instance reinit so first setOption uses notMerge: false", async () => {
    const chart1 = createMockInstance();
    const chart2 = createMockInstance();
    const [instance, setInstance] = createSignal<EChartsType | null>(chart1);
    const [option] = createSignal<SolidEChartOption>({
      series: [{ id: "a" }],
    });

    setupChartEffect(instance, option, { autoMerge: true });

    setInstance(null);

    setInstance(chart2);

    expect(vi.mocked(chart2.setOption).mock.calls[0]?.[1]).toMatchObject({
      notMerge: false,
    });
  });

  it("should ignore explicit notMerge when autoMerge: true", async () => {
    const chart = createMockInstance();
    const [instance] = createSignal<EChartsType | null>(chart);
    const [option] = createSignal<SolidEChartOption>({ series: [] });

    // autoMerge owns the strategy - explicit notMerge:true must be ignored
    setupChartEffect(instance, option, { autoMerge: true, notMerge: true });

    expect(chart.setOption).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ notMerge: false }),
    );
  });
});
