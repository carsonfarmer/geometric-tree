import { describe, expect, test } from "bun:test";
import { hash, hashed } from "../src/rank";
import { prng } from "./util";

const M = 2n ** 32n;

/** The rank by definition: 1 + the largest r with k^r * (h + 1) <= 2^32. */
function reference(h: number, pows: bigint[]) {
  let r = 0;
  while (pows[r + 1]! * BigInt(h + 1) <= M) r++;
  return r + 1;
}

describe("hashed ranks", () => {
  test("match the exact definition, including at every boundary", () => {
    const rand = prng(12);
    for (const k of [2, 3, 8, 10, 16, 1000]) {
      const rank = hashed<number>(k, (h) => h);
      const pows = Array.from({ length: 35 }, (_, r) => BigInt(k) ** BigInt(r));
      const hs = [0, 1, 2 ** 32 - 1, 2 ** 32 - 2];
      for (let r = 1; pows[r]! <= M; r++) {
        const b = Number(M / pows[r]!);
        hs.push(...[b - 2, b - 1, b, b + 1].filter((h) => h >= 0));
      }
      for (let i = 0; i < 500; i++) hs.push(Math.floor(rand() * 2 ** 32));
      for (const h of hs) expect(rank(h)).toBe(reference(h, pows));
      // Signed 32-bit results, as some hashes return them, mean the same.
      for (const h of hs) expect(rank(h | 0)).toBe(reference(h, pows));
    }
  });

  test("are geometric: P(rank > r) is about k^-r", () => {
    for (const k of [2, 8]) {
      const rank = hashed<number>(k);
      const n = 100_000;
      const counts = new Map<number, number>();
      for (let i = 0; i < n; i++) counts.set(rank(i), (counts.get(rank(i)) ?? 0) + 1);
      for (let r = 1; r <= 3; r++) {
        let above = 0;
        for (const [rr, c] of counts) if (rr > r) above += c;
        expect(above / n).toBeCloseTo(k ** -r, 2);
      }
    }
  });

  test("seeds give independent hashes", () => {
    expect(hash("a", 0)).not.toBe(hash("a", 1));
    expect(hash("a", 0)).toBe(hash("a", 0));
  });
});
