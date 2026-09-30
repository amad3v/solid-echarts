---
title: "Configuration"
---

## Configuration

### autoMerge

When `autoMerge: true` on `<SolidEChart />` or `createChartEffect`, the library automatically selects
the correct `setOption` merge strategy by diffing the previous and new option shapes.

**Decision priority:**

1. First render -> `notMerge: false`
2. `options` array shrank (timeline steps removed) -> `notMerge: true`
3. `media` array shrank (responsive breakpoints removed) -> `notMerge: true`
4. Top-level object or scalar key removed -> `notMerge: true`
5. Array items removed (by tracked `id` or anonymous count) -> `replaceMerge: [key]`
6. No removals detected -> `notMerge: false`

**Constraint:** `autoMerge` calls `setOption` in merge mode (`notMerge: false`) after `setTheme`.
Calling `setOption` in merge mode multiple times before `setTheme` causes ECharts to discard
intermediate options - only the last survives the theme change. Mitigate by using `notMerge: true`
on all prior `setOption` calls when `setTheme` changes are anticipated, or by ensuring every option
object is complete.

---

### Cross-chart Synchronisation

Assign the same `group` to multiple charts:

```tsx
<SolidEChartProvider group="dashboard">
  <SolidEChart option={chartA} />
  <SolidEChart option={chartB} />
</SolidEChartProvider>
```

`echarts.connect(groupId)` is called automatically. `echarts.disconnect(groupId)` is called on cleanup.

Alternatively manage groups imperatively via the re-exported `connect` and `disconnect` from `echarts/core`.

---

### Manual Mode (no `option` prop)

Omit the `option` prop entirely. The reactive binding is not established. Drive the chart
imperatively via `ref` or `useChart()`:

```tsx
<SolidEChart ref={setChartRef} onInit={(chart) => chart.setOption(initialOption)} />
```

This is the correct approach for streaming large datasets (`chart.appendData`) or custom render
loops where reactive overhead is undesirable.

---

### Performance

**Off-screen charts.** By default every chart is created and rendered as soon as its container
mounts, so a page with many charts does all of that work in one task. With `initOnVisible`, a chart
is created only once its container first enters the viewport:

```tsx
<SolidEChartProvider initOnVisible>
  <For each={charts}>{(option) => <SolidEChart option={option} style={{ height: "300px" }} />}</For>
</SolidEChartProvider>
```

- Until then `instance()` is `null`, `onInit` has not fired and `ref` has not received the instance.
- Visibility is reported asynchronously, so a chart that is already on screen is created shortly
  after mount rather than during it.
- A chart is not disposed when it scrolls out of view again, and a `renderer` change does not wait
  for visibility a second time.
- A container inside a hidden parent (`display: none`) is not visible; the chart is created when the
  parent is shown.
- Where `IntersectionObserver` is not available, the chart is created immediately.

---

### SSR

Pass `ssr: true` to `<SolidEChart />` or `createChart` to forward the ECharts SSR init flag. On the
server, `createChart`, `createChartEffect`, and `createAction` return without side effects because
`window` is undefined.

Use `chart.isSSR()` (via `useChart()`) to guard canvas-only operations.

## Re-exported ECharts Utilities

The library re-exports the following from `echarts/core` and sub-packages to avoid requiring direct
ECharts imports:

```ts
import {
  DEFAULT_THEME,
  DARK_THEME,
  registerMap,
  registerTheme,
  registerTransform,
  registerCoordinateSystem,
  connect,
  disconnect,
  graphic,
  color,
} from "solid-echarts";
```

All chart types, components, and renderers are re-exported via `echarts/charts`,
`echarts/components`, and `echarts/renderers`.

---

## Edge Cases / Gotchas

**`option` must be an accessor, not a plain object.**
Passing `option={{ ... }}` snapshots the value at mount and never updates.
Always pass a signal or accessor: `option={() => ({ ... })}`.

**Merge strategy signals do not trigger `setOption` alone.**
`notMerge`, `replaceMerge`, `lazyUpdate`, `silent`, and `autoMerge` are read with `untrack` inside
the effect. Changing them after mount takes effect on
the next natural trigger (instance or option change), not immediately.

**Static props are read once.**
`locale`, `devicePixelRatio`, `useDirtyRect`, `resizeDebounce`, `initOnVisible`, `width`, `height`,
`ssr`, `useCoarsePointer`, `pointerSize`, and `onResize` are read at `echarts.init()` time.
Subsequent changes - even reactive ones - have no effect.

**`renderer` is the only reinit-triggering prop.**
All other configuration changes update in place. On `renderer` change, `instance()` transiently emits
`null` between dispose and reinit.
Any `createChartEffect` bound to that instance handles reapplication automatically.

**`onInit` fires once per component lifetime, not per instance.**
Use `onReInit` for renderer reinit cycles. Use `onDispose` for cleanup before each dispose
(both unmount and reinit).

**`onEventsOnce` is wrapper-scoped.**
It guarantees that a registered wrapper cannot invoke its handler twice, but a new wrapper created
by an effect rerun is a fresh registration.

**Passing event maps as inline JSX objects causes identity churn.**
`onEvents={{ click: handler }}` creates a new object on every parent render. The library memoizes
these internally, but passing stable references (signals, or variables defined outside the JSX)
is more efficient.

**`seSetup` must be called before any chart mounts.**
Calling it after the first `<SolidEChart />` renders may result in missing chart types or components.

**`useChart()` outside a `<SolidEChart />` tree never throws.**
`instance()` returns `null`, `dispatch` is a no-op, `chart` methods return `undefined`.
This makes it safe to call in shared components used both inside and outside chart trees.

**`loadingOptions` defaults to a stable empty object.**
Omitting `loadingOptions` will not cause spurious `showLoading` re-calls on unrelated signal changes.

**`null` option values are tracked for removal detection.**
Setting a top-level key to `null` (e.g., `{ backgroundColor: null }`) is recorded in the option
signature. If the key is removed on the next render, `autoMerge` will correctly emit
`notMerge: true`. This is intentional - `null` signals key presence, not absence.

**`seActions` enforces payload requirements.**
`legendSelect`, `legendUnSelect`, `legendToggleSelect`, `timelineChange` and `timelinePlayChange`
cannot be called without their required field. All other factories accept zero arguments.

| [< API Summary](./2_API_SUMMARY.md) |
| ----------------------------------- |
