import type { EChartsType } from "echarts/core";
import * as echartsCore from "echarts/core";
import { vi } from "vitest";

import type { EventParams } from "../../src/types/echart";
import type { CreateChartEffectOptions } from "../../src/types/primitives";
import { createMockInstance } from "../mocks/echarts";

export const STYLE = { width: "400px", height: "300px" } as const;

// Minimal valid EventParams for simulating chart events
export const fakeParams: EventParams = {
  componentType: "series",
  seriesType: "bar",
  seriesIndex: 0,
  seriesName: "s",
  name: "n",
  dataIndex: 0,
  data: {},
  dataType: "",
  value: 1,
  color: "#ffffff",
};

export const createMockChartWithInit = (): EChartsType => {
  const chart = createMockInstance();
  vi.mocked(echartsCore.init).mockReturnValue(chart);
  return chart;
};

export const createMockChartWithLazySetOption = (
  updateOptions: () => CreateChartEffectOptions,
): EChartsType => {
  const chart = createMockInstance();

  // Override setOption to evaluate updateOptions() at call-time
  const originalSetOption = chart.setOption;
  chart.setOption = vi.fn((option, opts) => {
    // Merge in current updateOptions value lazily
    if (typeof opts === "object" && "notMerge" in opts) {
      opts.notMerge = updateOptions().notMerge;
    }
    originalSetOption(option, opts);
  });

  vi.mocked(echartsCore.init).mockReturnValue(chart);
  return chart;
};

export const createSequentialMockCharts = () => {
  const chart1 = createMockInstance();
  const chart2 = createMockInstance();
  vi.mocked(echartsCore.init).mockReturnValueOnce(chart1).mockReturnValueOnce(chart2);
  return [chart1, chart2] as const;
};

// Extract the last registered wrapper for a given event name from chart.on mock calls.
// SolidEChart wraps handlers before passing to chart.on - this captures that wrapper.
export const captureOnHandler = (eventName: string, chart: EChartsType) => {
  return vi
    .mocked(chart.on)
    .mock.calls.filter(([name]) => name === eventName)
    .map((call) => call.find((arg) => typeof arg === "function"))
    .at(-1) as ((...args: unknown[]) => void) | undefined;
};
