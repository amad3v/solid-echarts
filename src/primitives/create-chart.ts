import type { Accessor } from "solid-js";
import { createEffect, createSignal, on, onCleanup, untrack } from "solid-js";

import { registerThemeRevision } from "@primitive/theme-revision";
import type { EChartTheme } from "@type/common";
import type { CreateChartOptions, CreateChartResult } from "@type/primitives";
import { DEFAULT_THEME, resolveMaybeAccessor, toAccessor } from "@utils/common";
import { debounce } from "@utils/primitives";
import type { EChartsInitOpts, EChartsType } from "echarts/core";
import * as echarts from "echarts/core";
import { connect } from "echarts/core";

/**
 * Core primitive for creating and managing an ECharts instance lifecycle.
 *
 * @remarks
 *
 * Manages four concerns reactively:
 *
 * - **Init/dispose** - creates the instance when `container` is available,
 *   disposes on cleanup. Only `renderer` triggers a full reinit cycle.
 *   With `initOnVisible`, the first init waits until the container enters
 *   the viewport.
 * - **Theme** - applies via `setTheme` in place (ECharts 6+). No reinit.
 *   `setTheme` rebuilds the chart from the first option it was given, so
 *   {@link createChartEffect} reapplies the latest option after every switch.
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

  const { onResize, initOnVisible = false } = opts;

  // Init-time options are read untracked whenever an instance is created, so
  // a renderer reinit or a delayed `initOnVisible` init uses current values.
  // A change on its own never reinits: ECharts has no in-place update for them.
  // Cast: under `exactOptionalPropertyTypes` an unset option is `undefined`
  // here, which ECharts treats the same as a missing key.
  const readInitOptions = (): Omit<EChartsInitOpts, "renderer"> =>
    untrack(
      () =>
        ({
          locale: resolveMaybeAccessor(opts.locale),
          devicePixelRatio: resolveMaybeAccessor(opts.devicePixelRatio),
          useDirtyRect: resolveMaybeAccessor(opts.useDirtyRect),
          useCoarsePointer: resolveMaybeAccessor(opts.useCoarsePointer),
          ssr: resolveMaybeAccessor(opts.ssr),
          width: resolveMaybeAccessor(opts.width),
          height: resolveMaybeAccessor(opts.height),
          pointerSize: resolveMaybeAccessor(opts.pointerSize),
        }) as Omit<EChartsInitOpts, "renderer">,
    );

  const [instance, setInstance] = createSignal<EChartsType | null>(null);
  const [prevGroup, setPrevGroup] = createSignal<string | undefined>();
  // Bumped after every `setTheme`; `createChartEffect` tracks it (via
  // `readThemeRevision`) to reapply the latest option. See `theme-revision.ts`.
  const [themeRevision, setThemeRevision] = createSignal(0);
  // The theme the current instance shows, so an unchanged value (a theme
  // accessor re-running with the same result) does not call `setTheme`.
  let appliedTheme: EChartTheme;

  // Visibility gate (`initOnVisible`)
  // Open from the start unless deferral is requested and the browser can
  // observe. Once open it stays open: a chart is never disposed for leaving
  // the viewport, and a renderer reinit does not wait again.
  const [visible, setVisible] = createSignal(
    !initOnVisible || typeof IntersectionObserver === "undefined",
  );

  createEffect(
    on(container, (element) => {
      if (!element || visible()) return;

      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;

        observer.disconnect();
        setVisible(true);
      });
      observer.observe(element);

      onCleanup(() => {
        observer.disconnect();
      });
    }),
  );

  let resizeObserver: ResizeObserver | null = null;
  // Drops a pending debounced resize when the observer is detached.
  let cancelPendingResize: (() => void) | undefined;

  const detachResizeObserver = (): void => {
    resizeObserver?.disconnect();
    resizeObserver = null;
    cancelPendingResize?.();
    cancelPendingResize = undefined;
  };
  // Tracks the last successfully connected group id so we can disconnect when it changes.
  // Stored outside effects to avoid extra Solid state.
  // let prevGroup: string | undefined = undefined;

  // Core effect
  // Tracked dependencies: container, renderer and the visibility gate.
  //
  // theme IS an init argument and is read once via `untrack` at init time.
  // It does not belong in the tracked dependencies: later changes are applied
  // in place by the theme effect below via `setTheme`, palette included, so a
  // theme change never needs a reinit.
  //
  // Option reapplication after reinit is handled by createChartEffect which
  // tracks [instance, option], when `setInstance` fires with the new chart,
  // that effect wakes immediately and applies the current option.
  // No snapshot needed here.
  createEffect(
    on(
      [container, renderer, visible],
      ([element, rendererValue, isVisible]) => {
        if (!element || !isVisible) return;

        const initOptions: EChartsInitOpts = { ...readInitOptions(), renderer: rendererValue };

        // Apply theme before `setInstance` so the first `createChartEffect` call
        // already renders with the correct palette.
        // Untracked - theme effect owns all subsequent updates.
        const initialTheme = untrack(theme);
        appliedTheme = initialTheme ?? DEFAULT_THEME;
        const chart = echarts.init(element, appliedTheme, initOptions);
        registerThemeRevision(chart, themeRevision);

        // Apply group before `setInstance` without tracking.
        // group effect owns all subsequent updates.
        const initialGroup = untrack(group);
        if (initialGroup) {
          chart.group = initialGroup;
          connect(initialGroup);
          setPrevGroup(initialGroup);
        } else {
          setPrevGroup(undefined);
        }

        setInstance(chart);

        // Attach `ResizeObserver` at mount time if `autoResize` is enabled.
        // Post-mount toggling is handled by the `autoResize` effect below.
        if (untrack(autoResize)) {
          attachResizeObserver(chart, element);
        }

        onCleanup(() => {
          detachResizeObserver();

          if (!chart.isDisposed()) {
            chart.group = "";
            chart.dispose();
          }

          setPrevGroup(undefined);
          setInstance(null);
        });
      },
      { defer: false },
    ),
  );

  // Theme effect
  // `setTheme` updates in place, no reinit required.
  // Tracks `theme` only. Every instance is created with the current theme by
  // the core effect, so a new instance (late container, renderer reinit) needs
  // no `setTheme`; `instance` is read untracked for that reason. The initial
  // value, and a change made while there is no instance, go through `init`
  // and are skipped here as equal to `appliedTheme`.
  //
  // ECharts' `setTheme` rebuilds the model from the first option set on the
  // instance, not the current one. Bumping the revision makes
  // `createChartEffect` reapply the latest option afterwards, whichever of
  // the two effects runs first when theme and option change together.
  createEffect(
    on(theme, (themeValue) => {
      if (themeValue === undefined || themeValue === appliedTheme) return;

      const chart = instance();
      if (!chart || chart.isDisposed()) return;

      chart.setTheme(themeValue);
      appliedTheme = themeValue;
      setThemeRevision((revision) => revision + 1);
    }),
  );

  // Group effect
  // group is a chart property, not an init argument, updates in place.
  // `connect` is called after assignment so ECharts registers the instance
  // under the new group ID for datazoom and tooltip sync.
  createEffect(
    on([instance, group], ([chart, groupValue]) => {
      if (!chart || chart.isDisposed()) return;

      const nextGroup = groupValue || undefined;
      if (nextGroup === prevGroup()) return;

      chart.group = nextGroup ?? "";
      if (nextGroup) connect(nextGroup);

      setPrevGroup(nextGroup);
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
        detachResizeObserver();
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

    const debounceMs = untrack(() => resolveMaybeAccessor(opts.resizeDebounce)) ?? 100;
    let debouncedResize = handleResize;
    if (debounceMs > 0) {
      const debounced = debounce(handleResize, debounceMs);
      cancelPendingResize = debounced.cancel;
      debouncedResize = debounced;
    }

    resizeObserver = new ResizeObserver(debouncedResize);
    resizeObserver.observe(element);
  };

  return { instance };
};
