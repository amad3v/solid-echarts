# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-09-30

### Added

- `initOnVisible` option on `createChart`, `<SolidEChart />` and `<SolidEChartProvider />`: the
  chart is created only once its container first enters the viewport.
- `seActions.graphRoam`, `seActions.treeRoam` and `seActions.sankeyRoam`, with the payload types
  `GraphRoamPayload`, `TreeRoamPayload`, `SankeyRoamPayload`, `SeriesRoamPayload` and `RoamDelta`.
- Event names `sankeyroam`, `showtip`, `hidetip`, `updateaxispointer`, `focusnodeadjacency`,
  `unfocusnodeadjacency`, `dragnode`, `treeexpandandcollapse` and `changeaxisorder`.
- `EventParams.selfType` (`"line"`, `"area"` or `"breadcrumb"`).
- `RenderedEventParams` type, and the types `ComponentIndexQuery`, `ComponentIdQuery` and
  `BrushArea` used by the action payloads.
- Payload fields: `x` and `y` on `ShowTipPayload`, `dataZoomId` on `DataZoomPayload`, `notBlur` on
  `DownplayPayload`.
- "Performance" section in the manual (batching option updates, `lazyUpdate`, `initOnVisible`).
- `LICENSE` file.

### Changed

- Peer dependencies are now `echarts` `^6.1.0` (was `^6.0.0`) and `solid-js` `^1.9.15` (was
  `^1.9.12`).
- `seActions` creators type-check their payload. `legendSelect`, `legendUnSelect`,
  `legendToggleSelect`, `timelineChange` and `timelinePlayChange` require a payload; the other
  creators can still be called without arguments. Calls that omit a required field or pass a
  declared field with the wrong type no longer compile.
- Event handlers are typed per event: `rendered` receives `RenderedEventParams` and `finished`
  receives `undefined`. A handler for one of these two events that declares its parameter as
  `EventParams` no longer compiles.
- `GeoRoamPayload` declares the roam fields (`dx`, `dy`, `zoom`, `originX`, `originY`) and the
  targets ECharts reads (`geoId`, `geoIndex`, `geoName`, `seriesId`, `seriesIndex`, `seriesName`);
  the `name` field, which targeted nothing, is removed.
- `BrushPayload.areas` is optional.
- `useCoarsePointer` and `pointerSize` are no longer set to `false` and `0` when unset, so the
  ECharts defaults apply: the enlarged pointer is enabled on touch devices, with a size of `44`.
- A `<SolidEChart />` prop that changes between `undefined` and a value now switches between the
  provider value and the prop; before, that choice was fixed at mount.

### Fixed

- Props passed in call form (`theme={theme()}`, `loading={loading()}`, ...) were read once at mount
  and never updated.
- A change of the provider's `updateOptions` after mount was not picked up.
- The `updateOptions` prop of `<SolidEChart />` was ignored.
- `onSurfaceEvents` and `onSurfaceEventsOnce` passed as accessors attached no handler.
- `useCoarsePointer={true}` had no effect unless `pointerSize` was set as well.
- `setTheme` was called on a new chart instance (container set late, renderer change) with the
  theme `echarts.init` had just applied.
- Documentation: package name in the import examples, links in the README, and statements in the
  manual that did not match the code.

## [1.0.3] - 2026-04-02

### Added

- `useConfig` is exported for consumers of the primitive API.

## [1.0.2] - 2026-04-02

Version 1.0.1 was not published.

### Fixed

- The initial theme is passed to `echarts.init`, so the first render uses it.
- `createChart` no longer calls `echarts.disconnect` when a chart changes group or is disposed; the
  call disconnected every chart of that group.

## [1.0.0] - 2026-04-01

Initial release.

[1.1.0]: https://codeberg.org/amad3v/solid-echarts/compare/v1.0.3...v1.1.0
[1.0.3]: https://codeberg.org/amad3v/solid-echarts/compare/v1.0.2...v1.0.3
[1.0.2]: https://codeberg.org/amad3v/solid-echarts/compare/v1.0.0...v1.0.2
[1.0.0]: https://codeberg.org/amad3v/solid-echarts/src/tag/v1.0.0
