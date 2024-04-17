import { CID as Cid, Link } from "npm:multiformats";
import { create } from "npm:multiformats/hashes/digest";
import * as codec from "npm:@ipld/dag-cbor";
import { decode, encode } from "npm:multiformats/block";
import { BlockView } from "npm:multiformats/interface";
import { blake2b256 as hasher } from "npm:@multiformats/blake2/blake2b";
import { Blockstore } from "npm:interface-blockstore";

import { List } from "./list.ts";

export const DEFAULT_CID = Cid.create(1, 0, create(0, new Uint8Array(0)));

async function putCbor<S>(store: Blockstore, value: S) {
  const { cid, bytes } = await encode<S, 113, 45600>({
    value,
    codec,
    hasher,
  });
  return store.put(cid, bytes);
}

async function getCbor<S>(store: Blockstore, cid: Cid<S>) {
  const bytes = await store.get(cid);
  return decode<S, 113, 45600>({
    bytes,
    codec,
    hasher,
  });
}

// type Pair<K, V> = { key: K; value?: V; prev: Node<K, V> };

export class Node<K, V> {
  constructor(
    public key: K,
    public value?: V,
    public prev?: Link<unknown>,
  ) {}
  async encode(next?: Link<unknown>) {
    const pair = { key: this.key, value: this.value };
    const { cid } = await encode<typeof pair, 113, 45600>({
      value: pair,
      codec,
      hasher,
    });
    const tuple = [cid, this.prev, next];
    return await encode<typeof tuple, 113, 45600>({
      value: tuple,
      codec,
      hasher,
    });
  }
}
