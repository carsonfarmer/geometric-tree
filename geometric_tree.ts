import { Item, ZipTree } from "./api.ts";
import { splits, subsets } from "./utils.ts";
import {
  find,
  isEmpty,
  join,
  push,
  shift,
  split,
  unshift,
} from "./array_ops.ts";

export type Pair<K, R extends number = number> = [key: K, value?: Node<K, R>];

export interface Node<K, R extends number = number> {
  rank: R;
  items: ReadonlyArray<Pair<K, R>>;
  size: number;
  next?: Node<K, R>;
}

export class GeometricTree<K, R extends number = number>
  implements ZipTree<K, R> {
  constructor(
    /**
     * The root node of the tree.
     */
    public root?: Node<K, R>,
  ) {}

  /**
   * Create an empty GeneralizedZipTree.
   * @returns An empty GeneralizedZipTree.
   */
  static empty<K, R extends number = number>() {
    return new GeometricTree<K, R>(undefined);
  }

  /**
   * Create a GeneralizedZipTree with a single item.
   * @param item The item to insert into the tree.
   * @returns A GeneralizedZipTree with a single item.
   */
  static singleton<K, R extends number = number>(
    item: Item<K, R>,
  ) {
    return new GeometricTree<K, R>(singleton(item));
  }

  /**
   * Create a GeneralizedZipTree from a sorted array of items.
   * @param array The array of items to insert into the tree. The array must be pre-sorted by key.
   * @returns A GeneralizedZipTree with the items from the array.
   */
  static from<K, R extends number = number>(
    array: ReadonlyArray<Item<K, R>>,
  ) {
    const root = from(array);
    return new GeometricTree<K, R>(root);
  }

  /**
   * Return the size of the tree.
   * @returns The size of the tree.
   */
  length() {
    return this.root?.size ?? 0;
  }

  /**
   * Check if the tree is empty.
   * @returns Whether the tree is empty.
   */
  isEmpty() {
    return this.root === undefined;
  }

  /**
   * Search for a key in the tree.
   * @param key The key to search for.
   * @returns The item with the given key if it exists in the tree, otherwise undefined.
   */
  search(key: K) {
    const node = search(key, this.root);
    return node ? { key: node.key, rank: node.rank } : undefined;
  }

  /**
   * Insert an item into the tree.
   * @param item The item to insert.
   * @returns A new tree with the item inserted.
   */
  insert(item: Item<K, R>) {
    const root = insert(item, this.root);
    return new GeometricTree<K, R>(root);
  }

  /**
   * Remove an item from the tree.
   * @param key The key of the item to remove.
   * @returns A new tree with the item removed.
   */
  remove(key: K) {
    const root = remove(key, this.root);
    return new GeometricTree<K, R>(root);
  }

  /**
   * Split the input tree into two balanced sub-trees.
   * @param key The key to split the tree on.
   * @returns A tuple of the left and right trees.
   */
  unzip(
    key: K,
  ): [GeometricTree<K, R>, Item<K, R> | undefined, GeometricTree<K, R>] {
    const [left, node, right] = unzip(key, this.root);
    return [
      new GeometricTree<K, R>(left),
      node,
      new GeometricTree<K, R>(right),
    ];
  }

  /**
   * Join another tree into this one.
   * @param other The other tree to join.
   * All of the keys in the other tree must be greater than the keys in this tree.
   * @returns A new tree with the two trees joined.
   */
  zip(other: GeometricTree<K, R>) {
    const root = zip(this.root, other.root);
    return new GeometricTree<K, R>(root);
  }

  /**
   * Create a single tree by zipping two input trees.
   * @param left An input tree.
   * @param right Another input tree.
   * All of the keys in the right tree must be greater than the keys in the left tree.
   * @returns A new tree with the two trees joined.
   */
  static zip<K, R extends number>(
    left: GeometricTree<K, R>,
    right: GeometricTree<K, R>,
  ) {
    const root = zip(left.root, right.root);
    return new GeometricTree<K, R>(root);
  }

  /**
   * Return a string representation of the tree.
   * @returns A string representation of the tree.
   */
  toString() {
    return `GeometricTree(${this.root?.rank}, ${this.root?.size})`;
  }

  /**
   * Return an Iterator over the items in the tree.
   * @returns An Iterator over the items in the tree.
   */
  [Symbol.iterator]() {
    return iter(this.root);
  }

  /**
   * Return an array of the in-order items in the tree.
   * @returns An array of the in-order items in the tree.
   */
  toArray(): Array<Item<K, R>> {
    return [...iter(this.root)];
  }
}

export function sized<K, R extends number>(
  node: Omit<Node<K, R>, "size">,
): Node<K, R> {
  let size = 0;
  for (const item of node.items) {
    size += (item?.[1]?.size ?? 0) + 1;
  }
  size += node.next?.size ?? 0;
  return { ...node, size };
}

export function normalize<K, R extends number>(
  node: Omit<Node<K, R>, "size">,
): Node<K, R> | undefined {
  return isEmpty(node.items) ? node.next : sized(node);
}

export function singleton<K, R extends number>(
  item: Item<K, R>,
): Node<K, R> {
  const items = Array.from<[K, Node<K, R> | undefined]>([[
    item.key,
    undefined,
  ]]);
  return {
    items,
    rank: item.rank,
    size: 1,
    next: undefined,
  };
}

export function from<K, R extends number>(
  values: ReadonlyArray<Item<K, R>>,
  cls = Array<[K, Node<K, R> | undefined]>,
): Node<K, R> | undefined {
  if (values.length == 0) {
    return undefined;
  } else if (values.length == 1) {
    return singleton(values[0]);
  }
  const rank = Math.max(...values.map(({ rank }) => rank)) as R;
  const _splits = splits(values, ({ rank: r }) => r === rank);
  const keys = _splits.map((index) => values[index]);
  const children = subsets(values, _splits).map((subset) => from(subset, cls));
  const items = new cls(keys.length);
  for (const [i, key] of keys.entries()) {
    items[i] = [key.key, children[i]];
  }
  return normalize({
    items,
    rank,
    next: children.at(-1),
  });
}

export function search<K, R extends number>(
  key: K,
  root?: Node<K, R>,
): Item<K, R> | undefined {
  if (root === undefined) {
    return undefined;
  }
  const item = find(root.items, ([k]) => k >= key);
  if (item?.[0] === key) {
    return { key: item[0], rank: root.rank };
  }
  const next = item ? item[1] : root.next;
  return search(key, next);
}

/**
 * This is identical to the insert operation in the ZipTree implementation.
 * The differences are in the underlying zip and unzip functions.
 * We _could_ actually just use the ZipTree insert operation here, but
 * curry them by injecting the correct (un)zip function. But for now, we'll
 * keep them separate.
 */
export function insert<K, R extends number>(
  item: Item<K, R>,
  root?: Node<K, R>,
): Node<K, R> | undefined {
  if (root === undefined) {
    return singleton(item);
  }
  const [left, _, right] = unzip(item.key, root);
  return zip(zip(left, singleton(item)), right);
}

/**
 * Again, this is identical to the remove operation in the ZipTree implementation.
 */
export function remove<K, R extends number>(
  key: K,
  root?: Node<K, R>,
): Node<K, R> | undefined {
  if (root === undefined) {
    return undefined;
  }
  const [left, _, right] = unzip(key, root);
  return zip(left, right);
}

/**
 * Split the input tree into two balanced sub-trees.
 * @param key The key to split the tree on.
 * @param root The root node of the tree.
 * @returns A tuple of the left and right trees.
 */
export function unzip<K, R extends number>(
  key: K,
  root?: Node<K, R>,
): [Node<K, R> | undefined, Item<K, R> | undefined, Node<K, R> | undefined] {
  if (root === undefined) {
    return [undefined, undefined, undefined];
  }
  const [lefts, node, rights] = split(
    root.items,
    ([k]) => k >= key,
  );
  if (node === undefined) {
    const [next, n, right] = unzip(key, root.next);
    const left = normalize({ ...root, next });
    return [left, n, right];
  } else if (node[0] === key) {
    const left = normalize({ ...root, items: lefts, next: node[1] });
    const right = normalize({ ...root, items: rights });
    const n = { key: node[0], rank: root.rank };
    return [left, n, right];
  } else {
    const [next, n, inner] = unzip(key, node?.[1]);
    const left = normalize({ ...root, items: lefts, next });
    const newRights = shift<Pair<K, R>>(rights, [node![0], inner]);
    const right = normalize({ ...root, items: newRights });
    return [left, n, right];
  }
}

export function zip<K, R extends number>(
  left?: Node<K, R>,
  right?: Node<K, R>,
): Node<K, R> | undefined {
  if (left === undefined) {
    return right;
  }
  if (right === undefined) {
    return left;
  }
  if (left.rank == right.rank) {
    const [rights, child] = unshift(right.items);
    const inner = zip(left.next, child?.[1]);
    const lefts = push<Pair<K, R>>(left.items, [child![0], inner]);
    const items = join(lefts, rights);
    return normalize({ ...right, items });
  } else if (left.rank < right.rank) {
    const [rights, child] = unshift(right.items);
    const inner = zip(left, child?.[1]);
    const items = shift<Pair<K, R>>(rights, [child![0], inner]);
    return normalize({ ...right, items });
  } else {
    const next = zip(left.next, right);
    return normalize({ ...left, next });
  }
}

export function* iter<K, R extends number>(
  root: Node<K, R> | undefined,
): IterableIterator<Item<K, R>> {
  if (root === undefined) {
    return;
  }
  for (const [key, child] of root.items) {
    yield* iter(child);
    yield { key, rank: root.rank };
  }
  yield* iter(root.next);
}

function* mermaidNodes<K, R extends number>(
  node?: Node<K, R>,
  parentId = "",
): Generator<string> {
  if (node === undefined) {
    return;
  }
  const keys = [...node.items].map(([key]) => key);
  let nodeLabel = keys.join(",");
  if (node.size > 1) {
    nodeLabel += `\\n<small>rank:${node.rank}, size:${node.size}</small>`;
  }

  const nodeId = `node${keys.join("_")}`;
  yield `${nodeId}[${nodeLabel}]`;
  if (parentId !== "") {
    yield `${parentId} --> ${nodeId}`;
  }
  const items: ReadonlyArray<Pair<K, R>> | undefined = node.items;
  for (const [_key, child] of items) {
    if (child !== undefined) {
      yield* mermaidNodes(child, nodeId);
    }
  }
  yield* mermaidNodes(node.next, nodeId);
}

export function mermaidDiagram<K, R extends number>(tree: GeometricTree<K, R>) {
  let str = "```mermaid\ngraph TD;";
  str += "\n  " + [...mermaidNodes(tree.root)].join("\n  ");
  str += "\n```\n";
  return str;
}
