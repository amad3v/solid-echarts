export { SolidEChartProvider } from "@ctx/provider";
export { useChart } from "@ctx/use-chart";
export { useConfig } from "@ctx/use-config";
export { createAction } from "@primitive/create-action";
export { createChart } from "@primitive/create-chart";
export { createChartEffect } from "@primitive/create-chart-effect";
export { DARK_THEME, DEFAULT_THEME } from "@utils/common";
export { buildSignature, optionMergePlan } from "@utils/merge-plan";
export { debounce } from "@utils/primitives";
export { seActions } from "./actions";
export { seSetup } from "./setup";
export { SolidEChart } from "./SolidEChart";

export type {
  EChartRenderer,
  EChartTheme,
  LocaleOption,
  MaybeAccessor,
  PresetTheme,
} from "@type/common";
export type { SolidEChartConfig, SolidEChartConfigContextValue } from "@type/context";
export type {
  EchartsRef,
  ElementEventName,
  EventParams,
  LoadingOptions,
  RenderedEventParams,
  SolidEChartEventMap,
  SolidEChartOption,
  SolidEChartOptionOpts,
  SolidEChartProps,
  SolidEChartSurfaceEventMap,
  SolidEChartSurfaceHandler,
} from "@type/echart";
export type { MergePlan, OptionSignature } from "@type/merge-plan";
export type {
  CreateChartEffectOptions,
  CreateChartOptions,
  CreateChartResult,
} from "@type/primitives";
export type { Setup, SetupExtensions } from "@type/setup";
export type { SolidEChartAPI } from "@type/use-chart";

export type {
  ActionCreator,
  ActionKind,
  ActionPayload,
  BrushArea,
  BrushPayload,
  BrushType,
  ComponentIdQuery,
  ComponentIndexQuery,
  DataZoomPayload,
  DispatchOpt,
  DownplayPayload,
  FocusNodeAdjacencyPayload,
  GeoRoamPayload,
  GraphRoamPayload,
  HideTipPayload,
  HighlightPayload,
  LegendAllSelectPayload,
  LegendInverseSelectPayload,
  LegendSelectPayload,
  LegendToggleSelectPayload,
  LegendUnSelectPayload,
  PayloadInput,
  RestorePayload,
  RoamDelta,
  SankeyRoamPayload,
  SelectPayload,
  SeriesQuery,
  SeriesRoamPayload,
  SeriesTarget,
  ShowTipPayload,
  SimplePayload,
  TimelineChangePayload,
  TimelinePlayChangePayload,
  ToggleSelectPayload,
  TreeRoamPayload,
  TypedPayload,
  UnfocusNodeAdjacencyPayload,
  UnselectPayload,
} from "@type/actions";

// ─── echarts core utilities ───────────────────────────────────────────────────
// Exposed so users never need to import from echarts directly.
// `registerMap`, `registerTheme`, `registerTransform` are called at app level
// alongside `setup()`. graphic and color are used inside option configs.
export type { EChartsOption, SeriesOption } from "echarts";
export {
  color,
  connect,
  disconnect,
  graphic,
  registerCoordinateSystem,
  registerMap,
  registerTheme,
  registerTransform,
} from "echarts/core";
export type { EChartsType, ElementEvent, Payload } from "echarts/core";

// ─── echarts extensions ───────────────────────────────────────────────────────
// Direct re-exports from echarts sub-packages.
// Users pass these directly to `setup([...])`.
export * from "echarts/charts";
export * from "echarts/components";
export * from "echarts/renderers";
