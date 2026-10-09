import type { EChartsType } from "echarts/core";
import { vi } from "vitest";

type ZRenderType = EChartsType["getZr"];
type ZRenderInstance = ReturnType<ZRenderType>;

// Minimal mock ZRender
export const createMockZr = (): ZRenderInstance =>
  ({
    on: vi.fn(),
    off: vi.fn(),
  }) as unknown as ZRenderInstance;

export const createMockInstance = (overrides: Partial<EChartsType> = {}): EChartsType => {
  // ECharts never initialises `_disposed`: `isDisposed()` returns `undefined`
  // on a live instance and `true` after `dispose()`.
  const disposed: { value: true | undefined } = { value: undefined };
  return {
    setOption: vi.fn(),
    setTheme: vi.fn(),
    dispose: vi.fn(() => {
      disposed.value = true;
    }),
    isDisposed: vi.fn(() => disposed.value),
    on: vi.fn(),
    off: vi.fn(),
    getZr: vi.fn(() => createMockZr()),
    group: "",
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
    resize: vi.fn(),
    dispatchAction: vi.fn(),
    getDom: vi.fn(() => document.createElement("div")),
    getWidth: vi.fn(() => 400),
    getHeight: vi.fn(() => 300),
    getOption: vi.fn(() => ({})),
    clear: vi.fn(),
    ...overrides,
  } as EChartsType;
};
