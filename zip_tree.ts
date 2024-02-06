import { Item, ZipTree } from "./api.ts";

/**
 * A binary ZipTree implementation.
 */

/**
 * Node is a node in the BinaryZipTree.
 */
export interface Node<K, R extends number = number> extends Item<K, R> {
  left: Node<K, R> | undefined;
  right: Node<K, R> | undefined;
  size: number;
}

/**
 * A BinaryZipTree is an immutable, probabilistically balanced binary tree with a geometric distribution of ranks.
 */
export class BinaryZipTree<
  K,
  R extends number = number,
> implements ZipTree<K, R> {
  constructor(
    /**
     * The root node of the tree.
     */
    public root?: Node<K, R>,
  ) {}

  /**
   * Create an empty ZipTree.
   * @returns An empty ZipTree.
   */
  static empty<K, R extends number = number>(): BinaryZipTree<K, R> {
    return new BinaryZipTree<K, R>();
  }

  /**
   * Create a ZipTree with a single item.
   * @param item The item to insert into the tree.
   * @returns A ZipTree with a single item.
   */
  static singleton<K, R extends number = number>(
    item: Item<K, R>,
  ): BinaryZipTree<K, R> {
    return new BinaryZipTree<K, R>(singleton(item));
  }

  /**
   * Create a ZipTree from a sorted array of items.
   * @param array The array of items to insert into the tree. The array must be pre-sorted by key.
   * @returns A ZipTree with the items from the array.
   */
  static from<K, R extends number = number>(
    array: Array<Item<K, R>>,
  ): BinaryZipTree<K, R> {
    const root = from(array);
    return new BinaryZipTree<K, R>(root);
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
  search(key: K): Item<K, R> | undefined {
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
    return new BinaryZipTree<K, R>(root);
  }

  /**
   * Remove an item from the tree.
   * @param key The key of the item to remove.
   * @returns A new tree with the item removed.
   */
  remove(key: K) {
    const root = remove(key, this.root);
    return new BinaryZipTree<K, R>(root);
  }

  /**
   * Split the input tree into two balanced sub-trees.
   * @param key The key to split the tree on.
   * @returns A tuple of the left and right trees.
   */
  unzip(key: K): [BinaryZipTree<K, R>, BinaryZipTree<K, R>] {
    const [left, right] = unzip(key, this.root);
    return [
      new BinaryZipTree<K, R>(left),
      new BinaryZipTree<K, R>(right),
    ];
  }

  /**
   * Join another tree into this one.
   * @param other The other tree to join.
   * @invariant All of the keys in the other tree must be greater than the keys in this tree.
   * @returns A new tree with the two trees joined.
   */
  zip(other: BinaryZipTree<K, R>) {
    const root = zip(this.root, other.root);
    return new BinaryZipTree<K, R>(root);
  }

  /**
   * Create a single tree by zipping two input trees.
   * @param left An input tree.
   * @param right Another input tree.
   * All of the keys in the right tree must be greater than the keys in the left tree.
   * @returns A new tree with the two trees joined.
   */
  static zip<K, R extends number>(
    left: BinaryZipTree<K, R>,
    right: BinaryZipTree<K, R>,
  ) {
    const root = zip(left?.root, right?.root);
    return new BinaryZipTree<K, R>(root);
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
  toArray(): Array<Item<K, R>> {
    return [...iter(this.root)];
  }
}

export function sized<K, R extends number>(node: Node<K, R>) {
  const size = (node.left?.size ?? 0) + (node.right?.size ?? 0) + 1;
  return { ...node, size };
}

export function singleton<K, R extends number>(item: Item<K, R>): Node<K, R> {
  return { ...item, left: undefined, right: undefined, size: 1 };
}

export function from<K, R extends number>(
  array: Array<Item<K, R>>,
): Node<K, R> | undefined {
  if (array.length == 0) {
    return undefined;
  } else if (array.length == 1) {
    return singleton(array[0]);
  }
  const ranks = array.map(({ rank }) => rank);
  const maxRank = Math.max(...ranks);
  const splitIndex = array.findIndex(({ rank }) => rank === maxRank);
  const left = from(array.slice(0, splitIndex));
  const right = from(array.slice(splitIndex + 1));
  const size = (left?.size ?? 0) + (right?.size ?? 0) + 1;
  return { ...array[splitIndex], left, right, size };
}

export function search<K, R extends number>(
  key: K,
  root?: Node<K, R>,
): Node<K, R> | undefined {
  if (root === undefined) {
    return undefined;
  }
  if (root.key === key) {
    return root;
  } else if (root.key > key) {
    return search(key, root.left);
  } else {
    return search(key, root.right);
  }
}

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
 * Not currently used.
 * @param key
 * @param root
 * @returns
 */
function _defaultRemove<K, R extends number>(
  key: K,
  root?: Node<K, R>,
): Node<K, R> | undefined {
  if (root === undefined) {
    return undefined;
  } else if (key == root.key) {
    return zip(root.left, root.right);
  } else if (key < root.key) {
    if (key == root.left?.key) {
      const left = zip(root.left.left, root.left.right);
      return { ...root, left };
    }
    const left = remove(key, root.left);
    return { ...root, left };
  } else {
    if (key == root.right?.key) {
      const right = zip(root.right.left, root.right.right);
      return { ...root, right };
    }
    const right = remove(key, root.right);
    return { ...root, right };
  }
}

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
  if (root.key == key) {
    const right = root.right;
    const left = drop ? root.left : sized({ ...root, right: undefined });
    return [left, right];
  } else if (root.key < key) {
    const [_right, right] = unzip(key, root.right, drop);
    const left = sized({ ...root, right: _right });
    return [left, right];
  } else {
    const [left, _left] = unzip(key, root.left, drop);
    const right = sized({ ...root, left: _left });
    return [left, right];
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
  if (left.rank < right.rank) {
    const _left = zip(left, right.left);
    return sized({ ...right, left: _left });
  } else {
    const _right = zip(left.right, right);
    return sized({ ...left, right: _right });
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
  root?: Node<K, R>,
): IterableIterator<Node<K, R>> {
  if (root === undefined) {
    return;
  }
  yield* inOrder(root.left);
  yield root;
  yield* inOrder(root.right);
}

export function* depthFirst<K, R extends number>(
  root?: Node<K, R>,
  maxDepth = Infinity,
  currentDepth = 0,
): IterableIterator<Node<K, R>> {
  if (root === undefined || currentDepth > maxDepth) {
    return;
  }
  yield root;
  yield* depthFirst(root.left, maxDepth, currentDepth + 1);
  yield* depthFirst(root.right, maxDepth, currentDepth + 1);
}

export function* breadthFirst<K, R extends number>(
  root?: Node<K, R>,
  maxDepth = Infinity,
): IterableIterator<Node<K, R>> {
  if (root === undefined) {
    return;
  }
  const queue: Array<[Node<K, R>, number]> = [[root, 0]];
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

function* mermaidNodes<K, R extends number>(
  root: Node<K, R> | undefined,
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

export function mermaidDiagram<K, R extends number>(
  tree: BinaryZipTree<K, R>,
) {
  let str = "```mermaid\nflowchart TB;";
  str += "\n  " + [...mermaidNodes(tree.root)].join("\n  ");
  str += "\n```\n";
  return str;
}
