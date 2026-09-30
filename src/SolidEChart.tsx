import type { Accessor } from "solid-js";
import {
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  splitProps,
  untrack,
  type ParentComponent,
} from "solid-js";

import { EChartInstanceProvider } from "@ctx/provider";
import { useConfig } from "@ctx/use-config";
import { createChart } from "@primitive/create-chart";
import { createChartEffect } from "@primitive/create-chart-effect";
import type { EChartRenderer } from "@type/common";
import type { ChartConfigContextValue } from "@type/context";
import type {
  EchartsRef,
  EventHandler,
  SolidEChartEventHandler,
  SolidEChartEventMap,
  SolidEChartEventName,
  SolidEChartProps,
  SolidEChartSurfaceEventMap,
  SolidEChartSurfaceHandler,
} from "@type/echart";
import type { CreateChartEffectOptions, CreateChartOptions } from "@type/primitives";
import { resolveMaybeAccessor } from "@utils/common";

// Stable empty-option constants.
// Inline `?? {}` creates a new object reference on every evaluation.
// `on` uses `===` for change detection, so a new reference always looks like a
// change, causing spurious `showLoading`/`hideLoading` calls and full event
// re-registration on every parent render even when nothing actually changed.
// Module-level constants are `===`-equal across all evaluations.
const EMPTY_LOADING_OPTIONS: Record<string, never> = {};
const EMPTY_EVENT_MAP: SolidEChartEventMap = {};
const EMPTY_SURFACE_MAP: SolidEChartSurfaceEventMap = {};

// The params type depends on the event name (see `SolidEChartEventMap`).
// The wrappers forward whatever ECharts passes, so they are typed as `unknown`.
type ForwardingEventHandler = SolidEChartEventHandler<unknown>;

const CONTAINER_PROPS = ["children"] as const;
const CHART_PROPS = [
  "autoMerge",
  "autoResize",
  "devicePixelRatio",
  "group",
  "lazyUpdate",
  "loading",
  "loadingOptions",
  "locale",
  "notMerge",
  "onDispose",
  "onEvents",
  "onEventsOnce",
  "onInit",
  "onReInit",
  "onResize",
  "onSurfaceEvents",
  "onSurfaceEventsOnce",
  "option",
  "ref",
  "renderer",
  "replaceMerge",
  "resizeDebounce",
  "silent",
  "theme",
  "updateOptions",
  "useDirtyRect",
  "useCoarsePointer",
  "pointerSize",
  "ssr",
  "width",
  "height",
] as const;

/**
 * The primary chart component. A declarative wrapper around {@link createChart}
 * and {@link createChartEffect} that manages the full ECharts instance lifecycle
 * inside a SolidJS component tree.
 *
 * @remarks
 *
 * All props that affect the ECharts instance are reactive, changing them
 * updates the chart without unmounting the component:
 *
 * - **`option`**: calls `setOption` via {@link createChartEffect}
 * - **`theme`**: calls `setTheme` in place (ECharts 6+, no reinit)
 * - **`loading`**: calls `showLoading` / `hideLoading`
 * - **`renderer`**: triggers a full dispose -> reinit cycle (the only prop that does)
 * - **`group`**: updates `chart.group` and calls `connect` in place
 * - **`autoResize`**: attaches or detaches the `ResizeObserver` in place
 *
 * Props not passed inherit from the nearest {@link SolidEChartProvider} ancestor.
 * Per-component props always win over provider defaults.
 *
 * Publishes the instance to context so {@link useChart} works anywhere inside
 * the component tree. Pass children to build co-located controls that access
 * the instance without prop drilling.
 *
 * @param props - See {@link SolidEChartProps} for the full prop reference.
 *
 * @example
 * ```tsx
 * // Basic usage
 * const [data, setData] = createSignal([120, 200, 150, 80]);
 *
 * const option = () => ({
 *   xAxis: { type: 'category', data: ['A', 'B', 'C', 'D'] },
 *   yAxis: { type: 'value' },
 *   series: [{ type: 'bar', data: data() }],
 * });
 *
 * <SolidEChart option={option} style={{ width: '100%', height: '400px' }} />
 * ```
 *
 * @example
 * ```tsx
 * // With provider defaults and per-chart override
 * <SolidEChartProvider theme="dark" renderer="canvas">
 *   <SolidEChart option={chartA} />
 *   <SolidEChart option={chartB} theme="default" /> // overrides provider theme
 * </SolidEChartProvider>
 * ```
 *
 * @example
 * ```tsx
 * // With children, `useChart` works inside the tree
 * // can call `useChart` to access dispatch and instance
 * <SolidEChart option={option}>
 *   <MyControls />
 * </SolidEChart>
 * ```
 *
 * @see {@link SolidEChartProvider} for shared configuration across multiple charts
 * @see {@link useChart} for accessing the instance and dispatch inside the tree
 * @see {@link createChart} for the primitive API this component is built on
 */
export const SolidEChart: ParentComponent<SolidEChartProps> = (props) => {
  // Three-way split:
  //   containerProps : div children
  //   chartProps     : all SolidEChart-specific configuration
  //   nativeProps    : everything else falls through to the container div
  //                    (HTML attributes, DOM event handlers, aria-*, data-*, etc.)
  //
  // The explicit chart prop list ensures that any unknown/future prop is
  // passed to the div rather than silently discarded, future-proof by default.
  const [containerProps, chartProps, nativeProps] = splitProps(props, CONTAINER_PROPS, CHART_PROPS);

  // Inherit shared defaults from the nearest SolidEChartProvider.
  const configContext = useConfig();

  // Signal that bridges the div ref to createChart.
  // Becomes non-null when the container div mounts, triggering chart init.
  const [containerElement, setContainerElement] = createSignal<HTMLDivElement | null>(null);

  // Build merged config: context value is the fallback,
  // component prop wins when explicitly set.
  // Each resolver is a lazy accessor that reads the prop through SolidJS's
  // reactive proxy at call time, not at construction time. This keeps all
  // three usage patterns reactive:
  //   theme="dark"           : static string
  //   theme={currentTheme()} : signal value read through reactive proxy
  //   theme={currentTheme}   : accessor called at resolution time
  const resolveConfigProp =
    <T,>(key: keyof ChartConfigContextValue): Accessor<T> =>
    () => {
      const value = chartProps[key];
      return (value === undefined ? configContext[key]() : resolveMaybeAccessor(value)) as T;
    };

  // The four props `createChart` tracks are memoised: `theme={settings().theme}`
  // re-evaluates whenever `settings` changes, and without a memo an unchanged
  // value would still trigger `setTheme` or a full renderer reinit.
  const resolvedTheme = createMemo(resolveConfigProp<string | object | undefined>("theme"));
  const resolvedRenderer = createMemo(resolveConfigProp<EChartRenderer>("renderer"));
  const resolvedGroup = createMemo(resolveConfigProp<string | undefined>("group"));
  const resolvedAutoResize = createMemo(resolveConfigProp<boolean>("autoResize"));
  const resolvedLocale = resolveConfigProp<string>("locale");
  const resolvedDevicePixelRatio = resolveConfigProp<number>("devicePixelRatio");
  const resolvedUseDirtyRect = resolveConfigProp<boolean>("useDirtyRect");
  const resolvedUseCoarsePointer = resolveConfigProp<boolean>("useCoarsePointer");
  const resolvedSSR = resolveConfigProp<boolean>("ssr");
  const resolvedPointerSize = resolveConfigProp<number>("pointerSize");
  const resolvedHeight = resolveConfigProp<number | string>("height");
  const resolvedWidth = resolveConfigProp<number | string>("width");
  const resolvedResizeDebounce = resolveConfigProp<number>("resizeDebounce");

  // Core instance
  // `locale`, `devicePixelRatio`, `useDirtyRect`, and `resizeDebounce` are untracked,
  // they are static init-time values with no in-place update path in `ECharts`.
  // Changes after mount have no effect and should not trigger side effects.
  const { instance } = createChart(containerElement, {
    theme: resolvedTheme,
    renderer: resolvedRenderer,
    group: resolvedGroup,
    autoResize: resolvedAutoResize,
    locale: untrack(resolvedLocale),
    devicePixelRatio: untrack(resolvedDevicePixelRatio),
    useDirtyRect: untrack(resolvedUseDirtyRect),
    useCoarsePointer: untrack(resolvedUseCoarsePointer),
    pointerSize: untrack(resolvedPointerSize),
    resizeDebounce: untrack(resolvedResizeDebounce),
    ssr: untrack(resolvedSSR),
    width: untrack(resolvedWidth),
    height: untrack(resolvedHeight),
    // onResize is static, read once at init time, changes have no effect
    onResize: chartProps.onResize,
  } as CreateChartOptions);

  // Reactive option wiring
  // option is optional, when omitted the user controls `setOption` manually
  // via `ref` or `useChart`. This is the manual update escape hatch for
  // streaming large datasets or custom render loops.
  //
  // Merge strategy: per-chart props win over provider updateOptions.
  // Each param is a lazy accessor. `createChartEffect` reads them with
  // `untrack`, so a change never triggers a `setOption` on its own; the new
  // value is used on the next natural trigger (instance or option change).
  {
    const updateOptions = configContext.updateOptions;
    const resolveUpdateOption =
      <T,>(key: keyof CreateChartEffectOptions, fallback: T): Accessor<T> =>
      () =>
        (resolveMaybeAccessor<unknown>(chartProps[key]) ??
          resolveMaybeAccessor<unknown>(updateOptions()[key]) ??
          fallback) as T;

    createChartEffect(instance, () => chartProps.option?.(), {
      autoMerge: resolveUpdateOption("autoMerge", false),
      notMerge: resolveUpdateOption("notMerge", false),
      replaceMerge: resolveUpdateOption<string | string[]>("replaceMerge", []),
      lazyUpdate: resolveUpdateOption("lazyUpdate", false),
      silent: resolveUpdateOption("silent", false),
    });
  }

  // Loading state
  // Both props are read inside a memo, so they are resolved at call time.
  // Reading them eagerly (e.g. `toAccessor(chartProps.loading ?? false)`)
  // would snapshot the value at construction and freeze it, the `on` array
  // would never see signal updates.
  const resolvedLoading = createMemo(() => resolveMaybeAccessor(chartProps.loading) ?? false);
  const resolvedLoadingOptions = createMemo(
    () => resolveMaybeAccessor(chartProps.loadingOptions) ?? EMPTY_LOADING_OPTIONS,
  );

  createEffect(
    on(
      [instance, resolvedLoading, resolvedLoadingOptions],
      ([chart, isLoading, loadingOptions]) => {
        if (!chart || chart.isDisposed()) return;
        if (isLoading) {
          chart.showLoading("default", loadingOptions);
        } else {
          chart.hideLoading();
        }
      },
    ),
  );

  // Event attachment
  // Re-runs when instance changes (renderer reinit) or onEvents map changes.
  // Each handler is individually registered and cleaned up; if the map
  // changes, only stale handlers are removed, not the entire set.
  // The live instance is injected as the second argument so handlers can
  // call dispatch without needing a separate `ref`.
  //
  // Wrapped in createMemo so that object-literal maps passed directly
  // in JSX (`onEvents={{ click: handler }}`) do not produce a new reference
  // on every parent render.
  const eventMap = createMemo(() => resolveMaybeAccessor(chartProps.onEvents) ?? EMPTY_EVENT_MAP);

  createEffect(
    on([instance, eventMap], ([chart, evtMap]) => {
      if (!chart || chart.isDisposed()) return;

      const entries = Object.entries(evtMap) as [SolidEChartEventName, ForwardingEventHandler][];

      for (const [eventName, handler] of entries) {
        const wrappedHandler: EventHandler = (params) => {
          handler(params, chart);
        };

        chart.on(eventName, wrappedHandler);

        onCleanup(() => chart.off(eventName, wrappedHandler));
      }
    }),
  );

  // Once event attachment
  // Identical structure to onEvents but each handler self-removes after its
  // first invocation. ECharts has no native `once` in v6 (`echartsProto.one`
  // is deprecated), implemented by wrapping the handler and calling
  // `chart.off` with the wrapper's own reference after the first call.
  //
  // The wrapper captures itself via const, this works because
  // closures capture the binding, not the value at definition time. By the
  // time the wrapper is called, `wrappedOnce` is already assigned.
  //
  // If the event never fires before the instance is disposed or the map
  // changes, onCleanup detaches the wrapper to prevent memory leaks.
  //
  // A WeakSet tracks which wrapper functions have already fired. On each
  // effect run (driven by instance or map identity change) the existing fired
  // set is checked: if a wrapper already fired, it is not re-registered on the
  // new instance/map cycle. This prevents the case where map identity changes
  // (e.g. JSX re-evaluation) caused already-fired once-handlers to be re-armed.
  // The WeakSet uses wrapper function references as keys so it does not prevent
  // GC when the instance or map is replaced.
  const onceEventMap = createMemo(
    () => resolveMaybeAccessor(chartProps.onEventsOnce) ?? EMPTY_EVENT_MAP,
  );
  const firedHandlers = new WeakSet<ForwardingEventHandler>();
  createEffect(
    on([instance, onceEventMap], ([chart, oEventMap]) => {
      if (!chart || chart.isDisposed()) return;

      const entries = Object.entries(oEventMap) as [SolidEChartEventName, ForwardingEventHandler][];

      for (const [eventName, handler] of entries) {
        if (firedHandlers.has(handler)) continue; // already fired, skip

        const wrappedOnce: EventHandler = (params) => {
          if (firedHandlers.has(handler)) return; // double-guard
          firedHandlers.add(handler);

          handler(params, chart);
          chart.off(eventName, wrappedOnce);
        };

        chart.on(eventName, wrappedOnce);

        onCleanup(() => chart.off(eventName, wrappedOnce));
      }
    }),
  );

  // Surface event attachment
  // Surface events fire anywhere on the chart canvas or SVG surface,
  // including blank areas with no data elements. Unlike onEvents which attach
  // to `chart.on`, these attach to `chart.getZr.on`, the underlying
  // rendering surface.
  //
  // Critical: after a renderer reinit (renderer prop change), `chart.getZr`
  // returns a NEW rendering instance. Handlers attached to the old surface
  // are gone. Re-running this effect on instance change handles reattachment
  // automatically, the same guarantee we provide for onEvents.
  //
  // Handler signature is (`ElementEvent`), no instance injection, since
  // surface events are low-level and the user can access the instance via
  // `useChart` when needed.
  const surfaceEventMap = createMemo(() => chartProps.onSurfaceEvents ?? EMPTY_SURFACE_MAP);

  createEffect(
    on([instance, surfaceEventMap], ([chart, sEventMap]) => {
      if (!chart || chart.isDisposed()) return;

      const surface = chart.getZr();
      const entries = Object.entries(sEventMap) as [string, SolidEChartSurfaceHandler][];

      for (const [eventName, handler] of entries) {
        surface.on(eventName, handler);

        onCleanup(() => {
          surface.off(eventName, handler);
        });
      }
    }),
  );

  // Surface once event attachment
  // Same as `onSurfaceEvents` but each handler self-removes after first fire.
  // Same self-reference closure pattern as `onEventsOnce`.
  const surfaceOnceEventMap = createMemo(() => chartProps.onSurfaceEventsOnce ?? EMPTY_SURFACE_MAP);

  createEffect(
    on([instance, surfaceOnceEventMap], ([chart, sOnceEventMap]) => {
      if (!chart || chart.isDisposed()) return;

      const surface = chart.getZr();
      const entries = Object.entries(sOnceEventMap) as [string, SolidEChartSurfaceHandler][];

      for (const [eventName, handler] of entries) {
        const wrappedOnce: SolidEChartSurfaceHandler = (event) => {
          handler(event);
          if (!chart.isDisposed()) {
            surface.off(eventName, wrappedOnce);
          }
        };

        surface.on(eventName, wrappedOnce);

        onCleanup(() => {
          surface.off(eventName, wrappedOnce);
        });
      }
    }),
  );

  // onInit/onReinit lifecycle separation.
  // Tracks whether the first instance has fired. onInit is restricted
  // to the first non-null emission. `onReInit` fires on every subsequent one.
  // `onDispose` continues to fire on every cleanup (both unmount and reinit),
  // every instance creation triggers a future dispose, and callers may need
  // to clean up state on both transitions.
  let hasInitFired = false;

  createEffect(
    on([instance], ([chart]) => {
      if (!chart) return;

      if (!hasInitFired) {
        hasInitFired = true;
        chartProps.onInit?.(chart);
      } else {
        chartProps.onReInit?.(chart);
      }

      onCleanup(() => chartProps.onDispose?.());
    }),
  );

  // Ref forwarding
  // Accepts a plain callback (`ref={el => { chartRef = el }}`) or a SolidJS
  // signal setter (`ref={setChartRef}` from `createSignal`).
  // Both receive null when the instance is disposed and the live instance
  // when it is ready.
  const instanceRef = (): EchartsRef | undefined => chartProps.ref;

  createEffect(
    on([instance, instanceRef], ([chart, ref]) => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(chart);
      }

      onCleanup(() => ref(null));
    }),
  );

  // Instance context
  // Publish the instance so `useChart` resolves correctly anywhere inside
  // this component's subtree, including children passed as props.
  return (
    <EChartInstanceProvider value={{ instance }}>
      <div ref={setContainerElement} {...nativeProps} />
      {/* Children mount inside the provider so `useChart` finds the instance */}
      {containerProps.children}
    </EChartInstanceProvider>
  );
};
