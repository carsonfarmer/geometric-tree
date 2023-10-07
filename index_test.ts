import { assert, assertEquals, frozen, range, shuffle } from "./test_utils.ts";
import { mermaidDiagram, ZipTree } from "./index.ts";

Deno.test({
  name: "chunk",
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
      const _left = ZipTree.from(frozen.slice(0, i + 1));
      const _right = ZipTree.from(frozen.slice(i + 1));

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
