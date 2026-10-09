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

**Theme switches:** ECharts' `setTheme` rebuilds the chart from the first option set on the
instance, not from the current one. The library applies the latest option again right after every
`setTheme`, so a theme switch keeps the current option in every merge mode. With `autoMerge`, that
call uses `notMerge: true`, since the rebuilt chart no longer matches the previous option shape.

---

### Cross-chart Synchronisation

Assign the same `group` to multiple charts:

```tsx
<SolidEChartProvider group="dashboard">
  <SolidEChart option={chartA} />
  <SolidEChart option={chartB} />
</SolidEChartProvider>
```

`echarts.connect(groupId)` is called automatically. On cleanup the chart leaves its group before it
is disposed; `echarts.disconnect(groupId)` is not called, since other charts may still use the group.

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

A theme change still calls `setTheme`, which makes ECharts rebuild the chart from the first option
set on the instance. Without an `option` prop there is no option for the library to apply again, so
set the current option yourself after a theme change (or pass `notMerge: true` to every `setOption`
call, which makes ECharts keep the last option as the one it rebuilds from).

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
- The init-time props (`locale`, `devicePixelRatio`, ...) are read when the chart is created, so a
  value changed while waiting for visibility is used.

**Several signal writes, one render.** Each change of the `option` accessor calls `setOption`, and
ECharts renders synchronously by default. Writing three signals that feed one option therefore
renders three times. Group the writes with `batch`:

```ts
batch(() => {
  setData(nextData);
  setTitle(nextTitle);
});
```

Alternatively set `lazyUpdate` (per chart, or through the provider's `updateOptions`): ECharts then
merges each option immediately and updates the chart once, on the next frame (`updated` and
`finished` fire once; `rendered` can fire more than once in that frame). With `lazyUpdate`, values read
right after a change (`convertToPixel`, `getDataURL`, ...) still reflect the previous render.

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
} from "@amad3v/solid-echarts";
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

**Init-time props apply to the next instance.**
`locale`, `devicePixelRatio`, `useDirtyRect`, `width`, `height`, `ssr`, `useCoarsePointer` and
`pointerSize` are `echarts.init()` options: ECharts cannot change them on a live chart. They are read
every time an instance is created (first init, `renderer` change, delayed `initOnVisible` init), so
a new instance always uses the current values. Changing one does not recreate the chart; to apply it
right away, change `renderer` or remount the component (for example with `<Show when={key()} keyed>`).
`resizeDebounce` is read when the `ResizeObserver` is attached. `initOnVisible` and `onResize` are
read once at mount.

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
