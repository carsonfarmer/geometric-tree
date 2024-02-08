export {
  assert,
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.202.0/assert/mod.ts";
import { Item } from "./api.ts";
import { geometric } from "./utils.ts";

export const pairs = [
  [2, 1], /// 0
  [3, 2], /// 1
  [5, 1], /// 2
  [7, 3], /// 3
  [11, 1], // 4
  [13, 2], // 5
  [17, 1], // 6
  [19, 1], // 7
  [23, 2], // 8
  [29, 2], // 9
  [31, 3], // 10
  [37, 1], // 11
  [41, 2], // 12
  [43, 2], // 13
  [47, 1], // 14
  [53, 3], // 15
  [59, 1], // 16
  [61, 2], // 17
  [67, 3], // 18
  [71, 2], // 19
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

export function random(n = 10, p = 0.5): Array<Item<number, number>> {
  const factor = Math.floor(n / 10);
  const pairs: Item<number, number>[] = [];
  const keys = new Set<number>();
  while (pairs.length < n) {
    const key = Math.floor(Math.random() * 100 * factor);
    if (!keys.has(key)) {
      keys.add(key);
      const rank = geometric(p);
      pairs.push({ key, rank });
    }
  }
  return pairs;
}

export function sorted(items: ReadonlyArray<Item<number, number>>) {
  return items.toSorted(({ key: a }, { key: b }) => a - b);
}
