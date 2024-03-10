/**
 * Item is a key and rank pair.
 */
export type Item<K> = {
  /**
   * The key of the item. The type is generic, but should be comparable.
   */
  key: K;
  /**
   * The rank of the item. Should be drawn from a geometric distribution.
   * Most operations on a ZipTree are O(n log n) in the average case, but
   * can degrade to O(n²) in the worst case if ranks aren't geometrically
   * distributed.
   */
  rank: number;
};

// TODO: How to implement this while retaining the return type of the implementation?
export interface ZipTreeConstructor {
  new <K>(): ZipTree<K>;
  /**
   * Create an empty ZipTree.
   * @returns An empty ZipTree.
   */
  empty<K>(): ZipTree<K>;
  /**
   * Create a ZipTree with a single item.
   * @param item The item to insert into the tree.
   * @returns A ZipTree with a single item.
   */
  singleton<K>(item: Item<K>): ZipTree<K>;

  /**
   * Create a ZipTree from a sorted array of items.
   * @param array The array of items to insert into the tree. The array must be sorted by key.
   * @returns A ZipTree with the items from the array.
   */
  from<K>(
    array: Array<Item<K>>,
  ): ZipTree<K>;
}

/**
 * A ZipTree is an immutable, probabilistically balanced tree with a geometric distribution of ranks.
 */
export interface ZipTree<K> {
  /**
   * Check if the tree is empty.
   * @returns Whether the tree is empty.
   */
  isEmpty(): boolean;

  /**
   * Search for a key in the tree.
   * @param key The key to search for.
   * @returns The item with the given key if it exists in the tree, otherwise undefined.
   */
  search(key: K): Item<K> | undefined;

  /**
   * Insert an item into the tree.
   * @param item The item to insert.
   * @returns A new tree with the item inserted.
   */
  insert(item: Item<K>): ZipTree<K>;

  /**
   * Remove an item from the tree.
   * @param key The key of the item to remove.
   * @returns A new tree with the item removed.
   */
  remove(key: K): ZipTree<K>;

  /**
   * Split the input tree into two balanced sub-trees.
   * @param key The key to split the tree on.
   * @returns A tuple of the left and right trees.
   */
  unzip(key: K): [ZipTree<K>, Item<K> | undefined, ZipTree<K>];

  /**
   * Join another tree into this one.
   * @param other The other tree to join.
   * All of the keys in the other tree must be greater than the keys in this tree.
   * @returns A new tree with the two trees joined.
   */
  zip(other: ZipTree<K>): ZipTree<K>;

  /**
   * Return a string representation of the tree.
   * @returns A string representation of the tree.
   */
  toString(): string;

  /**
   * Return an Iterator over the items in the tree.
   * @returns An Iterator over the items in the tree.
   */
  [Symbol.iterator](): IterableIterator<Item<K>>;

  /**
   * Return an array of the in-order items in the tree.
   * @returns An array of the in-order items in the tree.
   */
  toArray(): Array<Item<K>>;
}
