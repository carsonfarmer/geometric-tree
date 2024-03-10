import { Item, ZipTree } from "./api.ts";
import {
  find,
  isEmpty,
  join,
  push,
  shift,
  split,
  unshift,
} from "./array_ops.ts";

export type Pair<K> = { key: K; value?: Node<K> };

export { type Item };

export interface Node<K> {
  rank: number;
  items: ReadonlyArray<Pair<K>>;
  size: number;
  next?: Node<K>;
}

export class GeometricTree<K> implements ZipTree<K> {
  constructor(
    /**
     * The root node of the tree.
     */
    public root?: Node<K>,
  ) {}

  /**
   * Create an empty GeneralizedZipTree.
   * @returns An empty GeneralizedZipTree.
   */
  static empty<K>() {
    return new GeometricTree<K>(undefined);
  }

  /**
   * Create a GeneralizedZipTree with a single item.
   * @param item The item to insert into the tree.
   * @returns A GeneralizedZipTree with a single item.
   */
  static singleton<K>(
    item: Item<K>,
  ) {
    return new GeometricTree<K>(singleton(item));
  }

  /**
   * Create a GeneralizedZipTree from a sorted array of items.
   * @param array The array of items to insert into the tree. The array must be pre-sorted by key.
   * @returns A GeneralizedZipTree with the items from the array.
   */
  static from<K>(
    array: ReadonlyArray<Item<K>>,
  ) {
    const root = from(array);
    return new GeometricTree<K>(root);
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
  insert(item: Item<K>) {
    const root = insert(item, this.root);
    return new GeometricTree<K>(root);
  }

  /**
   * Remove an item from the tree.
   * @param key The key of the item to remove.
   * @returns A new tree with the item removed.
   */
  remove(key: K) {
    const root = remove(key, this.root);
    return new GeometricTree<K>(root);
  }

  /**
   * Split the input tree into two balanced sub-trees.
   * @param key The key to split the tree on.
   * @returns A tuple of the left and right trees.
   */
  unzip(
    key: K,
  ): [GeometricTree<K>, Item<K> | undefined, GeometricTree<K>] {
    const [left, node, right] = unzip(key, this.root);
    return [
      new GeometricTree<K>(left),
      node,
      new GeometricTree<K>(right),
    ];
  }

  /**
   * Join another tree into this one.
   * @param other The other tree to join.
   * All of the keys in the other tree must be greater than the keys in this tree.
   * @returns A new tree with the two trees joined.
   */
  zip(other: GeometricTree<K>) {
    const root = zip(this.root, other.root);
    return new GeometricTree<K>(root);
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
  ) {
    const root = zip(left.root, right.root);
    return new GeometricTree<K>(root);
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
  return isEmpty(node.items) ? node.next : sized(node);
}

export function singleton<K>(
  item: Item<K>,
): Node<K> {
  const items = Array.from<Pair<K>>([{
    key: item.key,
    value: undefined,
  }]);
  return {
    items,
    rank: item.rank,
    size: 1,
    next: undefined,
  };
}

export function from<K>(
  values: ReadonlyArray<Item<K>>,
  cls = Array<Pair<K>>,
): Node<K> | undefined {
  if (values.length == 0) {
    return undefined;
  }
  const rank = Math.max(...values.map((item) => item.rank));
  const splits = Array
    .from(values.entries())
    .filter(([, item]) => item.rank === rank)
    .map(([i]) => i);
  let items = new cls();
  let prev = 0;
  for (let i = 0; i < splits.length; i++) {
    const subset = values.slice(prev, splits[i]);
    items = push(items, {
      key: values[splits[i]].key,
      value: from(subset, cls),
    });
    prev = splits[i] + 1;
  }
  const next = from(values.slice(prev), cls);
  return norm({ items, rank, next });
}

export function fromAtLeafs<K>(
  values: ReadonlyArray<Item<K>>,
  cls = Array<Pair<K>>,
): Node<K> | undefined {
  if (values.length == 0) {
    return undefined;
  }
  const rank = Math.max(...values.map((item) => item.rank).slice(1));
  const splits = Array
    .from(values.entries())
    .filter(([, item]) => item.rank === rank)
    .map(([i]) => i);
  if (rank === 1 || values.length === 1) {
    const pointer = {
      items: values,
      rank: Math.max(rank, 1),
      size: values.length,
    };
    console.log("early", pointer);
    return pointer;
  }
  let items = new cls();
  let prev = 0;
  for (let i = 0; i < splits.length; i++) {
    const subset = values.slice(prev, splits[i]);
    const value = fromAtLeafs(subset, cls);
    if (value?.rank === 1) {
      console.log("late", value);
    }
    items = push(items, {
      key: values[splits[i]].key,
      value,
    });
    prev = splits[i];
  }
  const next = fromAtLeafs(values.slice(prev), cls);
  return norm({ items, rank, next });
}

type PPair<K> = { key: K; value?: PNode<K> };

type Pointer<K> = PNode<K> & { pointer: true };

interface PNode<K> {
  rank: number;
  items: ReadonlyArray<PPair<K>>;
  size: number;
  next?: PNode<K> | Pointer<K>;
}

// export function fromAtLeafWithPointers<K>(
//   values: ReadonlyArray<Item<K>>,
//   cls = Array<PPair<K>>,
//   other: PNode<K> | undefined = undefined,
// ): [PNode<K>?, Pointer<K>?] {
//   if (values.length == 0) {
//     return [undefined, undefined];
//   }
//   const rank = Math.max(...values.map((item) => item.rank).slice(1));
//   const splits = Array
//     .from(values.entries())
//     .filter(([, item]) => item.rank === rank)
//     .map(([i]) => i);
//   if (rank === 1 || values.length === 1) {
//     const pointer = {
//       items: values,
//       rank: Math.max(rank, 1),
//       size: values.length,
//       next: undefined,
//     };
//     return [pointer, { ...pointer, pointer: true }];
//   }
//   let items = new cls();
//   let prev = 0;
//   let lastLeaf: PNode<K> | undefined = undefined;
//   let first = true;
//   for (let i = 0; i < splits.length; i++) {
//     const subset = values.slice(prev, splits[i]);
//     const [value, leaf]: [PNode<K>?, Pointer<K>?] = fromAtLeafWithPointers(
//       subset,
//       cls,
//       lastLeaf?.next,
//     );
//     if (other && other.rank === 1 && first && value) {
//       other.next = { ...value, pointer: true };
//       first = false;
//     }
//     if (lastLeaf !== undefined && lastLeaf.rank === 1 && leaf) {
//       lastLeaf.next = { ...leaf, pointer: true };
//     }
//     items = push(items, {
//       key: values[splits[i]].key,
//       value,
//     });
//     prev = splits[i];
//     lastLeaf = value;
//   }
//   const [next, leaf] = fromAtLeafWithPointers(
//     values.slice(prev),
//     cls,
//     lastLeaf?.next,
//   );
//   if (lastLeaf !== undefined && lastLeaf.rank === 1 && leaf) {
//     lastLeaf.next = { ...leaf, pointer: true };
//   }
//   const pointer = norm({ items, rank, next });
//   return [pointer, leaf];
// }

export function search<K>(
  key: K,
  root?: Node<K>,
): (Item<K> & { size: number }) | undefined {
  if (root === undefined) {
    return undefined;
  }
  const item = find(root.items, (item) => item.key >= key);
  if (item?.key === key) {
    const size = item.value?.size ?? 0;
    return { key: item.key, rank: root.rank, size };
  }
  const next = item ? item.value : root.next;
  return search(key, next);
}

/**
 * This is identical to the insert operation in the ZipTree implementation.
 * The differences are in the underlying zip and unzip functions.
 * We _could_ actually just use the ZipTree insert operation here, but
 * curry them by injecting the correct (un)zip function. But for now, we'll
 * keep them separate.
 */
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
 * Again, this is identical to the remove operation in the ZipTree implementation.
 */
export function remove<K>(
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
    n?: Item<K>,
    right?: Node<K>,
  ) => [Node<K>?, Item<K>?, Node<K>?] = (l, n, r) => [l, n, r],
): [Node<K>?, Item<K>?, Node<K>?] {
  if (root === undefined) {
    return cont(undefined, undefined, undefined);
  }
  const [lefts, node, rights] = split(
    root.items,
    (item) => item.key >= key,
  );
  if (node === undefined) {
    return unzip(key, root.next, (next, n, right) => {
      const left = norm({ ...root, next });
      return cont(left, n, right);
    });
  } else if (node.key === key) {
    const left = norm({ ...root, items: lefts, next: node.value });
    const right = norm({ ...root, items: rights });
    const n = { key: node.key, rank: root.rank };
    return cont(left, n, right);
  }
  return unzip(key, node.value, (next, n, value) => {
    const left = norm({ ...root, items: lefts, next });
    const items = shift<Pair<K>>(rights, { key: node.key, value });
    const right = norm({ ...root, items });
    return cont(left, n, right);
  });
}

/**
 * Split the input tree into two balanced sub-trees.
 * @param key The key to split the tree on.
 * @param root The root node of the tree.
 * @returns A tuple of the left and right trees.
 */
export function unzipBase<K>(
  key: K,
  root?: Node<K>,
): [Node<K> | undefined, Item<K> | undefined, Node<K> | undefined] {
  if (root === undefined) {
    return [undefined, undefined, undefined];
  }
  const [lefts, node, rights] = split(
    root.items,
    (item) => item.key >= key,
  );
  if (node === undefined) {
    const [next, n, right] = unzip(key, root.next);
    const left = norm({ ...root, next });
    return [left, n, right];
  } else if (node.key === key) {
    const left = norm({ ...root, items: lefts, next: node.value });
    const right = norm({ ...root, items: rights });
    const n = { key: node.key, rank: root.rank };
    return [left, n, right];
  } else {
    const [next, n, value] = unzip(key, node.value);
    const left = norm({ ...root, items: lefts, next });
    const items = shift<Pair<K>>(rights, { key: node.key, value });
    const right = norm({ ...root, items });
    return [left, n, right];
  }
}

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
  } else if (left.rank == right.rank) {
    const [rights, child] = unshift(right.items);
    return zip(left.next, child?.value, (value) => {
      const inner: Pair<K> = { key: child!.key, value };
      const items = join(push(left.items, inner), rights);
      return cont(norm({ ...right, items }));
    });
  } else if (left.rank < right.rank) {
    const [rights, child] = unshift(right.items);
    return zip(left, child?.value, (value) => {
      const items = shift<Pair<K>>(rights, { key: child!.key, value });
      return cont(norm({ ...right, items }));
    });
  }
  return zip(left.next, right, (next) => cont(norm({ ...left, next })));
}

/**
 * Join two trees into a single tree.
 * @param left The left-hand tree.
 * @param right The right-hand tree.
 * @returns A new tree with the two trees joined.
 */
export function zipBase<K>(
  left?: Node<K>,
  right?: Node<K>,
): Node<K> | undefined {
  if (left === undefined) {
    return right;
  } else if (right === undefined) {
    return left;
  } else if (left.rank == right.rank) {
    const [rights, child] = unshift(right.items);
    const value = zip(left.next, child?.value);
    const inner: Pair<K> = { key: child!.key, value };
    const items = join(push(left.items, inner), rights);
    return norm({ ...right, items });
  } else if (left.rank < right.rank) {
    const [rights, child] = unshift(right.items);
    const value = zip(left, child?.value);
    const items = shift<Pair<K>>(rights, { key: child!.key, value });
    return norm({ ...right, items });
  } else {
    const next = zip(left.next, right);
    return norm({ ...left, next });
  }
}

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
  // if (node.pointer) {
  //   return;
  // }
  const items: ReadonlyArray<Pair<K>> | undefined = node.items;
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
