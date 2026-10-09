import type { Debounced } from "@type/primitives";

/**
 * Creates a debounced version of `fn` that delays execution until `ms`
 * milliseconds have elapsed since the last call.
 *
 * @remarks
 *
 * Each call resets the timer. The wrapped function only executes after
 * the calls stop for at least `ms` milliseconds.
 *
 * Used internally by {@link createChart} to debounce `ResizeObserver`
 * callbacks - prevents excessive `chart.resize()` calls during continuous
 * container size changes.
 *
 * @param fn - The function to debounce.
 * @param ms - Delay in milliseconds. Set to `0` in {@link CreateChartOptions}
 * to disable debouncing and call `chart.resize()` on every observation.
 * @returns A debounced version of `fn` with the same parameters, plus
 * `cancel()` to drop a pending call (for example in `onCleanup`).
 *
 * @example
 * ```ts
 * const debouncedResize = debounce(() => chart.resize(), 100);
 * const observer = new ResizeObserver(debouncedResize);
 * observer.observe(container);
 * onCleanup(() => {
 *   observer.disconnect();
 *   debouncedResize.cancel();
 * });
 * ```
 */
export const debounce = <A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): Debounced<A> => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: A): void => {
    clearTimeout(timer);

    timer = setTimeout(() => {
      fn(...args);
    }, ms);
  };

  return Object.assign(debounced, {
    cancel: (): void => {
      clearTimeout(timer);
    },
  });
};
