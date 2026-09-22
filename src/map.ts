import { config, type Config, type Options } from "./options";
import {
  entries,
  find,
  insert,
  remove,
  single,
  size,
  type Entry,
  type Tree,
} from "./tree";

/** An immutable, ordered map. Every update returns a new map. */
export class GMap<K, V> implements Iterable<[K, V]> {
  private constructor(
    readonly root: Tree<K, V>,
    private readonly cfg: Config<K>,
  ) {}

  static empty<K, V>(options?: Options<K>): GMap<K, V> {
    return new GMap<K, V>(undefined, config(options));
  }

  static from<K, V>(
    pairs: Iterable<readonly [K, V]>,
    options?: Options<K>,
  ): GMap<K, V> {
    let map = GMap.empty<K, V>(options);
    for (const [key, value] of pairs) map = map.set(key, value);
    return map;
  }

  get size(): number {
    return size(this.root);
  }

  private at(key: K) {
    return (e: Entry<K, V>) => this.cfg.compare(e.key, key);
  }

  private entry(key: K): Entry<K, V> | undefined {
    const e = find(this.root, this.at(key));
    return e && this.cfg.compare(e.key, key) === 0 ? e : undefined;
  }

  has(key: K): boolean {
    return this.entry(key) !== undefined;
  }

  get(key: K): V | undefined {
    return this.entry(key)?.value;
  }

  set(key: K, value: V): GMap<K, V> {
    const one = single(key, value, this.cfg.rank(key), this.cfg.items());
    return new GMap(insert(this.root, this.at(key), one), this.cfg);
  }

  delete(key: K): GMap<K, V> {
    if (!this.has(key)) return this;
    return new GMap(remove(this.root, this.at(key)), this.cfg);
  }

  *entries(): Generator<[K, V]> {
    for (const e of entries(this.root)) yield [e.key, e.value];
  }

  *keys(): Generator<K> {
    for (const e of entries(this.root)) yield e.key;
  }

  *values(): Generator<V> {
    for (const e of entries(this.root)) yield e.value;
  }

  [Symbol.iterator](): Generator<[K, V]> {
    return this.entries();
  }
}
