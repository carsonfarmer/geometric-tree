# geometric-tree

> Immutable, history-independent maps, sets and lists built on geometric search trees.

A [G-tree](https://g-trees.github.io/g_trees/) is a randomised search tree in which every key
gets a geometrically distributed *rank*, and a node holds the whole run of keys that share the
highest rank in its subtree. Ranks derived from a hash of the key make the tree a pure function
of its contents: the same set of keys always yields the same tree, whatever the order of
insertions and deletions. With about `k` keys per node the family spans zip trees (`k = 2`),
cache-friendly wide trees, and, with a G-tree as the inner set of each node, zip-zip trees.

The point of this library is how little code it takes. The whole tree is two operations,
`unzip` and `zip`, and everything else is a composition of them.

## Install

```sh
npm install geometric-tree   # or bun add, pnpm add, deno add npm:geometric-tree
```

Plain ESM with no dependencies and no runtime-specific APIs; it runs on Node, Bun, Deno and
browsers. [Bun](https://bun.sh) is used for development only.

## Usage

```ts
import { GMap, GSet, GList } from "geometric-tree";

// Map: ordered by key, every update returns a new map.
let m = GMap.from([["b", 2], ["a", 1]]);
m = m.set("c", 3).delete("a");
m.get("b");      // 2
m.has("a");      // false
[...m];          // [["b", 2], ["c", 3]]

// Set.
let s = GSet.from([3, 1, 2]);
s = s.add(4).delete(1);
[...s];          // [2, 3, 4]

// List: logarithmic insert, remove, slice and concat at any position.
let l = GList.from(["a", "b", "d"]);
l = l.insert(2, "c").remove(0);
l.at(0);         // "b"
[...l.slice(1)]; // ["c", "d"]
[...l.concat(l)] // ["b", "c", "d", "b", "c", "d"]
```

All structures are persistent: old versions stay valid and share structure with new ones.

## How it works

A tree is a `Node` or `undefined`. A node has a `rank`, an ordered collection of `items`, each an
`Entry` holding a key, a value and the subtree of the keys before it, and one `right` subtree of
the keys after the last item.

```ts
type Entry<K, V> = { key: K; value: V; left: Tree<K, V> };
type Node<K, V> = { rank: number; items: Items<K, V>; right: Tree<K, V>; size: number };
type Tree<K, V> = Node<K, V> | undefined;
```

`unzip` splits a tree around a position into everything before it, the entry at it, and
everything after; `zip` joins two ordered trees. Both walk one path of the tree and rebuild the
nodes on it, so they take logarithmic time.

```ts
function unzip(t, at) {
  if (t === undefined) return [undefined, undefined, undefined];
  const [lo, e, hi] = t.items.split(at);
  if (e !== undefined) return [node(t.rank, lo, e.left), e, node(t.rank, hi, t.right)];
  if (hi.weight === 0) {
    const [l, hit, r] = unzip(t.right, at);
    return [node(t.rank, lo, l), hit, r];
  }
  const [first, rest] = hi.shift();
  const [l, hit, r] = unzip(first.left, at);
  return [node(t.rank, lo, l), hit, node(t.rank, rest.unshift({ ...first, left: r }), t.right)];
}

function zip(l, r) {
  if (l === undefined) return r;
  if (r === undefined) return l;
  if (l.rank > r.rank) return node(l.rank, l.items, zip(l.right, r));
  const [first, rest] = r.items.shift();
  if (l.rank < r.rank) return node(r.rank, rest.unshift({ ...first, left: zip(l, first.left) }), r.right);
  return node(r.rank, l.items.join(rest.unshift({ ...first, left: zip(l.right, first.left) })), r.right);
}
```

Insertion is `zip(zip(before, single), after)` and deletion is `zip(before, after)`, both
starting from `unzip`. Because insertion drops any existing entry at the position, a map's `set`
is an upsert for free. The list variant splits by position instead of by key, using the node
sizes, and shares `zip`.

The inner collection of a node, `Items`, is an interface with six members (`weight`, `split`,
`find`, `join`, `shift`, `unshift`). The default is a sorted array. Nodes have constant expected
size, so linear-time array operations cost nothing asymptotically.

For contrast, `src/binary.ts` is the classic binary zip tree, with the same function names. A
G-tree with `k = 2` is that tree with every run of equal-rank right children folded into one
node, and the tests unfold one into the other to check it.

## Options

`GMap` and `GSet` take:

| option    | default          | meaning                                                         |
| --------- | ---------------- | --------------------------------------------------------------- |
| `k`       | `8`              | expected keys per node; `2` gives a zip tree                    |
| `compare` | `<` / `>`        | three-way key comparison                                        |
| `rank`    | `hashed(k)`      | rank function; `random(k)` needs no hash but is history dependent |
| `items`   | sorted arrays    | inner-set implementation, see [Gk-trees](#gk-trees)             |

`hashed(k)` is the construction from section 3.2 of the paper: hash the key, then count the
leading zero digits of the hash in base `k`. It is computed by inverse transform, one logarithm
followed by an exact integer check, so it costs the same for any `k` and gives identical ranks
on every runtime. Hash functions return a 32-bit integer, the convention of xxHash32,
MurmurHash3 and friends, so any of them drops in; the default is a small, fast,
non-cryptographic string hash over `String(key)`. Keys of object type need a comparator and
a hash:

```ts
import { GMap, hash, hashed } from "geometric-tree";

type P = { x: number; y: number };
const m = GMap.empty<P, string>({
  compare: (a, b) => a.x - b.x || a.y - b.y,
  rank: hashed(8, (p, seed) => hash(`${p.x},${p.y}`, seed)),
});
```

`GList` takes only `k`; its ranks are random, since positions carry no key to hash.

## Gk-trees

A G-tree is only as balanced as its ranks. Someone who can craft keys can give them all the
same rank, and a plain G-tree then degenerates into one node holding every key. Jannik
Hehemann's master's thesis (Mittweida, 2025, section 4.1) proposes a fix: once a node holds
more than a threshold of entries, store them as a G-tree of their own, ranked by a fresh hash,
and so on recursively. Forcing a collision now costs the attacker one preimage-like search per
dimension, and operations stay in O(log² n) even against an adaptive adversary.

The `Items` interface makes this a drop-in: `TreeItems` is an inner set backed by a G-tree, and
`GkItems` is a sorted array that becomes a `TreeItems` past the threshold and back below it.
Converting in both directions at the same size keeps the representation a function of the
stored set, so history independence survives.

```ts
import { GSet, gk } from "geometric-tree";

const s = GSet.empty<string>(gk({ k: 8 }));               // threshold defaults to 12k
const zz = GSet.empty<string>(gk({ k: 2, threshold: 1 })); // zip-zip trees
```

With the default threshold an honest node overflows with probability around e⁻¹², so the
Gk variant costs nothing measurable on ordinary data.

## Performance

Simplicity comes first, but the structures are usable. Rough figures for 100 000 integer keys
on one core (`bun run bench`), per operation:

| structure    | insert | get    | iterate | delete |
| ------------ | ------ | ------ | ------- | ------ |
| `GMap`, k=8  | ~10 µs | ~1 µs   | ~0.3 µs | ~8 µs  |
| `GMap`, k=2  | ~12 µs | ~2 µs   | ~0.6 µs | ~11 µs |

Updates allocate a new node for every node on the path, plus array copies of the node
contents; that is the price of persistence. Building insertion from `unzip` and `zip` costs
roughly two extra path walks compared to a hand-written insert, which is the trade the paper
makes as well.

## Development

```sh
bun install
bun test
bun run typecheck
bun run bench
bun run build      # dist/ with ESM and type declarations
bun run smoke      # build, then import dist/ from Node
```

## References

- Carson Farmer and Aljoscha Meyer. *Geometric Search Trees.* https://g-trees.github.io/g_trees/
- Jannik Hehemann. *History-independent data structures and their synchronisation.* Master's
  thesis, Hochschule Mittweida, 2025. Section 4.1, Gk-trees.
- Tarjan, Levy and Timmel. *Zip Trees.* ACM Transactions on Algorithms, 2021.

## License

MIT © Carson Farmer
