/** @jsxImportSource solid-js */

// MUST be in the test file - vi.mock is hoisted above all imports
vi.mock("echarts/core", () => ({
  init: vi.fn(),
  use: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  registerTheme: vi.fn(),
}));

import type { Accessor } from "solid-js";
import { createEffect, createSignal } from "solid-js";

import { render } from "@solidjs/testing-library";
import type { EChartsType } from "echarts/core";
import * as echartsCore from "echarts/core";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import type { EChartsOption } from "../../src";
import { seActions } from "../../src/actions";
import { useChart } from "../../src/context/use-chart";
import { DARK_THEME, DEFAULT_THEME } from "../../src/helpers/common";
import { SolidEChart } from "../../src/SolidEChart";
import type { EChartRenderer } from "../../src/types/common";
import type { EventParams, RenderedEventParams, SolidEChartEventMap } from "../../src/types/echart";
import { createMockInstance, createMockZr } from "../mocks/echarts";
import { MockIntersectionObserver } from "../setup";
import {
  captureOnHandler,
  createMockChartWithInit,
  createSequentialMockCharts,
  fakeParams,
  getInitThemes,
  STYLE,
} from "../utils/charts";
import { spyOnResizeObserver } from "../utils/resize-observer";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("mount and init", () => {
  let _mockChart: EChartsType;

  beforeEach(() => {
    _mockChart = createMockChartWithInit(); // sets up echarts.init to return mockChart
  });

  it("should call echarts.init once when the component mounts", () => {
    render(() => <SolidEChart style={STYLE} />);
    expect(echartsCore.init).toHaveBeenCalledTimes(1);
  });

  it("should call echarts.init with the container div element", () => {
    const { container } = render(() => <SolidEChart style={STYLE} />);
    const el = container.querySelector("div");
    expect(echartsCore.init).toHaveBeenCalledWith(el, DEFAULT_THEME, expect.any(Object));
  });

  it("should call echarts.init with default canvas renderer", () => {
    render(() => <SolidEChart style={STYLE} />);
    expect(echartsCore.init).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      DEFAULT_THEME,
      expect.objectContaining({ renderer: "canvas" }),
    );
  });

  it("should render a container div in the document", () => {
    const { container } = render(() => <SolidEChart style={STYLE} />);
    expect(container.querySelector("div")).toBeInstanceOf(HTMLDivElement);
  });

  it("should forward the style prop to the container div", () => {
    const { container } = render(() => <SolidEChart style={STYLE} />);
    const el = container.querySelector("div") as HTMLDivElement;
    expect(el.style.width).toBe("400px");
    expect(el.style.height).toBe("300px");
  });

  it("should forward native HTML attributes to the container div", () => {
    const { container } = render(() => (
      <SolidEChart id="my-chart" aria-label="Sales chart" data-testid="chart" style={STYLE} />
    ));
    const el = container.querySelector("div")!;
    expect(el.id).toBe("my-chart");
    expect(el.getAttribute("aria-label")).toBe("Sales chart");
    expect(el.getAttribute("data-testid")).toBe("chart");
  });

  it("should call chart.dispose when the component unmounts", () => {
    const chart = createMockChartWithInit();
    const { unmount } = render(() => <SolidEChart style={STYLE} />);
    unmount();
    expect(vi.mocked(chart.dispose)).toHaveBeenCalledTimes(1);
  });

  it("should not call echarts.init a second time on theme change (no reinit)", () => {
    const [theme, setTheme] = createSignal(DEFAULT_THEME);
    render(() => <SolidEChart theme={theme} style={STYLE} />);

    setTheme(DARK_THEME);

    expect(echartsCore.init).toHaveBeenCalledTimes(1);
  });
});

describe("option prop", () => {
  it("should call setOption on initial render", () => {
    const chart = createMockChartWithInit();
    const [option] = createSignal({ series: [] });
    render(() => <SolidEChart option={option} style={STYLE} />);

    expect(vi.mocked(chart.setOption)).toHaveBeenCalledTimes(1);
  });

  it("should call setOption with the initial option value", () => {
    const chart = createMockChartWithInit();
    const opt: EChartsOption = { series: [{ type: "bar", data: [1, 2, 3] }] };
    const [option] = createSignal(opt);
    render(() => <SolidEChart option={option} style={STYLE} />);

    expect(vi.mocked(chart.setOption)).toHaveBeenCalledWith(opt, expect.any(Object));
  });

  it("should call setOption again when option signal changes", () => {
    const chart = createMockChartWithInit();
    const [option, setOption] = createSignal<Record<string, unknown>>({ series: [] });
    render(() => <SolidEChart option={option} style={STYLE} />);

    setOption({ series: [{ type: "line" }] });

    expect(vi.mocked(chart.setOption)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(chart.setOption)).toHaveBeenLastCalledWith(
      { series: [{ type: "line" }] },
      expect.any(Object),
    );
  });

  it("should not call setOption when no option prop is provided", () => {
    const chart = createMockChartWithInit();
    render(() => <SolidEChart style={STYLE} />);

    expect(vi.mocked(chart.setOption)).not.toHaveBeenCalled();
  });

  it("should call setOption when option transitions undefined -> defined", () => {
    const chart = createMockChartWithInit();
    // createChartEffect must be wired unconditionally so a late-arriving
    // option prop is picked up without remounting the component.
    const [option, setOption] = createSignal<Record<string, unknown> | undefined>(undefined);
    render(() => (
      <SolidEChart option={option as Accessor<Record<string, unknown>>} style={STYLE} />
    ));

    expect(vi.mocked(chart.setOption)).not.toHaveBeenCalled();

    setOption({ series: [{ type: "bar" }] });

    expect(vi.mocked(chart.setOption)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(chart.setOption)).toHaveBeenCalledWith(
      { series: [{ type: "bar" }] },
      expect.any(Object),
    );
  });

  it("should call setOption with notMerge: false by default", () => {
    const chart = createMockChartWithInit();
    const [option] = createSignal({ series: [] });
    render(() => <SolidEChart option={option} style={STYLE} />);

    expect(vi.mocked(chart.setOption)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ notMerge: false }),
    );
  });

  it("should call setOption with notMerge: true when prop is set", () => {
    const chart = createMockChartWithInit();
    const [option] = createSignal({ series: [] });
    render(() => <SolidEChart option={option} notMerge={true} style={STYLE} />);

    expect(vi.mocked(chart.setOption)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ notMerge: true }),
    );
  });

  it("[autoMerge] should pass replaceMerge when a series id is removed", () => {
    const chart = createMockChartWithInit();
    const [option, setOption] = createSignal<Record<string, unknown>>({
      series: [{ id: "a" }, { id: "b" }],
    });
    render(() => <SolidEChart option={option} autoMerge={true} style={STYLE} />);

    setOption({ series: [{ id: "a" }] });

    expect(vi.mocked(chart.setOption).mock.calls.at(-1)?.[1]).toMatchObject({
      replaceMerge: ["series"],
      notMerge: false,
    });
  });

  it("[autoMerge] should pass notMerge: true when a top-level object key is removed", () => {
    const chart = createMockChartWithInit();
    const [option, setOption] = createSignal<Record<string, unknown>>({
      grid: {},
      series: [],
    });
    render(() => <SolidEChart option={option} autoMerge={true} style={STYLE} />);

    setOption({ series: [] }); // grid removed

    expect(vi.mocked(chart.setOption).mock.calls.at(-1)?.[1]).toMatchObject({
      notMerge: true,
    });
  });
});

describe("lifecycle callbacks (onInit / onReInit / onDispose)", () => {
  it("should call onInit with the instance exactly once on first mount", () => {
    const chart = createMockChartWithInit();
    const onInit = vi.fn();
    render(() => <SolidEChart onInit={onInit} style={STYLE} />);

    expect(onInit).toHaveBeenCalledTimes(1);
    expect(onInit).toHaveBeenCalledWith(chart);
  });

  it("should NOT call onInit again when renderer changes (reinit cycle)", () => {
    const chart = createMockChartWithInit();
    const onInit = vi.fn();
    const chart2 = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValueOnce(chart).mockReturnValueOnce(chart2);

    const [renderer, setRenderer] = createSignal<EChartRenderer>("canvas");
    render(() => <SolidEChart renderer={renderer} onInit={onInit} style={STYLE} />);

    expect(onInit).toHaveBeenCalledTimes(1);

    setRenderer("svg");

    expect(onInit).toHaveBeenCalledTimes(1); // must not re-fire
  });

  it("should call onReInit (not onInit) when renderer changes", () => {
    const onInit = vi.fn();
    const onReInit = vi.fn();
    const [_, chart2] = createSequentialMockCharts();

    const [renderer, setRenderer] = createSignal<EChartRenderer>("canvas");
    render(() => (
      <SolidEChart renderer={renderer} onInit={onInit} onReInit={onReInit} style={STYLE} />
    ));

    expect(onReInit).toHaveBeenCalledTimes(0);

    setRenderer("svg");

    expect(onReInit).toHaveBeenCalledTimes(1);
    expect(onReInit).toHaveBeenCalledWith(chart2);
    expect(onInit).toHaveBeenCalledTimes(1); // still only once
  });

  it("should call onDispose on renderer reinit (not only on final unmount)", () => {
    const onDispose = vi.fn();

    const [renderer, setRenderer] = createSignal<EChartRenderer>("canvas");
    render(() => <SolidEChart renderer={renderer} onDispose={onDispose} style={STYLE} />);

    expect(onDispose).toHaveBeenCalledTimes(0);

    setRenderer("svg");

    expect(onDispose).toHaveBeenCalledTimes(1); // fired during reinit dispose
  });

  it("should call onDispose when the component unmounts", () => {
    const onDispose = vi.fn();
    const { unmount } = render(() => <SolidEChart onDispose={onDispose} style={STYLE} />);

    unmount();

    expect(onDispose).toHaveBeenCalledTimes(1);
  });
});

describe("theme prop", () => {
  it("should pass the provided static theme to echarts.init", () => {
    const chart = createMockChartWithInit();
    render(() => <SolidEChart theme={DARK_THEME} style={STYLE} />);

    expect(getInitThemes()).toEqual([DARK_THEME]);
    // init already applied it - no redundant in-place update
    expect(vi.mocked(chart.setTheme)).not.toHaveBeenCalled();
  });

  it("should call setTheme in-place when theme signal changes (no dispose, no reinit)", () => {
    const chart = createMockChartWithInit();
    const [theme, setTheme] = createSignal(DEFAULT_THEME);
    render(() => <SolidEChart theme={theme} style={STYLE} />);

    const initCount = vi.mocked(echartsCore.init).mock.calls.length;

    setTheme(DARK_THEME);

    expect(vi.mocked(chart.setTheme)).toHaveBeenLastCalledWith(DARK_THEME);
    expect(echartsCore.init).toHaveBeenCalledTimes(initCount); // no reinit
    expect(vi.mocked(chart.dispose)).not.toHaveBeenCalled();
  });

  it("should accept an inline object theme", () => {
    createMockChartWithInit();
    const themeObj = { backgroundColor: "#333333" };
    render(() => <SolidEChart theme={themeObj} style={STYLE} />);

    expect(getInitThemes()).toEqual([themeObj]);
  });
});

describe("renderer prop", () => {
  it("should call echarts.init with the svg renderer when renderer='svg'", () => {
    render(() => <SolidEChart renderer="svg" style={STYLE} />);

    expect(echartsCore.init).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      DEFAULT_THEME,
      expect.objectContaining({ renderer: "svg" }),
    );
  });

  it("should dispose and reinit when the renderer signal changes", () => {
    const chart = createMockChartWithInit();

    const [renderer, setRenderer] = createSignal<EChartRenderer>("canvas");
    render(() => <SolidEChart renderer={renderer} style={STYLE} />);
    setRenderer("svg");

    expect(vi.mocked(chart.dispose)).toHaveBeenCalledTimes(1);
    expect(echartsCore.init).toHaveBeenCalledTimes(2);
    expect(vi.mocked(echartsCore.init).mock.calls[1]?.[2]).toMatchObject({
      renderer: "svg",
    });
  });

  it("should set instance to null during the dispose->reinit transition", () => {
    const [chart1, chart2] = createSequentialMockCharts();
    // Track null ref state via a signal setter
    const [ref, setRef] = createSignal<EChartsType | null>(null);
    const [renderer, setRenderer] = createSignal<EChartRenderer>("canvas");

    const transitions: (EChartsType | null)[] = [];

    createEffect(() => {
      transitions.push(ref());
    });

    render(() => <SolidEChart renderer={renderer} ref={setRef} style={STYLE} />);

    expect(ref()).toBe(chart1);

    setRenderer("svg");

    // SolidJS runs cleanup synchronously when a dep changes - null transition
    // happens before the next microtask
    expect(transitions).toContain(null);
    expect(ref()).toBe(chart2);
  });
});

describe("loading prop", () => {
  it("should call showLoading('default', ...) when loading is true", () => {
    const chart = createMockChartWithInit();
    render(() => <SolidEChart loading={true} style={STYLE} />);

    expect(vi.mocked(chart.showLoading)).toHaveBeenCalledWith("default", expect.any(Object));
  });

  it("should call hideLoading when loading is false", () => {
    const chart = createMockChartWithInit();
    render(() => <SolidEChart loading={false} style={STYLE} />);

    expect(vi.mocked(chart.hideLoading)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(chart.showLoading)).not.toHaveBeenCalled();
  });

  it("should call showLoading when loading transitions false -> true", () => {
    const chart = createMockChartWithInit();
    const [loading, setLoading] = createSignal(false);
    render(() => <SolidEChart loading={loading} style={STYLE} />);

    setLoading(true);

    expect(vi.mocked(chart.showLoading)).toHaveBeenCalledTimes(1);
  });

  it("should call hideLoading when loading transitions true -> false", () => {
    const chart = createMockChartWithInit();
    const [loading, setLoading] = createSignal(true);
    render(() => <SolidEChart loading={loading} style={STYLE} />);

    expect(vi.mocked(chart.hideLoading)).toHaveBeenCalledTimes(0);

    setLoading(false);

    expect(vi.mocked(chart.hideLoading)).toHaveBeenCalledTimes(1);
  });

  it("should pass loadingOptions to showLoading", () => {
    const chart = createMockChartWithInit();
    const opts = { text: "Loading…", color: "#ff0000", spinnerRadius: 12 };
    render(() => <SolidEChart loading={true} loadingOptions={opts} style={STYLE} />);

    expect(vi.mocked(chart.showLoading)).toHaveBeenCalledWith("default", opts);
  });

  it("should not call showLoading spuriously when an unrelated signal changes", () => {
    const chart = createMockChartWithInit();
    // F6: EMPTY_LOADING_OPTIONS is a stable constant so the loading effect's
    // dep array sees no change when other signals (option) are updated.
    const [option, setOption] = createSignal<Record<string, unknown>>({ series: [] });
    render(() => <SolidEChart loading={true} option={option} style={STYLE} />);

    const callsAfterInit = vi.mocked(chart.showLoading).mock.calls.length;

    setOption({ series: [{ type: "bar" }] });

    // option change -> setOption effect fires, but loading effect must NOT re-fire
    expect(vi.mocked(chart.showLoading)).toHaveBeenCalledTimes(callsAfterInit);
  });

  it("should not call showLoading twice when loading stays true across option changes", () => {
    const chart = createMockChartWithInit();
    const [option, setOption] = createSignal<Record<string, unknown>>({ series: [] });
    render(() => <SolidEChart loading={true} option={option} style={STYLE} />);
    setOption({ series: [{ type: "line" }] });
    setOption({ series: [{ type: "bar" }] });

    expect(vi.mocked(chart.showLoading)).toHaveBeenCalledTimes(1);
  });
});

describe("onEvents prop", () => {
  it("should register each handler with chart.on", () => {
    const chart = createMockChartWithInit();
    const handler = vi.fn();
    render(() => <SolidEChart onEvents={{ click: handler }} style={STYLE} />);

    expect(vi.mocked(chart.on)).toHaveBeenCalledWith("click", expect.any(Function));
  });

  it("should inject the live instance as the second argument when the event fires", () => {
    const chart = createMockChartWithInit();
    const handler = vi.fn();
    render(() => <SolidEChart onEvents={{ click: handler }} style={STYLE} />);

    const wrapper = captureOnHandler("click", chart);
    wrapper?.(fakeParams);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(fakeParams, chart);
  });

  it("should forward undefined params for the finished event", () => {
    const chart = createMockChartWithInit();
    const handler = vi.fn();
    render(() => <SolidEChart onEvents={{ finished: handler }} style={STYLE} />);

    const wrapper = captureOnHandler("finished", chart);
    wrapper?.();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(undefined, chart);
  });

  it("should type handler params per event name", () => {
    expectTypeOf<SolidEChartEventMap["click"]>().toEqualTypeOf<
      ((params: EventParams, instance: EChartsType) => void) | undefined
    >();
    expectTypeOf<SolidEChartEventMap["rendered"]>().toEqualTypeOf<
      ((params: RenderedEventParams, instance: EChartsType) => void) | undefined
    >();
    expectTypeOf<SolidEChartEventMap["finished"]>().toEqualTypeOf<
      ((params: undefined, instance: EChartsType) => void) | undefined
    >();
  });

  it("should type selfType as an optional event param", () => {
    expectTypeOf<EventParams["selfType"]>().toEqualTypeOf<
      "line" | "area" | "breadcrumb" | undefined
    >();
    expectTypeOf<"sankeyroam">().toExtend<keyof SolidEChartEventMap>();
  });

  it("should register multiple handlers for different events", () => {
    const chart = createMockChartWithInit();
    const onClick = vi.fn();
    const onMousemove = vi.fn();
    render(() => (
      <SolidEChart onEvents={{ click: onClick, mousemove: onMousemove }} style={STYLE} />
    ));

    const registeredEvents = vi.mocked(chart.on).mock.calls.map(([name]) => name);
    expect(registeredEvents).toContain("click");
    expect(registeredEvents).toContain("mousemove");
  });

  it("should call chart.off for each handler when component unmounts", () => {
    const chart = createMockChartWithInit();
    const handler = vi.fn();
    const { unmount } = render(() => <SolidEChart onEvents={{ click: handler }} style={STYLE} />);

    const wrapper = captureOnHandler("click", chart);
    unmount();

    expect(vi.mocked(chart.off)).toHaveBeenCalledWith("click", wrapper);
  });

  it("should re-register handlers on the new instance after renderer reinit", () => {
    const chart = createMockChartWithInit();
    const handler = vi.fn();
    const [renderer, setRenderer] = createSignal<EChartRenderer>("canvas");
    render(() => <SolidEChart renderer={renderer} onEvents={{ click: handler }} style={STYLE} />);
    setRenderer("svg");

    expect(vi.mocked(chart.on)).toHaveBeenCalledWith("click", expect.any(Function));
  });

  it("should detach handlers from old instance before attaching to new instance", () => {
    const [chart1, chart2] = createSequentialMockCharts();
    const handler = vi.fn();
    const [renderer, setRenderer] = createSignal<EChartRenderer>("canvas");
    render(() => <SolidEChart renderer={renderer} onEvents={{ click: handler }} style={STYLE} />);
    setRenderer("svg");

    const oldOffIndex = vi.mocked(chart1.off).mock.calls.findIndex(([name]) => name === "click");
    const newOnIndex = vi.mocked(chart2.on).mock.calls.findIndex(([name]) => name === "click");

    expect(oldOffIndex).toBeGreaterThanOrEqual(0);
    expect(newOnIndex).toBeGreaterThanOrEqual(0);

    const oldCallOrder = vi.mocked(chart1.off).mock.invocationCallOrder[oldOffIndex]!;
    const newCallOrder = vi.mocked(chart2.on).mock.invocationCallOrder[newOnIndex]!;

    expect(oldCallOrder).toBeLessThan(newCallOrder);
  });

  it("should deregister handlers from the old instance using the same wrapper reference", () => {
    const chart = createMockChartWithInit();
    const handler = vi.fn();
    const [renderer, setRenderer] = createSignal<EChartRenderer>("canvas");
    render(() => <SolidEChart renderer={renderer} onEvents={{ click: handler }} style={STYLE} />);
    const oldWrapper = captureOnHandler("click", chart);
    setRenderer("svg");

    expect(vi.mocked(chart.off)).toHaveBeenCalledWith("click", oldWrapper);
  });
});

describe("onEventsOnce prop", () => {
  it("should register the once-handler with chart.on", () => {
    const chart = createMockChartWithInit();
    const handler = vi.fn();
    render(() => <SolidEChart onEventsOnce={{ click: handler }} style={STYLE} />);

    expect(vi.mocked(chart.on)).toHaveBeenCalledWith("click", expect.any(Function));
  });

  it("should call the handler exactly once when the event fires", () => {
    const chart = createMockChartWithInit();
    const handler = vi.fn();
    render(() => <SolidEChart onEventsOnce={{ click: handler }} style={STYLE} />);
    const wrapper = captureOnHandler("click", chart);
    wrapper?.(fakeParams);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(fakeParams, chart);
  });

  it("should NOT call the handler a second time if the same wrapper is invoked twice (WeakSet guard)", () => {
    const chart = createMockChartWithInit();
    // the WeakSet inside the wrapper prevents double-invocation of the
    // same wrapped function reference, guarding against race conditions.
    const handler = vi.fn();
    render(() => <SolidEChart onEventsOnce={{ click: handler }} style={STYLE} />);
    const wrapper = captureOnHandler("click", chart);
    wrapper?.(fakeParams);
    wrapper?.(fakeParams); // second invocation of the SAME wrapper

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should call chart.off with the wrapper reference immediately after the event fires", () => {
    const chart = createMockChartWithInit();
    const handler = vi.fn();
    render(() => <SolidEChart onEventsOnce={{ click: handler }} style={STYLE} />);
    const wrapper = captureOnHandler("click", chart);
    wrapper?.(fakeParams);

    expect(vi.mocked(chart.off)).toHaveBeenCalledWith("click", wrapper);
  });

  it("should call chart.off on cleanup even if the event never fired", () => {
    const chart = createMockChartWithInit();
    const handler = vi.fn();
    const { unmount } = render(() => (
      <SolidEChart onEventsOnce={{ click: handler }} style={STYLE} />
    ));
    const wrapper = captureOnHandler("click", chart);
    unmount();

    expect(vi.mocked(chart.off)).toHaveBeenCalledWith("click", wrapper);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("onSurfaceEvents prop", () => {
  it("should register the handler on the ZRender surface via getZr().on", () => {
    const mockZr = createMockZr();
    const chartWithZr = createMockInstance({ getZr: vi.fn(() => mockZr) });
    vi.mocked(echartsCore.init).mockReturnValue(chartWithZr);

    const handler = vi.fn();
    render(() => <SolidEChart onSurfaceEvents={{ click: handler }} style={STYLE} />);

    // Surface events are registered directly (not wrapped)
    expect(vi.mocked(mockZr.on)).toHaveBeenCalledWith("click", handler);
  });

  it("should call surface.off on the CAPTURED surface - not a fresh getZr() - when cleaning up", () => {
    // F2: the cleanup closure captures `surface` at registration time.
    // If getZr() is re-called at cleanup, it returns the NEW surface after reinit,
    // and off() would be a no-op on the wrong object.
    const mockZr1 = createMockZr();
    const mockZr2 = createMockZr();
    let getZrCallCount = 0;
    const chart = createMockInstance({
      getZr: vi.fn(() => {
        getZrCallCount++;
        return getZrCallCount === 1 ? mockZr1 : mockZr2;
      }),
    });
    vi.mocked(echartsCore.init).mockReturnValue(chart);

    const handler = vi.fn();
    const { unmount } = render(() => (
      <SolidEChart onSurfaceEvents={{ click: handler }} style={STYLE} />
    ));

    expect(vi.mocked(mockZr1.on)).toHaveBeenCalledWith("click", handler);

    unmount();

    // Cleanup must use the FIRST surface (captured at registration)
    expect(vi.mocked(mockZr1.off)).toHaveBeenCalledWith("click", handler);
    // The second surface must never have had off() called on it
    expect(vi.mocked(mockZr2.off)).not.toHaveBeenCalled();
  });

  it("should deregister from old surface and re-register on new surface after renderer reinit", () => {
    const mockZr1 = createMockZr();
    const mockZr2 = createMockZr();
    const chart1 = createMockInstance({ getZr: vi.fn(() => mockZr1) });
    const chart2 = createMockInstance({ getZr: vi.fn(() => mockZr2) });
    vi.mocked(echartsCore.init).mockReturnValueOnce(chart1).mockReturnValueOnce(chart2);

    const handler = vi.fn();
    const [renderer, setRenderer] = createSignal<EChartRenderer>("canvas");
    render(() => (
      <SolidEChart renderer={renderer} onSurfaceEvents={{ click: handler }} style={STYLE} />
    ));

    expect(vi.mocked(mockZr1.on)).toHaveBeenCalledWith("click", handler);

    setRenderer("svg"); // -> dispose chart1 (cleanup: off on zr1) -> init chart2 (on zr2)

    expect(vi.mocked(mockZr1.off)).toHaveBeenCalledWith("click", handler); // captured surface
    expect(vi.mocked(mockZr2.on)).toHaveBeenCalledWith("click", handler); // re-registered
    expect(vi.mocked(mockZr2.off)).not.toHaveBeenCalled(); // new surface is clean
  });
});

describe("onSurfaceEventsOnce prop", () => {
  it("should register a wrapper with the ZRender surface", () => {
    const mockZr = createMockZr();
    const chart = createMockInstance({ getZr: vi.fn(() => mockZr) });
    vi.mocked(echartsCore.init).mockReturnValue(chart);

    const handler = vi.fn();
    render(() => <SolidEChart onSurfaceEventsOnce={{ click: handler }} style={STYLE} />);

    expect(vi.mocked(mockZr.on)).toHaveBeenCalledWith("click", expect.any(Function));
  });

  it("should call the handler exactly once when the surface event fires", () => {
    const mockZr = createMockZr();
    const chart = createMockInstance({ getZr: vi.fn(() => mockZr) });
    vi.mocked(echartsCore.init).mockReturnValue(chart);

    const handler = vi.fn();
    render(() => <SolidEChart onSurfaceEventsOnce={{ click: handler }} style={STYLE} />);

    const onCalls = vi.mocked(mockZr.on).mock.calls as [string, (...args: unknown[]) => void][];
    const wrapper = onCalls.find(([name]) => name === "click")?.[1];
    wrapper?.({} as Event);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should use the captured surface reference to call off after firing", () => {
    const mockZr = createMockZr();
    const chart = createMockInstance({ getZr: vi.fn(() => mockZr) });
    vi.mocked(echartsCore.init).mockReturnValue(chart);

    const handler = vi.fn();
    render(() => <SolidEChart onSurfaceEventsOnce={{ click: handler }} style={STYLE} />);

    const onCalls = vi.mocked(mockZr.on).mock.calls as [string, (...args: unknown[]) => void][];
    const wrapper = onCalls.find(([name]) => name === "click")?.[1];
    wrapper?.({} as Event);

    expect(vi.mocked(mockZr.off)).toHaveBeenCalledWith("click", wrapper);
  });
});

describe("ref forwarding", () => {
  it("should forward the live instance to a plain callback ref", () => {
    const chart = createMockChartWithInit();
    let capturedRef: EChartsType | null = null;
    render(() => (
      <SolidEChart
        ref={(instance: EChartsType | null) => {
          capturedRef = instance;
        }}
        style={STYLE}
      />
    ));

    expect(capturedRef).toBe(chart);
  });

  it("should forward the live instance to a SolidJS Setter (signal setter)", () => {
    const chart = createMockChartWithInit();
    // ref must accept Setter<EChartsType | null>, which is a function,
    // so the same typeof ref === "function" branch handles both cases.
    const [chartRef, setChartRef] = createSignal<EChartsType | null>(null);
    render(() => <SolidEChart ref={setChartRef} style={STYLE} />);

    expect(chartRef()).toBe(chart);
  });

  it("should pass null to the ref when the instance is disposed on unmount", () => {
    const chart = createMockChartWithInit();
    const [chartRef, setChartRef] = createSignal<EChartsType | null>(null);
    const { unmount } = render(() => <SolidEChart ref={setChartRef} style={STYLE} />);

    expect(chartRef()).toBe(chart);

    unmount();

    expect(chartRef()).toBeNull();
  });

  it("should pass null then the new instance to the ref during renderer reinit", () => {
    const [chart1, chart2] = createSequentialMockCharts();

    const [chartRef, setChartRef] = createSignal<EChartsType | null>(null);
    const [renderer, setRenderer] = createSignal<EChartRenderer>("canvas");

    const transitions: (EChartsType | null)[] = [];

    createEffect(() => {
      transitions.push(chartRef());
    });

    render(() => <SolidEChart renderer={renderer} ref={setChartRef} style={STYLE} />);

    expect(chartRef()).toBe(chart1);

    setRenderer("svg");
    expect(transitions).toContain(null);

    expect(chartRef()).toBe(chart2); // new instance
  });
});

describe("useChart() inside SolidEChart tree", () => {
  it("should provide the live instance to a child component via context", () => {
    const chart = createMockChartWithInit();
    let capturedInstance: Accessor<EChartsType | null> | undefined;

    const Child = () => {
      const { instance } = useChart();
      capturedInstance = instance;
      return <></>;
    };

    render(() => (
      <SolidEChart style={STYLE}>
        <Child />
      </SolidEChart>
    ));

    expect(capturedInstance?.()).toBe(chart);
  });

  it("should allow dispatch() inside a child to call dispatchAction on the instance", () => {
    const chart = createMockChartWithInit();
    let capturedDispatch: ((payload: unknown) => void) | undefined;

    const Child = () => {
      const { dispatch } = useChart();
      capturedDispatch = dispatch as (payload: unknown) => void;
      return <></>;
    };

    render(() => (
      <SolidEChart style={STYLE}>
        <Child />
      </SolidEChart>
    ));

    capturedDispatch?.(seActions.restore());

    expect(vi.mocked(chart.dispatchAction)).toHaveBeenCalledWith({ type: "restore" }, undefined);
  });

  it("should return instance: () => null and a no-op dispatch() when called outside a tree", () => {
    // useChart() has null default - it must never throw outside a SolidEChart
    let outsideInstance: Accessor<EChartsType | null> | undefined;
    let outsideDispatch: ((p: unknown) => void) | undefined;

    const Standalone = () => {
      const { instance, dispatch } = useChart();
      outsideInstance = instance;
      outsideDispatch = dispatch as (p: unknown) => void;
      return <></>;
    };

    render(() => <Standalone />);

    expect(outsideInstance?.()).toBeNull();
    expect(() => outsideDispatch?.({ type: "restore" })).not.toThrow();
  });

  it("should update the instance accessor inside the child after renderer reinit", () => {
    const [chart1, chart2] = createSequentialMockCharts();

    let capturedInstance: Accessor<EChartsType | null> | undefined;
    const Child = () => {
      const { instance } = useChart();
      capturedInstance = instance;
      return <></>;
    };

    const [renderer, setRenderer] = createSignal<EChartRenderer>("canvas");
    render(() => (
      <SolidEChart renderer={renderer} style={STYLE}>
        <Child />
      </SolidEChart>
    ));

    expect(capturedInstance?.()).toBe(chart1);

    setRenderer("svg");

    expect(capturedInstance?.()).toBe(chart2);
  });
});

describe("initOnVisible prop", () => {
  it("should apply the option and fire onInit only once the container is visible", () => {
    MockIntersectionObserver.reset();
    const chart = createMockChartWithInit();
    const onInit = vi.fn();
    const [option] = createSignal({ series: [] });
    render(() => (
      <SolidEChart initOnVisible={true} option={option} onInit={onInit} style={STYLE} />
    ));

    expect(echartsCore.init).not.toHaveBeenCalled();
    expect(onInit).not.toHaveBeenCalled();

    MockIntersectionObserver.instances[0]?.emit(true);

    expect(onInit).toHaveBeenCalledWith(chart);
    expect(vi.mocked(chart.setOption)).toHaveBeenCalledTimes(1);
  });
});

// Call form: `prop={signal()}`. Solid compiles it to a getter on `props`, so
// the component has to read the prop lazily to stay reactive.
describe("call-form props (prop={signal()})", () => {
  it("should call setTheme when a call-form theme changes", () => {
    const chart = createMockChartWithInit();
    const [theme, setTheme] = createSignal(DEFAULT_THEME);
    render(() => <SolidEChart theme={theme()} style={STYLE} />);

    setTheme(DARK_THEME);

    expect(vi.mocked(chart.setTheme)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(chart.setTheme)).toHaveBeenLastCalledWith(DARK_THEME);
    expect(echartsCore.init).toHaveBeenCalledTimes(1);
  });

  it("should not call setTheme when the source signal changes but the theme does not", () => {
    const chart = createMockChartWithInit();
    const [settings, setSettings] = createSignal({ theme: DARK_THEME, locale: "EN" });
    render(() => <SolidEChart theme={settings().theme} style={STYLE} />);

    setSettings({ theme: DARK_THEME, locale: "FR" });

    expect(vi.mocked(chart.setTheme)).not.toHaveBeenCalled();
  });

  it("should fall back to the default theme when a call-form theme becomes undefined", () => {
    const chart = createMockChartWithInit();
    const [theme, setTheme] = createSignal<string | undefined>(DARK_THEME);
    render(() => <SolidEChart theme={theme()} style={STYLE} />);

    setTheme(undefined);

    expect(vi.mocked(chart.setTheme)).toHaveBeenLastCalledWith(DEFAULT_THEME);
  });

  it("should dispose and reinit when a call-form renderer changes", () => {
    const [chart1] = createSequentialMockCharts();
    const [renderer, setRenderer] = createSignal<EChartRenderer>("canvas");
    render(() => <SolidEChart renderer={renderer()} style={STYLE} />);

    setRenderer("svg");

    expect(vi.mocked(chart1.dispose)).toHaveBeenCalledTimes(1);
    expect(echartsCore.init).toHaveBeenCalledTimes(2);
    expect(vi.mocked(echartsCore.init).mock.calls[1]?.[2]).toMatchObject({ renderer: "svg" });
  });

  it("should not reinit when the source signal changes but the renderer does not", () => {
    const chart = createMockChartWithInit();
    const [settings, setSettings] = createSignal<{ renderer: EChartRenderer; locale: string }>({
      renderer: "svg",
      locale: "EN",
    });
    render(() => <SolidEChart renderer={settings().renderer} style={STYLE} />);

    setSettings({ renderer: "svg", locale: "FR" });

    expect(echartsCore.init).toHaveBeenCalledTimes(1);
    expect(vi.mocked(chart.dispose)).not.toHaveBeenCalled();
  });

  it("should update the group when a call-form group changes", () => {
    const chart = createMockChartWithInit();
    const [group, setGroup] = createSignal("a");
    render(() => <SolidEChart group={group()} style={STYLE} />);

    setGroup("b");

    expect(chart.group).toBe("b");
    expect(echartsCore.connect).toHaveBeenLastCalledWith("b");
  });

  it("should detach the ResizeObserver when a call-form autoResize turns false", () => {
    createMockChartWithInit();
    const [autoResize, setAutoResize] = createSignal(true);
    render(() => <SolidEChart autoResize={autoResize()} style={STYLE} />);
    const disconnectSpy = spyOnResizeObserver("disconnect");

    setAutoResize(false);

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  it("should call showLoading and hideLoading when a call-form loading changes", () => {
    const chart = createMockChartWithInit();
    const [loading, setLoading] = createSignal(false);
    render(() => <SolidEChart loading={loading()} style={STYLE} />);

    setLoading(true);
    expect(vi.mocked(chart.showLoading)).toHaveBeenCalledTimes(1);

    const hideCalls = vi.mocked(chart.hideLoading).mock.calls.length;
    setLoading(false);
    expect(vi.mocked(chart.hideLoading)).toHaveBeenCalledTimes(hideCalls + 1);
  });

  it("should pass a changed call-form loadingOptions to showLoading", () => {
    const chart = createMockChartWithInit();
    const [loadingOptions, setLoadingOptions] = createSignal({ text: "one" });
    render(() => <SolidEChart loading={true} loadingOptions={loadingOptions()} style={STYLE} />);

    const next = { text: "two" };
    setLoadingOptions(next);

    expect(vi.mocked(chart.showLoading)).toHaveBeenLastCalledWith("default", next);
  });

  it("should use a changed call-form notMerge on the next setOption without triggering one", () => {
    const chart = createMockChartWithInit();
    const [notMerge, setNotMerge] = createSignal(false);
    const [option, setOption] = createSignal<Record<string, unknown>>({ series: [] });
    render(() => <SolidEChart option={option} notMerge={notMerge()} style={STYLE} />);

    setNotMerge(true);
    expect(vi.mocked(chart.setOption)).toHaveBeenCalledTimes(1);

    setOption({ series: [{ type: "bar" }] });
    expect(vi.mocked(chart.setOption).mock.calls[1]?.[1]).toMatchObject({ notMerge: true });
  });
});
