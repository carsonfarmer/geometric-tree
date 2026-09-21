/**
 * Geometric search trees (G-trees), after Farmer & Meyer,
 * https://g-trees.github.io/g_trees/.
 *
 * A G-tree is a randomised, history-independent search tree. Every key has a
 * geometrically distributed `rank`. A G-node holds the maximal run of keys
 * that share the highest rank in its subtree, each paired with the subtree of
 * the keys that precede it, plus one `right` subtree of the keys that follow
 * the last one. The keys of a node live in an {@link Items} collection, which
 * is pluggable: a sorted array gives the plain G-tree, another G-tree gives a
 * Gk-tree (see `gk.ts`).
 *
 * Everything here is immutable. The two structural operations are `unzip`
 * (split a tree around a key) and `zip` (join two ordered trees); insertion
 * and deletion are compositions of them.
 */

/** Three-way comparison of keys: negative, zero or positive. */
export type Compare<K> = (a: K, b: K) => number;

/** A key, its value, and the subtree of all keys that precede it. */
export type Entry<K, V> = { key: K; value: V; left: Tree<K, V> };

/** A G-node: the keys of one rank, plus the subtree of the keys after them. */
export type Node<K, V> = {
  rank: number;
  items: Items<K, V>;
  right: Tree<K, V>;
  size: number;
};

/** A possibly empty G-tree. */
export type Tree<K, V> = Node<K, V> | undefined;

/** Number of keys in a tree. */
export const size = <K, V>(t: Tree<K, V>) => t?.size ?? 0;

/**
 * An immutable, ordered collection of entries: the inner set of a G-node.
 *
 * `at` locates a position: it is negative for entries before the position,
 * zero for an entry at it, positive after; it must be monotone over the
 * collection. Expected sizes are constant, so O(size) implementations are fine.
 */
export interface Items<K, V> extends Iterable<Entry<K, V>> {
  /** Number of keys in the entries and their left subtrees. */
  readonly weight: number;
  /** Entries before the position, the entry at it (if any), entries after. */
  split(at: (e: Entry<K, V>) => number): [Items<K, V>, Entry<K, V> | undefined, Items<K, V>];
  /** The first entry at or after the position. */
  find(at: (e: Entry<K, V>) => number): Entry<K, V> | undefined;
  /** Concatenate; every entry of `other` must follow every entry of this. */
  join(other: Items<K, V>): Items<K, V>;
  /** The first entry and the rest. Must not be called when empty. */
  shift(): [Entry<K, V>, Items<K, V>];
  /** Prepend an entry that precedes every existing entry. */
  unshift(e: Entry<K, V>): Items<K, V>;
}

/** Number of keys an entry stands for: itself and its left subtree. */
export const weight = <K, V>(e: Entry<K, V>) => size(e.left) + 1;

/** {@link Items} backed by a sorted array. */
export class ArrayItems<K, V> implements Items<K, V> {
  readonly weight: number;

  constructor(
    readonly array: readonly Entry<K, V>[] = [],
    protected readonly weigh: (e: Entry<K, V>) => number = weight,
  ) {
    let weight = 0;
    for (const e of array) weight += weigh(e);
    this.weight = weight;
  }

  /** Wrap a result; subclasses may pick another representation. */
  protected with(array: readonly Entry<K, V>[]): Items<K, V> {
    return new ArrayItems(array, this.weigh);
  }

  split(at: (e: Entry<K, V>) => number): [Items<K, V>, Entry<K, V> | undefined, Items<K, V>] {
    const i = this.array.findIndex((e) => at(e) >= 0);
    if (i < 0) return [this, undefined, this.with([])];
    const hit = at(this.array[i]!) === 0;
    const lo = this.with(this.array.slice(0, i));
    const hi = this.with(this.array.slice(hit ? i + 1 : i));
    return [lo, hit ? this.array[i] : undefined, hi];
  }

  find(at: (e: Entry<K, V>) => number) {
    return this.array.find((e) => at(e) >= 0);
  }

  join(other: Items<K, V>) {
    return this.with([...this.array, ...other]);
  }

  shift(): [Entry<K, V>, Items<K, V>] {
    return [this.array[0]!, this.with(this.array.slice(1))];
  }

  unshift(e: Entry<K, V>) {
    return this.with([e, ...this.array]);
  }

  [Symbol.iterator]() {
    return this.array[Symbol.iterator]();
  }
}

/** Build a G-node, or collapse to `right` when there are no items. */
export function node<K, V>(rank: number, items: Items<K, V>, right: Tree<K, V>): Tree<K, V> {
  if (items.weight === 0) return right;
  return { rank, items, right, size: items.weight + size(right) };
}

/** A tree holding a single entry. */
export function single<K, V>(key: K, value: V, rank: number, items: Items<K, V>): Tree<K, V> {
  return node(rank, items.unshift({ key, value, left: undefined }), undefined);
}

/**
 * Split a tree into the keys before a position, the entry at it (if any), and
 * the keys after it. `at` compares an entry to the position; see {@link Items}.
 */
export function unzip<K, V>(
  t: Tree<K, V>,
  at: (e: Entry<K, V>) => number,
): [Tree<K, V>, Entry<K, V> | undefined, Tree<K, V>] {
  if (t === undefined) return [undefined, undefined, undefined];
  const [lo, e, hi] = t.items.split(at);
  if (e !== undefined) {
    // Found in this node: its left subtree ends the left result.
    return [node(t.rank, lo, e.left), e, node(t.rank, hi, t.right)];
  }
  if (hi.weight === 0) {
    // Every key here precedes the position: continue in the right subtree.
    const [l, hit, r] = unzip(t.right, at);
    return [node(t.rank, lo, l), hit, r];
  }
  // The position lies in the left subtree of the first greater entry.
  const [first, rest] = hi.shift();
  const [l, hit, r] = unzip(first.left, at);
  const right = node(t.rank, rest.unshift({ ...first, left: r }), t.right);
  return [node(t.rank, lo, l), hit, right];
}

/** Join two trees; every key of `l` must precede every key of `r`. */
export function zip<K, V>(l: Tree<K, V>, r: Tree<K, V>): Tree<K, V> {
  if (l === undefined) return r;
  if (r === undefined) return l;
  // l has the higher rank: r belongs somewhere down l's right spine.
  if (l.rank > r.rank) return node(l.rank, l.items, zip(l.right, r));
  // Otherwise (part of) l belongs in the leftmost subtree of r.
  const [first, rest] = r.items.shift();
  if (l.rank < r.rank) {
    const items = rest.unshift({ ...first, left: zip(l, first.left) });
    return node(r.rank, items, r.right);
  }
  // Equal ranks: the two nodes merge into one.
  const items = rest.unshift({ ...first, left: zip(l.right, first.left) });
  return node(r.rank, l.items.join(items), r.right);
}

/** Insert a single-entry tree, replacing any entry at the same position. */
export function insert<K, V>(
  t: Tree<K, V>,
  at: (e: Entry<K, V>) => number,
  one: Tree<K, V>,
): Tree<K, V> {
  const [l, , r] = unzip(t, at);
  return zip(zip(l, one), r);
}

/** Remove the entry at a position, if any. */
export function remove<K, V>(t: Tree<K, V>, at: (e: Entry<K, V>) => number): Tree<K, V> {
  const [l, , r] = unzip(t, at);
  return zip(l, r);
}

/** The first entry at or after a position, without allocating. */
export function find<K, V>(
  t: Tree<K, V>,
  at: (e: Entry<K, V>) => number,
): Entry<K, V> | undefined {
  let best: Entry<K, V> | undefined;
  while (t !== undefined) {
    const e = t.items.find(at);
    if (e === undefined) t = t.right;
    else if (at(e) === 0) return e;
    else [best, t] = [e, e.left];
  }
  return best;
}

/** The entries of a tree, in order. */
export function* entries<K, V>(t: Tree<K, V>): Generator<Entry<K, V>> {
  if (t === undefined) return;
  for (const e of t.items) {
    yield* entries(e.left);
    yield e;
  }
  yield* entries(t.right);
}
