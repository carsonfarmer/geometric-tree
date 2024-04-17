import { CID as Cid } from "npm:multiformats";
import * as codec from "npm:@ipld/dag-cbor";
import { encode } from "npm:multiformats/block";
import { blake2b256 as hasher } from "npm:@multiformats/blake2/blake2b";
import { assertEquals, frozen } from "./test_utils.ts";
import { LinkedList, List } from "./list.ts";

interface Item<K, V> {
  key: K;
  value?: V;
  rank: number;
}

interface KeyValuePair<K, V> {
  key: K;
  value: V;
}

interface Link<K, V> {
  type: "link";
  cid: Cid;
  cache?: Node<K, V>;
}

interface Dirty<K, V> {
  type: "dirty";
  node: Node<K, V>;
}

type Pointer<K, V> = Link<K, V> | Dirty<K, V>;

function encodePointer<K, V>(
  pointer: Pointer<K, V>,
) {
  switch (pointer.type) {
    case "link":
      return pointer.cid;
    case "dirty":
      throw new Error("Cannot serialize cached values");
  }
}

async function encodePair<K, V>(
  value: KeyValuePair<K, V>,
) {
  const { cid } = await encode<typeof value, 113, 45600>({
    value,
    codec,
    hasher,
  });
  return cid;
}

const create = <T>() => new LinkedList<T>();

async function encodeNode<K, V>(
  node: Node<K, V>,
) {
  let next = node.next ? encodePointer(node.next) : null;
  for await (const item of [...node.items].toReversed()) {
    const value: (Cid | null)[] = [
      await encodePair({ key: item.key, value: null }),
      item.value ? encodePointer(item.value) : null,
      next,
    ];
    const { cid } = await encode<typeof value, 113, 45600>({
      value,
      codec,
      hasher,
    });
    next = cid;
  }
  return next;
}

export interface Node<K, V> {
  rank: number;
  items: List<KeyValuePair<K, Pointer<K, V> | undefined>>;
  next?: Pointer<K, V>;
}

async function makePair<K, V>(
  key: K,
  subset: Item<K, V>[],
  create: <T>() => List<T>,
) {
  const _value = await from(subset, create);
  const value = _value
    ? {
      cache: _value,
      type: "link" as const,
      cid: await encodeNode(_value) as Cid,
    }
    : undefined;

  return { key, value };
}

export async function from<K, V>(
  values: ReadonlyArray<Item<K, V>>,
  create: <T>() => List<T>,
): Promise<Node<K, V> | undefined> {
  if (values.length == 0) {
    return undefined;
  }
  const rank = Math.max(...values.map((item) => item.rank));
  const splits = Array
    .from(values.entries())
    .filter(([, item]) => item.rank === rank)
    .map(([i]) => i);
  const _items = splits.reduce((acc, curr, i, arr) => {
    const start = arr[i - 1] + 1 ?? 0;
    const subset = values.slice(start, curr);
    const pair = makePair(values[curr].key, subset, create);
    return acc.push(pair);
  }, create<Promise<KeyValuePair<K, Pointer<K, V> | undefined>>>());
  const items = LinkedList.from(await Promise.all(_items));
  const _next = await from(values.slice(splits[splits.length - 1] + 1), create);
  const next = _next
    ? {
      cache: _next,
      type: "link" as const,
      cid: await encodeNode(_next) as Cid,
    }
    : undefined;
  return { items, rank, next };
}

Deno.test({
  name: "random order should be the same",
  only: false,
  fn: async () => {
    const tree = await from(frozen, create);
    const cid = await encodeNode(tree!);
    assertEquals(
      cid,
      Cid.parse(
        "bafy2bzacealfhlat3gpstp7caj4vdddwxx45fo3jqdh5r5fijt6vqny7eihqk",
      ),
    );
  },
});
// CID(bafy2bzacealfhlat3gpstp7caj4vdddwxx45fo3jqdh5r5fijt6vqny7eihqk)
// CID(bafy2bzacealfhlat3gpstp7caj4vdddwxx45fo3jqdh5r5fijt6vqny7eihqk)
