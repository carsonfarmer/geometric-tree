/**
 * Rank functions. Ranks are geometric random variables with
 * P(rank = r) = (1 - 1/k) / k^(r - 1), so G-nodes hold about k keys and the
 * tree has about n/k nodes and log_k(n) height.
 */

/** Assigns a rank to a key. `seed` selects an independent rank function. */
export type Rank<K> = (key: K, seed?: number) => number;

/** Hashes a key to a non-negative integer; different seeds, different hashes. */
export type Hash<K> = (key: K, seed: number) => number;

/** Hash a key by its string form. Keys of object type need their own hash. */
export const hash: Hash<unknown> = (key, seed) =>
  Bun.hash.xxHash32(String(key), seed);

/**
 * Deterministic ranks: 1 + the number of trailing zero digits of the key's
 * hash in base k. Trees built with these depend only on their contents
 * (history independence), so equal sets always have equal trees.
 */
export function hashed<K>(k = 2, hashKey: Hash<K> = hash): Rank<K> {
  return (key, seed = 0) => {
    let h = hashKey(key, seed);
    let rank = 1;
    while (h > 0 && h % k === 0) [h, rank] = [Math.floor(h / k), rank + 1];
    return rank;
  };
}

/** Random ranks: the tree depends on insertion order, but keys need no hash. */
export function random(k = 2): Rank<unknown> {
  return () => {
    let rank = 1;
    while (Math.random() * k < 1) rank++;
    return rank;
  };
}
