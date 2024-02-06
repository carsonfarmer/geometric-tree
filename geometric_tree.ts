import { Item, ZipTree } from "./api.ts";
import { splits, subsets } from "./b_zip_tree.ts";
import {
  concat,
  findIndex,
  isEmpty,
  peekBack,
  peekFront,
  pick,
  popBack,
  popFront,
  pushBack,
  pushFront,
  splitAt,
} from "./array_ops.ts";

export interface Node<K, R extends number = number> {
  rank: R;
  items: ReadonlyArray<[K, Node<K, R> | undefined]>;
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
    array: Array<Item<K, R>>,
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
  unzip(key: K): [GeometricTree<K, R>, GeometricTree<K, R>] {
    const [left, right] = unzip(key, this.root);
    return [
      new GeometricTree<K, R>(left),
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

export function singleton<K, R extends number>(
  item: Item<K, R>,
): Node<K, R> {
  // const items = new Array<[K, Node<K, R> | undefined]>(k);
  // items.push([item.key, undefined]);
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
  values: Item<K, R>[],
  k = Infinity,
): Node<K, R> | undefined {
  if (values.length == 0) {
    return undefined;
  } else if (values.length == 1) {
    return singleton(values[0]);
  }
  // TODO: This is of course, not efficient... we can do this in a single pass!
  const rank = Math.max(...values.map(({ rank }) => rank)) as R;
  // TODO: We simply take the first k-1 splits, because we already have sorting
  // And we need to include the "next" pointer in our "k"
  // This is essentially the same as saying "compute the first k-1 splits", and
  // leave the rest for next level. In other words, we could do this _in_ the
  // splits function.
  const _splits = splits(values, ({ rank: r }) => r === rank).slice(0, k - 1);
  const keys = _splits.map((index) => values[index]);
  const children = subsets(values, _splits).map((subset) => from(subset, k));
  const items: Array<[K, Node<K, R> | undefined]> = [];
  for (let i = 0; i < keys.length; i++) {
    items.push([keys[i].key, children[i]]);
  }
  return sized({
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
  const index = findIndex(root.items, ([_key]) => _key >= key);
  if (index < 0) {
    return search(key, root.next);
  } else {
    const item = pick(root.items, index);
    if (item !== undefined) {
      if (item[0] === key) {
        return { key: item[0] as K, rank: root.rank };
      } else {
        return search(key, item[1]);
      }
    }
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
  k = Infinity,
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
  k = Infinity,
): Node<K, R> | undefined {
  if (root === undefined) {
    return undefined;
  }
  const [left, right] = unzip(key, root, true);
  return zip(left, right);
}

// function unzipNode<K, R extends number>(
//   key: K,
//   node?: Node<K, R>,
// ): [
//   ReadonlyArray<[K, Node<K, R> | undefined]>?,
//   ReadonlyArray<[K, Node<K, R> | undefined]>?,
// ] {
//   if (node === undefined) {
//     // Early out for when root is missing.
//     return [undefined, undefined];
//   }
//   // Find the index of the key in the items list.
//   const index = findIndex(node.items, ([_key]) => _key >= key);
//   if (index < 0) {
//     // Deal with the "special case" that key is within the "next" node.
//     if (node.next !== undefined) { // FIXME: Can we avoid this conditional?
//       const [next, right] = unzip(key, node.next, false);
//       return [sized({ ...root, next }), right];
//     }
//     // If we don't find it, we're done, just return the whole root.
//     return [node.items, undefined];
//   }
//   // We simply split the root node at the index.
//   const [left, right] = splitAt(node.items, index + 1);
//   return [left, right];
// }

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
    // Early out for when root is missing.
    return [undefined, undefined];
  }
  // Find the index of the key in the items list.
  const index = findIndex(root.items, ([_key]) => _key >= key);
  if (index < 0) {
    // Deal with the "special case" that key is within the "next" node.
    if (root.next !== undefined) { // FIXME: Can we avoid this conditional?
      const [next, right] = unzip(key, root.next, drop);
      return [sized({ ...root, next }), right];
    }
    // If we don't find it, we're done, just return the whole root.
    return [root, undefined];
  }
  // We simply split the root node at the index.
  let [__left, __right] = splitAt(root.items, index + 1);
  // Otherwise, we found the key (or a larger key)...
  const [_key, item] = peekBack(__left)!;
  if (_key === key) {
    // If we actually landed on a root with that key, split the root...
    // Just for symmetry
    let [_left, _right]: [Node<K, R>?, Node<K, R>?] = [undefined, root.next];
    if (drop) {
      // If we want to drop the target, this is the only place we have to do that.
      // We simply remove the item at the index, and assign its children to the
      // "next" pointer of the left subtree (which would always be undefined otherwise)
      __left = popBack(__left);
      _left = item;
    }
    // And then form the left and right trees, from the split items.
    // But, if either set of items are empty, we "promote" the "next" pointer
    // as the root of that subtree.
    const left = isEmpty(__left) ? _left : sized({
      ...root,
      items: __left,
      next: _left,
    });
    const right = isEmpty(__right) ? _right : sized({
      ...root,
      items: __right,
      // TODO: Probably make this more explicit
    });
    return [left, right];
  } else {
    // If we didn't land on a root with that key, we split the child...
    // Recursively unzip, and these will form our "next" pointer on the left
    // and the first element of the right items list.
    const [_left, _right] = unzip(key, item, drop);
    // Same process as before, we split the items at the index...
    __left = popBack(__left);
    // But we move the right "next" pointer "up" to the right items...
    __right = pushFront(__right, [_key, _right]);
    // And form the left and right trees, from the split items.
    // Again, if either set of items are empty, we "promote" the "next" pointer
    // as the root of that subtree.
    const left = isEmpty(__left) ? _left : sized({
      ...root,
      items: __left,
      next: _left,
    });
    // Except in this case, the right side always takes on the root's "next" pointer.
    const right = isEmpty(__right) ? _right : sized({
      ...root,
      items: __right,
    });
    return [left, right];
  }
}

export function zip<K, R extends number>(
  left?: Node<K, R>,
  right?: Node<K, R>,
): Node<K, R> | undefined {
  if (left === undefined) {
    // Early out for when left is missing.
    return right;
  }
  if (right === undefined) {
    // Early out for when right is missing.
    return left;
  }
  if (left.rank == right.rank) {
    // For nodes with equal rank...
    let leftItems = left.items;
    let rightItems = right.items;
    // If we're also storing a pointer to the "next" node, we need to
    // zip that with the right side.
    // FIXME: No need for this conditional check
    if (left.next !== undefined) {
      // Grab the first item from the right side...
      const innerRight = peekFront(rightItems);
      // ...then remove it from the right items list.
      rightItems = popFront(rightItems);
      if (innerRight === undefined) {
        throw new Error("invariant violation");
      }
      // Now combine it with the left side "next" pointer.
      const inner = zip(left.next, innerRight[1]);
      // And then move this inner item "up" to the left items list.
      leftItems = pushBack(leftItems, [innerRight[0], inner]);
      // TODO: We should be able to find a way to do this without mutating
      // the left and right items lists themselves for added clarity.
    }
    // In both cases, we concat the two item lists.
    const items = concat(leftItems, rightItems);
    // And move the right next pointer "up" to the root.
    return sized({ rank: left.rank, items, next: right.next });
  } else if (left.rank < right.rank) {
    // If the left side has rank less than the right side...
    // We zip the left side with the first right child...
    const child = peekFront(right.items);
    const _left = zip(left, child?.[1]);
    // And then replace the first right child with the zipped left side.
    const rightItems: readonly [K, Node<K, R> | undefined][] = pushFront(
      popFront(right.items),
      [child![0], _left],
    );
    // And return the new updated right side as the root.
    return sized({ ...right, items: rightItems });
  } else {
    // Otherwise, the right side has rank less than the left side...
    // So we can simply point to it as the next node of the left side.
    // TODO: It is possible that the zipping with next isn't needed.
    const next = zip(left.next, right);
    return sized({ ...left, next });
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
  const items: ReadonlyArray<[K, Node<K, R> | undefined]> | undefined =
    node.items;
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
