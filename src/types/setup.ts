import type { use } from "echarts/core";

export type Setup = typeof use;
export type SetupExtensions = Parameters<Setup>[0];
