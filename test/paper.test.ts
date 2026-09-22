/**
 * Tests of the claims in Farmer & Meyer, "Geometric Search Trees":
 * Definition 3 (structure), section 4.1 (analysis, with the tables of
 * figures 6 to 8), section 4.2 (the family) and section 5 (algorithms).
 */
import { describe, expect, test } from "bun:test";
import { gk, TreeItems } from "../src/gk";
import { hashed } from "../src/rank";
import { GSet } from "../src/set";
import {
  ArrayItems,
  entries,
  insert,
  node,
  remove,
  single,
  size,
  unzip,
  zip,
  type Entry,
  type Items,
  type Tree,
} from "../src/tree";
import { check, fingerprint, height, nodes, prng, shuffle, trial } from "./util";

type T = Tree<number, undefined>;
type Rank = (key: number) => number;
const at = (key: number) => (e: Entry<number, undefined>) => e.key - key;
const one = (key: number, rank: Rank): T => single(key, undefined, rank(key), new ArrayItems());
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function build(keys: Iterable<number>, rank: Rank): T {
  let t: T;
  for (const key of keys) t = insert(t, at(key), one(key, rank));
  return t;
}

/** Definition 3, literally: partition sorted keys at those of maximal rank. */
function construct(keys: number[], rank: Rank): T {
  if (keys.length === 0) return undefined;
  const r = Math.max(...keys.map((key) => rank(key)));
  const tops = keys.flatMap((key, i) => (rank(key) === r ? [i] : []));
  let items: Items<number, undefined> = new ArrayItems();
  for (let j = tops.length - 1; j >= 0; j--) {
    const from = j === 0 ? 0 : tops[j - 1]! + 1;
    const left = construct(keys.slice(from, tops[j]), rank);
    items = items.unshift({ key: keys[tops[j]!]!, value: undefined, left });
  }
  return node(r, items, construct(keys.slice(tops[tops.length - 1]! + 1), rank));
}

describe("definition 3: G-nodes are maximal runs of the highest rank", () => {
  const rank = hashed<number>(4);
  const keys = shuffle(range(3000), prng(20));
  const t = build(keys, rank);
  const sorted = keys.toSorted((a, b) => a - b);
  const index = new Map(sorted.map((key, i) => [key, i]));

  test("no run can be extended: the nearest keys of its rank or above rank above it", () => {
    const nearest = (i: number, step: number, r: number) => {
      for (i += step; i >= 0 && i < sorted.length; i += step) {
        if (rank(sorted[i]!) >= r) return rank(sorted[i]!);
      }
    };
    for (const n of nodes(t)) {
      const items = [...n.items];
      const before = nearest(index.get(items[0]!.key)!, -1, n.rank);
      const after = nearest(index.get(items[items.length - 1]!.key)!, 1, n.rank);
      if (before !== undefined) expect(before).toBeGreaterThan(n.rank);
      if (after !== undefined) expect(after).toBeGreaterThan(n.rank);
    }
  });

  test("the number of nodes at rank r is the number of rank-r runs", () => {
    const counted = new Map<number, number>();
    for (const n of nodes(t)) counted.set(n.rank, (counted.get(n.rank) ?? 0) + 1);
    for (const r of counted.keys()) {
      let runs = 0;
      let open = false;
      for (const key of sorted) {
        if (rank(key) > r) open = false;
        else if (rank(key) === r && !open) [runs, open] = [runs + 1, true];
      }
      expect(counted.get(r)).toBe(runs);
    }
  });

  test("insertion in any order yields the tree the definition constructs", () => {
    const expected = construct(sorted, rank);
    expect(t).toEqual(expected);
    expect(build(shuffle(keys, prng(21)), rank)).toEqual(expected);
    expect(check(t, (a, b) => a - b, rank)).toEqual(sorted);
  });
});

describe("section 4.1: analysis", () => {
  const trials = 3;
  // Figure 6: mean maximal rank and height of 200 random trees, by n and k.
  const figure6 = {
    2: { 100: [8.0, 6.7], 1000: [11.3, 9.9], 10000: [14.7, 13.2] },
    4: { 100: [4.2, 4.0], 1000: [5.9, 5.6], 10000: [7.5, 7.3] },
    16: { 100: [2.4, 2.3], 1000: [3.2, 3.2], 10000: [4.1, 4.1] },
    64: { 100: [1.8, 1.8], 1000: [2.2, 2.2], 10000: [3.0, 3.0] },
  } as const;
  // Figure 7: mean node size at n = 10 000. Figure 8: mean node count.
  const figure7 = { 2: 1.998, 4: 3.994, 16: 15.908, 64: 62.68 } as const;
  const figure8 = { 2: 5002, 4: 2504, 16: 628.2, 64: 159.16 } as const;

  const trees = new Map<string, T[]>();
  const forest = (k: number, n: number) => {
    const key = `${k}/${n}`;
    if (!trees.has(key)) {
      trees.set(key, range(trials).map((i) => build(shuffle(range(n), prng(i)), trial(k, i))));
    }
    return trees.get(key)!;
  };
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

  test("4.1.1 height is at most the root rank, about log_k(n) + O(1)", () => {
    for (const k of [2, 4, 16, 64] as const) {
      for (const n of [100, 1000, 10000] as const) {
        const [rank, h] = figure6[k][n];
        const ts = forest(k, n);
        for (const t of ts) expect(height(t)).toBeLessThanOrEqual(t!.rank);
        // E(M_T) <= ceil(log_k n) + k, with high probability.
        const bound = Math.ceil(Math.log(n) / Math.log(k)) + k;
        expect(mean(ts.map((t) => t!.rank))).toBeLessThanOrEqual(bound + 1);
        // Within a couple of standard deviations of the paper's means.
        const slack = k === 2 ? 3 : 1.5;
        expect(Math.abs(mean(ts.map((t) => t!.rank)) - rank)).toBeLessThanOrEqual(slack);
        expect(Math.abs(mean(ts.map(height)) - h)).toBeLessThanOrEqual(slack);
      }
    }
  });

  test("4.1.2 node sizes are geometric with mean k", () => {
    for (const k of [2, 4, 16, 64] as const) {
      const sizes = forest(k, 10000).flatMap((t) => [...nodes(t)].map((n) => [...n.items].length));
      expect(Math.abs(mean(sizes) - figure7[k])).toBeLessThanOrEqual(0.1 * k);
      // P(|g| >= s) = (1 - 1/k)^(s - 1): the paper's bound with a corrected exponent.
      for (const c of [1, 2, 3]) {
        const s = c * k;
        const observed = sizes.filter((x) => x >= s).length / sizes.length;
        const expected = (1 - 1 / k) ** (s - 1);
        const sd = Math.sqrt((expected * (1 - expected)) / sizes.length);
        expect(Math.abs(observed - expected)).toBeLessThanOrEqual(4 * sd + 1e-3);
      }
    }
  });

  test("4.1.3 the number of nodes is about n/k + 1", () => {
    for (const k of [2, 4, 16, 64] as const) {
      const counts = forest(k, 10000).map((t) => [...nodes(t)].length);
      const expected = 10000 / k + 1;
      for (const c of counts) expect(Math.abs(c - expected)).toBeLessThanOrEqual(4 * Math.sqrt(expected));
      expect(Math.abs(mean(counts) - figure8[k])).toBeLessThanOrEqual(3 * Math.sqrt(expected));
    }
  });

  test("ranks from the default hash are geometric (chi-square over the first ranks)", () => {
    const n = 100_000;
    for (const k of [2, 3, 8]) {
      const rank = hashed<number>(k);
      const buckets = 6;
      const counts = new Array(buckets + 1).fill(0);
      for (let i = 0; i < n; i++) counts[Math.min(rank(i), buckets + 1) - 1]++;
      let chi2 = 0;
      for (let r = 1; r <= buckets + 1; r++) {
        const p = r <= buckets ? (1 - 1 / k) / k ** (r - 1) : 1 / k ** buckets;
        chi2 += (counts[r - 1] - n * p) ** 2 / (n * p);
      }
      expect(chi2).toBeLessThan(22.5); // 99.9th percentile with 6 degrees of freedom
    }
  });
});

describe("section 5: algorithms", () => {
  const rank = hashed<number>(4);
  const keys = shuffle(range(400), prng(22));
  const t = build(keys, rank);
  const rand = prng(23);

  test("unzip and zip are inverse, associative, and have the empty tree as unit", () => {
    for (let i = 0; i < 100; i++) {
      const key = Math.floor(rand() * 400);
      const [l, hit, r] = unzip(t, at(key));
      expect(hit?.key).toBe(key);
      expect(zip(zip(l, one(key, rank)), r)).toEqual(t);
      expect(zip(l, r)).toEqual(build(keys.filter((x) => x !== key), rank));
      expect(remove(t, at(key))).toEqual(zip(l, r));
      // Positions between keys: nothing is dropped, so unzip + zip is the identity.
      const gap = key + 0.5;
      const [gl, none, gr] = unzip(t, at(gap));
      expect(none).toBeUndefined();
      expect(zip(gl, gr)).toEqual(t);
      // Three ordered pieces join the same either way.
      const [a, , bc] = unzip(t, at(gap));
      const [b, , c] = unzip(bc, at(gap + Math.floor(rand() * 100)));
      expect(zip(zip(a, b), c)).toEqual(t);
      expect(zip(a, zip(b, c))).toEqual(t);
    }
    expect(zip(t, undefined)).toBe(t);
    expect(zip(undefined, t)).toBe(t);
    expect(insert(t, at(7), one(7, rank))).toEqual(t);
  });

  test("appending sorted keys with zip builds the same tree as inserting", () => {
    let appended: T;
    for (const key of keys.toSorted((a, b) => a - b)) appended = zip(appended, one(key, rank));
    expect(appended).toEqual(t);
  });

  test("an update shares all but a path's worth of nodes with the old tree", () => {
    const n = 5000;
    const rank = hashed<number>(8);
    const old = build(shuffle(range(n), prng(24)), rank);
    const before = fingerprint(old);
    const shared = new Set(nodes(old));
    for (const key of [n + 1, -1, 2500.5]) {
      const updated = insert(old, at(key), one(key, rank));
      const fresh = [...nodes(updated)].filter((x) => !shared.has(x)).length;
      expect(fresh).toBeLessThanOrEqual(2 * height(updated) + 2);
      expect(fresh).toBeLessThan(shared.size / 20);
      expect(size(updated)).toBe(n + 1);
    }
    expect(fingerprint(old)).toBe(before);
  });

  test("work per operation grows like log n, not n", () => {
    const rank = hashed<number>(8);
    const cost = (n: number) => {
      const t = build(shuffle(range(n), prng(n)), rank);
      let compares = 0;
      const counting = (key: number) => (e: Entry<number, undefined>) => (compares++, e.key - key);
      for (let i = 0; i < 200; i++) insert(t, counting(i + 0.5), one(i + 0.5, rank));
      return compares / 200;
    };
    const [small, large] = [cost(1000), cost(100_000)];
    expect(large / small).toBeLessThan(4); // log growth; linear would be 100
  });
});

describe("section 4.2: the family", () => {
  test("zip-zip trees: inner sets are zip trees ranked by the second seed", () => {
    const options = gk<number>({ k: 2, threshold: 1 });
    const keys = range(2000);
    const set = GSet.from(shuffle(keys, prng(25)), options);
    expect(set.root).toEqual(GSet.from(shuffle(keys, prng(26)), options).root);
    const inner = hashed<number>(2);
    let innerDepth = 0;
    let treeNodes = 0;
    for (const n of nodes(set.root)) {
      if (!(n.items instanceof TreeItems)) continue;
      treeNodes++;
      innerDepth = Math.max(innerDepth, height(n.items.tree));
      for (const m of nodes(n.items.tree)) {
        for (const e of m.items) expect(inner(e.key, 1)).toBe(m.rank);
      }
    }
    expect(treeNodes).toBeGreaterThan(0);
    expect(innerDepth).toBeLessThanOrEqual(8); // runs have mean length 2
    expect([...set]).toEqual(keys);
  });

  test("treaps: ranks capped at two, nested until they tell keys apart", () => {
    const geometric = hashed<number>(2);
    const rank = (key: number, seed = 0) => Math.min(2, geometric(key, seed));
    const keys = range(300);
    const set = GSet.from(shuffle(keys, prng(27)), gk({ k: 2, threshold: 1, rank }));
    expect([...set]).toEqual(keys);
    let depth = 0;
    const dims = (items: Items<number, unknown>, d: number): void => {
      if (!(items instanceof TreeItems)) return;
      depth = Math.max(depth, d);
      for (const n of nodes(items.tree)) dims(n.items, d + 1);
    };
    for (const n of nodes(set.root)) dims(n.items, 1);
    expect(depth).toBeGreaterThanOrEqual(3);
    for (const e of entries(set.root)) expect(rank(e.key)).toBeLessThanOrEqual(2);
  });
});
