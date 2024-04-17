import { CID as Cid } from "npm:multiformats";
import * as codec from "npm:@ipld/dag-cbor";
import { encode } from "npm:multiformats/block";
import { blake2b256 as hasher } from "npm:@multiformats/blake2/blake2b";
import { assertEquals, frozen } from "./test_utils.ts";

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
  pointer?: Pointer<K, V>,
) {
  if (pointer == null) return null;
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

async function encodeNode<K, V>(
  node: Node<K, V>,
) {
  const value: (Cid | null)[] = [
    await encodePair({ key: node.key, value: node.value ?? null }),
    encodePointer(node.prev),
    encodePointer(node.next),
  ];
  const { cid } = await encode<typeof value, 113, 45600>({
    value,
    codec,
    hasher,
  });
  return cid;
}

interface Node<K, V> {
  key: K;
  rank: number;
  value?: V;
  prev?: Pointer<K, V>;
  next?: Pointer<K, V>;
}

export async function from<K, V>(
  array: ReadonlyArray<Item<K, V>>,
): Promise<Node<K, V> | undefined> {
  if (array.length == 0) {
    return undefined;
  }
  const rank = Math.max(...array.map((item) => item.rank));
  const split = array.findIndex((item) => item.rank === rank);
  const _prev = await from(array.slice(0, split));
  const prev = _prev
    ? {
      cache: _prev,
      type: "link" as const,
      cid: await encodeNode(_prev),
    }
    : undefined;
  const _next = await from(array.slice(split + 1));
  const next = _next
    ? {
      cache: _next,
      type: "link" as const,
      cid: await encodeNode(_next),
    }
    : undefined;
  const item = array[split];
  return { key: item.key, value: item.value, rank: item.rank, prev, next };
}

Deno.test({
  name: "random order should be the same",
  only: false,
  fn: async () => {
    const tree = await from(frozen);
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
