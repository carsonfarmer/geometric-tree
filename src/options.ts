import { hashed, type Rank } from "./rank.js";
import { ArrayItems, type Compare, type Items } from "./tree.js";

/** Creates the empty inner set for a node of a tree keyed by `K`. */
export type ItemsFactory<K> = <V>() => Items<K, V>;

/** Options shared by {@link GMap} and {@link GSet}. */
export type Options<K> = {
  /** Expected number of keys per node; 2 gives a zip tree. Default 8. */
  k?: number;
  /** Key ordering. Defaults to `<` / `>`. */
  compare?: Compare<K>;
  /** Rank function. Defaults to hashed ranks (see `rank.ts`). */
  rank?: Rank<K>;
  /** Inner-set implementation for nodes. Defaults to sorted arrays. */
  items?: ItemsFactory<K>;
};

export type Config<K> = Required<Options<K>>;

// Works for any primitive key type.
export const compare: Compare<any> = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function config<K>(options: Options<K> = {}): Config<K> {
  const k = options.k ?? 8;
  return {
    k,
    compare: options.compare ?? compare,
    rank: options.rank ?? hashed<K>(k),
    items: options.items ?? (() => new ArrayItems()),
  };
}
