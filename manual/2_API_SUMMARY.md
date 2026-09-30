---
title: "API Summary"
---

## API Summary

### `<SolidEChart />`

The primary component. All props are optional, but `option` must be an accessor if provided.

#### Configuration props

| Prop               | Type                               | Default                   | Notes                                                                                                                            |
| ------------------ | ---------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `option`           | `Accessor<SolidEChartOption>`      | -                         | Reactive. Drives `setOption`. Omit for manual mode.                                                                              |
| `theme`            | `MaybeAccessor<string \| object>`  | `'default'`               | Calls `setTheme()` in place.                                                                                                     |
| `renderer`         | `MaybeAccessor<'canvas' \| 'svg'>` | `'canvas'`                | Triggers full reinit on change.                                                                                                  |
| `locale`           | `MaybeAccessor<string>`            | `'EN'`                    | **Static.**                                                                                                                      |
| `group`            | `MaybeAccessor<string>`            | -                         | Calls `echarts.connect()` in place.                                                                                              |
| `devicePixelRatio` | `MaybeAccessor<number>`            | `window.devicePixelRatio` | **Static.**                                                                                                                      |
| `useDirtyRect`     | `MaybeAccessor<boolean>`           | `false`                   | **Static.**                                                                                                                      |
| `useCoarsePointer` | `MaybeAccessor<boolean>`           | `false`                   | **Static.**                                                                                                                      |
| `pointerSize`      | `MaybeAccessor<number>`            | `0`                       | **Static.**                                                                                                                      |
| `ssr`              | `MaybeAccessor<boolean>`           | `false`                   | **Static.**                                                                                                                      |
| `width`            | `MaybeAccessor<number \| string>`  | `0`                       | **Static.** Passed to `echarts.init()`.                                                                                          |
| `height`           | `MaybeAccessor<number \| string>`  | `0`                       | **Static.** Passed to `echarts.init()`.                                                                                          |
| `autoResize`       | `MaybeAccessor<boolean>`           | `true`                    | Attaches/detaches `ResizeObserver` in place.                                                                                     |
| `resizeDebounce`   | `MaybeAccessor<number>`            | `100`                     | **Static.** Milliseconds. `0` disables debounce.                                                                                 |
| `initOnVisible`    | `MaybeAccessor<boolean>`           | `false`                   | **Static.** Creates the chart once its container first enters the viewport. See [Performance](./3_CONFIGURATION.md#performance). |
| `loading`          | `MaybeAccessor<boolean>`           | `false`                   | Calls `showLoading()` / `hideLoading()`.                                                                                         |
| `loadingOptions`   | `MaybeAccessor<LoadingOptions>`    | -                         | Passed to `showLoading()`.                                                                                                       |
| `onResize`         | `() => void`                       | -                         | **Static.** Fires after a successful resize.                                                                                     |

#### Merge strategy props

These configure the `setOption` call. Read with `untrack` - changing them alone does **not** trigger
a re-render.

| Prop            | Type                                      | Default | Notes                                                                           |
| --------------- | ----------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| `notMerge`      | `MaybeAccessor<boolean>`                  | `false` |                                                                                 |
| `replaceMerge`  | `MaybeAccessor<string \| string[]>`       | `[]`    |                                                                                 |
| `lazyUpdate`    | `MaybeAccessor<boolean>`                  | `false` |                                                                                 |
| `silent`        | `MaybeAccessor<boolean>`                  | `false` |                                                                                 |
| `autoMerge`     | `MaybeAccessor<boolean>`                  | `false` | Automatically infers the minimal merge strategy.                                |
| `updateOptions` | `MaybeAccessor<CreateChartEffectOptions>` | `{}`    | Provider/default merge strategy values merged into `createChartEffect` options. |

When `autoMerge: true`, `notMerge` and `replaceMerge` are ignored. The library diffs the previous
and new option structure and automatically selects the minimal merge strategy. `lazyUpdate` and
`silent` still apply. See [autoMerge](./3_CONFIGURATION.md#automerge) below.

#### Event props

| Prop                  | Type                                                           | Notes                                                                                                                                                                                     |
| --------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onEvents`            | `SolidEChartEventMap`                                          | Registered via `chart.on()`. Each handler receives `(params: EventParams, instance: EChartsType)`. `rendered` receives `{ elapsedTime }` and `finished` receives `undefined` as `params`. |
| `onEventsOnce`        | Same as above                                                  | Self-removes after first invocation.                                                                                                                                                      |
| `onSurfaceEvents`     | `Partial<Record<ElementEventName, SolidEChartSurfaceHandler>>` | Registered on `chart.getZr().on()`. Fires anywhere on the canvas surface.                                                                                                                 |
| `onSurfaceEventsOnce` | Same as above                                                  | Self-removes after first invocation.                                                                                                                                                      |

**`onEventsOnce`**

Each handler is wrapped and registered with `chart.on()`, then removed after its first invocation
with `chart.off()`. The cleanup registered through `onCleanup()` ensures listeners are detached when
Solid re-runs the effect or disposes the scope.

#### Lifecycle callbacks

| Prop        | Type                              | Notes                                                          |
| ----------- | --------------------------------- | -------------------------------------------------------------- |
| `onInit`    | `(instance: EChartsType) => void` | Fires **once** on first instance creation only.                |
| `onReInit`  | `(instance: EChartsType) => void` | Fires on every subsequent instance creation (renderer reinit). |
| `onDispose` | `() => void`                      | Fires before every dispose - including mid-session reinits.    |

#### Ref forwarding

```tsx
// Plain callback
let chartRef: EChartsType | null = null;
<SolidEChart
  ref={(el) => {
    chartRef = el;
  }}
/>;

// Signal setter
const [chart, setChart] = createSignal<EChartsType | null>(null);
<SolidEChart ref={setChart} />;
```

Receives `null` during dispose and reinit; receives the live instance when ready.

#### Container passthrough

`style`, `class`, and all standard HTML attributes (`id`, `aria-*`, `data-*`, DOM event handlers)
are forwarded to the container `<div>`. Unrecognised props pass through rather than being silently
discarded.

### `<SolidEChartProvider />`

Provides shared configuration defaults to all descendant `<SolidEChart />` components.

Accepts the shared config props only: `theme`, `renderer`, `locale`, `group`, `devicePixelRatio`,
`useDirtyRect`, `useCoarsePointer`, `pointerSize`, `ssr`, `width`, `height`, `autoResize`,
`resizeDebounce`, `initOnVisible`, and `updateOptions`.

- Per-chart props always win over provider values.
- Providers can be nested; each inner provider shadows only what it explicitly declares - unset props fall through to the nearest outer provider.
- All props accept `MaybeAccessor<T>`.

```tsx
<SolidEChartProvider theme="dark" renderer="canvas" group="dashboard">
  <SolidEChart option={chartA} />
  <SolidEChart option={chartB} theme="default" /> {/* overrides provider theme */}
</SolidEChartProvider>
```

`updateOptions` provides default merge-strategy values for all charts in the subtree.
Per-chart `notMerge`, `replaceMerge`, `lazyUpdate`, `silent`, and `autoMerge` values override the
corresponding field from `updateOptions`.

### `useChart()`

Returns access to the nearest ancestor `<SolidEChart />` instance. Must be called inside the
`<SolidEChart />` component tree (typically via `children` prop).

```ts
const { instance, dispatch, chart } = useChart();
```

| Property   | Type                                                  | Description                                                                                              |
| ---------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `instance` | `Accessor<EChartsType \| null>`                       | Reactive. Use inside `createEffect`/`on()` when tracking changes matters.                                |
| `dispatch` | `(payload: ActionPayload, opt?: DispatchOpt) => void` | Safe `dispatchAction` wrapper. No-ops when instance is null or disposed.                                 |
| `chart`    | `SolidEChartAPI`                                      | Stable proxy object. Calls instance methods directly; returns `undefined` when no instance is available. |

`chart` exposes: `getId`, `getWidth`, `getHeight`, `getDevicePixelRatio`, `getDom`, `getOption`,
`isDisposed`, `isSSR`, `getDataURL`, `getConnectedDataURL`, `renderToSVGString`, `renderToCanvas`,
`convertToPixel`, `convertFromPixel`, `convertToLayout`, `containPixel`, `getVisual`, `appendData`,
`clear`.

Methods managed by the library (`setOption`, `setTheme`, `showLoading`, `resize`, `on`/`off`,
`dispatchAction`, `dispose`) are intentionally excluded from `SolidEChartAPI`.

Called outside a `<SolidEChart />` tree: `instance()` returns `null`, `dispatch` is a no-op,
`chart` methods return `undefined`. `isDisposed()` returns `true` in that state.

### `createChart(container, opts?)`

Low-level primitive. Creates and manages an ECharts instance lifecycle directly.

```tsx
const [container, setContainer] = createSignal<HTMLDivElement | null>(null);
const { instance } = createChart(container, { theme: "dark", renderer: "canvas" });

createChartEffect(instance, option);

<div ref={setContainer} style={{ width: "100%", height: "400px" }} />;
```

**Parameters:**

| Parameter               | Type                                         | Notes                                                                |
| ----------------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| `container`             | `Accessor<HTMLElement \| null \| undefined>` | Instance created when non-null, disposed on null.                    |
| `opts.theme`            | `MaybeAccessor<EChartTheme>`                 | Reactive. Updated via `setTheme()`.                                  |
| `opts.renderer`         | `MaybeAccessor<'canvas' \| 'svg'>`           | Reactive. Triggers reinit on change.                                 |
| `opts.group`            | `MaybeAccessor<string>`                      | Reactive. Updated via `chart.group` + `connect()`.                   |
| `opts.autoResize`       | `MaybeAccessor<boolean>`                     | Reactive. Toggles `ResizeObserver`.                                  |
| `opts.locale`           | `string`                                     | Static.                                                              |
| `opts.devicePixelRatio` | `number`                                     | Static.                                                              |
| `opts.useDirtyRect`     | `boolean`                                    | Static.                                                              |
| `opts.useCoarsePointer` | `boolean`                                    | Static.                                                              |
| `opts.pointerSize`      | `number`                                     | Static.                                                              |
| `opts.ssr`              | `boolean`                                    | Static.                                                              |
| `opts.width`            | `number \| string`                           | Static.                                                              |
| `opts.height`           | `number \| string`                           | Static.                                                              |
| `opts.resizeDebounce`   | `number`                                     | Static. Default `100`.                                               |
| `opts.initOnVisible`    | `boolean`                                    | Static. Default `false`. Defers init until the container is visible. |
| `opts.onResize`         | `() => void`                                 | Static. Called after `chart.resize()`.                               |

**Returns:** `{ instance: Accessor<EChartsType | null> }`

SSR-safe: returns `{ instance: () => null }` on the server.

Must be called inside a reactive root (`createRoot`, component body). Cleanup is automatic.

### `createChartEffect(instance, option, opts?)`

Bridges a reactive option accessor to `chart.setOption`. Fires immediately on mount (`defer: false`)
and re-fires when `instance` or `option` changes.

```ts
createChartEffect(instance, option, { notMerge: false });
createChartEffect(instance, option, { autoMerge: true });
```

**Parameters:**

| Parameter  | Type                                       | Notes                                                                                                    |
| ---------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `instance` | `Accessor<EChartsType \| null>`            | From `createChart` or `useChart`.                                                                        |
| `option`   | `Accessor<SolidEChartOption \| undefined>` | No-ops when `undefined`.                                                                                 |
| `opts`     | `CreateChartEffectOptions`                 | All fields accept `MaybeAccessor<T>`. Read with `untrack` - changes alone do not re-trigger `setOption`. |

`opts.autoMerge: true` enables automatic merge strategy inference. On each option change the library
diffs the previous and new option structure and selects the minimal strategy. Explicit `notMerge`
and `replaceMerge` values are ignored in that mode; `lazyUpdate` and `silent` still apply.

SSR-safe: no-ops on the server.

### `createAction(instance, action, opt?)`

Reactively dispatches an ECharts action whenever `instance` or `action` changes. Uses `defer: true`,
the first synchronous evaluation is skipped; the first dispatch happens on the first actual signal
change.

```ts
const [hoveredIndex, setHoveredIndex] = createSignal<number | null>(null);

createAction(instance, () =>
  hoveredIndex() !== null
    ? seActions.highlight({ seriesIndex: 0, dataIndex: hoveredIndex()! })
    : seActions.downplay({}),
);
```

**Parameters:**

| Parameter  | Type                            |
| ---------- | ------------------------------- |
| `instance` | `Accessor<EChartsType \| null>` |
| `action`   | `Accessor<ActionPayload>`       |
| `opt`      | `DispatchOpt` (optional)        |

No-ops when instance is null or disposed. SSR-safe.

### `seActions`

Typed factory functions for ECharts `dispatchAction` payloads. The factory injects `type` automatically.

The declared fields of each payload are type-checked. A payload argument is mandatory only for the
actions ECharts cannot run without a field: `legendSelect`, `legendUnSelect` and
`legendToggleSelect` (`name`), `timelineChange` (`currentIndex`) and `timelinePlayChange`
(`playState`). Every other factory can be called with no arguments. Fields a payload type does not
declare are passed through unchecked, as `dispatchAction` accepts any extra field.

```ts
seActions.highlight({ seriesIndex: 0, dataIndex: 2 })
seActions.downplay({})
seActions.select({ seriesIndex: 0, dataIndex: [0, 1, 2] })
seActions.unselect({})
seActions.toggleSelect({ seriesIndex: 0, dataIndex: 5 })
seActions.showTip({ seriesIndex: 0, dataIndex: 3 })
seActions.hideTip()
seActions.legendToggleSelect({ name: 'Revenue' })
seActions.legendSelect({ name: 'Revenue' })
seActions.legendUnSelect({ name: 'Expenses' })
seActions.legendAllSelect()
seActions.legendInverseSelect()
seActions.dataZoom({ start: 20, end: 80 })
seActions.restore()
seActions.brush({ areas: [{ brushType: 'rect', range: [[10, 50], [20, 60]] }] })
seActions.timelineChange({ currentIndex: 2 })
seActions.timelinePlayChange({ playState: true })
seActions.geoRoam({ geoIndex: 0, dx: 40, dy: 0 })
seActions.graphRoam({ seriesIndex: 0, dx: 40, dy: 0 })
seActions.treeRoam({ seriesIndex: 0, zoom: 2, originX: 200, originY: 150 })
seActions.sankeyRoam({ seriesIndex: 0, dx: 40, dy: 0 })
seActions.focusNodeAdjacency({ seriesIndex: 0, dataIndex: 3 })
seActions.unfocusNodeAdjacency({})
```

Factories are pure - no side effects. Use with `dispatch` from `useChart()` or with `createAction`.

---

### `seSetup(extensions)`

Thin wrapper around `echarts.use()`. See [Setup](../README.md#setup).

---

### `optionMergePlan(prevSignature, option)`

Pure function. Diffs a previous option signature against a new option and returns the minimal
`setOption` merge strategy.

```ts
let lastSignature: OptionSignature | null = null;

const plan = optionMergePlan(lastSignature, currentOption);
lastSignature = plan.signature;

chart.setOption(plan.option, {
  notMerge: plan.notMerge,
  replaceMerge: plan.replaceMerge.length > 0 ? plan.replaceMerge : undefined,
});
```

**Returns:** `MergePlan` - `{ option, signature, notMerge, replaceMerge }`

Pass `null` as `prevSignature` on first render. Pass `plan.signature` from the previous call on
subsequent renders.

---

### `buildSignature(option)`

Pure function. Builds a structural signature from an ECharts option object for use with `optionMergePlan`.

```ts
const sig = buildSignature({ series: [{ id: "a" }], grid: {}, backgroundColor: "red" });
```

**Returns:** `OptionSignature` - `{ optionsLength, mediaLength, arrays, objects, scalars }`

| [< Core Concepts](./1_CORE_CONCEPTS.md) | [Configuration >](./3_CONFIGURATION.md) |
| --------------------------------------- | --------------------------------------- |
