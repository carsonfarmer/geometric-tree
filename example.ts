import { BinaryZipTree } from "./zip_tree.ts";
import { assert, assertEquals, frozen, shuffle } from "./test_utils.ts";

const tree = BinaryZipTree.from(frozen);
let root = BinaryZipTree.empty();
for (const item of shuffle(frozen)) {
  root = root.insert(item);
}
assertEquals(root, tree);
assertEquals(tree.toArray(), frozen);
assertEquals(root.toArray(), frozen);

for (const item of shuffle(frozen)) {
  const node = tree.search(item.key);
  assertEquals(node, item);
}

for (const { key } of shuffle(frozen)) {
  assert(!root.isEmpty());
  root = root.remove(key);
}
assert(root.isEmpty());

console.log("ok");
