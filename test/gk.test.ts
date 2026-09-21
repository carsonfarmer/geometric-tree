import { describe, expect, test } from "bun:test";
import { gk, GkItems, TreeItems } from "../src/gk";
import { GMap } from "../src/map";
import { hashed } from "../src/rank";
import { GSet } from "../src/set";
import type { Tree } from "../src/tree";
import { check, prng, shuffle } from "./util";

const compare = (a: number, b: number) => a - b;

function depth(t: Tree<unknown, unknown>): number {
  if (t === undefined) return 0;
  let d = depth(t.right);
  for (const e of t.items) d = Math.max(d, depth(e.left));
  return d + 1;
}

describe("Gk-tree", () => {
  test("behaves like Map and keeps the invariants", () => {
    const rand = prng(8);
    let map = GMap.empty<number, number>(gk({ k: 4, threshold: 4 }));
    const ref = new Map<number, number>();
    for (let i = 0; i < 5000; i++) {
      const key = Math.floor(rand() * 500);
      if (rand() < 0.3) {
        map = map.delete(key);
        ref.delete(key);
      } else {
        map = map.set(key, i);
        ref.set(key, i);
      }
      expect(map.get(key)).toBe(ref.get(key));
    }
    expect([...map]).toEqual([...ref].sort(([a], [b]) => a - b));
    check(map.root, compare, hashed(4));
  });

  test("is history independent, conversions included", () => {
    const options = gk<number>({ k: 4, threshold: 4 });
    const keys = Array.from({ length: 500 }, (_, i) => i);
    const expected = GSet.from(keys, options);
    const rand = prng(9);
    for (let i = 0; i < 10; i++) {
      let set = GSet.from(shuffle(keys, rand), options);
      for (const key of shuffle(keys.slice(0, 200), rand)) set = set.delete(key);
      for (const key of shuffle(keys.slice(0, 200), rand)) set = set.add(key);
      expect(set.root).toEqual(expected.root);
    }
  });

  test("keys crafted to share a rank still form a shallow tree", () => {
    // Every key gets rank 1 in the first dimension: a plain G-tree would be
    // one node holding all n keys. The next dimensions use honest ranks.
    const n = 20_000;
    const honest = hashed<number>(8);
    const rank = (key: number, seed = 0) => (seed === 0 ? 1 : honest(key, seed));
    const map = GMap.from(
      Array.from({ length: n }, (_, i) => [i, i] as const),
      gk({ k: 8, rank }),
    );
    expect(map.root!.size).toBe(n);
    expect(map.root!.items).toBeInstanceOf(TreeItems);
    const inner = (map.root!.items as TreeItems<number, number>).tree;
    expect(depth(inner)).toBeLessThan(4 * Math.log2(n));
    expect(map.get(n - 1)).toBe(n - 1);
    expect(map.delete(0).size).toBe(n - 1);
  });

  test("threshold 1 gives zip-zip trees: every node is a tree of trees", () => {
    const set = GSet.from(Array.from({ length: 300 }, (_, i) => i), gk({ k: 2, threshold: 1 }));
    let trees = 0;
    const walk = (t: Tree<number, unknown>) => {
      if (t === undefined) return;
      const items = t.items;
      if (items instanceof GkItems) expect(items.array).toHaveLength(1);
      else expect(items).toBeInstanceOf(TreeItems), trees++;
      for (const e of items) walk(e.left);
      walk(t.right);
    };
    walk(set.root);
    expect(trees).toBeGreaterThan(0);
    expect([...set]).toHaveLength(300);
  });
});
