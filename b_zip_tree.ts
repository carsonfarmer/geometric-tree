import { Item, ZipTree } from "./api.ts";
import { pad } from "./utils.ts";

/**
 * A new type of higher-order ZipTree implementation.
 */

export interface Node<K, R extends number = number> {
  rank: R;
  keys: Item<K, R>[];
  children: (Node<K, R> | undefined)[];
  size: number;
}

export class BZipTree<K, R extends number = number> implements ZipTree<K, R> {
  constructor(
    /**
     * The root node of the tree.
     */
    public root?: Node<K, R>,
  ) {}

  /**
   * Create an empty BZipTree.
   * @returns An empty BZipTree.
   */
  static empty<K, R extends number = number>() {
    return new BZipTree<K, R>();
  }

  /**
   * Create a BZipTree with a single item.
   * @param item The item to insert into the tree.
   * @returns A BZipTree with a single item.
   */
  static singleton<K, R extends number = number>(item: Item<K, R>) {
    return new BZipTree<K, R>(singleton(item));
  }

  /**
   * Create a BZipTree from a sorted array of items.
   * @param array The array of items to insert into the tree. The array must be pre-sorted by key.
   * @returns A BZipTree with the items from the array.
   */
  static from<K, R extends number = number>(
    array: Array<Item<K, R>>,
  ) {
    const root = from(array);
    return new BZipTree<K, R>(root);
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
    return new BZipTree<K, R>(root);
  }

  /**
   * Remove an item from the tree.
   * @param key The key of the item to remove.
   * @returns A new tree with the item removed.
   */
  remove(key: K) {
    const root = remove(key, this.root);
    return new BZipTree<K, R>(root);
  }

  /**
   * Split the input tree into two balanced sub-trees.
   * @param key The key to split the tree on.
   * @returns A tuple of the left and right trees.
   */
  unzip(key: K): [BZipTree<K, R>, BZipTree<K, R>] {
    const [left, right] = unzip(key, this.root);
    return [new BZipTree<K, R>(left), new BZipTree<K, R>(right)];
  }

  /**
   * Join another tree into this one.
   * @param other The other tree to join.
   * All of the keys in the other tree must be greater than the keys in this tree.
   * @returns A new tree with the two trees joined.
   */
  zip(other: BZipTree<K, R>) {
    const root = zip(this.root, other.root);
    return new BZipTree<K, R>(root);
  }

  /**
   * Create a single tree by zipping two input trees.
   * @param left An input tree.
   * @param right Another input tree.
   * All of the keys in the right tree must be greater than the keys in the left tree.
   * @returns A new tree with the two trees joined.
   */
  static zip<K, R extends number>(
    left: BZipTree<K, R>,
    right: BZipTree<K, R>,
  ) {
    const root = zip(left.root, right.root);
    return new BZipTree<K, R>(root);
  }

  /**
   * Return a string representation of the tree.
   * @returns A string representation of the tree.
   */
  toString() {
    return `BZipTree(${this.root?.keys.length}, ${this.root?.children.length})`;
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

export function sized<K, R extends number>(node: Node<K, R>) {
  const size = node.children.reduce(
    (size, child) => (child?.size ?? 0) + size,
    node.keys.length,
  );
  return { ...node, size };
}

export function singleton<K, R extends number>(item: Item<K, R>): Node<K, R> {
  return {
    keys: [item],
    children: [undefined, undefined],
    rank: item.rank,
    size: 1,
  };
}

/**
 * Find all indices of array where predicate returns `true`.
 * @param array The array to process.
 * @param predicate The function invoked per iteration.
 * @returns Returns an array of all indices for which the predicate function returns `true`.
 */
export function splits<T>(
  array: T[],
  predicate: (element: T) => boolean,
) {
  const initial: number[] = [];
  return array.reduce(
    (indices, element, index) =>
      predicate(element) ? [...indices, index] : indices,
    initial,
  );
}

/**
 * Split an array into multiple subsets using an array of indices.
 * The elements at the "found" indices are not included in the subsets.
 * @param array The array to process.
 * @param indices The indices at which to split the original array.
 * @returns Returns an array of the resulting subsets.
 */
export function subsets<T>(array: T[], indices: number[]): T[][] {
  const indexes = [-1, ...indices, array.length];
  return indexes
    .map((value, index, arr) =>
      index < arr.length - 1 ? array.slice(value + 1, arr[index + 1]) : null
    )
    .filter((x) => x != null) as unknown as T[][];
}

export function from<K, R extends number>(
  items: Item<K, R>[],
): Node<K, R> | undefined {
  if (items.length == 0) {
    return undefined;
  } else if (items.length == 1) {
    return singleton(items[0]);
  }
  // TODO: This is of course, not efficient... we can do this in a single pass!
  const rank = Math.max(...items.map(({ rank }) => rank)) as R;
  const _splits = splits(items, ({ rank: r }) => r === rank);
  const keys = _splits.map((index) => items[index]);
  const children = subsets(items, _splits).map(from);
  const size = children.reduce(
    (size, child) => (child?.size ?? 0) + size,
    keys.length,
  );
  return { keys, children, rank, size };
}

export function search<K, R extends number>(
  key: K,
  root?: Node<K, R>,
): Item<K, R> | undefined {
  if (root === undefined) {
    return undefined;
  }
  const index = root.keys.findIndex((item) => item.key >= key);
  if (root.keys[index]?.key === key) {
    return root.keys[index];
  } else {
    const child = root.children.at(index);
    return search(key, child);
  }
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
  const [left, right] = unzip(item.key, root);
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
  const [left, right] = unzip(key, root, true);
  return zip(left, right);
}

// Sub-operation for unzip (needs some cleanup)
export function splitNode<K, R extends number>(
  root: Node<K, R>,
  index: number,
  drop = false,
): [Node<K, R> | undefined, Node<K, R> | undefined] {
  const rank = root.rank;
  let left: Node<K, R> | undefined;
  {
    const keys = root.keys.slice(0, index + Number(!drop));
    let children = root.children.slice(0, index + 1);
    children = pad(children, keys.length + 1);
    const size = children.reduce(
      (size, child) => (child?.size ?? 0) + size,
      keys.length,
    );
    // If there are no left keys, but is a left child, then we need to promote the child.
    // We do this to maintain history independence.
    const _node = { keys, children, rank, size };
    const _child = children[0];
    left = keys.length > 0
      ? isEmpty(_node) ? undefined : _node
      : children.length > 0
      ? !isEmpty(_child) ? _child : undefined
      : undefined;
  }
  let right: Node<K, R> | undefined;
  {
    const keys = root.keys.slice(index + 1);
    const children = root.children.slice(index + 1);
    while (children.length <= keys.length) {
      children.unshift(undefined);
    }
    const size = children.reduce(
      (size, child) => (child?.size ?? 0) + size,
      keys.length,
    );
    const _node = { keys, children, rank, size };
    const _child = children[0];
    right = keys.length > 0
      ? isEmpty(_node) ? undefined : _node
      : children.length > 0
      ? !isEmpty(_child) ? _child : undefined
      : undefined;
  }

  return [left, right];
}

function isEmpty<K, R extends number>(node?: Node<K, R>) {
  return node === undefined || node.size === 0 ||
    (node.keys.length === 0 && node.children[0] === undefined);
}

// Sub-operation for unzip (needs some cleanup)
export function splitChild<K, R extends number>(
  root: Node<K, R>,
  index: number,
  key: K,
  child?: Node<K, R>,
  drop = false,
): [Node<K, R> | undefined, Node<K, R> | undefined] {
  const [_left, _right] = unzip(key, child, drop);
  const rank = root.rank;
  let left: Node<K, R> | undefined;
  {
    const keys = root.keys.slice(0, index);
    let children = [...root.children.slice(0, index), _left];
    children = pad(children, keys.length + 1);
    const size = children.reduce(
      (size, child) => (child?.size ?? 0) + size,
      keys.length,
    );
    const _node = { keys, children, rank, size };
    const _child = _left;
    left = keys.length > 0
      ? isEmpty(_node) ? undefined : _node
      : children.length > 0
      ? !isEmpty(_child) ? _child : undefined
      : undefined;
  }
  let right: Node<K, R> | undefined;
  {
    const keys = root.keys.slice(index);
    let children = [_right, ...root.children.slice(index + 1)];
    children = pad(children, keys.length + 1, true);
    const size = children.reduce(
      (size, child) => (child?.size ?? 0) + size,
      keys.length,
    );
    const _node = { keys, children, rank, size };
    const _child = _right;
    right = keys.length > 0
      ? isEmpty(_node) ? undefined : _node
      : children.length > 0
      ? !isEmpty(_child) ? _child : undefined
      : undefined;
  }
  return [left, right];
}

/**
 * Split the input tree into two balanced sub-trees.
 * @param key The key to split the tree on.
 * @param root The root node of the tree.
 * @param drop Whether to drop the node with the given key. Defaults to false for normal unzipping.
 * @returns A tuple of the left and right trees.
 */
export function unzip<K, R extends number>(
  key: K,
  root?: Node<K, R>,
  drop = false,
): [Node<K, R> | undefined, Node<K, R> | undefined] {
  if (root === undefined) {
    return [undefined, undefined];
  }
  let index = root.keys.findIndex((item) => item.key >= key);
  if (index < 0) {
    index = root.keys.length;
  }
  if (root.keys[index]?.key === key) {
    return splitNode(root, index, drop);
  } else {
    const child = root.children.at(index);
    return splitChild(root, index, key, child, drop);
  }
}

// Sub-operation for zip
export function mergeNodes<K, R extends number>(
  left: Node<K, R>,
  right: Node<K, R>,
): Node<K, R> | undefined {
  const keys = [...left.keys, ...right.keys];
  const innerLeft = left.children.at(-1);
  const innerRight = right.children.at(0);
  const inner = zip(innerLeft, innerRight);
  const children = [
    ...left.children.slice(0, -1),
    inner,
    ...right.children.slice(1),
  ];
  const rank = left.rank;
  const size = children.reduce(
    (size, child) => (child?.size ?? 0) + size,
    keys.length,
  );
  return { keys, children, rank, size };
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
    return mergeNodes(left, right);
  } else if (left.rank < right.rank) {
    const _left = zip(left, right.children[0]);
    return sized({
      ...right,
      children: [_left, ...right.children.slice(1)],
    });
  } else {
    const _right = zip(left.children.at(-1), right);
    return sized({
      ...left,
      children: [...left.children.slice(0, -1), _right],
    });
  }
}

export function* iter<K, R extends number>(
  root?: Node<K, R>,
): IterableIterator<Item<K, R>> {
  for (const { key, rank } of inOrder(root)) {
    yield { key, rank };
  }
}

export function* inOrder<K, R extends number>(
  root: Node<K, R> | undefined,
): IterableIterator<Item<K, R>> {
  if (root === undefined) {
    return;
  }
  for (const [i, item] of root.keys.entries()) {
    yield* inOrder(root.children[i]);
    yield item;
  }
  yield* inOrder(root.children.at(-1));
}

function* mermaidNodes<K, R extends number>(
  node?: Node<K, R>,
): Generator<string> {
  if (node === undefined) {
    return;
  }
  const nodeName = `${node.keys[0].key}-${node.keys[node.keys.length - 1].key}`;
  yield `${nodeName}[${nodeName}]`;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child !== undefined) {
      const childName = `${child.keys[0].key}-${
        child.keys[child.keys.length - 1].key
      }`;
      yield `${nodeName}-->${childName}`;
      yield* mermaidNodes(child);
    }
  }
}

export function mermaidDiagram<K, R extends number>(tree: BZipTree<K, R>) {
  let str = "```mermaid\ngraph TD;";
  str += "\n  " + [...mermaidNodes(tree.root)].join("\n  ");
  str += "\n```\n";
  return str;
}
