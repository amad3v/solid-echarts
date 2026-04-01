import { useContext } from "solid-js";

import type { SolidEChartConfigContextValue } from "@type/context";

import { SolidEChartsConfigContext } from "./config";

export const useConfig = (): SolidEChartConfigContextValue => useContext(SolidEChartsConfigContext);
