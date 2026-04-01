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
