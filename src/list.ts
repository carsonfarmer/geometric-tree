import { random, type Rank } from "./rank";
import {
  ArrayItems,
  entries,
  node,
  single,
  size,
  zip,
  type Entry,
  type Tree,
} from "./tree";

/**
 * A G-tree used as a sequence: positions replace keys, and node sizes guide
 * the search. Ranks are random, since there is no key to hash.
 */
export type Seq<T> = Tree<T, undefined>;

/** The entry at index `i`. */
export function at<T>(t: Seq<T>, i: number): Entry<T, undefined> | undefined {
  if (t === undefined) return;
  for (const e of t.items) {
    const n = size(e.left);
    if (i < n) return at(e.left, i);
    if (i === n) return e;
    i -= n + 1;
  }
  return at(t.right, i);
}

/** Split a sequence into its first `i` elements and the rest. */
export function splitAt<T>(t: Seq<T>, i: number): [Seq<T>, Seq<T>] {
  if (t === undefined || i <= 0) return [undefined, t];
  if (i >= t.size) return [t, undefined];
  for (const e of t.items) {
    const n = size(e.left);
    if (i <= n) {
      // The cut falls inside (or right after) e's left subtree.
      const [l, r] = splitAt(e.left, i);
      const [lo, , hi] = t.items.split((x) => (x === e ? 0 : -1));
      const right = node(t.rank, hi.unshift({ ...e, left: r }), t.right);
      return [node(t.rank, lo, l), right];
    }
    i -= n + 1;
  }
  const [l, r] = splitAt(t.right, i);
  return [node(t.rank, t.items, l), r];
}

/** An immutable sequence with logarithmic positional updates. */
export class GList<T> implements Iterable<T> {
  private constructor(
    readonly root: Seq<T>,
    private readonly rank: Rank<T>,
  ) {}

  /** `k` is the expected number of elements per node. */
  static empty<T>({ k = 8 } = {}): GList<T> {
    return new GList<T>(undefined, random(k));
  }

  static from<T>(elements: Iterable<T>, options?: { k?: number }): GList<T> {
    let list = GList.empty<T>(options);
    for (const x of elements) list = list.push(x);
    return list;
  }

  get size(): number {
    return size(this.root);
  }

  private with(root: Seq<T>) {
    return new GList(root, this.rank);
  }

  private one(x: T): Seq<T> {
    return single(x, undefined, this.rank(x), new ArrayItems());
  }

  /** The element at index `i`; negative indices count from the end. */
  at(i: number): T | undefined {
    return at(this.root, i < 0 ? i + this.size : i)?.key;
  }

  push(x: T): GList<T> {
    return this.with(zip(this.root, this.one(x)));
  }

  unshift(x: T): GList<T> {
    return this.with(zip(this.one(x), this.root));
  }

  /** Insert `x` so that it ends up at index `i`. */
  insert(i: number, x: T): GList<T> {
    const [l, r] = splitAt(this.root, i);
    return this.with(zip(zip(l, this.one(x)), r));
  }

  /** Remove the element at index `i`. */
  remove(i: number): GList<T> {
    const [l, r] = splitAt(this.root, i);
    return this.with(zip(l, splitAt(r, 1)[1]));
  }

  /** The elements from `start` up to (not including) `end`, as `Array.slice`. */
  slice(start = 0, end = this.size): GList<T> {
    const n = this.size;
    const clamp = (i: number) => Math.min(Math.max(i < 0 ? i + n : i, 0), n);
    const [head] = splitAt(this.root, clamp(end));
    return this.with(splitAt(head, clamp(start))[1]);
  }

  concat(other: GList<T>): GList<T> {
    return this.with(zip(this.root, other.root));
  }

  /** Split into the first `i` elements and the rest. */
  splitAt(i: number): [GList<T>, GList<T>] {
    const [l, r] = splitAt(this.root, i);
    return [this.with(l), this.with(r)];
  }

  *[Symbol.iterator](): Generator<T> {
    for (const e of entries(this.root)) yield e.key;
  }
}
