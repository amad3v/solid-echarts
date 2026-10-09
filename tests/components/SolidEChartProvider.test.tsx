/** @jsxImportSource solid-js */

// MUST be in the test file - vi.mock is hoisted above all imports
vi.mock("echarts/core", () => ({
  init: vi.fn(),
  use: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  registerTheme: vi.fn(),
}));

import { createSignal } from "solid-js";

import { render } from "@solidjs/testing-library";
import * as echartsCore from "echarts/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SolidEChartProvider } from "../../src/context/provider";
import { DARK_THEME, DEFAULT_THEME } from "../../src/helpers/common";
import { SolidEChart } from "../../src/SolidEChart";
import type { EChartRenderer } from "../../src/types/common";
import type { CreateChartEffectOptions } from "../../src/types/primitives";
import { createMockInstance } from "../mocks/echarts";
import { MockIntersectionObserver } from "../setup";
import {
  createMockChartWithInit,
  createSequentialMockCharts,
  getInitThemes,
  STYLE,
} from "../utils/charts";
import { spyOnResizeObserver } from "../utils/resize-observer";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("theme propagation", () => {
  it("should propagate a static theme string to all child charts", () => {
    createMockChartWithInit();

    render(() => (
      <SolidEChartProvider theme={DARK_THEME}>
        <SolidEChart style={STYLE} />
      </SolidEChartProvider>
    ));

    expect(getInitThemes()).toEqual([DARK_THEME]);
  });

  it("should propagate a reactive theme signal to all child charts", () => {
    const chart = createMockChartWithInit();
    const [theme, setTheme] = createSignal(DEFAULT_THEME);
    render(() => (
      <SolidEChartProvider theme={theme}>
        <SolidEChart style={STYLE} />
      </SolidEChartProvider>
    ));

    expect(getInitThemes()).toEqual([DEFAULT_THEME]);

    setTheme(DARK_THEME);

    expect(vi.mocked(chart.setTheme)).toHaveBeenLastCalledWith(DARK_THEME);
    // in-place, no reinit
    expect(vi.mocked(chart.dispose)).not.toHaveBeenCalled();
  });

  it("should apply provider theme to multiple child charts", () => {
    createSequentialMockCharts();
    render(() => (
      <SolidEChartProvider theme={DARK_THEME}>
        <SolidEChart style={STYLE} />
        <SolidEChart style={STYLE} />
      </SolidEChartProvider>
    ));

    expect(getInitThemes()).toEqual([DARK_THEME, DARK_THEME]);
  });

  it("should allow a per-chart theme prop to override the provider theme", () => {
    createSequentialMockCharts();
    render(() => (
      <SolidEChartProvider theme={DARK_THEME}>
        <SolidEChart style={STYLE} /> {/* inherits "dark" */}
        <SolidEChart theme={DEFAULT_THEME} style={STYLE} /> {/* per-chart wins */}
      </SolidEChartProvider>
    ));

    expect(getInitThemes()).toEqual([DARK_THEME, DEFAULT_THEME]);
  });

  it("should allow a per-chart signal theme to override the provider theme", () => {
    const [chart1, chart2] = createSequentialMockCharts();
    const [chartTheme, setChartTheme] = createSignal(DEFAULT_THEME);
    render(() => (
      <SolidEChartProvider theme={DARK_THEME}>
        <SolidEChart style={STYLE} />
        <SolidEChart theme={chartTheme} style={STYLE} />
      </SolidEChartProvider>
    ));

    expect(getInitThemes()).toEqual([DARK_THEME, DEFAULT_THEME]);

    setChartTheme("custom");

    expect(vi.mocked(chart2.setTheme)).toHaveBeenLastCalledWith("custom");
    expect(vi.mocked(chart1.setTheme)).not.toHaveBeenCalled(); // unaffected
  });
});

describe("renderer propagation", () => {
  it("should propagate a static renderer to child charts", () => {
    render(() => (
      <SolidEChartProvider renderer={"svg"}>
        <SolidEChart style={STYLE} />
      </SolidEChartProvider>
    ));

    expect(echartsCore.init).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      DEFAULT_THEME,
      expect.objectContaining({ renderer: "svg" }),
    );
  });

  it("should allow a per-chart renderer to override the provider renderer", () => {
    const [chart1, chart2] = createSequentialMockCharts();
    render(() => (
      <SolidEChartProvider renderer={"svg"}>
        <SolidEChart style={STYLE} /> {/* svg from provider */}
        <SolidEChart renderer={"canvas"} style={STYLE} /> {/* per-chart wins */}
      </SolidEChartProvider>
    ));

    const initCalls = vi.mocked(echartsCore.init).mock.calls;
    // First chart: svg (from provider); second chart: canvas (per-chart override)
    expect(initCalls[0]?.[2]).toMatchObject({ renderer: "svg" });
    expect(initCalls[1]?.[2]).toMatchObject({ renderer: "canvas" });

    // Suppress unused-variable warning
    void chart1;
    void chart2;
  });

  it("should propagate a reactive renderer signal and trigger reinit on all children", () => {
    const [chart1, chart2] = createSequentialMockCharts();

    vi.mocked(echartsCore.init).mockReturnValueOnce(chart1).mockReturnValueOnce(chart2);

    const [renderer, setRenderer] = createSignal<EChartRenderer>("canvas");
    render(() => (
      <SolidEChartProvider renderer={renderer}>
        <SolidEChart style={STYLE} />
      </SolidEChartProvider>
    ));

    expect(echartsCore.init).toHaveBeenCalledTimes(1);

    setRenderer("svg");

    expect(vi.mocked(chart1.dispose)).toHaveBeenCalledTimes(1);
    expect(echartsCore.init).toHaveBeenCalledTimes(2);

    const initCalls = vi.mocked(echartsCore.init).mock.calls;

    expect(initCalls.length).toBeGreaterThan(1); // ensure there is a second call
    expect(initCalls[1]![2]).toMatchObject({
      renderer: "svg",
    });
  });
});

describe("static init-time props (locale, devicePixelRatio, useDirtyRect)", () => {
  it("should propagate locale to echarts.init", () => {
    render(() => (
      <SolidEChartProvider locale={"ZH"}>
        <SolidEChart style={STYLE} />
      </SolidEChartProvider>
    ));

    expect(echartsCore.init).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      DEFAULT_THEME,
      expect.objectContaining({ locale: "ZH" }),
    );
  });

  it("should propagate devicePixelRatio to echarts.init", () => {
    render(() => (
      <SolidEChartProvider devicePixelRatio={2}>
        <SolidEChart style={STYLE} />
      </SolidEChartProvider>
    ));

    expect(echartsCore.init).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      DEFAULT_THEME,
      expect.objectContaining({ devicePixelRatio: 2 }),
    );
  });

  it("should propagate useDirtyRect to echarts.init", () => {
    render(() => (
      <SolidEChartProvider useDirtyRect={true}>
        <SolidEChart style={STYLE} />
      </SolidEChartProvider>
    ));

    expect(echartsCore.init).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      DEFAULT_THEME,
      expect.objectContaining({ useDirtyRect: true }),
    );
  });
});

describe("initOnVisible propagation", () => {
  beforeEach(() => {
    MockIntersectionObserver.reset();
  });

  it("should defer init of child charts until they are visible", () => {
    createMockChartWithInit();
    render(() => (
      <SolidEChartProvider initOnVisible={true}>
        <SolidEChart style={STYLE} />
      </SolidEChartProvider>
    ));

    expect(echartsCore.init).not.toHaveBeenCalled();

    MockIntersectionObserver.instances[0]?.emit(true);

    expect(echartsCore.init).toHaveBeenCalledTimes(1);
  });

  it("should allow a per-chart initOnVisible prop to override the provider", () => {
    createMockChartWithInit();
    render(() => (
      <SolidEChartProvider initOnVisible={true}>
        <SolidEChart initOnVisible={false} style={STYLE} />
      </SolidEChartProvider>
    ));

    expect(echartsCore.init).toHaveBeenCalledTimes(1);
  });
});

describe("accessor props returning undefined", () => {
  it("should fall back to the provider theme when a theme accessor returns undefined", () => {
    const chart = createMockChartWithInit();
    const [chartTheme, setChartTheme] = createSignal<string | undefined>("custom");
    render(() => (
      <SolidEChartProvider theme={DARK_THEME}>
        <SolidEChart theme={chartTheme} style={STYLE} />
      </SolidEChartProvider>
    ));

    expect(getInitThemes()).toEqual(["custom"]);

    setChartTheme(undefined);

    expect(vi.mocked(chart.setTheme)).toHaveBeenLastCalledWith(DARK_THEME);
  });

  it("should use the provider theme at init when a theme accessor returns undefined", () => {
    createMockChartWithInit();
    render(() => (
      <SolidEChartProvider theme={DARK_THEME}>
        <SolidEChart theme={() => undefined} style={STYLE} />
      </SolidEChartProvider>
    ));

    expect(getInitThemes()).toEqual([DARK_THEME]);
  });

  it("should fall back to the provider group when a group accessor returns undefined", () => {
    const chart = createMockChartWithInit();
    const [chartGroup, setChartGroup] = createSignal<string | undefined>("sidebar");
    render(() => (
      <SolidEChartProvider group={"dashboard"}>
        <SolidEChart group={chartGroup} style={STYLE} />
      </SolidEChartProvider>
    ));

    expect(chart.group).toBe("sidebar");

    setChartGroup(undefined);

    expect(chart.group).toBe("dashboard");
    expect(echartsCore.connect).toHaveBeenLastCalledWith("dashboard");
  });

  it("should fall back to the outer provider when an inner provider accessor returns undefined", () => {
    createMockChartWithInit();
    render(() => (
      <SolidEChartProvider theme={DARK_THEME}>
        <SolidEChartProvider theme={() => undefined}>
          <SolidEChart style={STYLE} />
        </SolidEChartProvider>
      </SolidEChartProvider>
    ));

    expect(getInitThemes()).toEqual([DARK_THEME]);
  });
});

describe("group propagation", () => {
  it("should propagate a group to child charts and call connect()", () => {
    render(() => (
      <SolidEChartProvider group={"dashboard"}>
        <SolidEChart style={STYLE} />
      </SolidEChartProvider>
    ));

    expect(echartsCore.connect).toHaveBeenCalledWith("dashboard");
  });

  it("should allow a per-chart group to override the provider group", () => {
    const [chart1, chart2] = createSequentialMockCharts();
    render(() => (
      <SolidEChartProvider group={"dashboard"}>
        <SolidEChart style={STYLE} /> {/* gets "dashboard" */}
        <SolidEChart group={"sidebar"} style={STYLE} /> {/* per-chart wins */}
      </SolidEChartProvider>
    ));

    const connectCalls = vi.mocked(echartsCore.connect).mock.calls.map(([g]) => g);
    expect(connectCalls).toContain("dashboard");
    expect(connectCalls).toContain("sidebar");

    void chart1;
    void chart2;
  });
});

describe("updateOptions propagation", () => {
  it("should pass provider notMerge to setOption", () => {
    const chart = createMockChartWithInit();
    const [option] = createSignal({ series: [] });
    render(() => (
      <SolidEChartProvider updateOptions={{ notMerge: true }}>
        <SolidEChart option={option} style={STYLE} />
      </SolidEChartProvider>
    ));

    expect(vi.mocked(chart.setOption)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ notMerge: true }),
    );
  });

  it("should pass provider lazyUpdate to setOption", () => {
    const chart = createMockChartWithInit();
    const [option] = createSignal({ series: [] });
    render(() => (
      <SolidEChartProvider updateOptions={{ lazyUpdate: true }}>
        <SolidEChart option={option} style={STYLE} />
      </SolidEChartProvider>
    ));

    expect(vi.mocked(chart.setOption)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lazyUpdate: true }),
    );
  });

  it("should allow a per-chart notMerge prop to override provider updateOptions.notMerge", () => {
    const chart = createMockChartWithInit();
    const [option] = createSignal({ series: [] });

    render(() => (
      <SolidEChartProvider updateOptions={{ notMerge: true }}>
        <SolidEChart option={option} notMerge={false} style={STYLE} />
      </SolidEChartProvider>
    ));

    expect(vi.mocked(chart.setOption)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ notMerge: false }), // per-chart prop wins
    );
  });

  it("should use a per-chart updateOptions prop instead of the provider updateOptions", () => {
    const chart = createMockChartWithInit();
    const [option] = createSignal({ series: [] });

    render(() => (
      <SolidEChartProvider updateOptions={{ notMerge: true, lazyUpdate: true }}>
        <SolidEChart option={option} updateOptions={{ silent: true }} style={STYLE} />
      </SolidEChartProvider>
    ));

    // The prop replaces the provider value as a whole, like every other config prop
    expect(vi.mocked(chart.setOption)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ notMerge: false, lazyUpdate: false, silent: true }),
    );
  });

  it("should pick up a provider `updateOptions` change on the next `setOption` call (lazy accessor)", () => {
    // the per-chart component reads `() => updateOptions().notMerge` lazily
    // inside the effect, not snapshotted at mount time. So changing the provider
    // signal AFTER mount is reflected on the next natural option change.
    const [updateOpts, setUpdateOpts] = createSignal<CreateChartEffectOptions>({
      notMerge: false,
    });
    const [option, setOption] = createSignal<Record<string, unknown>>({ series: [] });

    const chart = createMockChartWithInit();

    render(() => (
      <SolidEChartProvider updateOptions={updateOpts}>
        <SolidEChart option={option} style={STYLE} />
      </SolidEChartProvider>
    ));

    const firstCall = vi.mocked(chart.setOption).mock.calls[0];
    expect(firstCall?.[1]).toMatchObject({ notMerge: false });

    // Change provider updateOptions then trigger a new option signal change
    setUpdateOpts({ notMerge: true });
    setOption({ series: [{ type: "bar" }] });

    const secondCall = vi.mocked(chart.setOption).mock.calls[1];
    // lazy read picked it up
    expect(secondCall?.[1]).toMatchObject({ notMerge: true });
  });

  it("should NOT trigger an extra setOption call when only updateOptions signal changes", () => {
    const chart = createMockChartWithInit();
    // The merge strategy is read with untrack() inside createChartEffect -
    // it is NOT a reactive dependency. Changing it alone must not fire setOption.
    const [updateOpts, setUpdateOpts] = createSignal<CreateChartEffectOptions>({
      notMerge: false,
    });
    const [option] = createSignal({ series: [] });

    render(() => (
      <SolidEChartProvider updateOptions={updateOpts}>
        <SolidEChart option={option} style={STYLE} />
      </SolidEChartProvider>
    ));

    const callsAfterInit = vi.mocked(chart.setOption).mock.calls.length;

    setUpdateOpts({ notMerge: true }); // only merge strategy changes

    // No additional setOption call - merge strategy alone is not a dep
    expect(vi.mocked(chart.setOption)).toHaveBeenCalledTimes(callsAfterInit);
  });
});

describe("autoResize propagation", () => {
  it("should attach ResizeObserver when provider sets autoResize: true", () => {
    const observeSpy = spyOnResizeObserver();

    render(() => (
      <SolidEChartProvider autoResize={true}>
        <SolidEChart style={STYLE} />
      </SolidEChartProvider>
    ));

    expect(observeSpy).toHaveBeenCalled();
  });

  it("should not attach ResizeObserver when provider sets autoResize: false", () => {
    const observeSpy = spyOnResizeObserver();

    render(() => (
      <SolidEChartProvider autoResize={false}>
        <SolidEChart style={STYLE} />
      </SolidEChartProvider>
    ));

    expect(observeSpy).not.toHaveBeenCalled();
  });

  it("should allow a per-chart autoResize prop to override the provider", () => {
    const observeSpy = spyOnResizeObserver();

    render(() => (
      <SolidEChartProvider autoResize={false}>
        <SolidEChart autoResize={true} style={STYLE} /> {/* per-chart wins */}
      </SolidEChartProvider>
    ));

    expect(observeSpy).toHaveBeenCalled();
  });
});

describe("nested providers", () => {
  it("inner provider should override only the props it declares", () => {
    createSequentialMockCharts();
    render(() => (
      <SolidEChartProvider theme={DARK_THEME} renderer="svg">
        <SolidEChart style={STYLE} /> {/* dark + svg */}
        <SolidEChartProvider theme={DEFAULT_THEME}>
          {/* inner only overrides theme; renderer falls through to outer */}
          <SolidEChart style={STYLE} /> {/* light + svg */}
        </SolidEChartProvider>
      </SolidEChartProvider>
    ));

    expect(getInitThemes()).toEqual([DARK_THEME, DEFAULT_THEME]);

    // Both charts should use "svg" renderer (outer provider)
    const initCalls = vi.mocked(echartsCore.init).mock.calls;
    expect(initCalls[0]?.[2]).toMatchObject({ renderer: "svg" });
    expect(initCalls[1]?.[2]).toMatchObject({ renderer: "svg" });
  });

  it("inner provider should not affect siblings outside its subtree", () => {
    createSequentialMockCharts();
    render(() => (
      <SolidEChartProvider theme={DARK_THEME}>
        <SolidEChartProvider theme={DEFAULT_THEME}>
          <SolidEChart style={STYLE} /> {/* light (inner) */}
        </SolidEChartProvider>
        <SolidEChart style={STYLE} /> {/* dark (outer, unaffected) */}
      </SolidEChartProvider>
    ));

    expect(getInitThemes()).toEqual([DEFAULT_THEME, DARK_THEME]);
  });

  it("three-level nesting should resolve the nearest ancestor", () => {
    createSequentialMockCharts();
    render(() => (
      <SolidEChartProvider theme={DARK_THEME}>
        <SolidEChartProvider theme={DEFAULT_THEME}>
          <SolidEChartProvider theme={"custom"}>
            <SolidEChart style={STYLE} /> {/* custom (nearest wins) */}
          </SolidEChartProvider>
        </SolidEChartProvider>
      </SolidEChartProvider>
    ));

    expect(getInitThemes()).toEqual(["custom"]);
  });

  it("a reactive signal in the inner provider should update only that subtree", () => {
    // const [chart1, chart2] = twoCharts();
    const chart1 = createMockInstance();
    const chart2 = createMockInstance();
    vi.mocked(echartsCore.init).mockReturnValue(chart1).mockReturnValue(chart2);
    const [innerTheme, setInnerTheme] = createSignal(DEFAULT_THEME);

    render(() => (
      <SolidEChartProvider theme={DARK_THEME}>
        <SolidEChart style={STYLE} />
        <SolidEChartProvider theme={innerTheme}>
          <SolidEChart style={STYLE} />
        </SolidEChartProvider>
      </SolidEChartProvider>
    ));

    setInnerTheme("custom");

    expect(vi.mocked(chart2.setTheme)).toHaveBeenLastCalledWith("custom");
    // Outer chart must not have received "custom"
    const chart1Calls = vi.mocked(chart1.setTheme).mock.calls.map(([t]) => t);
    expect(chart1Calls).not.toContain("custom");
  });
});

describe("default context values (no provider)", () => {
  it("should use canvas renderer by default", () => {
    render(() => <SolidEChart style={STYLE} />);

    expect(echartsCore.init).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      DEFAULT_THEME,
      expect.objectContaining({ renderer: "canvas" }),
    );
  });

  it("should attach a ResizeObserver by default (autoResize: true)", () => {
    const observeSpy = spyOnResizeObserver();

    render(() => <SolidEChart style={STYLE} />);

    expect(observeSpy).toHaveBeenCalled();
  });

  it("should not call connect() by default (no group)", () => {
    render(() => <SolidEChart style={STYLE} />);

    expect(echartsCore.connect).not.toHaveBeenCalled();
  });
});
