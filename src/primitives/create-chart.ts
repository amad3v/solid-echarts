import type { Accessor } from "solid-js";
import { createEffect, createSignal, on, onCleanup, untrack } from "solid-js";

import type { CreateChartOptions, CreateChartResult } from "@type/primitives";
import { DEFAULT_THEME, toAccessor } from "@utils/common";
import { debounce } from "@utils/primitives";
import type { EChartsType } from "echarts/core";
import * as echarts from "echarts/core";
import { connect, disconnect } from "echarts/core";

/**
 * Core primitive for creating and managing an ECharts instance lifecycle.
 *
 * @remarks
 *
 * Manages four concerns reactively:
 *
 * - **Init/dispose** - creates the instance when `container` is available,
 *   disposes on cleanup. Only `renderer` triggers a full reinit cycle.
 * - **Theme** - applies via `setTheme` in place (ECharts 6+). No reinit.
 * - **Group** - updates `chart.group` and calls `connect` in place.
 * - **Resize** - attaches a debounced `ResizeObserver`. Toggles reactively
 *   without touching the instance.
 *
 * SSR-safe - returns `{ instance: () => null }` on the server.
 *
 * @param container - Reactive accessor for the container `HTMLElement`.
 * The instance is created when the element becomes available and disposed
 * when it is removed. Typically a signal setter ref from a `<div>`.
 * @param opts - Configuration options. See {@link CreateChartOptions}.
 *
 * @returns `{ instance }` - a reactive accessor for the live `EChartsType`
 * instance. Null before the container mounts, during reinit, and after dispose.
 *
 * @example
 * ```tsx
 * // Basic usage - wire a div ref to createChart
 * const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
 * const { instance } = createChart(container, { theme: 'dark', renderer: 'canvas' });
 *
 * // Wire option reactivity with createChartEffect
 * createChartEffect(instance, option);
 *
 * <div ref={setContainer} style={{ width: '100%', height: '400px' }} />
 * ```
 *
 * @example
 * ```tsx
 * // Reactive theme switching - no reinit, uses setTheme() in place
 * const [theme, setTheme] = createSignal<string>("default");
 * const { instance } = createChart(container, { theme });
 *
 * <button onClick={() => setTheme('dark')}>Dark</button>
 * ```
 *
 * @see {@link createChartEffect} for reactive option wiring
 * @see {@link createAction} for reactive action bindings
 * @see {@link SolidEChart} for the component API built on this primitive
 */
export const createChart = (
  container: Accessor<HTMLElement | null | undefined>,
  opts: CreateChartOptions = {},
): CreateChartResult => {
  if (typeof window === "undefined") {
    return { instance: () => null };
  }

  const theme = toAccessor(opts.theme);
  const renderer = toAccessor(opts.renderer ?? "canvas");
  const group = toAccessor(opts.group);
  const autoResize = toAccessor(opts.autoResize ?? true);

  const {
    locale,
    devicePixelRatio,
    useDirtyRect,
    useCoarsePointer,
    pointerSize,
    ssr,
    width,
    height,
    resizeDebounce: debounceMs = 100,
    onResize,
  } = opts;

  const [instance, setInstance] = createSignal<EChartsType | null>(null);

  let resizeObserver: ResizeObserver | null = null;
  // Tracks the last successfully connected group id so we can disconnect when it changes.
  // Stored outside effects to avoid extra Solid state.
  let prevGroup: string | undefined = undefined;

  // Core effect
  // Tracked dependencies: container and renderer only.
  //
  // theme is not longer an init argument and does NOT belong here.
  // Adding it would cause unnecessary dispose/reinit
  // cycles on every theme change. It gets its own effect below.
  //
  // Option reapplication after reinit is handled by createChartEffect which
  // tracks [instance, option] - when `setInstance` fires with the new chart,
  // that effect wakes immediately and applies the current option.
  // No snapshot needed here.
  createEffect(
    on(
      [container, renderer],
      ([element, rendererValue]) => {
        if (!element) return;

        const initOptions = {
          renderer: rendererValue,
          locale,
          devicePixelRatio,
          useDirtyRect,
          useCoarsePointer,
          ssr,
          width,
          height,
          pointerSize,
        } as echarts.EChartsInitOpts;
        const chart = echarts.init(element, DEFAULT_THEME, initOptions);

        // Apply theme before `setInstance` so the first `createChartEffect` call
        // already renders with the correct palette.
        // Untracked - theme effect owns all subsequent updates.
        const initialTheme = untrack(theme);
        if (initialTheme !== undefined) chart.setTheme(initialTheme);

        // Apply group before `setInstance` without tracking.
        // group effect owns all subsequent updates.
        const initialGroup = untrack(group);
        if (initialGroup) {
          chart.group = initialGroup;
          connect(initialGroup);
          prevGroup = initialGroup;
        } else {
          prevGroup = undefined;
        }

        setInstance(chart);

        // Attach `ResizeObserver` at mount time if `autoResize` is enabled.
        // Post-mount toggling is handled by the `autoResize` effect below.
        if (untrack(autoResize)) {
          attachResizeObserver(chart, element);
        }

        onCleanup(() => {
          resizeObserver?.disconnect();
          resizeObserver = null;

          if (!chart.isDisposed()) {
            // Ensure cross-chart sync is not left active after group removal/reinit.
            if (prevGroup) disconnect(prevGroup);
            chart.dispose();
          }

          prevGroup = undefined;
          setInstance(null);
        });
      },
      { defer: false },
    ),
  );

  // Theme effect
  // `setTheme` updates in place, no reinit required.
  // `defer: true`: the core effect already applies the initial theme synchronously
  // before `setInstance` fires. Running again immediately would be a redundant
  // no-op at best, and could cause a palette flash if setOption fires between
  // the two theme applications.
  createEffect(
    on(
      [instance, theme],
      ([chart, themeValue]) => {
        if (!chart || chart.isDisposed()) return;
        if (themeValue === undefined) return;
        chart.setTheme(themeValue);
      },
      { defer: true },
    ),
  );

  // Group effect
  // group is a chart property, not an init argument, updates in place.
  // `connect` is called after assignment so ECharts registers the instance
  // under the new group ID for datazoom and tooltip sync.
  createEffect(
    on([instance, group], ([chart, groupValue]) => {
      if (!chart || chart.isDisposed()) return;

      const nextGroup = groupValue || undefined;
      if (nextGroup === prevGroup) return;

      // Disconnect prior group before connecting
      // the new one to keep group sync consistent.
      if (prevGroup) disconnect(prevGroup);

      chart.group = nextGroup ?? "";
      if (nextGroup) connect(nextGroup);

      prevGroup = nextGroup;
    }),
  );

  // AutoResize effect
  // Attaches or detaches the ResizeObserver reactively without touching the
  // instance. Toggling `autoResize` never triggers a reinit.
  createEffect(
    on([instance, autoResize], ([chart, shouldResize]) => {
      const element = untrack(container);

      if (!chart || !element || chart.isDisposed()) return;

      if (shouldResize && !resizeObserver) {
        attachResizeObserver(chart, element);
      } else if (!shouldResize && resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
    }),
  );

  const attachResizeObserver = (chart: EChartsType, element: HTMLElement): void => {
    // Snapshot dimensions at observation time.
    // The first `ResizeObserver` callback fires immediately after `observe` even
    // if nothing has changed. We use these to detect that no-op first call.
    const initialWidth = element.offsetWidth;
    const initialHeight = element.offsetHeight;
    let firstCallbackFired = false;

    const handleResize = (): void => {
      if (chart.isDisposed()) return;

      // Guard 1
      // Skip the first `ResizeObserver` callback if the container
      // dimensions have not actually changed since we started observing.
      // The `ResizeObserver` spec fires one callback immediately after `observe`
      // regardless of whether anything changed.
      // Without this guard, that first callback triggers `chart.resize`
      // before the initial `setOption` animation has a chance to play,
      // cancelling entry animations because ECharts internally sets
      // `animation.duration = 0` during resize.
      if (!firstCallbackFired) {
        firstCallbackFired = true;
        if (element.offsetWidth === initialWidth && element.offsetHeight === initialHeight) {
          return;
        }
      }

      // Guard 2
      // Skip resize when the container has zero dimensions.
      // zrender reads `clientWidth`/`clientHeight` to size the canvas. When the
      // container is hidden or collapsed (`display: none`, `height: 0`), these are
      // 0 and zrender resizes the canvas to 0x0 - destroying the rendered
      // chart visually.
      // Skip the call and wait for the next observation when the container
      // has real dimensions again.
      if (element.offsetWidth === 0 || element.offsetHeight === 0) {
        return;
      }

      chart.resize();
      onResize?.();
    };

    const debouncedResize = debounceMs > 0 ? debounce(handleResize, debounceMs) : handleResize;

    resizeObserver = new ResizeObserver(debouncedResize);
    resizeObserver.observe(element);
  };

  return { instance };
};
