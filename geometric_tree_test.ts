import {
  assert,
  assertEquals,
  frozen,
  random,
  range,
  shuffle,
  sorted,
} from "./test_utils.ts";
import { GeometricTree, mermaidDiagram } from "./geometric_tree.ts";
import { pop, splitAt } from "./array_ops.ts";

Deno.test({
  name: "from",
  only: false,
  fn: () => {
    const tree = GeometricTree.from(frozen);
    assertEquals(tree.root?.size, frozen.length); // Not really public
    assertEquals(tree.isEmpty(), false);
    // assertEquals(tree.root?.items.length, 4); // Not really public
    assertEquals(tree.toArray(), frozen);
    assertEquals(tree.length(), frozen.length);
  },
});

Deno.test({
  name: "search",
  only: false,
  fn: () => {
    const tree = GeometricTree.from(frozen);
    for (const item of shuffle(frozen)) {
      const node = tree.search(item.key);
      assertEquals(node, item);
    }
    assertEquals(tree.search(50), undefined);
  },
});

Deno.test({
  name: "zip one",
  only: false,
  fn: () => {
    const tree = GeometricTree.from(frozen);
    let count = 100;
    while (count--) {
      for (const i of shuffle(range(0, frozen.length - 1))) {
        const left = GeometricTree.from(frozen.slice(0, i + 1));
        const right = GeometricTree.from(frozen.slice(i + 1));
        const root = left.zip(right);
        assertEquals(root, tree, `mismatch at ${i}`);
        const splitValue = frozen[i].key;
        const [_left, target, _right] = root.unzip(splitValue);
        assertEquals(
          _left.zip(GeometricTree.singleton(target!)),
          left,
          `mismatch at ${i}`,
        );
        assertEquals(_right, right, `mismatch at ${i}`);
      }
    }
    // Also test alternative API
    assertEquals(GeometricTree.zip(GeometricTree.empty(), tree), tree);
    assertEquals(GeometricTree.zip(tree, GeometricTree.empty()), tree);
    assertEquals(
      GeometricTree.zip(GeometricTree.empty(), GeometricTree.empty()),
      GeometricTree.empty(),
    );
  },
});

Deno.test({
  name: "unzip",
  only: false,
  fn: () => {
    const tree = GeometricTree.from(frozen);
    for (const i of shuffle(range(0, frozen.length - 1))) {
      const [leftPairs, rightPairs] = splitAt(frozen, i + 1);
      const _left = GeometricTree.from(leftPairs);
      const _right = GeometricTree.from(rightPairs);

      assertEquals(_left.toArray(), leftPairs);
      assertEquals(_right.toArray(), rightPairs);

      const splitValue = frozen[i].key;
      const [left, target, right] = tree.unzip(splitValue);
      const fullLeft = left.zip(GeometricTree.singleton(target!));
      assertEquals(fullLeft, _left, `mismatch at ${i}`);
      assertEquals(right, _right, `mismatch at ${i}`);
      const zipped = GeometricTree.zip(fullLeft, right);
      assertEquals(tree, zipped, `mismatch at ${i}`);
    }

    for (const k of [30, 9, 55]) {
      const leftPairs = frozen.filter(({ key }) => key <= k);
      const rightPairs = frozen.filter(({ key }) => key > k);
      const _left = GeometricTree.from(leftPairs);
      const _right = GeometricTree.from(rightPairs);

      assertEquals(_left.toArray(), leftPairs);
      assertEquals(_right.toArray(), rightPairs);

      const [left, _, right] = tree.unzip(k);
      assertEquals(left, _left, `mismatch at ${k}`);
      assertEquals(right, _right, `mismatch at ${k}`);
    }
    assertEquals(GeometricTree.empty().unzip(0), [
      GeometricTree.empty(),
      undefined,
      GeometricTree.empty(),
    ]);
    const [left, _, right] = tree.unzip(100);
    assertEquals(left, tree, `left should be full`);
    assertEquals(right, GeometricTree.empty(), `right should be empty`);
  },
});

Deno.test({
  name: "from",
  only: false,
  fn: () => {
    const tree = GeometricTree.from(frozen);
    assertEquals(tree.toArray(), frozen);
    assertEquals(tree.length(), frozen.length);
  },
});

Deno.test({
  name: "search",
  only: false,
  fn: () => {
    const tree = GeometricTree.from(frozen);
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
    const tree = GeometricTree.from(frozen);
    const shuffled = shuffle(frozen);
    let root = GeometricTree.empty();
    for (const [i, pair] of shuffled.entries()) {
      root = root.insert(pair);
      const other = GeometricTree.from(sorted(shuffled.slice(0, i + 1)));
      assertEquals(root, other, `mismatch at ${i} for ${pair.key}`);
    }
    assertEquals(tree.toArray(), frozen);
    assertEquals(root, tree);
    assertEquals(root.toArray(), frozen);
  },
});

Deno.test({
  name: "remove",
  only: false,
  fn: () => {
    const tree = GeometricTree.from(frozen);
    const [removed, kept] = splitAt(shuffle(frozen), 10);
    let root = tree;
    let soFar = [...frozen];
    for (const pair of removed) {
      soFar = soFar.filter((p) => p.key != pair.key);
      root = root.remove(pair.key);
      const other = GeometricTree.from(sorted(soFar));
      assertEquals(root, other);
    }
    assert(!root.isEmpty());
    // tree should be unchanged
    assertEquals(tree.toArray(), frozen);
    assertEquals(root, GeometricTree.from(sorted(kept)));
    assertEquals(root.toArray(), sorted(kept));

    // Note that this test isn't the same as the zip-tree variant.
    // Remove all the keys from the root node
    for (const { key } of [...root.root!.items]) {
      root = root.remove(key);
    }
    assert(!root.isEmpty());

    assert(GeometricTree.empty().remove(0).isEmpty());
  },
});

Deno.test({
  name: "insert in place/replace",
  only: false,
  fn: () => {
    // Pop a random item from the array
    const [rest, item] = pop(shuffle(frozen));
    assert(item !== undefined);
    const copy = { ...item }; // Make a copy so that we know it isn't reference equal
    const tree = GeometricTree.from(frozen);
    const root = tree.insert(copy); // Should be the same thing again
    assertEquals(root.toArray(), frozen);
    assertEquals(root, tree);
    assertEquals(root, GeometricTree.from(sorted([...rest, item])));
  },
});

Deno.test({
  name: "unzip two",
  only: false,
  fn: () => {
    const tree = GeometricTree.from(frozen);
    for (const i of shuffle(range(0, frozen.length - 1))) {
      const [leftPairs, rightPairs] = splitAt(frozen, i + 1);
      const _left = GeometricTree.from(leftPairs);
      const _right = GeometricTree.from(rightPairs);

      const splitValue = frozen[i].key;
      const [left, target, right] = tree.unzip(splitValue);
      assertEquals(
        left.zip(GeometricTree.singleton(target!)),
        _left,
        `mismatch at ${i}`,
      );
      assertEquals(right, _right, `mismatch at ${i}`);
    }
    assertEquals(GeometricTree.empty().unzip(0), [
      GeometricTree.empty(),
      undefined,
      GeometricTree.empty(),
    ]);
    const [left, _, right] = tree.unzip(100);
    assertEquals(left, tree, `left should be full`);
    assertEquals(right, GeometricTree.empty(), `right should be empty`);
  },
});

Deno.test({
  name: "zip two",
  only: false,
  fn: () => {
    const tree = GeometricTree.from(frozen);
    for (const i of shuffle(range(0, frozen.length - 1))) {
      const splitValue = frozen[i].key;
      const [left, target, right] = tree.unzip(splitValue);
      const root = left.zip(GeometricTree.singleton(target!)).zip(right);
      assertEquals(tree, root, `mismatch at ${i}`);
    }
    // Also test alternative API
    assertEquals(GeometricTree.zip(GeometricTree.empty(), tree), tree);
    assertEquals(GeometricTree.zip(tree, GeometricTree.empty()), tree);
    assertEquals(
      GeometricTree.zip(GeometricTree.empty(), GeometricTree.empty()),
      GeometricTree.empty(),
    );
  },
});

Deno.test({
  name: "size",
  only: false,
  fn: () => {
    const tree = GeometricTree.from(frozen);
    assertEquals(tree.length(), frozen.length);
    const [left, _, right] = tree.unzip(50);
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
    let tree = GeometricTree.empty();
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
    let tree = GeometricTree.empty();
    for (const { key, rank } of pairs) {
      tree = tree.insert({ key, rank });
    }
    let deleted = tree;
    const [removed, remainder] = splitAt(pairs, 100);
    for (const { key } of removed) {
      deleted = deleted.remove(key);
    }
    const sortedRemainder = sorted(remainder);
    assertEquals(deleted.toArray(), sortedRemainder);
    // The from static method requires a sorted array
    const reduced = GeometricTree.from(sortedRemainder);
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
  name: "random remove and replace",
  only: false,
  fn: () => {
    const pairs = random(1000);
    let tree = GeometricTree.empty();
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
  name: "order independence",
  only: false,
  fn: () => {
    const pairs = random(1000);
    let tree = GeometricTree.empty();
    for (const { key, rank } of pairs) {
      tree = tree.insert({ key, rank });
    }
    let recreated = GeometricTree.empty();
    for (const { key, rank } of shuffle(pairs)) {
      recreated = recreated.insert({ key, rank });
    }
    assertEquals(tree, recreated);
    assertEquals(tree.toArray(), recreated.toArray());

    // Now try deleting in a different order
    const [removed, remainder] = splitAt(pairs, 100);
    const sortedRemainder = sorted(remainder);
    for (const { key } of removed) {
      tree = tree.remove(key);
      recreated = recreated.remove(key);
    }
    const root = GeometricTree.from(sortedRemainder);
    assertEquals(tree, recreated);
    assertEquals(tree, root);
    assertEquals(tree.toArray(), recreated.toArray());
  },
});

Deno.test({
  name: "mermaid",
  only: false,
  ignore: true,
  fn: () => {
    const tree = GeometricTree.from(frozen);
    console.log(mermaidDiagram(tree));

    const [left, _, right] = tree.unzip(47);
    console.log(mermaidDiagram(left));
    console.log(mermaidDiagram(right));
  },
});
