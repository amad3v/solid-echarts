import { describe, expect, it } from "vitest";

import { seActions } from "../src/actions";
import { testCases } from "./utils/actions";

describe("seActions", () => {
  testCases.forEach(({ name, payload, typeString }) => {
    describe(`${name} action creator`, () => {
      it(`should create an action with type "${typeString}"`, () => {
        const action = seActions[name](payload);
        expect(action.type).toStrictEqual(typeString);
      });

      it("should include the provided payload", () => {
        const action = seActions[name](payload);
        Object.keys(payload).forEach((key) => {
          expect(action[key as keyof typeof action]).toStrictEqual(payload[key]);
        });
      });

      it("should default payload to empty object if none provided", () => {
        const action = seActions[name]();
        expect(action.type).toStrictEqual(typeString);
      });

      it("should accept undefined or null payload without crashing", () => {
        const action1 = seActions[name](undefined);
        // @ts-expect-error used for test purposes
        const action2 = seActions[name](null);
        expect(action1.type).toStrictEqual(typeString);
        expect(action2.type).toStrictEqual(typeString);
      });
    });
  });
});
