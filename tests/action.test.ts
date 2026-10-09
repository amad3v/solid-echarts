import type { Payload } from "echarts/core";
import { describe, expect, expectTypeOf, it } from "vitest";

import { seActions } from "../src/actions";
import type {
  ComponentIdQuery,
  ComponentIndexQuery,
  DragNodePayload,
  GeoRoamPayload,
  PayloadInput,
  RoamDelta,
  SeriesRoamPayload,
  TimelineChangePayload,
  TreeExpandAndCollapsePayload,
} from "../src/types/actions";
import type { ActionCreatorTest } from "./utils/actions";
import { testCases } from "./utils/actions";

// The runtime cases are data-driven over every action kind, so the creators
// are called through one loose signature instead of their own typed ones.
type LooseCreator = (payload?: Record<string, unknown> | null) => Payload;
const creatorOf = (name: ActionCreatorTest["name"]): LooseCreator =>
  seActions[name] as LooseCreator;

describe("seActions", () => {
  testCases.forEach(({ name, payload, typeString }) => {
    describe(`${name} action creator`, () => {
      it(`should create an action with type "${typeString}"`, () => {
        const action = creatorOf(name)(payload);
        expect(action.type).toStrictEqual(typeString);
      });

      it("should include the provided payload", () => {
        const action = creatorOf(name)(payload);
        Object.keys(payload).forEach((key) => {
          expect(action[key]).toStrictEqual(payload[key]);
        });
      });

      it("should default payload to empty object if none provided", () => {
        const action = creatorOf(name)();
        expect(action.type).toStrictEqual(typeString);
      });

      it("should accept undefined or null payload without crashing", () => {
        const action1 = creatorOf(name)(undefined);
        const action2 = creatorOf(name)(null);
        expect(action1.type).toStrictEqual(typeString);
        expect(action2.type).toStrictEqual(typeString);
      });
    });
  });

  describe("payload requirements", () => {
    it("should keep the declared payload fields in the creator input", () => {
      expectTypeOf<PayloadInput<TimelineChangePayload>>().toHaveProperty("currentIndex");
      expectTypeOf<PayloadInput<TimelineChangePayload>["currentIndex"]>().toEqualTypeOf<number>();
    });

    it("should require a payload for actions with required fields", () => {
      expectTypeOf(seActions.legendSelect).toBeCallableWith({ name: "Revenue" });
      expectTypeOf(seActions.timelineChange).toBeCallableWith({ currentIndex: 2 });
      expectTypeOf(seActions.timelinePlayChange).toBeCallableWith({ playState: true });

      // @ts-expect-error `name` is required
      seActions.legendSelect();
      // @ts-expect-error `name` is required
      seActions.legendToggleSelect({});
      // @ts-expect-error `name` is required
      seActions.legendUnSelect({});
      // @ts-expect-error `currentIndex` is required
      seActions.timelineChange();
      // @ts-expect-error `playState` is required
      seActions.timelinePlayChange({});
    });

    it("should reject wrongly typed fields", () => {
      type InputOf<K extends keyof typeof seActions> = Parameters<(typeof seActions)[K]>[0];

      expectTypeOf({ name: 1 }).not.toExtend<InputOf<"legendSelect">>();
      expectTypeOf({ dataIndex: "x" }).not.toExtend<InputOf<"highlight">>();
      // `brushType` is required on every area
      expectTypeOf({ areas: [{ range: [0, 10] }] }).not.toExtend<InputOf<"brush">>();
    });

    it("should allow omitting the payload for actions without required fields", () => {
      expectTypeOf(seActions.hideTip).toBeCallableWith();
      expectTypeOf(seActions.restore).toBeCallableWith();
      expectTypeOf(seActions.legendAllSelect).toBeCallableWith();
      expectTypeOf(seActions.legendInverseSelect).toBeCallableWith();
      expectTypeOf(seActions.highlight).toBeCallableWith();
      expectTypeOf(seActions.brush).toBeCallableWith();
      expectTypeOf(seActions.graphRoam).toBeCallableWith();
    });

    it("should accept the field values ECharts accepts", () => {
      expectTypeOf(seActions.highlight).toBeCallableWith({ seriesIndex: "all", seriesId: 3 });
      expectTypeOf(seActions.showTip).toBeCallableWith({ x: 10, y: 20, position: ["50%", 10] });
      expectTypeOf(seActions.dataZoom).toBeCallableWith({ dataZoomId: "z", startValue: "Mon" });
      expectTypeOf(seActions.brush).toBeCallableWith({
        areas: [{ brushType: "lineX", range: [10, 50], xAxisIndex: 0 }],
      });
      // Fields the payload types do not declare still pass through.
      expectTypeOf(seActions.restore).toBeCallableWith({ escapeConnect: true, custom: 1 });
    });
  });

  describe("roam action creators", () => {
    it("should type series roam payloads with roam and series fields", () => {
      expectTypeOf(seActions.graphRoam).returns.toEqualTypeOf<SeriesRoamPayload<"graphRoam">>();
      expectTypeOf(seActions.treeRoam).returns.toEqualTypeOf<SeriesRoamPayload<"treeRoam">>();
      expectTypeOf(seActions.sankeyRoam).returns.toEqualTypeOf<SeriesRoamPayload<"sankeyRoam">>();
      expectTypeOf<SeriesRoamPayload<"graphRoam">>().toExtend<RoamDelta>();
      expectTypeOf<SeriesRoamPayload<"graphRoam">["seriesId"]>().toEqualTypeOf<
        ComponentIdQuery | undefined
      >();
    });

    it("should type geoRoam with geo and series targets", () => {
      expectTypeOf<GeoRoamPayload>().toExtend<RoamDelta>();
      expectTypeOf<GeoRoamPayload["geoIndex"]>().toEqualTypeOf<ComponentIndexQuery | undefined>();
      expectTypeOf<GeoRoamPayload["seriesName"]>().toEqualTypeOf<ComponentIdQuery | undefined>();
    });
  });

  describe("tree and sankey node action creators", () => {
    it("should type treeExpandAndCollapse with a required dataIndex", () => {
      expectTypeOf(
        seActions.treeExpandAndCollapse,
      ).returns.toEqualTypeOf<TreeExpandAndCollapsePayload>();
      expectTypeOf(seActions.treeExpandAndCollapse).toBeCallableWith({
        seriesIndex: 0,
        dataIndex: 1,
      });
      expectTypeOf<TreeExpandAndCollapsePayload["dataIndex"]>().toEqualTypeOf<number>();
      // @ts-expect-error - dataIndex is required
      seActions.treeExpandAndCollapse({ seriesIndex: 0 });
    });

    it("should type dragNode with required dataIndex, localX and localY", () => {
      expectTypeOf(seActions.dragNode).returns.toEqualTypeOf<DragNodePayload>();
      expectTypeOf(seActions.dragNode).toBeCallableWith({
        seriesId: "flow",
        dataIndex: 1,
        localX: 0.5,
        localY: 0.25,
      });
      expectTypeOf<DragNodePayload["seriesName"]>().toEqualTypeOf<ComponentIdQuery | undefined>();
      // @ts-expect-error - localX and localY are required
      seActions.dragNode({ seriesIndex: 0, dataIndex: 1 });
    });
  });
});
