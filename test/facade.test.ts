import { describe, expect, test } from "bun:test";
import { GList } from "../src/list";
import { GMap } from "../src/map";
import { GSet } from "../src/set";

describe("GList contract", () => {
  const xs = Array.from({ length: 10 }, (_, i) => i * 10);
  const list = GList.from(xs, { k: 2 });

  test("slice agrees with Array.slice for every bound combination", () => {
    const bounds = [undefined, -20, -10, -3, -1, 0, 1, 5, 9, 10, 20];
    for (const a of bounds) {
      for (const b of bounds) {
        expect([...list.slice(a, b)]).toEqual(xs.slice(a, b));
      }
    }
  });

  test("at agrees with Array.at, including out of range", () => {
    for (let i = -12; i <= 12; i++) expect(list.at(i)).toBe(xs.at(i));
  });

  test("sizes track every operation", () => {
    let l = list;
    expect(l.size).toBe(10);
    l = l.push(1);
    expect(l.size).toBe(11);
    l = l.unshift(2);
    expect(l.size).toBe(12);
    l = l.insert(6, 3);
    expect(l.size).toBe(13);
    l = l.remove(0);
    expect(l.size).toBe(12);
    l = l.remove(100);
    expect(l.size).toBe(12);
    const [a, b] = l.splitAt(5);
    expect([a.size, b.size]).toEqual([5, 7]);
    expect(a.concat(b).size).toBe(12);
    expect([...a.concat(b)]).toEqual([...l]);
    expect(GList.empty().size).toBe(0);
    expect([...GList.empty<number>().slice(-1)]).toEqual([]);
  });
});

describe("GMap and GSet contract", () => {
  test("set on an existing key replaces the value and keeps the size", () => {
    const m = GMap.from([[1, "a"], [2, "b"]]);
    const n = m.set(1, "c");
    expect(n.size).toBe(2);
    expect(n.get(1)).toBe("c");
    expect(m.get(1)).toBe("a");
  });

  test("from keeps the last of duplicate keys", () => {
    expect([...GMap.from([[1, "a"], [1, "b"]])]).toEqual([[1, "b"]]);
    expect(GSet.from([1, 1, 1]).size).toBe(1);
  });

  test("absent lookups and no-op updates", () => {
    const m = GMap.from([[1, 1]]);
    expect(m.get(2)).toBeUndefined();
    expect(m.has(2)).toBe(false);
    expect(m.delete(2)).toBe(m);
    expect(GMap.empty<number, number>().delete(1).size).toBe(0);
    const s = GSet.from([1]);
    expect(s.add(1)).toBe(s);
    expect(s.delete(2)).toBe(s);
  });

  test("iteration follows the comparator", () => {
    const words = ["pear", "Apple", "fig", "banana"];
    const byLength = (a: string, b: string) => a.length - b.length || a.localeCompare(b);
    expect([...GSet.from(words, { compare: byLength })]).toEqual(["fig", "pear", "Apple", "banana"]);
    const byLower = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase());
    const m = GMap.from(words.map((w) => [w, w.length] as const), { compare: byLower });
    expect([...m.keys()]).toEqual(["Apple", "banana", "fig", "pear"]);
    expect(m.get("APPLE")).toBe(5); // equal under the comparator
  });
});
