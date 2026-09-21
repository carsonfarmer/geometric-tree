import { describe, expect, test } from "bun:test";
import { hashed } from "../src/rank";
import { GSet } from "../src/set";
import { check, prng, shuffle } from "./util";

describe("GSet", () => {
  test("behaves like Set, in key order", () => {
    const rand = prng(5);
    let set = GSet.empty<number>({ k: 4 });
    const ref = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const key = Math.floor(rand() * 1000);
      if (rand() < 0.3) {
        set = set.delete(key);
        ref.delete(key);
      } else {
        set = set.add(key);
        ref.add(key);
      }
      expect(set.size).toBe(ref.size);
      expect(set.has(key)).toBe(ref.has(key));
    }
    expect([...set]).toEqual([...ref].sort((a, b) => a - b));
    check(set.root, (a, b) => a - b, hashed(4));
  });

  test("is persistent and history independent", () => {
    const a = GSet.from(shuffle([1, 2, 3, 4, 5], prng(6)));
    const b = a.add(6).delete(1);
    expect([...a]).toEqual([1, 2, 3, 4, 5]);
    expect([...b]).toEqual([2, 3, 4, 5, 6]);
    expect(b.root).toEqual(GSet.from([6, 5, 4, 3, 2]).root);
  });

  test("adding a present key or deleting an absent one is a no-op", () => {
    const set = GSet.from(["a"]);
    expect(set.add("a")).toBe(set);
    expect(set.delete("b")).toBe(set);
  });
});
