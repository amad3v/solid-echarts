export class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  static reset(): void {
    MockResizeObserver.instances = [];
  }

  callback: ResizeObserverCallback;
  observe(_target: Element): void {}
  unobserve(_target: Element): void {}
  disconnect(): void {}

  emit(entry: Partial<ResizeObserverEntry> = {}): void {
    this.callback([entry as ResizeObserverEntry], this as unknown as ResizeObserver);
  }

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }
}

globalThis.ResizeObserver = MockResizeObserver;

export class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  static reset(): void {
    MockIntersectionObserver.instances = [];
  }

  callback: IntersectionObserverCallback;
  observe(_target: Element): void {}
  unobserve(_target: Element): void {}
  disconnect(): void {}

  emit(isIntersecting: boolean): void {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }
}

globalThis.IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver;
