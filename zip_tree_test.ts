import {
  assert,
  assertEquals,
  frozen,
  random,
  range,
  shuffle,
  sorted,
  split,
} from "./test_utils.ts";
import { BinaryZipTree as ZipTree, mermaidDiagram } from "./zip_tree.ts";

Deno.test({
  name: "from",
  only: false,
  fn: () => {
    const tree = ZipTree.from(frozen);
    assertEquals(tree.toArray(), frozen);
  },
});

Deno.test({
  name: "search",
  only: false,
  fn: () => {
    const tree = ZipTree.from(frozen);
    for (const item of shuffle(frozen)) {
      const node = tree.search(item.key);
      assertEquals(node, item);
    }
    assertEquals(tree.search(50), undefined);
  },
});

Deno.test({
  name: "insert",
  only: false,
  fn: () => {
    const tree = ZipTree.from(frozen);
    const shuffled = shuffle(frozen);
    let root = ZipTree.empty();
    for (const pair of shuffled) {
      root = root.insert(pair);
    }
    assertEquals(root, tree);
    assertEquals(tree.toArray(), frozen);
    assertEquals(root.toArray(), frozen);
  },
});

Deno.test({
  name: "remove",
  only: false,
  fn: () => {
    const tree = ZipTree.from(frozen);
    const [removed, kept] = split(shuffle(frozen), 10);
    let root = tree;
    for (const { key } of removed) {
      root = root.remove(key);
    }
    assert(!root.isEmpty());
    // tree should be unchanged
    assertEquals(tree.toArray(), frozen);
    assertEquals(root.toArray(), sorted(kept));
    // Remove the root node
    root = root.remove(root.root!.key);
    assert(!root.isEmpty());

    assert(ZipTree.empty().remove(0).isEmpty());
  },
});

Deno.test({
  name: "unzip",
  only: false,
  fn: () => {
    const tree = ZipTree.from(frozen);
    for (const i of shuffle(range(0, frozen.length - 1))) {
      const [leftPairs, rightPairs] = split(frozen, i + 1);
      const _left = ZipTree.from(leftPairs);
      const _right = ZipTree.from(rightPairs);

      const splitValue = frozen[i].key;
      const [left, right] = tree.unzip(splitValue);
      assertEquals(left, _left, `mismatch at ${i}`);
      assertEquals(right, _right, `mismatch at ${i}`);
    }
    assertEquals(ZipTree.empty().unzip(0), [
      ZipTree.empty(),
      ZipTree.empty(),
    ]);
    const [left, right] = tree.unzip(100);
    assertEquals(left, tree, `left should be full`);
    assertEquals(right, ZipTree.empty(), `right should be empty`);
  },
});

Deno.test({
  name: "zip",
  only: false,
  fn: () => {
    const tree = ZipTree.from(frozen);
    for (const i of shuffle(range(0, frozen.length - 1))) {
      const splitValue = frozen[i].key;
      const [left, right] = tree.unzip(splitValue);
      const root = left.zip(right);
      assertEquals(tree, root, `mismatch at ${i}`);
    }
    // Also test alternative API
    assertEquals(ZipTree.zip(ZipTree.empty(), tree), tree);
    assertEquals(ZipTree.zip(tree, ZipTree.empty()), tree);
    assertEquals(
      ZipTree.zip(ZipTree.empty(), ZipTree.empty()),
      ZipTree.empty(),
    );
  },
});

Deno.test({
  name: "size",
  only: false,
  fn: () => {
    const tree = ZipTree.from(frozen);
    assertEquals(tree.length(), frozen.length);
    const [left, right] = tree.unzip(50);
    assertEquals(left?.length(), 15);
    assertEquals(right?.length(), 5);

    // Adding a node should increase the size at the root.
    let newTree = tree.insert({
      key: 14,
      rank: 2,
    });
    assertEquals(newTree?.length(), frozen.length + 1);

    // Removing a node should decrease the size at the root.
    // newTree = newTree.remove(19);
    newTree = newTree.remove(47);
    assertEquals(newTree?.length(), frozen.length);
  },
});

Deno.test({
  name: "insert random",
  only: false,
  fn: () => {
    const pairs = random(1000);
    let tree = ZipTree.empty();
    for (const { key, rank } of pairs) {
      tree = tree.insert({ key, rank });
    }
    for (const { key } of pairs) {
      const got = tree.search(key);
      assertEquals(got?.key, key);
    }
    assertEquals(tree.length(), pairs.length);
    assertEquals(tree.toArray(), sorted(pairs));
  },
});

Deno.test({
  name: "delete random",
  only: false,
  fn: () => {
    const pairs = random(1000);
    let tree = ZipTree.empty();
    for (const { key, rank } of pairs) {
      tree = tree.insert({ key, rank });
    }
    let deleted = tree;
    const [removed, remainder] = split(pairs, 100);
    for (const { key } of removed) {
      deleted = deleted.remove(key);
    }
    const sortedRemainder = sorted(remainder);
    assertEquals(deleted.toArray(), sortedRemainder);
    // The from static method requires a sorted array
    const reduced = ZipTree.from(sortedRemainder);
    assertEquals(deleted, reduced);
    for (const { key } of removed) {
      const got = deleted.search(key);
      assertEquals(got, undefined);
    }
    // The remaining nodes should still be in the tree
    // Note that we're using the unsorted array here
    for (const { key, rank } of remainder) {
      const got = deleted.search(key);
      assertEquals(got?.key, key);
      assertEquals(got?.rank, rank);
    }
  },
});

Deno.test({
  name: "order independence",
  only: false,
  fn: () => {
    const pairs = random(1000);
    let tree = ZipTree.empty();
    for (const { key, rank } of pairs) {
      tree = tree.insert({ key, rank });
    }
    let recreated = ZipTree.empty();
    for (const { key, rank } of shuffle(pairs)) {
      recreated = recreated.insert({ key, rank });
    }
    assertEquals(tree, recreated);
    assertEquals(tree.toArray(), recreated.toArray());

    // Now try deleting in a different order
    const [removed, remainder] = split(pairs, 100);
    const sortedRemainder = sorted(remainder);
    for (const { key } of removed) {
      tree = tree.remove(key);
      recreated = recreated.remove(key);
    }
    const root = ZipTree.from(sortedRemainder);
    assertEquals(tree, recreated);
    assertEquals(tree, root);
    assertEquals(tree.toArray(), recreated.toArray());
  },
});

Deno.test({
  name: "mermaid",
  only: false,
  fn: () => {
    const tree = ZipTree.from(frozen);
    console.log(mermaidDiagram(tree));

    const [left, right] = tree.unzip(47);
    console.log(mermaidDiagram(left));
    console.log(mermaidDiagram(right));
  },
});
