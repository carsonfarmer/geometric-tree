// Smoke test of the built package under Node: run `bun run build` first.
import assert from "node:assert/strict";
import { GList, GMap, GSet, gk } from "../dist/index.js";

const m = GMap.from([["b", 2], ["a", 1]]).set("c", 3).delete("a");
assert.deepEqual([...m], [["b", 2], ["c", 3]]);
assert.deepEqual([...GSet.from([3, 1, 2], gk()).add(0)], [0, 1, 2, 3]);
assert.deepEqual([...GList.from([1, 2, 3]).insert(1, 9)], [1, 9, 2, 3]);
console.log("ok");
