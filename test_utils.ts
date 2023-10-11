export {
  assert,
  assertEquals,
} from "https://deno.land/std@0.202.0/assert/mod.ts";
import { Item } from "./api.ts";
import { geometric } from "./utils.ts";

export const pairs = [
  [2, 1],
  [3, 2],
  [5, 1],
  [7, 3],
  [11, 1],
  [13, 2],
  [17, 1],
  [19, 1],
  [23, 2],
  [29, 2],
  [31, 3],
  [37, 1],
  [41, 2],
  [43, 2],
  [47, 1],
  [53, 3],
  [59, 1],
  [61, 2],
  [67, 3],
  [71, 2],
];

export const frozen = pairs.map(([key, rank]) => Object.freeze({ key, rank }));

export function range(start: number, end: number): number[] {
  return Array.from({ length: end - start }, (_, i) => start + i);
}

export function shuffle<T>(array: ReadonlyArray<T>): Array<T> {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function random(n = 10): Item<number, number>[] {
  const factor = Math.floor(n / 10);
  const pairs: Item<number, number>[] = [];
  const keys = new Set<number>();
  while (pairs.length < n) {
    const key = Math.floor(Math.random() * 10 * factor);
    if (!keys.has(key)) {
      keys.add(key);
      const rank = geometric(0.5);
      pairs.push({ key, rank });
    }
  }
  return pairs;
}

export function sorted(items: Item<number, number>[]) {
  return items.toSorted(({ key: a }, { key: b }) => a - b);
}

export function split<T>(array: T[], index: number): [T[], T[]] {
  const left = array.slice(0, index);
  const right = array.slice(index);
  return [left, right];
}
