import { useContext } from "solid-js";

import type { ActionPayload, DispatchOpt } from "@type/actions";
import type { UseChart } from "@type/context";
import type { SolidEChartAPI } from "@type/use-chart";

import { EChartsInstanceContext } from "./instance";

/**
 * Returns the live `instance` accessor, a safe `dispatch` function, and a
 * stable `chart` proxy from the nearest `SolidEChart` ancestor in the tree.
 *
 * @remarks
 *
 * Must be called inside a `SolidEChart` subtree. Outside one, `instance`
 * always returns `null`, `dispatch` silently no-ops, and all `chart`
 * methods return `undefined`, never throws.
 *
 * **`instance`**: reactive `Accessor<EChartsType | null>`. Used in reactive
 * contexts (`createEffect`, `createMemo`) where tracking instance
 * changes matters.
 *
 * **`dispatch`**: safe `dispatchAction` wrapper with built-in null and
 * dispose guards. Use {@link seActions} for typed payloads.
 *
 * **`chart`**: stable proxy for calling instance methods imperatively,
 * without null checks or signal unwrapping.
 *
 * @example
 * ```ts
 * // Before - null check + optional chaining every time
 * const width = instance()?.getWidth();
 * const url   = instance()?.getDataURL({ type: 'png' });
 *
 * // After - clean method calls, guards built in
 * const width = chart.getWidth();
 * const url   = chart.getDataURL({ type: 'png' });
 * ```
 *
 * The `chart` object is stable, safe to pass as a prop or store in a
 * variable. Methods close over `instance()` and read it at call time.
 *
 * @returns `{ instance, dispatch, chart }`
 *
 * @example
 * ```tsx
 * const ChartToolbar = () => {
 *   const { dispatch, chart } = useChart();
 *
 *   const exportPng = () => {
 *     const url = chart.getDataURL({ type: 'png', pixelRatio: 2 });
 *     if (url) triggerDownload(url, 'chart.png');
 *   };
 *
 *   const highlightFirst = () =>
 *     dispatch(seActions.highlight({ seriesIndex: 0, dataIndex: 0 }));
 *
 *   return (
 *     <>
 *       <button onClick={exportPng}>Export PNG</button>
 *       <button onClick={highlightFirst}>Highlight first bar</button>
 *     </>
 *   );
 * }
 *
 * <SolidEChart option={option}>
 *   <ChartToolbar />
 * </SolidEChart>
 * ```
 *
 * @example
 * ```tsx
 * // Coordinate conversion - position a custom tooltip
 * const CustomTooltip = () => {
 *   const { chart } = useChart();
 *
 *   const [pos, setPos] = createSignal({ x: 0, y: 0 });
 *
 *   const handleClick = (params: EventParams) => {
 *     const [x, y] = chart.convertToPixel(
 *       { seriesIndex: 0 },
 *       [params.dataIndex, params.value as number]
 *     ) as number[];
 *     setPos({ x, y });
 *   };
 *
 *   return ...; // render tooltip at pos()
 * }
 * ```
 *
 * @see {@link SolidEChartAPI} for all available proxy methods
 * @see {@link createAction} for reactive action bindings
 * @see {@link seActions} for typed action payload factories
 */
export const useChart = (): UseChart => {
  const { instance } = useContext(EChartsInstanceContext);

  const dispatch = (payload: ActionPayload, opt?: DispatchOpt): void => {
    const c = instance();
    if (!c || c.isDisposed()) return;
    c.dispatchAction(payload, opt);
  };

  // Stable object, created once, methods read `instance()` at call time.
  const chart: SolidEChartAPI = {
    getId: () => instance()?.getId(),
    getWidth: () => instance()?.getWidth(),
    getHeight: () => instance()?.getHeight(),
    getDevicePixelRatio: () => instance()?.getDevicePixelRatio(),
    getDom: () => instance()?.getDom(),
    getOption: () => instance()?.getOption(),
    isDisposed: () => instance()?.isDisposed() ?? true,
    isSSR: () => instance()?.isSSR() ?? false,
    getDataURL: (opts) => instance()?.getDataURL(opts),
    getConnectedDataURL: (opts) => instance()?.getConnectedDataURL(opts),
    renderToSVGString: (opts) => instance()?.renderToSVGString(opts),
    renderToCanvas: (opts) => instance()?.renderToCanvas(opts),
    convertToPixel: (finder, value) => instance()?.convertToPixel(finder, value),
    convertFromPixel: (finder, value) => instance()?.convertFromPixel(finder, value),
    convertToLayout: (finder, value, opts) => instance()?.convertToLayout(finder, value, opts),
    containPixel: (finder, value) => instance()?.containPixel(finder, value),
    getVisual: (finder, type) => instance()?.getVisual(finder, type),
    appendData: (params) => instance()?.appendData(params),
    clear: () => instance()?.clear(),
  };

  return { instance, dispatch, chart };
};
