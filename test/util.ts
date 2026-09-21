import { expect } from "bun:test";
import type { Compare, Tree } from "../src/tree";

/** A small seeded PRNG (mulberry32) so failures reproduce. */
export function prng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(xs: Iterable<T>, rand = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Assert the G-tree invariants and return the keys in order: ranks strictly
 * decrease down every path, every key sits in a node of its own rank, keys
 * are sorted, nodes are non-empty and sizes are right.
 */
export function check<K, V>(
  t: Tree<K, V>,
  compare: Compare<K>,
  rank: (key: K) => number,
  above = Infinity,
): K[] {
  if (t === undefined) return [];
  expect(t.rank).toBeLessThan(above);
  expect(t.items.weight).toBeGreaterThan(0);
  const keys: K[] = [];
  for (const e of t.items) {
    keys.push(...check(e.left, compare, rank, t.rank));
    expect(rank(e.key)).toBe(t.rank);
    keys.push(e.key);
  }
  keys.push(...check(t.right, compare, rank, t.rank));
  for (let i = 1; i < keys.length; i++) {
    expect(compare(keys[i - 1]!, keys[i]!)).toBeLessThan(0);
  }
  expect(t.size).toBe(keys.length);
  return keys;
}

/** The fixture from the paper's figures: primes with hand-picked ranks. */
export const ranks = new Map<number, number>([
  [2, 1], [3, 2], [5, 1], [7, 3], [11, 1], [13, 2], [17, 1], [19, 1], [23, 2],
  [29, 2], [31, 3], [37, 1], [41, 2], [43, 2], [47, 1], [53, 3], [59, 1],
  [61, 2], [67, 3], [71, 2],
]);
export const primes = [...ranks.keys()];
export const fixed = (key: number) => ranks.get(key)!;
