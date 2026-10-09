import type { ActionKind } from "../../src/types/actions";

type PayloadTest = Record<string, unknown>;

export type ActionCreatorTest = {
  name: ActionKind;
  payload: PayloadTest;
  typeString: ActionKind;
};

const cases: [ActionKind, PayloadTest][] = [
  ["highlight", { seriesIndex: 1 }],
  ["downplay", { seriesIndex: 2 }],
  ["select", { dataIndex: 0 }],
  ["unselect", { dataIndex: 1 }],
  ["toggleSelect", { dataIndex: 2 }],
  ["showTip", { x: 10, y: 20 }],
  ["hideTip", {}],
  ["legendToggleSelect", { name: "Legend1" }],
  ["legendSelect", { name: "Legend2" }],
  ["legendUnSelect", { name: "Legend3" }],
  ["legendAllSelect", {}],
  ["legendInverseSelect", {}],
  ["dataZoom", { start: 0, end: 50 }],
  ["restore", {}],
  ["brush", { areas: [] }],
  ["timelineChange", { currentIndex: 1 }],
  ["timelinePlayChange", { playState: true }],
  ["geoRoam", { geoIndex: 0, dx: 40, dy: 10 }],
  ["graphRoam", { seriesIndex: 0, dx: 40, dy: 10 }],
  ["treeRoam", { seriesId: "tree", zoom: 2, originX: 200, originY: 150 }],
  ["sankeyRoam", { seriesName: "flow", dx: -5, dy: 0 }],
  ["focusNodeAdjacency", { seriesIndex: 0, dataIndex: 1 }],
  ["unfocusNodeAdjacency", { seriesIndex: 0, dataIndex: 1 }],
  ["treeExpandAndCollapse", { seriesIndex: 0, dataIndex: 1 }],
  ["dragNode", { seriesId: "flow", dataIndex: 1, localX: 0.5, localY: 0.25 }],
];

export const testCases: ActionCreatorTest[] = cases.map(([name, payload]) => ({
  name,
  payload,
  typeString: name,
}));
