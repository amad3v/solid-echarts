import { vi } from "vitest";

import { MockResizeObserver } from "../setup";

export const spyOnResizeObserver = (key: keyof MockResizeObserver = "observe") =>
  vi.spyOn(MockResizeObserver.prototype, key);
