import { Item, ZipTree } from "./api.ts";

/**
 * A new type of higher-order ZipTree implementation.
 */

export interface Node<K, R extends number> {
  rank: R;
  keys: Item<K, R>[];
  children: (Node<K, R> | undefined)[];
}

export class BZipTree<K, R extends number> implements ZipTree<K, R> {
  constructor(
    public root?: Node<K, R>,
  ) {}

  static empty<K, R extends number>() {
    return new BZipTree<K, R>();
  }

  static singleton<K, R extends number>(item: Item<K, R>) {
    return new BZipTree<K, R>(singleton(item));
  }

  static from<K, R extends number>(
    array: Array<Item<K, R>>,
  ) {
    const root = from(array);
    return new BZipTree<K, R>(root);
  }

  isEmpty() {
    return this.root === undefined;
  }

  search(key: K) {
    const node = search(key, this.root);
    return node ? { key: node.key, rank: node.rank } : undefined;
  }

  insert(item: Item<K, R>) {
    const root = insert(item, this.root);
    return new BZipTree<K, R>(root);
  }

  remove(key: K) {
    const root = remove(key, this.root);
    return new BZipTree<K, R>(root);
  }

  unzip(key: K): [BZipTree<K, R>, BZipTree<K, R>] {
    const [left, right] = unzip(key, this.root);
    return [new BZipTree<K, R>(left), new BZipTree<K, R>(right)];
  }

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
    const root = zip(left?.root, right?.root);
    return new BZipTree<K, R>(root);
  }

  toString() {
    return `BZipTree(${this.root?.keys.length}, ${this.root?.children.length})`;
  }

  [Symbol.iterator]() {
    return inOrder(this.root);
  }

  toArray(): Array<Item<K, R>> {
    return [...inOrder(this.root)].map(({ key, rank }) => ({ key, rank }));
  }
}

export function singleton<K, R extends number>(item: Item<K, R>) {
  return {
    keys: [item],
    children: [undefined, undefined],
    rank: item.rank,
  };
}

/**
 * Find all indices of array where predicate returns `true`.
 *
 * @param array The array to process.
 * @param predicate The function invoked per iteration.
 * @returns Returns an array of all indices for which the predicate function returns `true`.
 */
function findAllIndices<T>(
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
 *
 * @template T
 * @param array The array to process.
 * @param indices The indices at which to split the original array.
 * @returns Returns an array of the resulting subsets.
 */
function splitByIndices<T>(array: T[], indices: number[]): T[][] {
  const indexes = [-1, ...indices, array.length];
  return indexes
    .map((value, index, arr) =>
      index < arr.length - 1 ? array.slice(value + 1, arr[index + 1]) : null
    )
    .filter((x) => x != null) as unknown as T[][];
}

/**
 * Map an array of values to a k-ary zip tree.
 * @param array The input array.
 */
export function from<K, R extends number>(
  keys: Item<K, R>[],
): Node<K, R> | undefined {
  if (keys.length == 0) {
    return undefined;
  } else if (keys.length == 1) {
    return { keys, children: [undefined, undefined], rank: keys[0].rank };
  }
  // TODO: This is of course, not efficient... we can do this in a single pass!
  const maxRank = Math.max(...keys.map(({ rank }) => rank));
  const splitIndexes = findAllIndices(keys, ({ rank }) => rank == maxRank);
  const _keys = splitIndexes.map((index) => keys[index]);
  const children = splitByIndices(keys, splitIndexes).map(from);
  return { keys: _keys, children, rank: maxRank as R };
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
  let index = root.keys.findIndex((item) => item.key >= key);
  if (index < 0) {
    index = root.keys.length;
  }
  if (root.keys[index]?.key === key) {
    const leftKeys = root.keys.slice(0, index + Number(!drop));
    const leftChildren = root.children.slice(0, index + 1);
    while (leftChildren.length <= leftKeys.length) {
      leftChildren.push(undefined);
    }
    const rightKeys = root.keys.slice(index + 1);
    const rightChildren = root.children.slice(index + 1);
    while (rightChildren.length <= rightKeys.length) {
      rightChildren.unshift(undefined);
    }
    const left = leftKeys.length > 0 || leftChildren.length > 0
      ? {
        keys: leftKeys,
        children: leftChildren,
        rank: root.rank,
      }
      // If there are no left keys, but is a left child, then we need to promote the child.
      // We do this to maintain history independence. Because a node like this wouldn't occur
      // in a zip tree created in a "top down", or from scratch, manner.
      : leftChildren.length > 0
      ? leftChildren[0]
      : undefined;
    const right = rightKeys.length > 0
      ? {
        keys: rightKeys,
        children: rightChildren,
        rank: root.rank,
      }
      // Same here.
      : rightChildren.length > 0
      ? rightChildren[0]
      : undefined;
    return [left, right];
  } else {
    const child = root.children.at(index);
    const [left, right] = unzip(key, child, drop);
    const leftKeys = root.keys.slice(0, index);
    const rightKeys = root.keys.slice(index);
    const leftChildren = root.children.slice(0, index).concat(left);
    while (leftChildren.length <= leftKeys.length) {
      leftChildren.push(undefined);
    }
    const _left = leftKeys.length > 0
      ? {
        keys: leftKeys,
        children: leftChildren,
        rank: root.rank,
      }
      : left;
    const rightChildren = [right].concat(
      root.children.slice(index + 1),
    );
    while (rightChildren.length <= rightKeys.length) {
      rightChildren.unshift(undefined);
    }
    const _right = rightKeys.length > 0
      ? {
        keys: rightKeys,
        children: rightChildren,
        rank: root.rank,
      }
      : right;
    return [_left, _right];
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
    return { keys, children, rank };
  } else if (left.rank < right.rank) {
    const _left = zip(left, right.children[0]);
    return {
      ...right,
      children: [_left, ...right.children.slice(1)],
    };
  } else {
    const _right = zip(left.children.at(-1), right);
    return {
      ...left,
      children: [...left.children.slice(0, -1), _right],
    };
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
