import type { Accessor, Setter } from "solid-js";
import { batch, createEffect, createRoot, createSignal } from "solid-js";

import * as echartsCore from "echarts/core";
import { connect, disconnect, type EChartsType } from "echarts/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DARK_THEME, DEFAULT_THEME } from "../../src/helpers/common";
import { createChart } from "../../src/primitives/create-chart";
import { createChartEffect } from "../../src/primitives/create-chart-effect";
import type { SolidEChartOption } from "../../src/types/echart";
import type { CreateChartEffectOptions, CreateChartOptions } from "../../src/types/primitives";
import { createMockInstance } from "../mocks/echarts";
import { MockIntersectionObserver, MockResizeObserver } from "../setup";
import { createMockChartWithInit } from "../utils/charts";
import { spyOnResizeObserver } from "../utils/resize-observer";

// vi.mock MUST be here, in the test file
vi.mock("echarts/core", () => ({
  init: vi.fn(),
  use: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  registerTheme: vi.fn(),
}));

let disposeRoot: (() => void) | undefined;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  disposeRoot?.();
  disposeRoot = undefined;
});

// createChart has a two-level reactive chain:
//   Level 1: container signal -> container effect -> echarts.init -> setInstance
//   Level 2: instance signal -> group/autoResize effects
//
// The theme effect is outside that chain: it tracks the theme only, since
// every instance is created with the current theme.
//
// flushEffects() = two nextTick()s covers both levels.
// Use nextTick() alone when asserting Level 1 outcomes (init called, instance set).
// Use flushEffects() when asserting Level 2 outcomes (connect, ResizeObserver).
const setupChart = (
  container: Accessor<HTMLElement | null | undefined>,
  opts?: CreateChartOptions,
): { instance: Accessor<EChartsType | null> } => {
  let instance!: Accessor<EChartsType | null>;
  createRoot((dispose) => {
    disposeRoot = dispose;
    const result = createChart(container, opts);
    instance = result.instance;
  });
  return { instance };
};

const defineProperty = (
  el: HTMLElement,
  property: PropertyKey,
  attributes: Record<string, unknown>,
) => {
  Object.defineProperty(el, property, attributes);
};

const defineWidth = (el: HTMLElement, attributes: Record<string, unknown>) => {
  defineProperty(el, "offsetWidth", attributes);
};

const defineHeight = (el: HTMLElement, attributes: Record<string, unknown>) => {
  defineProperty(el, "offsetHeight", attributes);
};

const defineConfSz = (el: HTMLElement, height: number, width: number, configurable = true) => {
  defineWidth(el, { value: width, configurable });
  defineHeight(el, { value: height, configurable });
};

describe("SSR guard", () => {
  it("should return instance: () => null when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    const [container] = createSignal<HTMLDivElement | null>(null);
    const { instance } = setupChart(container);
    expect(instance()).toBeNull();
  });
});

describe("instance initialisation", () => {
  it("should return instance: () => null before container is set", () => {
    const [container] = createSignal<HTMLDivElement | null>(null);
    const { instance } = setupChart(container);
    expect(instance()).toBeNull();
  });

  it("should call echarts.init when container signal becomes non-null", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const chart = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValue(chart);

    setupChart(container);
    expect(echartsCore.init).not.toHaveBeenCalled();

    setContainer(el);

    expect(echartsCore.init).toHaveBeenCalledTimes(1);
    expect(echartsCore.init).toHaveBeenCalledWith(
      el,
      DEFAULT_THEME,
      expect.objectContaining({ renderer: "canvas" }),
    );
  });

  it("should emit the chart instance via the instance signal after init", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const chart = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValue(chart as unknown as EChartsType);

    const { instance } = setupChart(container);
    setContainer(el);

    expect(instance()).toBe(chart);
  });

  it("should pass renderer option to echarts.init", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const chart = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValue(chart as unknown as EChartsType);

    setupChart(container, { renderer: "svg" });
    setContainer(el);

    expect(echartsCore.init).toHaveBeenCalledWith(
      el,
      DEFAULT_THEME,
      expect.objectContaining({ renderer: "svg" }),
    );
  });

  it("should pass static init options to echarts.init", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const chart = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValue(chart as unknown as EChartsType);

    setupChart(container, { locale: "ZH", devicePixelRatio: 2, useDirtyRect: true });
    setContainer(el);

    expect(echartsCore.init).toHaveBeenCalledWith(
      el,
      DEFAULT_THEME,
      expect.objectContaining({ locale: "ZH", devicePixelRatio: 2, useDirtyRect: true }),
    );
  });
});

describe("init-time options", () => {
  it("should accept init options as accessors", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    createMockChartWithInit();

    setupChart(container, { locale: () => "ZH", devicePixelRatio: () => 2, width: () => 300 });
    setContainer(el);

    expect(echartsCore.init).toHaveBeenCalledWith(
      el,
      DEFAULT_THEME,
      expect.objectContaining({ locale: "ZH", devicePixelRatio: 2, width: 300 }),
    );
  });

  it("should not reinit when an init option accessor changes", () => {
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const [locale, setLocale] = createSignal("EN");
    const chart = createMockChartWithInit();

    setupChart(container, { locale });
    setContainer(document.createElement("div"));
    setLocale("ZH");

    expect(echartsCore.init).toHaveBeenCalledTimes(1);
    expect(chart.dispose).not.toHaveBeenCalled();
  });

  it("should create a renderer reinit with the current init option values", () => {
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const [renderer, setRenderer] = createSignal<"canvas" | "svg">("canvas");
    const [locale, setLocale] = createSignal("EN");
    const [dpr, setDpr] = createSignal(1);
    vi.mocked(echartsCore.init)
      .mockReturnValueOnce(createMockInstance())
      .mockReturnValueOnce(createMockInstance());

    setupChart(container, { renderer, locale, devicePixelRatio: dpr });
    setContainer(document.createElement("div"));

    setLocale("ZH");
    setDpr(2);
    setRenderer("svg");

    expect(vi.mocked(echartsCore.init).mock.calls[0]?.[2]).toMatchObject({
      renderer: "canvas",
      locale: "EN",
      devicePixelRatio: 1,
    });
    expect(vi.mocked(echartsCore.init).mock.calls[1]?.[2]).toMatchObject({
      renderer: "svg",
      locale: "ZH",
      devicePixelRatio: 2,
    });
  });

  it("should init with the init option values current when the container arrives", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const [locale, setLocale] = createSignal("EN");
    createMockChartWithInit();

    setupChart(container, { locale });
    setLocale("ZH");
    setContainer(el);

    expect(echartsCore.init).toHaveBeenCalledWith(
      el,
      DEFAULT_THEME,
      expect.objectContaining({ locale: "ZH" }),
    );
  });

  it("should debounce with the resizeDebounce value current when the observer attaches", () => {
    vi.useFakeTimers();
    MockResizeObserver.reset();
    const chart = createMockChartWithInit();
    const el = document.createElement("div");
    defineConfSz(el, 300, 400);
    const [container, setContainer] = createSignal<HTMLElement | null>(null);
    const [autoResize, setAutoResize] = createSignal(false);
    const [debounceMs, setDebounceMs] = createSignal(10);

    setupChart(container, { autoResize, resizeDebounce: debounceMs });
    setContainer(el);
    setDebounceMs(50);
    setAutoResize(true);

    const resizeObserver = MockResizeObserver.instances[0]!;
    defineConfSz(el, 350, 500);
    resizeObserver.emit();

    vi.advanceTimersByTime(10);
    expect(chart.resize).not.toHaveBeenCalled();

    vi.advanceTimersByTime(40);
    expect(chart.resize).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

describe("theme", () => {
  it("should pass the initial theme to echarts.init", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const chart = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValue(chart as unknown as EChartsType);

    setupChart(container, { theme: "dark" });
    setContainer(el);
    // container effect: init(el, "dark") -> setInstance

    expect(echartsCore.init).toHaveBeenCalledTimes(1);
    expect(echartsCore.init).toHaveBeenCalledWith(el, "dark", expect.any(Object));
    expect(chart.dispose).not.toHaveBeenCalled();
  });

  it("should call setTheme in place when theme signal changes - no dispose or reinit", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const [theme, setTheme] = createSignal<string>(DEFAULT_THEME);
    const chart = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValue(chart as unknown as EChartsType);

    setupChart(container, { theme });
    setContainer(el);
    // init applies the initial theme, the theme effect only handles the change below

    setTheme(DARK_THEME);

    expect(chart.setTheme).toHaveBeenLastCalledWith(DARK_THEME);
    // no reinit
    expect(echartsCore.init).toHaveBeenCalledTimes(1);
    expect(chart.dispose).not.toHaveBeenCalled();
  });

  it("should not call setTheme when theme is undefined", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const chart = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValue(chart as unknown as EChartsType);

    setupChart(container, { theme: undefined });
    setContainer(el);

    expect(chart.setTheme).not.toHaveBeenCalled();
  });

  it("should not call setTheme when the container arrives after creation", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const chart = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValue(chart);

    setupChart(container, { theme: DARK_THEME });
    setContainer(el);

    // init already applied the theme
    expect(echartsCore.init).toHaveBeenCalledWith(el, DARK_THEME, expect.any(Object));
    expect(chart.setTheme).not.toHaveBeenCalled();
  });

  it("should call setTheme once per theme change", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const [theme, setTheme] = createSignal<string>(DEFAULT_THEME);
    const chart = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValue(chart);

    setupChart(container, { theme });
    setContainer(el);
    setTheme(DARK_THEME);

    expect(chart.setTheme).toHaveBeenCalledTimes(1);
    expect(chart.setTheme).toHaveBeenCalledWith(DARK_THEME);
  });

  it("should init with the latest theme when it changes before the container arrives", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const [theme, setTheme] = createSignal<string>(DEFAULT_THEME);
    const chart = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValue(chart);

    setupChart(container, { theme });
    setTheme(DARK_THEME);
    setContainer(el);

    expect(echartsCore.init).toHaveBeenCalledWith(el, DARK_THEME, expect.any(Object));
    expect(chart.setTheme).not.toHaveBeenCalled();
  });

  it("should apply the current theme through init on renderer reinit, not setTheme", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const [renderer, setRenderer] = createSignal<"canvas" | "svg">("canvas");
    const [theme, setTheme] = createSignal<string>(DEFAULT_THEME);
    const chart1 = createMockInstance();
    const chart2 = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValueOnce(chart1).mockReturnValueOnce(chart2);

    setupChart(container, { renderer, theme });
    setContainer(el);
    setTheme(DARK_THEME);
    setRenderer("svg");

    expect(vi.mocked(echartsCore.init).mock.calls[1]?.[1]).toBe(DARK_THEME);
    expect(chart2.setTheme).not.toHaveBeenCalled();
  });
});

// ECharts' `setTheme` rebuilds the model from the first option ever set, so
// every theme switch must be followed by the latest option.
describe("theme switch with createChartEffect", () => {
  const OPTION_A: SolidEChartOption = { series: [{ type: "bar", data: [1] }] };
  const OPTION_B: SolidEChartOption = { series: [{ type: "bar", data: [2] }] };

  type Harness = {
    chart: EChartsType;
    setTheme: Setter<string>;
    setOption: Setter<SolidEChartOption | undefined>;
  };

  const setupThemeAndOption = (
    theme: Accessor<string>,
    effectOpts: CreateChartEffectOptions | undefined,
    initialOption: SolidEChartOption | undefined,
  ): Omit<Harness, "setTheme"> => {
    const el = document.createElement("div");
    const chart = createMockChartWithInit();
    const [option, setOption] = createSignal<SolidEChartOption | undefined>(initialOption);

    createRoot((dispose) => {
      disposeRoot = dispose;
      const { instance } = createChart(() => el, { theme });
      createChartEffect(instance, option, effectOpts);
    });

    return { chart, setOption };
  };

  // `initialOption: null` is manual mode (no option).
  const setup = (
    effectOpts?: CreateChartEffectOptions,
    initialOption: SolidEChartOption | null = OPTION_A,
  ): Harness => {
    const [theme, setTheme] = createSignal<string>(DEFAULT_THEME);
    return {
      ...setupThemeAndOption(theme, effectOpts, initialOption ?? undefined),
      setTheme,
    };
  };

  // Call order across both mocks: ["setTheme", "setOption", ...].
  const callSequence = (chart: EChartsType): string[] => {
    const calls = [
      ...vi
        .mocked(chart.setTheme)
        .mock.invocationCallOrder.map((order) => ({ order, name: "setTheme" })),
      ...vi.mocked(chart.setOption).mock.invocationCallOrder.map((order) => ({
        order,
        name: "setOption",
      })),
    ];
    return calls.toSorted((a, b) => a.order - b.order).map(({ name }) => name);
  };

  it("should call setOption with the latest option right after setTheme", () => {
    const { chart, setTheme, setOption } = setup();
    setOption(OPTION_B);
    vi.mocked(chart.setOption).mockClear();

    setTheme(DARK_THEME);

    expect(callSequence(chart)).toEqual(["setTheme", "setOption"]);
    expect(chart.setOption).toHaveBeenCalledWith(OPTION_B, {
      notMerge: false,
      replaceMerge: [],
      lazyUpdate: false,
      silent: false,
    });
  });

  it("should reapply with the update options of the option effect", () => {
    const { chart, setTheme } = setup({ replaceMerge: ["series"], lazyUpdate: true, silent: true });
    vi.mocked(chart.setOption).mockClear();

    setTheme(DARK_THEME);

    expect(chart.setOption).toHaveBeenCalledExactlyOnceWith(OPTION_A, {
      notMerge: false,
      replaceMerge: ["series"],
      lazyUpdate: true,
      silent: true,
    });
  });

  it("should reapply with notMerge: true under autoMerge", () => {
    const { chart, setTheme, setOption } = setup({ autoMerge: true });
    setOption(OPTION_B);
    vi.mocked(chart.setOption).mockClear();

    setTheme(DARK_THEME);

    expect(chart.setOption).toHaveBeenCalledExactlyOnceWith(OPTION_B, {
      notMerge: true,
      replaceMerge: undefined,
      lazyUpdate: false,
      silent: false,
    });
  });

  it("should end with setOption(latest) after setTheme when the option is written first in a batch", () => {
    const { chart, setTheme, setOption } = setup();
    vi.mocked(chart.setOption).mockClear();

    batch(() => {
      setOption(OPTION_B);
      setTheme(DARK_THEME);
    });

    const sequence = callSequence(chart);
    expect(sequence.slice(sequence.indexOf("setTheme"))).toEqual(["setTheme", "setOption"]);
    expect(chart.setOption).toHaveBeenLastCalledWith(OPTION_B, expect.any(Object));
  });

  it("should call setOption once, after setTheme, when the theme is written first in a batch", () => {
    const { chart, setTheme, setOption } = setup();
    vi.mocked(chart.setOption).mockClear();

    batch(() => {
      setTheme(DARK_THEME);
      setOption(OPTION_B);
    });

    expect(callSequence(chart)).toEqual(["setTheme", "setOption"]);
    expect(chart.setOption).toHaveBeenLastCalledWith(OPTION_B, expect.any(Object));
  });

  it("should not call setTheme or setOption when the theme accessor re-runs with the same value", () => {
    const [settings, setSettings] = createSignal({ theme: DARK_THEME, other: 1 });
    const { chart } = setupThemeAndOption(() => settings().theme, undefined, OPTION_A);
    vi.mocked(chart.setOption).mockClear();

    setSettings({ theme: DARK_THEME, other: 2 });

    expect(chart.setTheme).not.toHaveBeenCalled();
    expect(chart.setOption).not.toHaveBeenCalled();
  });

  it("should not call setOption after setTheme when there is no option (manual mode)", () => {
    const { chart, setTheme } = setup(undefined, null);
    setTheme(DARK_THEME);

    expect(chart.setTheme).toHaveBeenCalledExactlyOnceWith(DARK_THEME);
    expect(chart.setOption).not.toHaveBeenCalled();
  });
});

describe("renderer", () => {
  it("should dispose and reinit when renderer signal changes", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const [renderer, setRenderer] = createSignal<"canvas" | "svg">("canvas");

    const chart1 = createMockInstance();
    const chart2 = createMockInstance();
    vi.mocked(echartsCore.init)
      .mockReturnValueOnce(chart1 as unknown as EChartsType)
      .mockReturnValueOnce(chart2 as unknown as EChartsType);

    const { instance } = setupChart(container, { renderer });
    setContainer(el);

    expect(instance()).toBe(chart1);

    setRenderer("svg");

    expect(chart1.dispose).toHaveBeenCalledTimes(1);
    expect(echartsCore.init).toHaveBeenCalledTimes(2);
    expect(vi.mocked(echartsCore.init).mock.calls[1]?.[2]).toMatchObject({ renderer: "svg" });
    expect(instance()).toBe(chart2);
  });

  it("should set instance to null between dispose and reinit", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const [renderer, setRenderer] = createSignal<"canvas" | "svg">("canvas");

    const chart1 = createMockInstance();
    const chart2 = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValueOnce(chart1).mockReturnValueOnce(chart2);

    const nullTransitions: boolean[] = [];
    const { instance } = setupChart(container, { renderer });

    createEffect(() => {
      const val = instance();
      nullTransitions.push(val === null);
    });

    setContainer(el);
    setRenderer("svg");

    expect(nullTransitions).toContain(true);
    expect(instance()).toBe(chart2);
  });
});

describe("group", () => {
  it("should call connect on init when group is provided", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const chart = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValue(chart as unknown as EChartsType);

    setupChart(container, { group: "dashboard" });
    setContainer(el);

    expect(echartsCore.connect).toHaveBeenCalledWith("dashboard");
  });

  it("should update group assignment and connect new group when group signal changes", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const [group, setGroup] = createSignal<string | undefined>("group-a");
    const chart = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValue(chart as unknown as EChartsType);

    setupChart(container, { group });
    setContainer(el);

    setGroup("group-b");

    expect(echartsCore.disconnect).not.toHaveBeenCalled();
    expect(echartsCore.connect).toHaveBeenCalledWith("group-b");
    expect(chart.group).toBe("group-b");
  });

  it("should clear group on root dispose without disconnecting", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const chart = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValue(chart as unknown as EChartsType);

    setupChart(container, { group: "dashboard" });
    setContainer(el);

    disposeRoot?.();
    disposeRoot = undefined;

    expect(echartsCore.disconnect).not.toHaveBeenCalled();
    expect(chart.group).toBe("");
  });

  it("should not call connect when group is undefined", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const chart = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValue(chart as unknown as EChartsType);

    setupChart(container, { group: undefined });
    setContainer(el);

    expect(echartsCore.connect).not.toHaveBeenCalled();
  });
});

describe("autoResize", () => {
  it("should attach ResizeObserver when autoResize: true", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const chart = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValue(chart);
    const observeSpy = spyOnResizeObserver();

    setupChart(container, { autoResize: true });
    setContainer(el);

    expect(observeSpy).toHaveBeenCalledWith(el);
  });

  it("should not attach ResizeObserver when autoResize: false", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const chart = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValue(chart);
    const observeSpy = spyOnResizeObserver();

    setupChart(container, { autoResize: false });
    setContainer(el);

    expect(observeSpy).not.toHaveBeenCalled();
  });

  it("should detach ResizeObserver when autoResize signal changes true -> false", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const [autoResize, setAutoResize] = createSignal(true);
    const chart = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValue(chart as unknown as EChartsType);
    const disconnectSpy = spyOnResizeObserver("disconnect");

    setupChart(container, { autoResize });
    setContainer(el);

    setAutoResize(false);

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  it("should attach ResizeObserver when autoResize signal changes false -> true", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const [autoResize, setAutoResize] = createSignal(false);
    const chart = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValue(chart as unknown as EChartsType);

    const observeSpy = spyOnResizeObserver();

    setupChart(container, { autoResize });
    setContainer(el);

    expect(observeSpy).not.toHaveBeenCalled();

    setAutoResize(true);

    expect(observeSpy).toHaveBeenCalledTimes(1);
  });
});

describe("dispose and cleanup", () => {
  it("should call chart.dispose when reactive root is disposed", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const chart = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValue(chart as unknown as EChartsType);

    setupChart(container);
    setContainer(el);

    disposeRoot?.();
    disposeRoot = undefined;

    expect(chart.dispose).toHaveBeenCalledTimes(1);
  });

  it("should set instance to null after root is disposed", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const chart = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValue(chart as unknown as EChartsType);

    const { instance } = setupChart(container);
    setContainer(el);

    expect(instance()).toBe(chart);

    disposeRoot?.();
    disposeRoot = undefined;

    expect(instance()).toBeNull();
  });

  it("should disconnect ResizeObserver on cleanup", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    const chart = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValue(chart as unknown as EChartsType);
    const disconnectSpy = spyOnResizeObserver("disconnect");

    setupChart(container, { autoResize: true });
    setContainer(el);

    disposeRoot?.();
    disposeRoot = undefined;

    expect(disconnectSpy).toHaveBeenCalled();
  });

  it("should not call dispose twice on an already-disposed instance", () => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
    let isDisposed = false;
    const chart = createMockInstance({
      isDisposed: vi.fn(() => isDisposed),
      dispose: vi.fn(() => {
        isDisposed = true;
      }),
    });
    vi.mocked(echartsCore.init).mockReturnValue(chart as unknown as EChartsType);

    setupChart(container);
    setContainer(el);

    // external dispose
    chart.dispose();
    disposeRoot?.();
    disposeRoot = undefined;

    expect(chart.dispose).toHaveBeenCalledTimes(1);
  });

  it("should not call resize or onResize if chart is disposed", () => {
    vi.useFakeTimers();
    MockResizeObserver.reset();

    let disposed = false;

    const chart = createMockInstance({
      isDisposed: vi.fn(() => disposed),
    });

    vi.mocked(echartsCore.init).mockReturnValue(chart);

    const onResize = vi.fn();

    const el = document.createElement("div");
    defineConfSz(el, 300, 400);

    const [container, setContainer] = createSignal<HTMLElement | null>(null);

    setupChart(container, { onResize });

    setContainer(el);

    expect(MockResizeObserver.instances.length).toBeGreaterThan(0);
    const resizeObserver = MockResizeObserver.instances[0]!;

    // --- First: normal resize (should work)
    defineWidth(el, { value: 500 });
    resizeObserver.emit();
    vi.runAllTimers();

    expect(chart.resize).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledTimes(1);

    // --- Now mark as disposed
    disposed = true;

    defineWidth(el, { value: 600 });
    resizeObserver.emit();
    vi.runAllTimers();

    // --- Should NOT be called again
    expect(chart.resize).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});

describe("inner handleResize", () => {
  it("skips the first resize callback when dimensions did not change", () => {
    vi.useFakeTimers();
    MockResizeObserver.reset();

    const chart = createMockChartWithInit();

    const onResize = vi.fn();
    const el = document.createElement("div");

    defineConfSz(el, 300, 400);

    const [container, setContainer] = createSignal<HTMLElement | null>(null);

    setupChart(container, { onResize });

    // chart created + effect ran
    setContainer(el);

    expect(MockResizeObserver.instances.length).toBeGreaterThan(0);
    const resizeObserver = MockResizeObserver.instances[0]!;
    expect(resizeObserver).toBeDefined(); // sanity check

    // First RO callback (should be skipped)
    resizeObserver.emit();
    vi.runAllTimers();

    expect(chart.resize).not.toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("skips resize when container becomes zero-sized", () => {
    vi.useFakeTimers();
    MockResizeObserver.reset();

    const chart = createMockChartWithInit();

    const onResize = vi.fn();
    const el = document.createElement("div");
    defineConfSz(el, 300, 400);

    const [container, setContainer] = createSignal<HTMLElement | null>(null);

    setupChart(container, { onResize });

    setContainer(el);

    expect(MockResizeObserver.instances.length).toBeGreaterThan(0);
    const resizeObserver = MockResizeObserver.instances[0]!;

    defineConfSz(el, 300, 400);

    resizeObserver.emit();
    vi.runAllTimers();

    expect(chart.resize).not.toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("calls resize and onResize after a real size change", () => {
    vi.useFakeTimers();
    MockResizeObserver.reset();

    const chart = createMockChartWithInit();

    const onResize = vi.fn();
    const el = document.createElement("div");
    defineConfSz(el, 300, 400);

    const [container, setContainer] = createSignal<HTMLElement | null>(null);

    setupChart(container, { onResize, resizeDebounce: 10 });

    setContainer(el);

    expect(MockResizeObserver.instances.length).toBeGreaterThan(0);
    const resizeObserver = MockResizeObserver.instances[0]!;

    defineConfSz(el, 350, 500);

    resizeObserver.emit();
    vi.advanceTimersByTime(10);

    expect(chart.resize).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("does not call onResize when no callback is provided", () => {
    vi.useFakeTimers();
    MockResizeObserver.reset();

    const chart = createMockChartWithInit();

    const el = document.createElement("div");
    defineConfSz(el, 300, 400);

    const [container, setContainer] = createSignal<HTMLElement | null>(null);

    setupChart(container, { resizeDebounce: 0 });

    setContainer(el);

    expect(MockResizeObserver.instances.length).toBeGreaterThan(0);
    const resizeObserver = MockResizeObserver.instances[0]!;

    defineConfSz(el, 350, 500);

    resizeObserver.emit();
    vi.runAllTimers();

    expect(chart.resize).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

describe("group synchronisation", () => {
  it("should connect when group is set initially", () => {
    const chart = createMockChartWithInit();

    const [group] = createSignal("group-1");
    const [container, setContainer] = createSignal<HTMLElement | null>(null);

    setupChart(container, { group });

    const el = document.createElement("div");
    setContainer(el);

    expect(chart.group).toBe("group-1");
    expect(connect).toHaveBeenCalledWith("group-1");
    expect(disconnect).not.toHaveBeenCalled();
  });

  it("should update group assignment and connect new one on change", () => {
    const chart = createMockChartWithInit();
    const [group, setGroup] = createSignal<string | undefined>("group-1");
    const [container, setContainer] = createSignal<HTMLElement | null>(null);

    setupChart(container, { group });
    setContainer(document.createElement("div"));

    vi.mocked(connect).mockClear();
    vi.mocked(disconnect).mockClear();

    setGroup("group-2");

    expect(disconnect).not.toHaveBeenCalled();
    expect(connect).toHaveBeenCalledWith("group-2");
    expect(chart.group).toBe("group-2");
  });

  it("should clear group when group becomes undefined", () => {
    const chart = createMockChartWithInit();
    const [group, setGroup] = createSignal<string | undefined>("group-1");
    const [container, setContainer] = createSignal<HTMLElement | null>(null);

    setupChart(container, { group });
    setContainer(document.createElement("div"));

    vi.mocked(connect).mockClear();
    vi.mocked(disconnect).mockClear();

    setGroup(undefined);

    expect(disconnect).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
    expect(chart.group).toBe("");
  });

  it("should not reconnect when group value does not change", () => {
    const [group, setGroup] = createSignal<string | undefined>("group-1");
    const [container, setContainer] = createSignal<HTMLElement | null>(null);

    setupChart(container, { group });

    const el = document.createElement("div");
    setContainer(el);

    vi.mocked(connect).mockClear();
    vi.mocked(disconnect).mockClear();

    setGroup("group-1"); // same value

    expect(connect).not.toHaveBeenCalled();
    expect(disconnect).not.toHaveBeenCalled();
  });
});

describe("initOnVisible", () => {
  beforeEach(() => {
    MockIntersectionObserver.reset();
  });

  const mountWithGate = (opts?: CreateChartOptions) => {
    const el = document.createElement("div");
    const [container, setContainer] = createSignal<HTMLElement | null>(null);
    const chart = createMockChartWithInit();
    const { instance } = setupChart(container, { initOnVisible: true, ...opts });
    setContainer(el);
    return { el, chart, instance, setContainer };
  };

  it("should not observe visibility by default", () => {
    const [container, setContainer] = createSignal<HTMLElement | null>(null);
    createMockChartWithInit();

    setupChart(container);
    setContainer(document.createElement("div"));

    expect(MockIntersectionObserver.instances).toHaveLength(0);
    expect(echartsCore.init).toHaveBeenCalledTimes(1);
  });

  it("should observe the container and not init before it is visible", () => {
    const observeSpy = vi.spyOn(MockIntersectionObserver.prototype, "observe");
    const { el, instance } = mountWithGate();

    expect(observeSpy).toHaveBeenCalledWith(el);
    expect(echartsCore.init).not.toHaveBeenCalled();
    expect(instance()).toBeNull();
  });

  it("should not init when the observer reports a non-intersecting entry", () => {
    mountWithGate();

    MockIntersectionObserver.instances[0]!.emit(false);

    expect(echartsCore.init).not.toHaveBeenCalled();
  });

  it("should init once the container intersects and stop observing", () => {
    const disconnectSpy = vi.spyOn(MockIntersectionObserver.prototype, "disconnect");
    const { el, chart, instance } = mountWithGate();

    MockIntersectionObserver.instances[0]!.emit(true);

    expect(echartsCore.init).toHaveBeenCalledTimes(1);
    expect(echartsCore.init).toHaveBeenCalledWith(el, DEFAULT_THEME, expect.any(Object));
    expect(instance()).toBe(chart);
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  it("should init with the init option values current when the container becomes visible", () => {
    const [locale, setLocale] = createSignal("EN");
    mountWithGate({ locale });

    setLocale("ZH");
    MockIntersectionObserver.instances[0]!.emit(true);

    expect(vi.mocked(echartsCore.init).mock.calls[0]?.[2]).toMatchObject({ locale: "ZH" });
  });

  it("should keep the instance when the container leaves the viewport again", () => {
    const { chart, instance } = mountWithGate();
    const observer = MockIntersectionObserver.instances[0]!;

    observer.emit(true);
    observer.emit(false);

    expect(vi.mocked(chart.dispose)).not.toHaveBeenCalled();
    expect(instance()).toBe(chart);
  });

  it("should reinit on renderer change without waiting for visibility again", () => {
    const [renderer, setRenderer] = createSignal<"canvas" | "svg">("canvas");
    mountWithGate({ renderer });
    MockIntersectionObserver.instances[0]!.emit(true);

    setRenderer("svg");

    expect(echartsCore.init).toHaveBeenCalledTimes(2);
    expect(MockIntersectionObserver.instances).toHaveLength(1);
  });

  it("should stop observing when disposed before the container became visible", () => {
    const disconnectSpy = vi.spyOn(MockIntersectionObserver.prototype, "disconnect");
    mountWithGate();

    disposeRoot?.();
    disposeRoot = undefined;

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    expect(echartsCore.init).not.toHaveBeenCalled();
  });

  it("should init immediately when IntersectionObserver is not available", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    mountWithGate();

    expect(echartsCore.init).toHaveBeenCalledTimes(1);
  });
});
