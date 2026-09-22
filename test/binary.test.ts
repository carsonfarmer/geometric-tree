import { describe, expect, test } from "bun:test";
import * as binary from "../src/binary";
import { hashed } from "../src/rank";
import { ArrayItems, insert, single, type Tree } from "../src/tree";
import { fixed, primes, prng, shuffle } from "./util";

type B = binary.Tree<number, undefined>;
const at = (key: number) => (n: { key: number }) => n.key - key;
const one = (key: number, rank = fixed(key)) => binary.single(key, undefined, rank);

function build(keys: Iterable<number>, rank = fixed): B {
  let t: B;
  for (const key of keys) t = binary.insert(t, at(key), one(key, rank(key)));
  return t;
}

/** Keys as nested `[key, left, right]` for readable structure checks. */
type Shape = [number, Shape?, Shape?] | undefined;
const shape = (t: B): Shape => t && [t.key, shape(t.left), shape(t.right)];

/** Check zip-tree invariants and return the keys in order. */
function check(t: B, rank: (key: number) => number, maxLeft = Infinity, maxRight = Infinity): number[] {
  if (t === undefined) return [];
  expect(t.rank).toBe(rank(t.key));
  expect(t.rank).toBeLessThan(maxLeft);
  expect(t.rank).toBeLessThanOrEqual(maxRight);
  const keys = [...check(t.left, rank, t.rank, t.rank), t.key, ...check(t.right, rank, Infinity, t.rank)];
  for (let i = 1; i < keys.length; i++) expect(keys[i - 1]!).toBeLessThan(keys[i]!);
  expect(t.size).toBe(keys.length);
  return keys;
}

/** Unfold a k = 2 G-tree into the binary zip tree it represents. */
function unfold(t: Tree<number, undefined>): B {
  if (t === undefined) return undefined;
  let right = unfold(t.right);
  for (const e of [...t.items].reverse()) {
    right = binary.node({ key: e.key, value: e.value, rank: t.rank, left: unfold(e.left), right });
  }
  return right;
}

describe("binary zip tree", () => {
  test("matches the figure from the paper", () => {
    const t = build(primes);
    expect(check(t, fixed)).toEqual(primes);
    expect(shape(t)).toEqual([7,
      [3, [2], [5]],
      [31,
        [13, [11], [23, [17, undefined, [19]], [29]]],
        [53, [41, [37], [43, undefined, [47]]], [67, [61, [59]], [71]]]]]);
  });

  test("insertion order does not matter", () => {
    const rand = prng(10);
    const expected = build(primes);
    for (let i = 0; i < 50; i++) expect(build(shuffle(primes, rand))).toEqual(expected);
  });

  test("unzip, zip, remove and find", () => {
    const t = build(primes);
    const [l, hit, r] = binary.unzip(t, at(31));
    expect(hit?.key).toBe(31);
    expect([...binary.nodes(l)].map((n) => n.key)).toEqual(primes.filter((p) => p < 31));
    expect(binary.zip(binary.zip(l, one(31)), r)).toEqual(t);
    expect(binary.remove(t, at(31))).toEqual(build(primes.filter((p) => p !== 31)));
    expect(binary.find(t, at(30))?.key).toBe(31);
    expect(binary.find(t, at(72))).toBeUndefined();
  });

  test("is the G-tree with k = 2, runs of equal rank folded into one node", () => {
    const rank = hashed<number>(2);
    for (const keys of [primes, shuffle(Array.from({ length: 2000 }, (_, i) => i), prng(11))]) {
      const r = keys === primes ? fixed : rank;
      let g: Tree<number, undefined>;
      for (const key of keys) {
        g = insert(g, at(key), single(key, undefined, r(key), new ArrayItems()));
      }
      expect(unfold(g)).toEqual(build(keys, r));
    }
  });
});
