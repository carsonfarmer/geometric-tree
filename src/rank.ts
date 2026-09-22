/**
 * Rank functions. Ranks are geometric random variables with
 * P(rank = r) = (1 - 1/k) / k^(r - 1), so G-nodes hold about k keys and the
 * tree has about n/k nodes and log_k(n) height.
 */

/** Assigns a rank to a key. `seed` selects an independent rank function. */
export type Rank<K> = (key: K, seed?: number) => number;

/** Hashes a key to a non-negative integer; different seeds, different hashes. */
export type Hash<K> = (key: K, seed: number) => number;

/**
 * Hash a key by its string form with cyrb53, a small, fast, well-mixed 53-bit
 * string hash that runs on any runtime. Keys of object type need their own
 * hash. It is not cryptographic: it makes trees history independent, but
 * someone who can choose keys can also choose their ranks.
 */
export const hash: Hash<unknown> = (key, seed) => {
  const s = String(key);
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

/**
 * Deterministic ranks: 1 + the number of trailing zero digits of the key's
 * hash in base k, the construction of the paper's section 3.2 (for k = 2,
 * the largest power of two dividing the hash). Trees built with these depend
 * only on their contents (history independence), so equal sets always have
 * equal trees.
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
