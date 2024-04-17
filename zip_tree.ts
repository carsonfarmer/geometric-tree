import { Item, ZipTree } from "./api.ts";

/**
 * A binary ZipTree implementation.
 */

/**
 * Node is a node in the BinaryZipTree.
 */
export interface Node<K> extends Item<K> {
  left: Node<K> | undefined;
  right: Node<K> | undefined;
  size: number;
}

/**
 * A BinaryZipTree is an immutable, probabilistically balanced binary tree with a geometric distribution of ranks.
 */
export class BinaryZipTree<K> implements ZipTree<K> {
  constructor(
    /**
     * The root node of the tree.
     */
    public root?: Node<K>,
  ) {}

  /**
   * Create an empty ZipTree.
   * @returns An empty ZipTree.
   */
  static empty<K = number>(): BinaryZipTree<K> {
    return new BinaryZipTree<K>();
  }

  /**
   * Create a ZipTree with a single item.
   * @param item The item to insert into the tree.
   * @returns A ZipTree with a single item.
   */
  static singleton<K = number>(
    item: Item<K>,
  ): BinaryZipTree<K> {
    return new BinaryZipTree<K>(singleton(item));
  }

  /**
   * Create a ZipTree from a sorted array of items.
   * @param array The array of items to insert into the tree. The array must be pre-sorted by key.
   * @returns A ZipTree with the items from the array.
   */
  static from<K = number>(
    array: ReadonlyArray<Item<K>>,
  ): BinaryZipTree<K> {
    const root = from(array);
    return new BinaryZipTree<K>(root);
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
  search(key: K): Item<K> | undefined {
    const node = search(key, this.root);
    return node ? { key: node.key, rank: node.rank } : undefined;
  }

  /**
   * Insert an item into the tree.
   * @param item The item to insert.
   * @returns A new tree with the item inserted.
   */
  insert(item: Item<K>) {
    const root = insert(item, this.root);
    return new BinaryZipTree<K>(root);
  }

  /**
   * Remove an item from the tree.
   * @param key The key of the item to remove.
   * @returns A new tree with the item removed.
   */
  remove(key: K) {
    const root = remove(key, this.root);
    return new BinaryZipTree<K>(root);
  }

  /**
   * Split the input tree into two balanced sub-trees.
   * @param key The key to split the tree on.
   * @returns A tuple of the left and right trees.
   */
  unzip(
    key: K,
  ): [BinaryZipTree<K>, Item<K> | undefined, BinaryZipTree<K>] {
    const [left, node, right] = unzip(key, this.root);
    return [
      new BinaryZipTree<K>(left),
      node,
      new BinaryZipTree<K>(right),
    ];
  }

  /**
   * Join another tree into this one.
   * @param other The other tree to join.
   * @invariant All of the keys in the other tree must be greater than the keys in this tree.
   * @returns A new tree with the two trees joined.
   */
  zip(other: BinaryZipTree<K>) {
    const root = zip(this.root, other.root);
    return new BinaryZipTree<K>(root);
  }

  /**
   * Create a single tree by zipping two input trees.
   * @param left An input tree.
   * @param right Another input tree.
   * All of the keys in the right tree must be greater than the keys in the left tree.
   * @returns A new tree with the two trees joined.
   */
  static zip<K>(
    left: BinaryZipTree<K>,
    right: BinaryZipTree<K>,
  ) {
    const root = zip(left?.root, right?.root);
    return new BinaryZipTree<K>(root);
  }

  /**
   * Return a string representation of the tree.
   * @returns A string representation of the tree.
   */
  toString() {
    return `BinaryZipTree(${this.root?.key}, ${this.root?.rank})`;
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
  toArray(): Array<Item<K>> {
    return [...iter(this.root)];
  }
}

export function sized<K>(node: Node<K>) {
  const size = (node.left?.size ?? 0) + (node.right?.size ?? 0) + 1;
  return { ...node, size };
}

export function singleton<K>(item: Item<K>): Node<K> {
  return { ...item, left: undefined, right: undefined, size: 1 };
}

export function from<K>(
  array: ReadonlyArray<Item<K>>,
): Node<K> | undefined {
  if (array.length == 0) {
    return undefined;
  }
  const ranks = array.map(({ rank }) => rank);
  const rank = Math.max(...ranks);
  const split = array.findIndex((item) => item.rank === rank);
  const left = from(array.slice(0, split));
  const right = from(array.slice(split + 1));
  const size = (left?.size ?? 0) + (right?.size ?? 0) + 1;
  return { ...array[split], left, right, size };
}

export function search<K>(
  key: K,
  root?: Node<K>,
): Node<K> | undefined {
  if (root === undefined) {
    return undefined;
  }
  if (root.key === key) {
    return root;
  }
  return search(key, root.key > key ? root.left : root.right);
}

export function _defaultInsert<K>(
  item: Item<K>,
  root?: Node<K>,
): Node<K> {
  if (root === undefined) {
    return singleton(item);
  }
  if (item.key < root.key) {
    const left = _defaultInsert(item, root.left);
    if (left.rank < root.rank) {
      return sized({ ...root, left });
    } else {
      const right = sized({ ...root, left: left.right });
      return sized({ ...left, right });
    }
  } else {
    const right = _defaultInsert(item, root.right);
    if (right.rank <= root.rank) {
      return sized({ ...root, right });
    } else {
      const left = sized({ ...root, right: right.left });
      return sized({ ...right, left });
    }
  }
}

export function insert<K>(
  item: Item<K>,
  root?: Node<K>,
): Node<K> | undefined {
  if (root === undefined) {
    return singleton(item);
  }
  const [left, _, right] = unzip(item.key, root);
  return zip(zip(left, singleton(item)), right);
}

/**
 * Not currently used.
 * @param key
 * @param root
 * @returns
 */
export function remove<K>(
  key: K,
  root?: Node<K>,
): Node<K> | undefined {
  if (root === undefined) {
    return undefined;
  } else if (key === root.key) {
    return zip(root.left, root.right);
  } else if (key < root.key) {
    if (key === root.left?.key) {
      const left = zip(root.left.left, root.left.right);
      return sized({ ...root, left });
    }
    const left = remove(key, root.left);
    return sized({ ...root, left });
  } else {
    if (key === root.right?.key) {
      const right = zip(root.right.left, root.right.right);
      return sized({ ...root, right });
    }
    const right = remove(key, root.right);
    return sized({ ...root, right });
  }
}

export function _del<K>(
  key: K,
  root?: Node<K>,
): Node<K> | undefined {
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
 * @param drop Whether to drop the node with the given key. Defaults to false for normal unzipping.
 * @returns A tuple of the left and right trees.
 */
export function unzip<K>(
  key: K,
  root?: Node<K>,
): [Node<K> | undefined, Item<K> | undefined, Node<K> | undefined] {
  if (root === undefined) {
    return [undefined, undefined, undefined];
  }
  if (root.key == key) {
    const right = root.right;
    const left = root.left;
    return [left, { key, rank: root.rank }, right];
  } else if (root.key < key) {
    const [next, n, right] = unzip(key, root.right);
    const left = sized({ ...root, right: next });
    return [left, n, right];
  } else {
    const [left, n, prev] = unzip(key, root.left);
    const right = sized({ ...root, left: prev });
    return [left, n, right];
  }
}

export function zip<K>(
  left?: Node<K>,
  right?: Node<K>,
): Node<K> | undefined {
  if (left === undefined) {
    return right;
  }
  if (right === undefined) {
    return left;
  }
  if (left.rank < right.rank) {
    const _left = zip(left, right.left);
    return sized({ ...right, left: _left });
  } else {
    const _right = zip(left.right, right);
    return sized({ ...left, right: _right });
  }
}

export function* iter<K>(
  root?: Node<K>,
): IterableIterator<Item<K>> {
  for (const { key, rank } of inOrder(root)) {
    yield { key, rank };
  }
}

export function* inOrder<K>(
  root?: Node<K>,
): IterableIterator<Node<K>> {
  if (root === undefined) {
    return;
  }
  yield* inOrder(root.left);
  yield root;
  yield* inOrder(root.right);
}

export function* depthFirst<K>(
  root?: Node<K>,
  maxDepth = Infinity,
  currentDepth = 0,
): IterableIterator<Node<K>> {
  if (root === undefined || currentDepth > maxDepth) {
    return;
  }
  yield root;
  yield* depthFirst(root.left, maxDepth, currentDepth + 1);
  yield* depthFirst(root.right, maxDepth, currentDepth + 1);
}

export function* breadthFirst<K>(
  root?: Node<K>,
  maxDepth = Infinity,
): IterableIterator<Node<K>> {
  if (root === undefined) {
    return;
  }
  const queue: Array<[Node<K>, number]> = [[root, 0]];
  while (queue.length > 0) {
    const [current, depth] = queue.shift()!;
    if (depth > maxDepth) {
      break;
    }
    yield current;
    if (current.left !== undefined) {
      queue.push([current.left, depth + 1]);
    }
    if (current.right !== undefined) {
      queue.push([current.right, depth + 1]);
    }
  }
}

function* mermaidNodes<K>(
  root: Node<K> | undefined,
): Generator<string> {
  if (root == null) {
    return;
  }
  const nodeKey = root.key;
  const nodeRank = root.rank;
  if (root.left) {
    const leftKey = root.left.key;
    const leftRank = root.left.rank;
    yield `${nodeKey}--${nodeRank}-${leftRank}-->${leftKey}`;
    yield* mermaidNodes(root.left);
  } else if (root.right) {
    yield `${nodeKey}-.->${nodeKey}null{ }`;
  }
  if (root.right) {
    const rightKey = root.right.key;
    const rightRank = root.right.rank;
    yield `${nodeKey}--${nodeRank}-${rightRank}-->${rightKey}`;
    yield* mermaidNodes(root.right);
  } else if (root.left) {
    yield `${nodeKey}-.->${nodeKey}null{ }`;
  }
}

export function mermaidDiagram<K>(
  tree: BinaryZipTree<K>,
) {
  let str = "```mermaid\nflowchart TB;";
  str += "\n  " + [...mermaidNodes(tree.root)].join("\n  ");
  str += "\n```\n";
  return str;
}
