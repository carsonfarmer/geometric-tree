import { describe, expect, test } from "bun:test";
import { GMap } from "../src/map";
import { hashed, random } from "../src/rank";
import { check, prng, shuffle } from "./util";

const compare = (a: number, b: number) => a - b;

describe("GMap", () => {
  test("behaves like Map, in key order", () => {
    const rand = prng(3);
    let map = GMap.empty<number, string>();
    const ref = new Map<number, string>();
    for (let i = 0; i < 5000; i++) {
      const key = Math.floor(rand() * 1000);
      if (rand() < 0.3) {
        map = map.delete(key);
        ref.delete(key);
      } else {
        map = map.set(key, `v${i}`);
        ref.set(key, `v${i}`);
      }
      expect(map.size).toBe(ref.size);
      expect(map.get(key)).toBe(ref.get(key));
      expect(map.has(key)).toBe(ref.has(key));
    }
    const sorted = [...ref].sort(([a], [b]) => a - b);
    expect([...map]).toEqual(sorted);
    expect([...map.keys()]).toEqual(sorted.map(([k]) => k));
    expect([...map.values()]).toEqual(sorted.map(([, v]) => v));
    check(map.root, compare, hashed(8));
  });

  test("is persistent", () => {
    const a = GMap.from([[1, "a"], [2, "b"]]);
    const b = a.set(3, "c").delete(1);
    expect([...a]).toEqual([[1, "a"], [2, "b"]]);
    expect([...b]).toEqual([[2, "b"], [3, "c"]]);
  });

  test("is history independent", () => {
    const pairs = Array.from({ length: 500 }, (_, i) => [i, i * i] as const);
    const rand = prng(4);
    const expected = GMap.from(pairs);
    for (let i = 0; i < 10; i++) {
      let map = GMap.from(shuffle(pairs, rand));
      for (const [k] of shuffle(pairs.slice(0, 100), rand)) map = map.delete(k);
      for (const p of shuffle(pairs.slice(0, 100), rand)) map = map.set(...p);
      expect(map.root).toEqual(expected.root);
    }
  });

  test("deleting a missing key returns the same map", () => {
    const map = GMap.from([[1, 1]]);
    expect(map.delete(2)).toBe(map);
  });

  test("accepts a comparator and a rank function", () => {
    const map = GMap.from([["a", 1], ["b", 2], ["c", 3]], {
      compare: (a: string, b: string) => b.localeCompare(a),
      rank: random(2),
    });
    expect([...map.keys()]).toEqual(["c", "b", "a"]);
  });

  test("object keys work with a custom hash", () => {
    type P = { x: number; y: number };
    const map = GMap.from<P, string>([[{ x: 1, y: 2 }, "a"], [{ x: 0, y: 9 }, "b"]], {
      compare: (a, b) => a.x - b.x || a.y - b.y,
      rank: hashed(2, (p, seed) => Bun.hash.xxHash32(`${p.x},${p.y}`, seed)),
    });
    expect(map.get({ x: 1, y: 2 })).toBe("a");
    expect([...map.values()]).toEqual(["b", "a"]);
  });
});
