import { Item } from "./api.ts";
import { from, iter, Node, singleton, zip } from "./zip_tree.ts";

/**
 * A BinaryZipTree is an immutable, probabilistically balanced binary tree with a geometric distribution of ranks.
 */
export class ZipSequence<K> {
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
  static empty<K>(): ZipSequence<K> {
    return new ZipSequence<K>();
  }

  /**
   * Create a ZipTree with a single item.
   * @param item The item to insert into the tree.
   * @returns A ZipTree with a single item.
   */
  static singleton<K>(
    item: Item<K>,
  ): ZipSequence<K> {
    return new ZipSequence<K>(singleton(item));
  }

  /**
   * Create a ZipTree from a sorted array of items.
   * @param array The array of items to insert into the tree. The array must be pre-sorted by key.
   * @returns A ZipTree with the items from the array.
   */
  static from<K>(
    array: ReadonlyArray<Item<K>>,
  ): ZipSequence<K> {
    const root = from(array);
    return new ZipSequence<K>(root);
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
    const root = insert(i, item, this.root);
    return new ZipSequence<K>(root);
  }

  /**
   * Remove an item from the tree.
   * @param key The key of the item to remove.
   * @returns A new tree with the item removed.
   */
  remove(i: number) {
    const root = remove(i, this.root);
    return new ZipSequence<K>(root);
  }

  /**
   * Return the first n elements of the sequence.
   * @param n The number of elements to return.
   * @returns A new sequence with the first n elements of the sequence.
   */
  first(n: number) {
    const root = first(n, this.root);
    return new ZipSequence<K>(root);
  }

  /**
   * Return the last n elements of the sequence.
   * @param n The number of elements to return.
   * @returns A new sequence with the last n elements of the sequence.
   */
  last(n: number) {
    const root = last(n, this.root);
    return new ZipSequence<K>(root);
  }

  /**
   * Return the element at the given index.
   * @param i The index of the element to return.
   * @returns The element at the given index.
   */
  at(i: number): Item<K> | undefined {
    const length = this.length();
    if (i < 0) {
      i = length + i;
    }
    const root = at(i, this.root);
    return root !== undefined ? { key: root.key, rank: root.rank } : undefined;
  }

  /**
   * Appends a new element to the end of the sequence.
   * @param item New element to add to the array.
   */
  push(item: Item<K>) {
    const root = push(item, this.root);
    return new ZipSequence<K>(root);
  }

  /**
   * Inserts a new element at the start of the sequence.
   * @param item Element to insert at the start of the array.
   */
  unshift(item: Item<K>) {
    const root = unshift(item, this.root);
    return new ZipSequence<K>(root);
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
    return new ZipSequence<K>(root);
  }

  split(i: number) {
    const [left, right] = split(i, this.root);
    return [new ZipSequence<K>(left), new ZipSequence<K>(right)];
  }

  /**
   * Return a string representation of the sequence.
   * @returns A string representation of the sequence.
   */
  toString() {
    return `ZipSequence(${this.root?.key}, ${this.root?.rank})`;
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

export function first<K>(
  n: number,
  root?: Node<K>,
): Node<K> | undefined {
  if (n == 0 || root === undefined) {
    return undefined;
  } else if (n == root.size) {
    return root;
  }
  const leftSize = root.left?.size ?? 0;
  if (n <= leftSize) {
    return first(n, root.left);
  } else {
    const length = n - leftSize - 1;
    const right = first(length, root.right);
    const rightSize = right?.size ?? 0;
    const size = leftSize + 1 + rightSize;
    return { ...root, right, size };
  }
}

export function last<K>(
  n: number,
  root?: Node<K>,
): Node<K> | undefined {
  if (n == 0 || root === undefined) {
    return undefined;
  } else if (n == root.size) {
    return root;
  }
  const rightSize = root.right?.size ?? 0;
  if (n <= rightSize) {
    return last(n, root.right);
  } else {
    const length = n - rightSize - 1;
    const left = last(length, root.left);
    const leftSize = left?.size ?? 0;
    const size = rightSize + 1 + leftSize;
    return { ...root, left, size };
  }
}

/**
 * Split the input tree into two balanced sub-trees.
 * @param i The index to split the tree on.
 * @param root The root of the tree.
 * @returns A tuple of the left and right trees.
 */
export function split<K>(
  i: number,
  root?: Node<K>,
): [Node<K> | undefined, Node<K> | undefined] {
  if (root === undefined) {
    return [undefined, undefined];
  }
  return [first(i, root), last(root.size - i, root)];
}

export function push<K>(x: Item<K>, root?: Node<K>) {
  if (root == null) {
    return singleton(x);
  }
  // return insert(x, root.size, root);
  return zip(root, singleton(x));
}

/**
 * Prepend a node to the start of the sequence represented by the input tree.
 */
export function unshift<K>(x: Item<K>, root?: Node<K>) {
  if (root == null) {
    return singleton(x);
  }
  // return insert(x, 0, root);
  return zip(singleton(x), root);
}

/**
 * Insert a node at the given index into the sequence represented by the input tree.
 */
export function insert<K>(
  i: number,
  x: Item<K>,
  root?: Node<K>,
) {
  if (root === undefined || i > root.size || i < 0) {
    if (i == 0) {
      return singleton(x);
    } else {
      return undefined;
    }
  }
  return zip(first(i, root), zip(singleton(x), last(root.size - i, root)));
}

/**
 * Delete the node at the given index from the sequence represented by the input tree.
 */
export function remove<K>(
  i: number,
  root?: Node<K>,
) {
  if (root === undefined) {
    return undefined;
  }
  return zip(first(i, root), last(root.size - i - 1, root));
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
  return last(1, first(i + 1, root));
}
