/**
 * Tests of Hehemann (2025), section 4.1: Gk-trees keep operations
 * polylogarithmic against an adversary, stay history independent across
 * conversions, and, with the exact rank function, are the same on every runtime.
 */
import { describe, expect, test } from "bun:test";
import { gk, GkItems, TreeItems } from "../src/gk";
import { GMap } from "../src/map";
import { hashed } from "../src/rank";
import { GSet } from "../src/set";
import type { Items, Node, Tree } from "../src/tree";
import { fingerprint, height, nodes, prng, shuffle } from "./util";

/** Every node at every dimension, with its dimension. */
function* everywhere<K>(t: Tree<K, unknown>, dim = 0): Generator<[Node<K, unknown>, number]> {
  for (const n of nodes(t)) {
    yield [n, dim];
    if (n.items instanceof TreeItems) yield* everywhere(n.items.tree, dim + 1);
  }
}

describe("Gk-trees", () => {
  const honest = hashed<number>(8);
  /** Every key has rank 1 in the first dimension: a plain G-tree is one node. */
  const adversarial = (key: number, seed = 0) => (seed === 0 ? 1 : honest(key, seed));

  test("operations stay polylogarithmic when every key shares a rank", () => {
    const threshold = 32;
    const cost = (n: number) => {
      let compares = 0;
      const compare = (a: number, b: number) => (compares++, a - b);
      const options = { ...gk({ k: 8, rank: adversarial, threshold }), compare };
      const map = GMap.from(Array.from({ length: n }, (_, i) => [i, i] as const), options);
      compares = 0;
      for (let i = 0; i < 200; i++) map.get(Math.floor((i * n) / 200));
      const get = compares / 200;
      compares = 0;
      for (let i = 0; i < 100; i++) map.set(n + i, i);
      const set = compares / 100;
      let dims = 0;
      for (const [node, dim] of everywhere(map.root)) {
        dims = Math.max(dims, dim);
        if (node.items instanceof GkItems) expect(node.items.array.length).toBeLessThanOrEqual(threshold);
      }
      return { get, set, dims, height: height((map.root!.items as TreeItems<number, number>).tree) };
    };
    const [small, large] = [cost(1000), cost(16_000)];
    expect(large.get / small.get).toBeLessThan(4); // a plain G-tree would give 16
    expect(large.set / small.set).toBeLessThan(4);
    expect(large.dims).toBeLessThanOrEqual(3); // a third dimension is rare but legitimate
    expect(large.height).toBeLessThan(4 * Math.log2(16_000));
  });

  test("representation stays a function of the set across many conversions", () => {
    const options = gk<number>({ k: 4, threshold: 4 });
    const rand = prng(30);
    let set = GSet.empty<number>(options);
    const present = new Set<number>();
    for (let i = 1; i <= 3000; i++) {
      const key = Math.floor(rand() * 60);
      if (present.has(key) && rand() < 0.5) {
        set = set.delete(key);
        present.delete(key);
      } else {
        set = set.add(key);
        present.add(key);
      }
      if (i % 100 === 0) {
        expect(set.root).toEqual(GSet.from(shuffle(present, rand), options).root);
      }
    }
  });

  test("a fixed set has a fixed fingerprint (checked again under Node in test/node.mjs)", () => {
    const set = GSet.from(Array.from({ length: 1000 }, (_, i) => i * 7919), { k: 4 });
    expect(fingerprint(set.root)).toMatch(/^\d+\(/);
    expect(GOLDEN).toBe(hashString(fingerprint(set.root)));
  });
});

/** Same as in test/node.mjs. */
function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h >>> 0;
}
const GOLDEN = 1620864361;
