import { Item } from "./api.ts";
import { List } from "./list.ts";

export type Pair<K> = { key: K; value?: Node<K> };

export { type Item };

export interface Node<K> {
  rank: number;
  items: List<Pair<K>>;
  size: number;
  next?: Node<K>;
}

export class GeometricTree<K> { //implements ZipTree<K> {
  constructor(
    public root: Node<K> | undefined,
    public create: <T>() => List<T>,
  ) {}

  /**
   * Create an empty GeneralizedZipTree.
   * @returns An empty GeneralizedZipTree.
   */
  static empty<K>(create: <T>() => List<T>) {
    return new GeometricTree<K>(undefined, create);
  }

  /**
   * Create a GeneralizedZipTree with a single item.
   * @param item The item to insert into the tree.
   * @returns A GeneralizedZipTree with a single item.
   */
  static singleton<K>(
    item: Item<K>,
    create: <T>() => List<T>,
  ) {
    return new GeometricTree<K>(singleton(item, create), create);
  }

  /**
   * Create a GeneralizedZipTree from a sorted array of items.
   * @param array The array of items to insert into the tree. The array must be pre-sorted by key.
   * @returns A GeneralizedZipTree with the items from the array.
   */
  static from<K>(
    array: ReadonlyArray<Item<K>>,
    create: <T>() => List<T>,
  ) {
    const root = from(array, create);
    return new GeometricTree<K>(root, create);
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
  insert(item: Item<K>): GeometricTree<K> {
    const root = insert(item, this.root, this.create);
    return new GeometricTree<K>(root, this.create);
  }

  /**
   * Remove an item from the tree.
   * @param key The key of the item to remove.
   * @returns A new tree with the item removed.
   */
  remove(key: K): GeometricTree<K> {
    const root = remove(key, this.root);
    return new GeometricTree<K>(root, this.create);
  }

  /**
   * Split the input tree into two balanced sub-trees.
   * @param key The key to split the tree on.
   * @returns A tuple of the left and right trees.
   */
  unzip(
    key: K,
  ): [GeometricTree<K>, GeometricTree<K>] {
    const [left, right] = unzip(key, this.root);
    return [
      new GeometricTree<K>(left, this.create),
      new GeometricTree<K>(right, this.create),
    ];
  }

  /**
   * Join another tree into this one.
   * @param other The other tree to join.
   * All of the keys in the other tree must be greater than the keys in this tree.
   * @returns A new tree with the two trees joined.
   */
  zip(other: GeometricTree<K>): GeometricTree<K> {
    const root = zip(this.root, other.root);
    return new GeometricTree<K>(root, this.create);
  }

  /**
   * Create a single tree by zipping two input trees.
   * @param left An input tree.
   * @param right Another input tree.
   * All of the keys in the right tree must be greater than the keys in the left tree.
   * @returns A new tree with the two trees joined.
   */
  static zip<K>(
    left: GeometricTree<K>,
    right: GeometricTree<K>,
    create: <T>() => List<T>,
  ): GeometricTree<K> {
    const root = zip(left.root, right.root);
    return new GeometricTree<K>(root, create);
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
  toArray(): Array<Item<K>> {
    return [...iter(this.root)];
  }
}

export function sized<K>(
  node: Omit<Node<K>, "size">,
): Node<K> {
  let size = 0;
  for (const item of node.items) {
    size += (item?.value?.size ?? 0) + 1;
  }
  size += node.next?.size ?? 0;
  return { ...node, size };
}

export function norm<K>(
  node: Omit<Node<K>, "size">,
): Node<K> | undefined {
  return node.items.isEmpty() ? node.next : sized(node);
}

export function singleton<K>(
  item: Item<K>,
  create: <K>() => List<K>,
): Node<K> {
  return {
    items: create<Pair<K>>().push({ key: item.key, value: undefined }),
    rank: item.rank,
    size: 1,
    next: undefined,
  };
}

export function from<K>(
  values: ReadonlyArray<Item<K>>,
  create: <T>() => List<T>,
): Node<K> | undefined {
  if (values.length == 0) {
    return undefined;
  }
  const rank = Math.max(...values.map((item) => item.rank));
  const splits = Array
    .from(values.entries())
    .filter(([, item]) => item.rank === rank)
    .map(([i]) => i);
  const items = splits.reduce((acc, curr, i, arr) => {
    const start = arr[i - 1] + 1 ?? 0;
    const subset = values.slice(start, curr);
    return acc.push({
      key: values[curr].key,
      value: from(subset, create),
    });
  }, create<Pair<K>>());
  const next = from(values.slice(splits[splits.length - 1] + 1), create);
  return sized({ items, rank, next });
}

export function search<K>(
  key: K,
  root?: Node<K>,
): (Item<K> & { size: number }) | undefined {
  if (root === undefined) {
    return undefined;
  }
  const item = root.items.find((item) => item.key >= key);
  if (item?.key === key) {
    const size = item.value?.size ?? 0;
    return { key: item.key, rank: root.rank, size };
  }
  const next = item?.value ?? root.next;
  return search(key, next);
}

/**
 * This is identical to the insert operation in the ZipTree implementation.
 * The differences are in the underlying zip and unzip functions.
 * We _could_ actually just use the ZipTree insert operation here, but
 * curry them by injecting the correct (un)zip function. But for now, we'll
 * keep them separate.
 */
export function _put<K>(
  item: Item<K>,
  root: Node<K> | undefined,
  create: <T>() => List<T>,
): Node<K> | undefined {
  if (root === undefined) {
    return singleton(item, create);
  }
  const [left, right] = unzip(item.key, root);
  return zip(zip(left, singleton(item, create)), right);
}

/**
 * An elegant recursive implementation of the delete operation defined in terms of unzip and zip.
 */
export function _del<K>(
  key: K,
  root?: Node<K>,
): Node<K> | undefined {
  if (root === undefined) {
    return undefined;
  }
  const [left, right] = unzip(key, root);
  return zip(left, right);
}

export function insert<K>(
  node: Item<K>,
  root: Node<K> | undefined,
  create: <T>() => List<T>,
): Node<K> {
  if (root === undefined) {
    return singleton(node, create);
  }
  // Search the current node
  const [lefts, item, rights] = root.items.split(
    (item) => item.key >= node.key,
  );
  if (item) {
    // Short-circuit to avoid duplicate keys
    if (item.key === node.key) {
      return root;
    }
    // Search left
    const left = insert(node, item.value, create);
    if (left.rank < root.rank) {
      const items = lefts.push({ ...item, value: left }).join(rights);
      return norm({ ...root, items })!;
    } else if (left.rank === root.rank) {
      const items = lefts
        .join(left.items)
        .push({ ...item, value: left.next })
        .join(rights);
      return norm({ ...root, items })!;
    } // else if (left.rank > root.rank) {
    const rightItems = rights.unshift({ ...item, value: left.next });
    const next = norm({ ...root, items: rightItems });
    const last = left.items.last()!;
    const value = norm({ ...root, items: lefts, next: last.value });
    const leftItems = left.items.pop().push({ ...last, value });
    return norm({ ...left, items: leftItems, next })!;
  } else {
    // Search right
    const right = insert(node, root.next, create);
    if (right.rank < root.rank) {
      const items = lefts;
      return norm({ ...root, items, next: right })!;
    } else if (right.rank === root.rank) {
      const items = lefts.join(right.items);
      return norm({ ...root, items, next: right.next })!;
    } // else if (right.rank > root.rank) {
    const last = right.items.last()!;
    const value = norm({ ...root, items: lefts, next: last.value });
    const items = right.items.pop().push({ ...last, value });
    return norm({ ...right, items })!;
  }
}

export function remove<K>(
  key: K,
  root?: Node<K>,
): Node<K> | undefined {
  if (root === undefined) {
    return undefined;
  }
  // Search the current node
  const [lefts, item, rights] = root.items.split(
    (item) => item.key >= key,
  );
  if (item) {
    if (item.key === key) {
      // Found it, remove it and zip the children
      const left = norm({ ...root, items: lefts, next: item.value });
      const right = norm({ ...root, items: rights });
      return zip(left, right);
    }
    // Search left
    const value = remove(key, item.value);
    const items = lefts.push({ ...item, value }).join(rights);
    return norm({ ...root, items });
  }
  // Search right
  const next = remove(key, root.next);
  const items = lefts.join(rights);
  return norm({ ...root, items, next });
}

/**
 * unzip function that uses continuation-passing style to achieve tail recursion.
 * @param key The search key.
 * @param root The root node.
 * @param cont Continuation function.
 * @returns Tuple of the left, target, and right trees.
 */
export function unzip<K>(
  key: K,
  root?: Node<K>,
  cont: (
    left?: Node<K>,
    right?: Node<K>,
  ) => [Node<K>?, Node<K>?] = (l, r) => [l, r],
): [Node<K>?, Node<K>?] {
  if (root === undefined) {
    return cont(undefined, undefined);
  }
  const [lefts, node, rights] = root.items.split(
    (item) => item.key >= key,
  );
  if (node) {
    if (node.key === key) {
      // If we actually found it exactly... remove it and return the two sides
      const left = norm({ ...root, items: lefts, next: node.value });
      const right = norm({ ...root, items: rights });
      return cont(left, right);
    }
    // Otherwise, move down the tree to keep looking for the key
    return unzip(key, node.value, (next, value) => {
      const left = norm({ ...root, items: lefts, next });
      const items = rights.unshift({ ...node, value });
      const right = norm({ ...root, items });
      return cont(left, right);
    });
  }
  // If we didn't find it, skip to the next node
  return unzip(key, root.next, (next, right) => {
    // Items already is equal to lefts... we're just showing it explicitly here
    const left = norm({ ...root, items: lefts, next });
    return cont(left, right);
  });
}

// /**
//  * Split the input tree into two balanced sub-trees.
//  * @param key The key to split the tree on.
//  * @param root The root node of the tree.
//  * @returns A tuple of the left and right trees.
//  */
// export function unzipBase<K>(
//   key: K,
//   root?: Node<K>,
// ): [Node<K> | undefined, Item<K> | undefined, Node<K> | undefined] {
//   if (root === undefined) {
//     return [undefined, undefined, undefined];
//   }
//   const [lefts, node, rights] = root.items.split(
//     (item) => item.key >= key,
//   );
//   if (node) {
//     if (node.key === key) {
//       const left = norm({ ...root, items: lefts, next: node.value });
//       const right = norm({ ...root, items: rights });
//       const item = { key: node.key, rank: root.rank };
//       return [left, item, right];
//     }
//     const [next, item, value] = unzipBase(key, node.value);
//     const left = norm({ ...root, items: lefts, next });
//     const items = rights.unshift<Pair<K>>({ key: node.key, value });
//     const right = norm({ ...root, items });
//     return [left, item, right];
//   } else {
//     const [next, item, right] = unzipBase(key, root.next);
//     const left = norm({ ...root, next });
//     return [left, item, right];
//   }
// }

/**
 * zip function that uses continuation-passing style to achieve tail recursion.
 * @param left Left-hand tree.
 * @param right Right-hand tree.
 * @param cont Continuation function.
 * @returns Joined tree.
 */
export function zip<K>(
  left?: Node<K>,
  right?: Node<K>,
  cont: (value?: Node<K>) => Node<K> | undefined = (x) => x,
): Node<K> | undefined {
  if (left === undefined) {
    return cont(right);
  } else if (right === undefined) {
    return cont(left);
  }
  if (left.rank === right.rank) {
    const child = right.items.first()!;
    return zip(left.next, child.value, (value) => {
      const items = left.items.push({ key: child.key, value }).join(
        right.items.shift(),
      );
      return cont(norm({ ...right, items }));
    });
  } else if (left.rank < right.rank) {
    const child = right.items.first()!;
    return zip(left, child.value, (value) => {
      const items = right.items.shift().unshift({ key: child.key, value });
      return cont(norm({ ...right, items }));
    });
  }
  return zip(left.next, right, (next) => cont(norm({ ...left, next })));
}

// /**
//  * Join two trees into a single tree.
//  * @param left The left-hand tree.
//  * @param right The right-hand tree.
//  * @returns A new tree with the two trees joined.
//  */
// export function zipBase<K>(
//   left?: Node<K>,
//   right?: Node<K>,
// ): Node<K> | undefined {
//   if (left === undefined) {
//     return right;
//   } else if (right === undefined) {
//     return left;
//   } else if (left.rank === right.rank) {
//     const [rights, child] = shift(right.items);
//     const value = zipBase(left.next, child?.value);
//     const inner: Pair<K> = { key: child!.key, value };
//     const items = join(push(left.items, inner), rights);
//     return norm({ ...right, items });
//   } else if (left.rank < right.rank) {
//     const [rights, child] = shift(right.items);
//     const value = zipBase(left, child?.value);
//     const items = unshift<Pair<K>>(rights, { key: child!.key, value });
//     return norm({ ...right, items });
//   } else {
//     const next = zipBase(left.next, right);
//     return norm({ ...left, next });
//   }
// }

export function* iter<K>(
  root: Node<K> | undefined,
): IterableIterator<Item<K>> {
  if (root === undefined) {
    return;
  }
  for (const { key, value } of root.items) {
    yield* iter(value);
    yield { key, rank: root.rank };
  }
  yield* iter(root.next);
}

export function* mermaidNodes<K>(
  node?: Node<K>,
  parentId = "",
): Generator<string> {
  if (node === undefined) {
    return;
  }
  const keys = [...node.items].map(({ key }) => key);
  let nodeLabel = keys.join(",");
  if (node.size > 1) {
    nodeLabel += `\\n<small>rank:${node.rank}, size:${node.size}</small>`;
  }

  const nodeId = `node${keys.join("_")}`;
  yield `${nodeId}[${nodeLabel}]`;
  if (parentId !== "") {
    yield `${parentId} --> ${nodeId}`;
  }
  const items = node.items;
  for (const { value } of items) {
    if (value !== undefined) {
      yield* mermaidNodes(value, nodeId);
    }
  }
  yield* mermaidNodes(node.next, nodeId);
}

export function mermaidDiagram<K>(tree: GeometricTree<K>) {
  let str = "```mermaid\ngraph TD;";
  str += "\n  " + [...mermaidNodes(tree.root)].join("\n  ");
  str += "\n```\n";
  return str;
}
