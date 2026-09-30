import { describe, expect, expectTypeOf, it } from "vitest";

import { seActions } from "../src/actions";
import type { GeoRoamPayload, RoamDelta, SeriesRoamPayload } from "../src/types/actions";
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

  describe("roam action creators", () => {
    it("should type series roam payloads with roam and series fields", () => {
      expectTypeOf(seActions.graphRoam).returns.toEqualTypeOf<SeriesRoamPayload<"graphRoam">>();
      expectTypeOf(seActions.treeRoam).returns.toEqualTypeOf<SeriesRoamPayload<"treeRoam">>();
      expectTypeOf(seActions.sankeyRoam).returns.toEqualTypeOf<SeriesRoamPayload<"sankeyRoam">>();
      expectTypeOf<SeriesRoamPayload<"graphRoam">>().toExtend<RoamDelta>();
      expectTypeOf<SeriesRoamPayload<"graphRoam">["seriesId"]>().toEqualTypeOf<
        string | string[] | undefined
      >();
    });

    it("should type geoRoam with geo and series targets", () => {
      expectTypeOf<GeoRoamPayload>().toExtend<RoamDelta>();
      expectTypeOf<GeoRoamPayload["geoIndex"]>().toEqualTypeOf<number | number[] | undefined>();
      expectTypeOf<GeoRoamPayload["seriesName"]>().toEqualTypeOf<string | string[] | undefined>();
    });
  });
});
