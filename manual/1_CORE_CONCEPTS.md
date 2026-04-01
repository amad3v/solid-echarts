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
 You never need to unwrap values before passing them.

### Reactive vs. Static Props

Some props are reactive — they update the chart in place when the signal changes.
 Others are **static** — read once at init time; changes after mount have no effect.

| Category | Props                                                                                                                       | Behaviour                                  |
| -------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Reactive | `theme`, `group`, `autoResize`, `renderer`                                                                                  | Update in place (or reinit for `renderer`) |
| Reactive | `option`, `loading`, `loadingOptions`                                                                                       | Update chart state                         |
| Static   | `locale`, `devicePixelRatio`, `useDirtyRect`, `resizeDebounce`, `width`, `height`, `ssr`, `useCoarsePointer`, `pointerSize` | Read at `echarts.init()` only              |

### Instance Lifecycle

The chart instance is created when the container `<div>` mounts and disposed on cleanup. The only
 prop that triggers a full dispose->reinit cycle is `renderer`. All other prop changes update the
  instance in place.

During a `renderer` reinit, the instance signal briefly emits `null` between the two instances.

| [< README.md](../README.md) | [API Reference >](./2_API_SUMMARY.md) |
| --------------------------- | ------------------------------------- |
