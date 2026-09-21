/**
 * G-trees whose inner sets are G-trees.
 *
 * {@link TreeItems} stores a node's entries in a G-tree of their own, ranked
 * by an independent rank function. Using this at every level gives the
 * zip-zip trees of the paper (Section 4.2).
 *
 * {@link GkItems} adds the threshold of Hehemann (2025, Section 4.1): entries
 * live in a sorted array until a node outgrows `threshold`, then become a
 * G-tree ranked by a fresh seed, whose own nodes are again Gk items one
 * dimension further down. An adversary who crafts keys of equal rank (which
 * costs O(n) work for one dimension) must repeat the feat once per dimension,
 * so node sizes stay bounded and operations stay O(log^2 n) even then. The
 * conversion happens in both directions at the same threshold, so the
 * representation remains a function of the stored set alone.
 */
import { hashed, type Rank } from "./rank";
import type { ItemsFactory, Options } from "./options";
import {
  ArrayItems,
  entries,
  find,
  remove,
  single,
  size,
  unzip,
  weight,
  zip,
  type Entry,
  type Items,
  type Tree,
} from "./tree";

/** One dimension of a Gk-tree: how its inner trees rank, weigh and nest. */
export type Dimension<K> = {
  rank: (key: K) => number;
  // Accepts entries of any deeper dimension.
  weigh: (e: Entry<K, any>) => number;
  items: ItemsFactory<K>;
  threshold: number;
};

/** Array-backed items that turn into {@link TreeItems} past the threshold. */
export class GkItems<K, V> extends ArrayItems<K, V> {
  constructor(
    array: readonly Entry<K, V>[],
    readonly dim: Dimension<K>,
  ) {
    super(array, dim.weigh);
  }

  protected override with(array: readonly Entry<K, V>[]) {
    if (array.length > this.dim.threshold) return TreeItems.from(array, this.dim);
    return new GkItems(array, this.dim);
  }
}

/** Items stored as a G-tree; turn back into {@link GkItems} at the threshold. */
export class TreeItems<K, V> implements Items<K, V> {
  constructor(
    readonly tree: Tree<K, Entry<K, V>>,
    readonly dim: Dimension<K>,
  ) {}

  static from<K, V>(items: Iterable<Entry<K, V>>, dim: Dimension<K>) {
    let tree: Tree<K, Entry<K, V>>;
    for (const e of items) tree = zip(tree, TreeItems.one(e, dim));
    return new TreeItems(tree, dim);
  }

  private static one<K, V>(e: Entry<K, V>, dim: Dimension<K>) {
    return single(e.key, e, dim.rank(e.key), dim.items<Entry<K, V>>());
  }

  private with(tree: Tree<K, Entry<K, V>>): Items<K, V> {
    let n = this.dim.threshold;
    for (const _ of entries(tree)) if (n-- === 0) return new TreeItems(tree, this.dim);
    return new GkItems(Array.from(entries(tree), (e) => e.value), this.dim);
  }

  get weight() {
    return size(this.tree);
  }

  split(at: (e: Entry<K, V>) => number): [Items<K, V>, Entry<K, V> | undefined, Items<K, V>] {
    const [l, hit, r] = unzip(this.tree, (e) => at(e.value));
    return [this.with(l), hit?.value, this.with(r)];
  }

  find(at: (e: Entry<K, V>) => number) {
    return find(this.tree, (e) => at(e.value))?.value;
  }

  join(other: Items<K, V>) {
    const tree: Tree<K, Entry<K, V>> =
      other instanceof TreeItems ? other.tree : TreeItems.from(other, this.dim).tree;
    return this.with(zip(this.tree, tree));
  }

  shift(): [Entry<K, V>, Items<K, V>] {
    const min = find(this.tree, () => 1)!;
    return [min.value, this.with(remove(this.tree, (e) => (e === min ? 0 : 1)))];
  }

  unshift(e: Entry<K, V>) {
    return this.with(zip(TreeItems.one(e, this.dim), this.tree));
  }

  *[Symbol.iterator]() {
    for (const e of entries(this.tree)) yield e.value;
  }
}

/**
 * Options for a Gk-tree. `rank` is reseeded once per dimension. With the
 * default threshold an honest node overflows with probability about e^-12;
 * a threshold of 1 gives zip-zip trees.
 */
export function gk<K>({
  k = 8,
  rank = hashed<K>(k),
  threshold = 12 * k,
}: { k?: number; rank?: Rank<K>; threshold?: number } = {}): Options<K> {
  const dimension = (seed: number, weigh: Dimension<K>["weigh"]): Dimension<K> => {
    let next: Dimension<K> | undefined;
    return {
      rank: (key) => rank(key, seed),
      weigh,
      items: <V>() => {
        next ??= dimension(seed + 1, (e) => size(e.left) + weigh(e.value));
        return new GkItems<K, V>([], next);
      },
      threshold: Math.max(threshold, 1),
    };
  };
  const first = dimension(1, weight);
  return { k, rank, items: <V>() => new GkItems<K, V>([], first) };
}
