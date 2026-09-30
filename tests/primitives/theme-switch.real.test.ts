import type { Accessor, Setter } from "solid-js";
import { batch, createRoot, createSignal } from "solid-js";

import { BarChart } from "echarts/charts";
import { GridComponent } from "echarts/components";
import type { EChartsType } from "echarts/core";
import { registerTheme, use } from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { afterEach, describe, expect, it } from "vitest";

import { createChart } from "../../src/primitives/create-chart";
import { createChartEffect } from "../../src/primitives/create-chart-effect";
import type { SolidEChartOption } from "../../src/types/echart";
import type { CreateChartEffectOptions } from "../../src/types/primitives";

// Real ECharts (no `vi.mock("echarts/core")` in this file), rendered in
// SSR/SVG mode so no canvas is needed in jsdom.
//
// ECharts' `setTheme` rebuilds the model from the option backup its
// `OptionManager` took at the FIRST `setOption` (later merges are not
// recorded). These tests pin that a theme switch still shows the latest
// option.

use([BarChart, GridComponent, SVGRenderer]);

const RED = "#ff0000";
const GREEN = "#00ff00";
registerTheme("real-red", { color: [RED] });
registerTheme("real-green", { color: [GREEN] });

const barOption = (data: number[]): SolidEChartOption => ({
  animation: false,
  xAxis: { type: "category", data: ["a", "b", "c"] },
  yAxis: { type: "value" },
  series: [{ type: "bar", data }],
});

const OPTION_A = barOption([1, 2, 3]);
const OPTION_B = barOption([4, 5, 6]);

let disposeRoot: (() => void) | undefined;

afterEach(() => {
  disposeRoot?.();
  disposeRoot = undefined;
});

type Harness = {
  instance: Accessor<EChartsType | null>;
  setOption: Setter<SolidEChartOption>;
  setTheme: Setter<string>;
};

const setup = (
  effectOpts?: CreateChartEffectOptions,
  initialOption: SolidEChartOption = OPTION_A,
): Harness => {
  const container = document.createElement("div");
  let harness!: Harness;

  createRoot((dispose) => {
    disposeRoot = dispose;
    const [option, setOption] = createSignal<SolidEChartOption>(initialOption);
    const [theme, setTheme] = createSignal("real-red");
    const { instance } = createChart(() => container, {
      theme,
      renderer: "svg",
      ssr: true,
      width: 400,
      height: 300,
      autoResize: false,
    });
    createChartEffect(instance, option, effectOpts);
    harness = { instance, setOption, setTheme };
  });

  return harness;
};

const liveChart = (instance: Accessor<EChartsType | null>): EChartsType => {
  const chart = instance();
  if (!chart) throw new Error("chart instance was not created");
  return chart;
};

const seriesData = (chart: EChartsType): unknown => {
  const { series } = chart.getOption() as { series: { data: unknown }[] };
  return series[0]?.data;
};

// The bars' fill comes from the theme palette, since the options set no
// colour. Read from the rendered SVG (SSR mode).
const barFill = (chart: EChartsType): string | undefined => {
  const fills = chart.renderToSVGString().match(/fill="#(?:ff0000|00ff00)"/g) ?? [];
  const colours = new Set(fills.map((fill) => fill.slice(6, -1)));
  return colours.size === 1 ? [...colours][0] : undefined;
};

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe.each([
  ["explicit merge (default)", undefined],
  ["autoMerge", { autoMerge: true }],
  ["notMerge", { notMerge: true }],
] as const)("theme switch against real ECharts - %s", (_label, effectOpts) => {
  it("shows the latest option, not the first, after a theme switch", async () => {
    const { instance, setOption, setTheme } = setup(effectOpts);
    await flush();
    const chart = liveChart(instance);
    expect(barFill(chart)).toBe(RED);

    setOption(OPTION_B);
    await flush();
    expect(seriesData(chart)).toEqual([4, 5, 6]);

    setTheme("real-green");
    await flush();

    expect(barFill(chart)).toBe(GREEN);
    expect(seriesData(chart)).toEqual([4, 5, 6]);
  });

  it("shows the new theme with the latest option when the option is written first in one batch", async () => {
    const { instance, setOption, setTheme } = setup(effectOpts);
    await flush();
    const chart = liveChart(instance);

    batch(() => {
      setOption(OPTION_B);
      setTheme("real-green");
    });
    await flush();

    expect(barFill(chart)).toBe(GREEN);
    expect(seriesData(chart)).toEqual([4, 5, 6]);
  });

  it("shows the new theme with the latest option when the theme is written first in one batch", async () => {
    const { instance, setOption, setTheme } = setup(effectOpts);
    await flush();
    const chart = liveChart(instance);

    batch(() => {
      setTheme("real-green");
      setOption(OPTION_B);
    });
    await flush();

    expect(barFill(chart)).toBe(GREEN);
    expect(seriesData(chart)).toEqual([4, 5, 6]);
  });
});

describe("theme switch against real ECharts - autoMerge after a removal", () => {
  it("keeps a removed series removed after a theme switch", async () => {
    // The first option has two series; ECharts' `setTheme` rebuilds from it.
    const { instance, setOption, setTheme } = setup(
      { autoMerge: true },
      {
        ...OPTION_A,
        series: [
          { type: "bar", data: [1, 2, 3] },
          { type: "bar", data: [7, 8, 9] },
        ],
      },
    );
    await flush();
    const chart = liveChart(instance);

    // One series fewer: autoMerge removes the second one with `replaceMerge`.
    setOption(OPTION_B);
    await flush();
    expect((chart.getOption() as { series: unknown[] }).series).toHaveLength(1);

    // The reapplied option must not merge into the rebuilt two-series model.
    setTheme("real-green");
    await flush();

    expect((chart.getOption() as { series: unknown[] }).series).toHaveLength(1);
    expect(seriesData(chart)).toEqual([4, 5, 6]);
  });
});
