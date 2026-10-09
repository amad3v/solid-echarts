import type { ParentComponent } from "solid-js";
import { useContext } from "solid-js";

import type { SolidEChartConfig, SolidEChartConfigContextValue } from "@type/context";
import { resolveMaybeAccessor } from "@utils/common";

import { SolidEChartsConfigContext } from "./config";
import { EChartsInstanceContext } from "./instance";

const configValueKeys = [
  "theme",
  "renderer",
  "locale",
  "group",
  "devicePixelRatio",
  "useDirtyRect",
  "useCoarsePointer",
  "autoResize",
  "resizeDebounce",
  "initOnVisible",
  "updateOptions",
  "pointerSize",
  "ssr",
  "height",
  "width",
] as const;

/**
 * Provides shared ECharts configuration to all `SolidEChart` descendants.
 *
 * @remarks
 *
 * Any prop passed to the provider becomes the inherited default for every
 * `SolidEChart` in its subtree. Per-chart props always win over provider
 * values.
 *
 * Providers can be nested, an inner provider only overrides the
 * props it explicitly receives, inheriting everything else from the outer one.
 *
 * All props accept both static values and reactive accessors (signals):
 * - `theme="dark"` - static, always `'dark'`
 * - `theme={currentTheme()}` - reactive, updates when the signal changes
 * - `theme={currentTheme}` - accessor, called at resolution time
 *
 * @param props - See {@link SolidEChartConfig} for the full prop reference.
 *
 * @example
 * ```tsx
 * // Set shared defaults for a dashboard
 * <SolidEChartProvider theme="dark" renderer="canvas" group="dashboard">
 *   <SolidEChart option={chartA} />
 *   <SolidEChart option={chartB} />
 *   <SolidEChart option={chartC} theme="default" /> // overrides provider theme
 * </SolidEChartProvider>
 * ```
 *
 * @example
 * ```tsx
 * // Reactive theme toggling across all charts at once
 * const [theme, setTheme] = createSignal<string>('default');
 *
 * <SolidEChartProvider theme={theme}>
 *   <SolidEChart option={chartA} />
 *   <SolidEChart option={chartB} />
 * </SolidEChartProvider>
 *
 * <button onClick={() => setTheme(t => t === 'default' ? 'dark' : 'default')}>
 *   Toggle theme
 * </button>
 * ```
 *
 * @see {@link SolidEChart} for per-chart configuration
 * @see {@link useChart} for accessing the instance inside the tree
 */
export const SolidEChartProvider: ParentComponent<SolidEChartConfig> = (props) => {
  const parentConfig = useContext(SolidEChartsConfigContext);

  // Resolve first, so an accessor returning `undefined` also falls back
  const setConfigValue = <T,>(key: keyof SolidEChartConfig): T => {
    const value = resolveMaybeAccessor(props[key]);
    return (value === undefined ? parentConfig[key]() : value) as T;
  };

  // Each accessor is a lazy lambda that reads props at call time, not at
  // construction time. This is what keeps all three usage patterns reactive.
  //
  // Contrast:
  //   `toAccessor(props.theme)`    - evaluates `props.theme` once, freezes the value
  //   `() => resolve(props.theme)` - reads through SolidJS reactive proxy every call
  //
  // Unset props (and accessors returning `undefined`) fall back to the
  // nearest parent context value, making provider nesting work
  // transparently - inner providers shadow only what they explicitly declare.
  const configValue = configValueKeys.reduce((acc, v) => {
    acc[v] = () => setConfigValue(v);
    return acc;
  }, {} as SolidEChartConfigContextValue);

  return (
    <SolidEChartsConfigContext.Provider value={configValue}>
      {props.children}
    </SolidEChartsConfigContext.Provider>
  );
};

/**
 * Re-export of `EChartsInstanceContext.Provider` for internal use by
 * `SolidEChart`. Allows the component to publish its instance to context
 * without importing `EChartsInstanceContext` directly.
 *
 * @internal
 */
export const EChartInstanceProvider = EChartsInstanceContext.Provider;
