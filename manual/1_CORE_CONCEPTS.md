---
title: "Core Concepts"
---

## Core Concepts

### MaybeAccessor

Most props accept either a plain value **or** a SolidJS accessor (signal or derived signal):

```ts
type MaybeAccessor<T> = T | Accessor<T>;
```

This applies to all configuration props on `<SolidEChart />` and `<SolidEChartProvider />`.
You never need to unwrap values before passing them. All three forms are accepted, and a reactive
prop stays reactive in each:

```tsx
<SolidEChart theme="dark" />      {/* plain value */}
<SolidEChart theme={theme} />     {/* accessor */}
<SolidEChart theme={theme()} />   {/* signal read in JSX */}
```

`option` is the exception: it must be an accessor.

### Reactive vs. Static Props

Some props are reactive — they update the chart in place when the signal changes.
Others are **init-time** — ECharts only accepts them when it creates an instance. A change does
not touch the live chart; the next instance (after a `renderer` change, or the delayed one from
`initOnVisible`) is created with the current values.

| Category  | Props                                                                                                                       | Behaviour                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Reactive  | `theme`, `group`, `autoResize`, `renderer`                                                                                  | Update in place (or reinit for `renderer`) |
| Reactive  | `option`, `loading`, `loadingOptions`                                                                                       | Update chart state                         |
| Init-time | `locale`, `devicePixelRatio`, `useDirtyRect`, `resizeDebounce`, `width`, `height`, `ssr`, `useCoarsePointer`, `pointerSize` | Read when an instance is created           |
| Static    | `initOnVisible`, `onResize`                                                                                                 | Read once at mount                         |

### Instance Lifecycle

The chart instance is created when the container `<div>` mounts and disposed on cleanup. With
`initOnVisible`, creation waits until the container first enters the viewport (see
[Performance](./3_CONFIGURATION.md#performance)). The only prop that triggers a full
dispose->reinit cycle is `renderer`. All other prop changes update the instance in place.

During a `renderer` reinit, the instance signal briefly emits `null` between the two instances.

| [< README.md](../README.md) | [API Reference >](./2_API_SUMMARY.md) |
| --------------------------- | ------------------------------------- |
