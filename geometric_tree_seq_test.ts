import { assert, assertEquals, frozen, random, shuffle } from "./test_utils.ts";
import { GeometricSequence } from "./geometric_tree_seq.ts";
import { GeometricTree, unzip } from "./geometric_tree.ts";

Deno.test({
  name: "from",
  only: false,
  fn: () => {
    const tree = GeometricSequence.from(frozen);
    assertEquals(tree.toArray(), frozen);
  },
});

Deno.test({
  name: "at",
  only: false,
  fn: () => {
    const entries = shuffle(frozen);
    const tree = GeometricSequence.from(entries);
    for (const [i, item] of entries.entries()) {
      const node = tree.at(i);
      assertEquals(node, item);
    }
    assertEquals(tree.at(50), undefined);
  },
});

Deno.test({
  name: "insert",
  only: false,
  fn: () => {
    const tree = GeometricTree.from(frozen);
    let root = GeometricSequence.empty();
    for (const [i, pair] of frozen.entries()) {
      root = root.insert(i, pair);
    }
    // Compare the tree to the tree underlying the sequence
    assertEquals(root.root, tree.root);
    assertEquals(tree.toArray(), frozen);
    assertEquals(root.toArray(), frozen);
  },
});

Deno.test({
  name: "remove",
  only: false,
  fn: () => {
    const tree = GeometricSequence.from(frozen);
    let root = tree;
    for (let _i = 0; _i < 10; _i++) {
      root = root.remove(0);
    }
    assert(!root.isEmpty());
    // tree should be unchanged
    assertEquals(tree.toArray(), frozen);
    assertEquals(root.toArray(), frozen.slice(10));
    // Remove the root node
    root = root.remove(root.root?.items[0]?.key as number);
    assert(!root.isEmpty());

    assert(GeometricSequence.empty().remove(0).isEmpty());
  },
});

Deno.test({
  name: "size",
  only: false,
  fn: () => {
    const tree = GeometricSequence.from(frozen);
    assertEquals(tree.length(), frozen.length);
    const [left, right] = [tree.slice(0, 16), tree.slice(15)];
    assertEquals(left?.length(), 15);
    assertEquals(right?.length(), 5);

    // Adding a node should increase the size at the root.
    let newTree = tree.insert(tree.length(), {
      key: 14,
      rank: 2,
    });
    assertEquals(newTree?.length(), frozen.length + 1);

    // Removing a node should decrease the size at the root.
    newTree = newTree.remove(19);
    assertEquals(newTree?.length(), frozen.length);
  },
});

Deno.test({
  name: "insert random",
  only: false,
  fn: () => {
    const pairs = random(1000);
    let tree = GeometricSequence.empty();
    for (const [i, { key, rank }] of pairs.entries()) {
      tree = tree.insert(i, { key, rank });
    }
    for (const [i, { key }] of pairs.entries()) {
      const got = tree.at(i);
      assertEquals(got?.key, key);
    }
    assertEquals(tree.length(), pairs.length);
    assertEquals(tree.toArray(), pairs);
  },
});

Deno.test({
  name: "delete random",
  only: false,
  fn: () => {
    const pairs = random(1000);
    let tree = GeometricSequence.empty();
    for (const [i, node] of pairs.entries()) {
      tree = tree.insert(i, node);
    }
    let deleted = tree;
    // Remove the first 100 by repeatedly removing the first node
    for (let _i = 0; _i < 100; _i++) {
      deleted = deleted.remove(0);
    }
    assertEquals(deleted.toArray(), pairs.slice(100));
    // The from static method requires a sorted array
    const reduced = GeometricSequence.from(pairs.slice(100));
    assertEquals(deleted, reduced);
    assertEquals(deleted.length(), 900);
    // The remaining nodes should still be in the tree, but all at the shifted indexes
    for (const [i, { key, rank }] of pairs.slice(100).entries()) {
      const got = deleted.at(i);
      assertEquals(got?.key, key);
      assertEquals(got?.rank, rank);
    }
  },
});

Deno.test({
  name: "first",
  only: false,
  fn: () => {
    const seq = GeometricSequence.from(frozen);
    const firstFive = seq.first(5);
    assertEquals(firstFive.toArray(), frozen.slice(0, 5));
    assertEquals(firstFive.length(), 5);
    const firstEmpty = seq.first(0);
    assertEquals(firstEmpty, GeometricSequence.empty());
    const firstNull = GeometricSequence.empty().first(5);
    assertEquals(firstNull, GeometricSequence.empty());
    const [leftFive] = unzip(12, seq.root);
    assertEquals(firstFive.root, leftFive);
    const firstFifteen = seq.first(15);
    const [leftFifteen] = unzip(50, seq.root);
    assertEquals(firstFifteen.root, leftFifteen);
    // Original sequence should remain unchanged.
    assertEquals(seq.toArray(), frozen);
  },
});

Deno.test({
  name: "first sizes",
  only: false,
  fn: () => {
    const seq = GeometricSequence.from(frozen);
    const firstFive = seq.first(5);
    assertEquals(firstFive?.length(), 5);
    const [leftFive] = unzip(12, seq.root);
    assertEquals(leftFive?.size, 5);
    const firstFifteen = seq.first(15);
    assertEquals(firstFifteen.length(), 15);
  },
});

Deno.test({
  name: "last",
  only: false,
  fn: () => {
    const seq = GeometricSequence.from(frozen);
    const lastFive = seq.last(5);
    assertEquals(lastFive.toArray(), frozen.slice(-5));
    const lastEmpty = seq.last(0);
    assertEquals(lastEmpty, GeometricSequence.empty());
    const lastNull = GeometricSequence.empty().last(5);
    assertEquals(lastNull, GeometricSequence.empty());
    const [, , rightFive] = unzip(50, seq.root);
    assertEquals(lastFive.root, rightFive);
    const lastFifteen = seq.last(15);
    const [, , rightFifteen] = unzip(12, seq.root);
    assertEquals(lastFifteen.root, rightFifteen);
    // Original sequence should remain unchanged.
    assertEquals(seq.toArray(), frozen);
  },
});

Deno.test({
  name: "last sizes",
  only: false,
  fn: () => {
    const seq = GeometricSequence.from(frozen);
    const lastFive = seq.last(5);
    assertEquals(lastFive.length(), 5);
    const [, , rightFifteen] = unzip(12, seq.root);
    assertEquals(rightFifteen?.size, 15);
    const lastFifteen = seq.last(15);
    assertEquals(lastFifteen.length(), 15);
  },
});

Deno.test({
  name: "first/last contrived",
  only: false,
  fn: () => {
    let seq = GeometricSequence.empty();
    // We use push here because we are assuming a sorted sequence.
    // There are no "left" nodes here, only nodes to the right.
    seq = seq.push({ key: "B", rank: 0 }); // B; level 0
    seq = seq.push({ key: "C", rank: 0 }); // C; level 0
    seq = seq.push({ key: "A", rank: 0 }); // A; level 0

    const one = seq.first(1);
    assertEquals(one.length(), 1);
    const two = seq.last(2);
    assertEquals(two.length(), 2);

    // We ask for more than the size of the sequence, which should still
    // end up with the correct size value being set on the returned node.
    const singleFirst = GeometricSequence.singleton({ key: "A", rank: 0 })
      .first(2);
    assertEquals(singleFirst.length(), 1);
    const singleLast = GeometricSequence.singleton({ key: "A", rank: 0 }).last(
      2,
    );
    assertEquals(singleLast.length(), 1);
  },
});

Deno.test({
  name: "split",
  only: false,
  fn: () => {
    let seq = GeometricSequence.empty();
    const shuffled = shuffle(frozen);
    for (const node of shuffled) {
      seq = seq.push(node);
    }
    const [left, right] = seq.split(15);
    const leftArray = left.toArray();
    const rightArray = right.toArray();
    assertEquals(leftArray, shuffled.slice(0, 15));
    assertEquals(rightArray, shuffled.slice(15));
    assertEquals(leftArray.at(-1), shuffled[14]);
    // Original tree should remain unchanged.
    assertEquals(seq.toArray(), shuffled);
    const [emptyLeft, emptyRight] = GeometricSequence.empty().split(12);
    assertEquals(emptyLeft, GeometricSequence.empty());
    assertEquals(emptyRight, GeometricSequence.empty());
  },
});

Deno.test({
  name: "split independent",
  only: false,
  fn: () => {
    let seq = GeometricSequence.empty();
    const shuffled = shuffle(frozen);
    for (const node of shuffled) {
      seq = seq.push(node);
    }
    // Split the tree at the root, just because
    const [left, right] = seq.split(10);
    let leftSide = GeometricSequence.empty(),
      rightSide = GeometricSequence.empty();

    for (const node of seq.first(10).toArray()) {
      leftSide = leftSide.push(node);
    }
    for (const node of seq.last(10).toArray()) {
      rightSide = rightSide.push(node);
    }
    assertEquals(right.toArray(), rightSide.toArray());
    assertEquals(left, leftSide);
    assertEquals(right, rightSide);
  },
});

Deno.test({
  name: "ranges",
  only: false,
  fn: () => {
    const seq = GeometricSequence.from(frozen);
    const middleFive = seq.first(15).last(5);
    assertEquals(middleFive.length(), 5);
    assertEquals(seq.slice(10, 16), middleFive);
    const middleTen = seq.last(15).first(10);
    assertEquals(middleTen.length(), 10);
    assertEquals(seq.slice(5, 16), middleTen);
    // Overshoots should be clamped to the size of the sequence.
    const lastTen = seq.first(10).last(20);
    assertEquals(lastTen.length(), 10);
    const fullSet = seq.first(20).last(20);
    assertEquals(fullSet.length(), 20);
    assertEquals(fullSet, seq);
  },
});

Deno.test({
  name: "insert",
  only: false,
  fn: () => {
    let seq = GeometricSequence.empty();
    for (const [i, node] of frozen.entries()) {
      seq = seq.insert(i, node);
    }
    assertEquals(seq.toArray(), frozen);

    // Can't insert at an index that doesn't exist.
    assertEquals(
      GeometricSequence.empty().insert(1, { key: 0, rank: 0 }),
      GeometricSequence.empty(),
    );
  },
});

Deno.test({
  name: "push",
  only: false,
  fn: () => {
    let seq = GeometricSequence.empty();
    for (const node of frozen) {
      seq = seq.push(node);
    }
    assertEquals(seq.toArray(), frozen);
  },
});

Deno.test({
  name: "push vs insert",
  only: false,
  fn: () => {
    let pushed = GeometricSequence.empty();
    let inserted = GeometricSequence.empty();
    for (const [i, node] of shuffle([...frozen]).entries()) {
      pushed = pushed.push(node);
      inserted = inserted.insert(i, node);
    }
    assertEquals(pushed.toArray(), inserted.toArray());
    assertEquals(pushed, inserted);
  },
});

Deno.test({
  name: "unshift",
  only: false,
  fn: () => {
    let seq = GeometricSequence.empty();
    for (const node of [...frozen].reverse()) {
      seq = seq.unshift(node);
    }
    assertEquals(seq.toArray(), frozen);
  },
});

Deno.test({
  name: "at and del",
  only: false,
  fn: () => {
    const shuffled = shuffle(frozen);
    let seq = GeometricSequence.empty();
    for (const node of shuffled) {
      seq = seq.push(node);
    }
    assertEquals(seq.toArray(), shuffled);

    // Delete the first 10 nodes, and check that they match the values from the shuffled order
    for (let i = 0; i < 10; i++) {
      const node = seq.at(0);
      assertEquals(node, shuffled.at(i));
      seq = seq.remove(0);
    }
    // Should now be left with the last 10 nodes.
    assertEquals(seq.toArray(), shuffled.slice(10));

    // Get the node at 10 (which should now be the last node in the sequence).
    const node = seq.at(10);
    assertEquals(node, shuffled.at(shuffled.length - 1));

    assertEquals(GeometricSequence.empty().at(0), undefined);
    assertEquals(
      GeometricSequence.empty().remove(0),
      GeometricSequence.empty(),
    );
  },
});
