/**
 * Rank functions. Ranks are geometric random variables with
 * P(rank = r) = (1 - 1/k) / k^(r - 1), so G-nodes hold about k keys and the
 * tree has about n/k nodes and log_k(n) height.
 */

/** Assigns a rank to a key. `seed` selects an independent rank function. */
export type Rank<K> = (key: K, seed?: number) => number;

/**
 * Hashes a key to a 32-bit integer, the convention of xxHash32, MurmurHash3
 * and friends, so any of them drops in. Seeds give independent hashes.
 */
export type Hash<K> = (key: K, seed: number) => number;

/** The number of hash values. */
const M = 2 ** 32;

/**
 * Hash a key by its string form: cyrb53's mixing, folded to 32 bits. Small,
 * fast, and the same on every runtime. Keys of object type need their own
 * hash. It is not cryptographic: it makes trees history independent, but
 * someone who can choose keys can also choose their ranks.
 */
export const hash: Hash<unknown> = (key, seed) => {
  // The seed is mixed in as a leading input unit, so different seeds give
  // unrelated hashes rather than a permutation of the same values.
  let h1 = Math.imul(0xdeadbeef ^ seed, 2654435761);
  let h2 = Math.imul(0x41c6ce57 ^ seed, 1597334677);
  const s = String(key);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
};

/**
 * Deterministic ranks by inverse transform: the hash is a uniform u in
 * (0, 1], and rank = 1 + floor(log_k(1/u)), the number of leading zero digits
 * of the hash in base k (the paper's section 3.2). One logarithm, then an
 * integer comparison against precomputed powers of k, so the result is exact
 * and identical on every runtime. Trees built with these depend only on their
 * contents (history independence), so equal sets always have equal trees.
 */
export function hashed<K>(k = 2, hashKey: Hash<K> = hash): Rank<K> {
  // bound[r] is the largest hash value (plus one) still of rank r + 1.
  const bound = Array.from({ length: 35 }, (_, r) => M / k ** r);
  const lnk = Math.log(k);
  return (key, seed = 0) => {
    const h = (hashKey(key, seed) >>> 0) + 1;
    let r = Math.floor(Math.log(M / h) / lnk);
    if (h > bound[r]!) r--;
    else if (h <= bound[r + 1]!) r++;
    return r + 1;
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
