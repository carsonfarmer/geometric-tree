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

/** An immutable, ordered set. Every update returns a new set. */
export class GSet<K> implements Iterable<K> {
  private constructor(
    readonly root: Tree<K, undefined>,
    private readonly cfg: Config<K>,
  ) {}

  static empty<K>(options?: Options<K>): GSet<K> {
    return new GSet<K>(undefined, config(options));
  }

  static from<K>(keys: Iterable<K>, options?: Options<K>): GSet<K> {
    let set = GSet.empty<K>(options);
    for (const key of keys) set = set.add(key);
    return set;
  }

  get size(): number {
    return size(this.root);
  }

  private at(key: K) {
    return (e: Entry<K, undefined>) => this.cfg.compare(e.key, key);
  }

  has(key: K): boolean {
    const e = find(this.root, this.at(key));
    return e !== undefined && this.cfg.compare(e.key, key) === 0;
  }

  add(key: K): GSet<K> {
    if (this.has(key)) return this;
    const one = single(key, undefined, this.cfg.rank(key), this.cfg.items());
    return new GSet(insert(this.root, this.at(key), one), this.cfg);
  }

  delete(key: K): GSet<K> {
    if (!this.has(key)) return this;
    return new GSet(remove(this.root, this.at(key)), this.cfg);
  }

  *[Symbol.iterator](): Generator<K> {
    for (const e of entries(this.root)) yield e.key;
  }
}
