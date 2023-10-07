import { assert, assertEquals, frozen, range, shuffle } from "./test_utils.ts";
import { BZipTree, mermaidDiagram } from "./k_max_tree.ts";

Deno.test({
  name: "chunk",
  only: false,
  fn: () => {
    const tree = BZipTree.from(frozen);
    assertEquals(tree.toArray(), frozen);
  },
});

Deno.test({
  name: "search",
  only: false,
  fn: () => {
    const tree = BZipTree.from(frozen);
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
    const tree = BZipTree.from(frozen);
    const shuffled = shuffle(frozen);
    let root = BZipTree.empty();
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
    const tree = BZipTree.from(frozen);
    const shuffled = shuffle(frozen);
    const [removed, kept] = [shuffled.slice(0, 10), shuffled.slice(10)];
    kept.sort(({ key: a }, { key: b }) => a - b);
    let root = tree;
    for (const { key } of removed) {
      root = root.remove(key);
    }
    assert(!root.isEmpty());
    // tree should be unchanged
    assertEquals(tree.toArray(), frozen);
    assertEquals(root.toArray(), kept);

    // Remove all the keys from the root node
    for (const { key } of [...root.root!.keys]) {
      root = root.remove(key);
    }
    assert(!root.isEmpty());

    assert(BZipTree.empty().remove(0).isEmpty());
  },
});

Deno.test({
  name: "unzip",
  only: false,
  fn: () => {
    const tree = BZipTree.from(frozen);
    for (const i of shuffle(range(0, frozen.length - 1))) {
      const _left = BZipTree.from(frozen.slice(0, i + 1));
      const _right = BZipTree.from(frozen.slice(i + 1));

      const splitValue = frozen[i].key;
      const [left, right] = tree.unzip(splitValue);
      assertEquals(left, _left, `mismatch at ${i}`);
      assertEquals(right, _right, `mismatch at ${i}`);
    }
    assertEquals(BZipTree.empty().unzip(0), [
      BZipTree.empty(),
      BZipTree.empty(),
    ]);
    const [left, right] = tree.unzip(100);
    assertEquals(left, tree, `left should be full`);
    assertEquals(right, BZipTree.empty(), `right should be empty`);
  },
});

Deno.test({
  name: "zip",
  only: false,
  fn: () => {
    const tree = BZipTree.from(frozen);
    for (const i of shuffle(range(0, frozen.length - 1))) {
      const splitValue = frozen[i].key;
      const [left, right] = tree.unzip(splitValue);
      const root = left.zip(right);
      assertEquals(tree, root, `mismatch at ${i}`);
    }
    // Also test alternative API
    assertEquals(BZipTree.zip(BZipTree.empty(), tree), tree);
    assertEquals(BZipTree.zip(tree, BZipTree.empty()), tree);
    assertEquals(
      BZipTree.zip(BZipTree.empty(), BZipTree.empty()),
      BZipTree.empty(),
    );
  },
});

Deno.test({
  name: "mermaid",
  only: false,
  fn: () => {
    const tree = BZipTree.from(frozen);
    console.log(mermaidDiagram(tree));

    const [left, right] = tree.unzip(47);
    console.log(mermaidDiagram(left));
    console.log(mermaidDiagram(right));
  },
});
