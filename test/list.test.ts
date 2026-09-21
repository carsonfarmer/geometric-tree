import { describe, expect, test } from "bun:test";
import { GList } from "../src/list";
import { prng } from "./util";

describe("GList", () => {
  test("behaves like Array under random edits", () => {
    const rand = prng(7);
    let list = GList.empty<number>({ k: 4 });
    const ref: number[] = [];
    for (let i = 0; i < 3000; i++) {
      const r = rand();
      const pos = Math.floor(rand() * (ref.length + 1));
      if (r < 0.2) {
        list = list.push(i);
        ref.push(i);
      } else if (r < 0.4) {
        list = list.unshift(i);
        ref.unshift(i);
      } else if (r < 0.7) {
        list = list.insert(pos, i);
        ref.splice(pos, 0, i);
      } else if (ref.length > 0) {
        const j = Math.min(pos, ref.length - 1);
        list = list.remove(j);
        ref.splice(j, 1);
      }
      expect(list.size).toBe(ref.length);
      expect(list.at(pos)).toBe(ref[pos]);
      expect(list.at(-1)).toBe(ref[ref.length - 1]);
    }
    expect([...list]).toEqual(ref);
  });

  test("slice, concat and splitAt agree with Array", () => {
    const xs = Array.from({ length: 100 }, (_, i) => i);
    const list = GList.from(xs);
    for (const [a, b] of [[0, 100], [10, 20], [-5, undefined], [50, 10], [-200, 3], [7, -7]]) {
      expect([...list.slice(a, b)]).toEqual(xs.slice(a, b));
    }
    expect([...list.slice(20).concat(list.slice(0, 20))]).toEqual([
      ...xs.slice(20),
      ...xs.slice(0, 20),
    ]);
    for (const i of [0, 1, 42, 100, 200]) {
      const [l, r] = list.splitAt(i);
      expect([...l]).toEqual(xs.slice(0, i));
      expect([...r]).toEqual(xs.slice(i));
    }
  });

  test("is persistent", () => {
    const a = GList.from([1, 2, 3]);
    const b = a.remove(0).push(4);
    expect([...a]).toEqual([1, 2, 3]);
    expect([...b]).toEqual([2, 3, 4]);
    expect(a.at(5)).toBeUndefined();
  });
});
