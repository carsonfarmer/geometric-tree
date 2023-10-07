# max-k-tree

A zip-tree based unbounded b-tree

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Contributing](#contributing)
- [License](#license)

## Background

This project includes an implementation of the zip-tree data structure, as well as an unbounded b-tree variant based on translating the zip-tree operations to trees of higher order.

A zip-tree is a randomized version of a balanced binary search tree, which relies on randomization (similar to "skip-lists") to maintain balance rather than strict structural properties.  The zip-tree is a simple data structure, and is easy to implement and understand.  It is also very fast, and has been shown to be competitive with other balanced binary search trees in practice.

The unbounded b-tree implemented here is a self-balancing tree data structure that maintains sorted data and allows searches, insertions, and deletions in logarithmic time. The "unbounded" nature means that this b-tree variant doesn't have a fixed order (i.e., a maximum number of child nodes). This b-tree variant takes the concepts and methods used in zip-trees and applies them to trees of higher order. 

A bounded variant of the unbounded b-tree will also be implemented here, leading to a tree with a fixed (or perhaps just max) order. This bounded variant could be used to create a spectrum of probabilistic tree types, from binary to a more traditional b-tree.

## Install

There are no external dependencies for this project, and it is written in pure Typescript with Deno in mind as the runtime. For now, simply clone the repo and import the code directly into your work:

## Usage

```ts
import { ZipTree } from "./zip_tree.ts";
import { assert, assertEquals, frozen, shuffle } from "./test_utils.ts";

const tree = ZipTree.from(frozen);
let root = ZipTree.empty();
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
```

## API

The API design is very much a work in progress, and will be updated as the project progresses. It is minimal at the moment, and for ease of translation, the APIs for the two implementations have been kept almost identical. The focus is on simplicity and consistency. The trees are immutable, and all "mutating" operations return a new tree. The trees are also persistent, and all operations are performed on copies of the original tree. This means that the original tree is never modified, and can be used to create new trees. The underlying algorithms are purely functional whenever possible. Lastly, the trees are generic, and can be used to store any type of data.

## Contributing

To get started, please fork this repository, and then clone it to your local machine.
Once you have a local copy, you can run the tests, build the project, and run the example code:

```bash
git clone git@github.com:carsonfarmer/max-k-tree.git
cd max-k-tree
deno test
deno run example.ts
```

PRs accepted.

Small note: If editing the README, please conform to the [standard-readme specification](https://github.com/RichardLitt/standard-readme).

## License

MIT © Carson Farmer

