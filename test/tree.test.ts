import { describe, expect, test } from "bun:test";
import { hashed } from "../src/rank";
import {
  ArrayItems,
  entries,
  find,
  insert,
  remove,
  single,
  size,
  unzip,
  zip,
  type Entry,
  type Tree,
} from "../src/tree";
import { check, fixed, primes, prng, shuffle } from "./util";

const compare = (a: number, b: number) => a - b;
const at = (key: number) => (e: Entry<number, undefined>) => e.key - key;
const items = () => new ArrayItems<number, undefined>();
const one = (key: number, rank = fixed(key)) =>
  single(key, undefined, rank, items());

function build(keys: Iterable<number>, rank = fixed) {
  let t: Tree<number, undefined>;
  for (const key of keys) t = insert(t, at(key), one(key, rank(key)));
  return t;
}

describe("tree", () => {
  test("insertion order does not matter", () => {
    const rand = prng(1);
    const expected = build(primes);
    expect(check(expected, compare, fixed)).toEqual(primes);
    for (let i = 0; i < 50; i++) {
      expect(build(shuffle(primes, rand))).toEqual(expected);
    }
  });

  test("the root node holds the keys of maximal rank", () => {
    const root = build(primes)!;
    expect(root.rank).toBe(3);
    expect([...root.items].map((e) => e.key)).toEqual([7, 31, 53, 67]);
    expect(size(root.right)).toBe(1);
  });

  test("unzip then zip is the identity", () => {
    const t = build(primes);
    for (const key of [0, 1, 2, 30, 31, 53, 71, 100]) {
      const [l, hit, r] = unzip(t, at(key));
      expect(check(l, compare, fixed)).toEqual(primes.filter((p) => p < key));
      expect(check(r, compare, fixed)).toEqual(primes.filter((p) => p > key));
      expect(hit?.key).toBe(primes.includes(key) ? key : (undefined as never));
      const back = hit ? zip(zip(l, one(key)), r) : zip(l, r);
      expect(back).toEqual(build(primes.filter((p) => hit || p !== key)));
    }
  });

  test("zip of two ordered trees is the tree of their union", () => {
    for (let i = 0; i <= primes.length; i++) {
      const l = build(primes.slice(0, i));
      const r = build(primes.slice(i));
      expect(zip(l, r)).toEqual(build(primes));
    }
  });

  test("remove", () => {
    let t = build(primes);
    let rest = primes;
    for (const key of shuffle(primes, prng(2))) {
      t = remove(t, at(key));
      rest = rest.filter((p) => p !== key);
      expect(t).toEqual(build(rest));
    }
    expect(t).toBeUndefined();
  });

  test("find returns the entry at or after a position", () => {
    const t = build(primes);
    expect(find(t, at(31))?.key).toBe(31);
    expect(find(t, at(30))?.key).toBe(31);
    expect(find(t, at(0))?.key).toBe(2);
    expect(find(t, at(72))).toBeUndefined();
  });

  test("insert replaces the entry at the same position", () => {
    let t: Tree<number, string>;
    const box = (k: number, v: string) => single(k, v, 1, new ArrayItems());
    t = insert(t, (e) => e.key - 1, box(1, "a"));
    t = insert(t, (e) => e.key - 1, box(1, "b"));
    expect([...entries(t)].map((e) => [e.key, e.value])).toEqual([[1, "b"]]);
  });

  test("hashed ranks keep the invariants for many keys and any k", () => {
    for (const k of [2, 3, 8, 32]) {
      const rank = hashed<number>(k);
      const keys = shuffle(Array.from({ length: 2000 }, (_, i) => i), prng(k));
      const t = build(keys, rank);
      expect(check(t, compare, rank)).toEqual(keys.toSorted(compare));
    }
  });
});
