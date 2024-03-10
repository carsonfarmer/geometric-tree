import { frozen, random } from "./test_utils.ts";
import { find } from "./array_ops.ts";
import { geometric } from "./utils.ts";
import { GeometricTree, Item, Node } from "./geometric_tree.ts";
import { Node as ZipNode, singleton } from "./zip_tree.ts";

function search<K extends number>(
  key: K,
  root?: Node<K>,
  depth = 0,
): [Item<K> | undefined, number] {
  if (root === undefined) {
    return [undefined, depth];
  }
  const item = find(root.items, (item) => item.key >= key);
  if (item?.key === key) {
    return [{ key: item.key, rank: root.rank }, depth];
  }
  const next = item ? item.value : root.next;
  return search(key, next, depth + 1);
}

function computeHeight<K extends number = number>(
  node: Node<K> | undefined,
): number {
  if (!node) {
    return 0;
  }

  let maxChildHeight = 0;
  for (const pair of node.items) {
    const childHeight = computeHeight(pair.value);
    if (childHeight > maxChildHeight) {
      maxChildHeight = childHeight;
    }
  }
  const nextHeight = computeHeight(node.next);
  if (nextHeight > maxChildHeight) {
    maxChildHeight = nextHeight;
  }

  return 1 + maxChildHeight;
}

function computeAverageChildren<K extends number = number>(
  node: Node<K> | undefined,
): number {
  let totalChildren = 0;
  let totalNodes = 0;

  function traverse(node: Node<K> | undefined): void {
    if (!node) {
      return;
    }

    totalNodes++;
    totalChildren += node.items.length;
    totalChildren += node.next ? 1 : 0;

    for (const pair of node.items) {
      traverse(pair.value);
    }
    traverse(node.next);
  }

  traverse(node);

  return totalNodes ? totalChildren / totalNodes : 0;
}

function withNext<K extends number = number>(
  node: Node<K> | undefined,
): number {
  let totalNext = 0;
  let totalNodes = 0;

  function traverse(node: Node<K> | undefined): void {
    if (!node) {
      return;
    }

    totalNodes++;
    totalNext += node.next ? 1 : 0;

    for (const pair of node.items) {
      traverse(pair.value);
    }
    traverse(node.next);
  }

  traverse(node);

  return totalNodes ? totalNext / totalNodes : 0;
}

Deno.test({
  name: "random stats",
  only: false,
  fn: () => {
    let cost = 0;
    let heights = 0;
    let children = 0;
    let rank = 0;
    let hasNext = 0;
    const B = 2;
    for (let i = 0; i < 1000; i++) {
      const pairs = random(1000, 0.5);
      const tree = GeometricTree.from(pairs);
      let mean = 0;
      for (const { key } of pairs) {
        const [_item, count] = search(key, tree.root, 0);
        mean += count;
      }
      rank += tree.root?.rank ?? 0;
      heights += computeHeight(tree.root);
      children += computeAverageChildren(tree.root);
      mean = mean / 1000;
      cost += mean;
      hasNext += withNext(tree.root);
    }
    console.log("next:\t", hasNext / 1000 * 100);
    console.log("height:\t", heights / 1000);
    console.log("length:\t", children / 1000);
    console.log("rank:\t", rank / 1000);
    console.log("search:\t", cost / 1000);
    console.log("exp:\t", Math.log(1000) / Math.log(B));
  },
});

function from<K extends number>(
  array: ReadonlyArray<Item<K>>,
  count = 0,
): [number, ZipNode<K> | undefined] {
  if (array.length == 0) {
    return [++count, undefined];
  } else if (array.length == 1) {
    return [++count, singleton(array[0])];
  }
  const ranks = array.map(({ rank }) => rank);
  const maxRank = Math.max(...ranks);
  const splitIndex = array.findIndex(({ rank }) => rank === maxRank);
  console.log(count, array[splitIndex]);
  const [countLeft, left] = from(array.slice(0, splitIndex), count + 1);
  const [countRight, right] = from(array.slice(splitIndex + 1), countLeft);
  const size = (left?.size ?? 0) + (right?.size ?? 0) + 1;

  return [countRight, { ...array[splitIndex], left, right, size }];
}

Deno.test({
  name: "math",
  only: false,
  fn: () => {
    from(frozen);
  },
});
