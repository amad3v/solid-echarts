![Solid ECharts](assets/banner.svg)

[![Solid](https://img.shields.io/badge/SolidJS-1.9-2C4F7C?style=for-the-badge&logo=solid&logoColor=2C4F7C&labelColor=cbd5e1)](https://www.solidjs.com/)
[![ECharts](https://img.shields.io/badge/ECharts-6-AA344D?style=for-the-badge&logo=apacheecharts&logoColor=AA344D&labelColor=cbd5e1)](https://echarts.apache.org/en/index.html)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=3178C6&labelColor=cbd5e1)](https://www.typescriptlang.org/)
[![npm version](https://img.shields.io/npm/v/%40amad3v%2Fsolid-echarts?style=for-the-badge&labelColor=cbd5e1)](https://www.npmjs.com/package/@amad3v/solid-chart)
![coverage](https://img.shields.io/badge/coverage-94%25-ea580c?style=for-the-badge&labelColor=cbd5e1)
[![license](https://img.shields.io/badge/license-MIT-A31F34?style=for-the-badge&labelColor=cbd5e1)](https://mit-license.org/)

---

## Overview

`solid-echarts` is a thin, idiomatic SolidJS wrapper around [Apache ECharts 6](https://echarts.apache.org/). It exposes:

* A declarative `<SolidEChart />` component with reactive props and init-time options
* A context-based provider for shared configuration across multiple charts
* Primitive functions (`createChart`, `createChartEffect`, `createAction`) for building custom chart integrations
* Typed action factories and a `useChart()` hook for imperative access

**Core use cases:**

* Drop-in reactive charts driven by SolidJS signals
* Shared dashboards with synchronised zoom, tooltip, and theme
* Streaming or imperatively-updated charts that bypass the reactive layer
* Custom layouts where chart logic is decoupled from the component tree

## Installation

Install the library:

```bash
pnpm add @amad3v/solid-echarts
```

or with npm:

```bash
npm install @amad3v/solid-echarts
```

or with yarn:

```bash
yarn add @amad3v/solid-echarts
```

## Setup

Call `seSetup` once at application root **before any `<SolidEChart />` renders**.
 It registers the needed ECharts extensions (charts, components, renderers).

```ts
import {
  seSetup,
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  CanvasRenderer,
} from "solid-echarts";

seSetup([BarChart, LineChart, GridComponent, TooltipComponent, CanvasRenderer]);
```

Only registered extensions are included in your bundle.
 ECharts is fully tree-shakable through this call.

`seSetup` is idempotent: calling it multiple times with already-registered extensions is a no-op.

## Quick Start

```tsx
const option = () => ({
  xAxis: { type: "category", data: ["A", "B", "C"] },
  yAxis: { type: "value" },
  series: [{ type: "bar", data: [1, 2, 3] }],
});

<SolidEChart option={option} style={{ width: "100%", height: "320px" }} />;
```

## Documentation

[API Reference](https://amad3v.codeberg.page/solid-echarts/)

* [Core Concepts](./manual/1_CORE_CONCEPTS.md)
* [API Summary](./manual/2_API_SUMMARY.md)
* [Configuration](./manual/3_CONFIGURATION.md)

## License

[MIT](https://mit-license.org/)
