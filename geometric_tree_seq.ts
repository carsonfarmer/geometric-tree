import { Item } from "./api.ts";
import { from, iter, Node, norm, singleton, zip } from "./geometric_tree.ts";
import { split as _split, unshift as _unshift } from "./array_ops.ts";
import { List } from "./list.ts";

export class GeometricSequence<K> {
  constructor(
    /**
     * The root node of the tree.
     */
    public root: Node<K> | undefined,
    public create: <T>() => List<T>,
  ) {}

  /**
   * Create an empty ZipTree.
   * @returns An empty ZipTree.
   */
  static empty<K>(create: <T>() => List<T>): GeometricSequence<K> {
    return new GeometricSequence<K>(undefined, create);
  }

  /**
   * Create a ZipTree with a single item.
   * @param item The item to insert into the tree.
   * @returns A ZipTree with a single item.
   */
  static singleton<K>(
    item: Item<K>,
    create: <T>() => List<T>,
  ): GeometricSequence<K> {
    return new GeometricSequence<K>(singleton(item, create), create);
  }

  /**
   * Create a ZipTree from a sorted array of items.
   * @param array The array of items to insert into the tree. The array must be pre-sorted by key.
   * @returns A ZipTree with the items from the array.
   */
  static from<K>(
    array: ReadonlyArray<Item<K>>,
    create: <T>() => List<T>,
  ): GeometricSequence<K> {
    const root = from(array, create);
    return new GeometricSequence<K>(root, create);
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
   * Insert an item into the tree.
   * @param item The item to insert.
   * @param i The index at which to insert the item.
   * @returns A new tree with the item inserted.
   */
  insert(i: number, item: Item<K>) {
    const root = insert(i, item, this.root, this.create);
    return new GeometricSequence<K>(root, this.create);
  }

  /**
   * Remove an item from the tree.
   * @param key The key of the item to remove.
   * @returns A new tree with the item removed.
   */
  remove(i: number) {
    const root = remove(i, this.root);
    return new GeometricSequence<K>(root, this.create);
  }

  /**
   * Return the first n elements of the sequence.
   * @param n The number of elements to return.
   * @returns A new sequence with the first n elements of the sequence.
   */
  first(n: number) {
    const root = first(n, this.root);
    return new GeometricSequence<K>(root, this.create);
  }

  /**
   * Return the last n elements of the sequence.
   * @param n The number of elements to return.
   * @returns A new sequence with the last n elements of the sequence.
   */
  last(n: number) {
    const root = last(n, this.root);
    return new GeometricSequence<K>(root, this.create);
  }

  /**
   * Return the element at the given index.
   * @param i The index of the element to return.
   * @returns The element at the given index.
   */
  at(i: number): Item<K> | undefined {
    return at(i, this.root);
  }

  /**
   * Appends a new element to the end of the sequence.
   * @param item New element to add to the array.
   */
  push(item: Item<K>) {
    const root = push(item, this.root, this.create);
    return new GeometricSequence<K>(root, this.create);
  }

  /**
   * Inserts a new element at the start of the sequence.
   * @param item Element to insert at the start of the array.
   */
  unshift(item: Item<K>) {
    const root = unshift(item, this.root, this.create);
    return new GeometricSequence<K>(root, this.create);
  }

  /**
   * Returns a copy of a section of a sequence.
   * For both start and end, a negative index can be used to indicate an offset from the end of the array.
   * @param start The beginning index of the specified portion of the array.
   * If start is undefined, then the slice begins at index 0.
   * @param end The end index of the specified portion of the array.
   * This is exclusive of the element at the index 'end'. If end is undefined, then the slice extends to the end of the array.
   */
  slice(start = 0, end = this.length()) {
    const length = this.length();
    if (start < 0) {
      start = Math.max(length + start, 0);
    } else {
      start = Math.min(start, length);
    }
    if (end < 0) {
      end = Math.max(length + end, 0) - 1;
    } else if (end < length) {
      end = Math.min(end, length) - 1;
    }
    const offset = length - start;
    const front = last(offset, this.root);
    const root = first(end - start, front);
    return new GeometricSequence<K>(root, this.create);
  }

  split(i: number) {
    const [left, right] = split(i, this.root);
    return [
      new GeometricSequence<K>(left, this.create),
      new GeometricSequence<K>(right, this.create),
    ];
  }

  /**
   * Return a string representation of the sequence.
   * @returns A string representation of the sequence.
   */
  toString() {
    return `GeometricSequence(${this.root?.rank}, ${this.root?.size})`;
  }

  /**
   * Return an Iterator over the items in the sequence.
   * @returns An Iterator over the items in the sequence.
   */
  [Symbol.iterator]() {
    return iter(this.root);
  }

  /**
   * Return an array of the in-order items in the sequence.
   * @returns An array of the in-order items in the sequence.
   */
  toArray(): Array<Item<K>> {
    return [...iter(this.root)];
  }
}

export function unzip<K>(
  offset: number,
  root?: Node<K>,
): [Node<K> | undefined, Item<K> | undefined, Node<K> | undefined] {
  if (root === undefined) {
    return [undefined, undefined, undefined];
  }
  let remainder = offset;
  const [lefts, node, rights] = root.items.split(
    ({ value }) => {
      const size = (value?.size ?? 0) + 1;
      const result = size >= remainder;
      remainder -= size;
      return result;
    },
  );
  if (node === undefined) {
    const [next, n, right] = unzip(remainder, root.next);
    const left = norm({ ...root, next });
    return [left, n, right];
  } else if (remainder === 0) {
    const left = norm({ ...root, items: lefts, next: node.value });
    const right = norm({ ...root, items: rights });
    const n = { key: node.key, rank: root.rank };
    return [left, n, right];
  } else {
    const size = node.value?.size ?? 0;
    const [next, n, value] = unzip(size + remainder + 1, node.value);
    const left = norm({ ...root, items: lefts, next });
    const items = rights.unshift({ key: node.key, value });
    const right = norm({ ...root, items });
    return [left, n, right];
  }
}

export function first<K>(
  offset: number,
  root?: Node<K>,
): Node<K> | undefined {
  const [left, _node, _right] = unzip(offset + 1, root);
  return left;
}

export function last<K>(
  offset: number,
  root?: Node<K>,
): Node<K> | undefined {
  const n = (root?.size ?? 0) - offset;
  const [_left, _node, right] = unzip(n, root);
  return right;
}

/**
 * Split the input tree into two balanced sub-trees.
 * @param i The index to split the tree on.
 * @param root The root of the tree.
 * @returns A tuple of the left and right trees.
 */
export function split<K>(
  i: number,
  root: Node<K> | undefined,
): [Node<K> | undefined, Node<K> | undefined] {
  return [first(i, root), last((root?.size ?? 0) - i, root)];
}

export function push<K>(
  x: Item<K>,
  root: Node<K> | undefined,
  create: <T>() => List<T>,
) {
  return zip(root, singleton(x, create));
}

/**
 * Prepend a node to the start of the sequence represented by the input tree.
 */
export function unshift<K>(
  x: Item<K>,
  root: Node<K> | undefined,
  create: <T>() => List<T>,
) {
  return zip(singleton(x, create), root);
}

/**
 * Insert a node at the given index into the sequence represented by the input tree.
 */
export function insert<K>(
  i: number,
  x: Item<K>,
  root: Node<K> | undefined,
  create: <T>() => List<T>,
) {
  if (root === undefined || i > root.size || i < 0) {
    if (i == 0) {
      return singleton(x, create);
    } else {
      return undefined;
    }
  }
  return zip(
    first(i, root),
    unshift(x, last((root?.size ?? 0) - i, root), create),
  );
}

/**
 * Delete the node at the given index from the sequence represented by the input tree.
 */
export function remove<K>(
  i: number,
  root?: Node<K>,
) {
  return zip(
    first(i, root),
    last((root?.size ?? 0) - i - 1, root),
  );
}

/**
 * Return the node at the given index from the sequence represented by the input tree.
 */
export function at<K>(
  i: number,
  root?: Node<K>,
) {
  if (root === undefined || (i > 0 && i > root.size)) {
    return undefined;
  }
  if (i < 0) {
    i = root.size + i;
  }
  const [, node] = unzip(Math.min(i + 1, root.size), root);
  return node;
}
