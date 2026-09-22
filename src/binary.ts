/**
 * The classic binary zip tree (Tarjan, Levy and Timmel, 2021), kept as the
 * reference that `tree.ts` generalises: a G-tree with k = 2 is this tree with
 * every run of equal-rank right children folded into one node. The tests
 * check that correspondence. Read the two files side by side.
 */

/** A node: key, value, rank, and the subtrees of smaller and greater keys. */
export type Node<K, V> = {
  key: K;
  value: V;
  rank: number;
  left: Tree<K, V>;
  right: Tree<K, V>;
  size: number;
};

/** A possibly empty zip tree. */
export type Tree<K, V> = Node<K, V> | undefined;

/** Number of keys in a tree. */
export const size = <K, V>(t: Tree<K, V>) => t?.size ?? 0;

/** Build a node, computing its size. */
export function node<K, V>(n: Omit<Node<K, V>, "size">): Node<K, V> {
  return { ...n, size: size(n.left) + size(n.right) + 1 };
}

/** A tree holding a single key. */
export function single<K, V>(key: K, value: V, rank: number): Tree<K, V> {
  return node({ key, value, rank, left: undefined, right: undefined });
}

/**
 * Split a tree into the keys before a position, the node at it (if any), and
 * the keys after it. `at` compares a node to the position, as in `tree.ts`.
 */
export function unzip<K, V>(
  t: Tree<K, V>,
  at: (n: Node<K, V>) => number,
): [Tree<K, V>, Node<K, V> | undefined, Tree<K, V>] {
  if (t === undefined) return [undefined, undefined, undefined];
  const c = at(t);
  if (c === 0) return [t.left, t, t.right];
  if (c > 0) {
    // t is after the position: t and its right subtree go right.
    const [l, hit, r] = unzip(t.left, at);
    return [l, hit, node({ ...t, left: r })];
  }
  const [l, hit, r] = unzip(t.right, at);
  return [node({ ...t, right: l }), hit, r];
}

/** Join two trees; every key of `l` must precede every key of `r`. */
export function zip<K, V>(l: Tree<K, V>, r: Tree<K, V>): Tree<K, V> {
  if (l === undefined) return r;
  if (r === undefined) return l;
  // Ties go left, so equal ranks chain down a right spine.
  if (l.rank >= r.rank) return node({ ...l, right: zip(l.right, r) });
  return node({ ...r, left: zip(l, r.left) });
}

/** Insert a single-node tree, replacing any node at the same position. */
export function insert<K, V>(
  t: Tree<K, V>,
  at: (n: Node<K, V>) => number,
  one: Tree<K, V>,
): Tree<K, V> {
  const [l, , r] = unzip(t, at);
  return zip(zip(l, one), r);
}

/** Remove the node at a position, if any. */
export function remove<K, V>(t: Tree<K, V>, at: (n: Node<K, V>) => number): Tree<K, V> {
  const [l, , r] = unzip(t, at);
  return zip(l, r);
}

/** The first node at or after a position, without allocating. */
export function find<K, V>(t: Tree<K, V>, at: (n: Node<K, V>) => number): Node<K, V> | undefined {
  let best: Node<K, V> | undefined;
  while (t !== undefined) {
    const c = at(t);
    if (c === 0) return t;
    if (c < 0) t = t.right;
    else [best, t] = [t, t.left];
  }
  return best;
}

/** The nodes of a tree, in key order. */
export function* nodes<K, V>(t: Tree<K, V>): Generator<Node<K, V>> {
  if (t === undefined) return;
  yield* nodes(t.left);
  yield t;
  yield* nodes(t.right);
}
