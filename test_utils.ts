export {
  assert,
  assertEquals,
} from "https://deno.land/std@0.202.0/assert/mod.ts";

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
