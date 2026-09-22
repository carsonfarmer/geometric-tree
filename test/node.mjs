// Smoke test of the built package under Node: run `bun run build` first.
import assert from "node:assert/strict";
import { GList, GMap, GSet, gk } from "../dist/index.js";

const m = GMap.from([["b", 2], ["a", 1]]).set("c", 3).delete("a");
assert.deepEqual([...m], [["b", 2], ["c", 3]]);
assert.deepEqual([...GSet.from([3, 1, 2], gk()).add(0)], [0, 1, 2, 3]);
assert.deepEqual([...GList.from([1, 2, 3]).insert(1, 9)], [1, 9, 2, 3]);
// The same set must have the same shape as under Bun (see test/thesis.test.ts).
const fingerprint = (t) =>
  t === undefined
    ? "."
    : `${t.rank}(${[...t.items].map((e) => `${fingerprint(e.left)}${e.key}`).join(",")})${fingerprint(t.right)}`;
const hashString = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h >>> 0;
};
const fixed = GSet.from(Array.from({ length: 1000 }, (_, i) => i * 7919), { k: 4 });
assert.equal(hashString(fingerprint(fixed.root)), 1620864361);
console.log("ok");
