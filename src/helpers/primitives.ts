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
 * @returns A debounced version of `fn` with the same signature.
 *
 * @example
 * ```ts
 * const debouncedResize = debounce(() => chart.resize(), 100);
 * const observer = new ResizeObserver(debouncedResize);
 * observer.observe(container);
 * ```
 */
export const debounce = <T extends (...args: unknown[]) => void>(fn: T, ms: number): T => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return ((...args: unknown[]) => {
    clearTimeout(timer);

    timer = setTimeout(() => {
      fn(...args);
    }, ms);
  }) as T;
};
