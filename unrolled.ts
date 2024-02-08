// Alternatives:
// https://opendatastructures.org/ods-python/3_3_SEList_Space_Efficient_.html
//

/**
 * UnrolledList is singly-linked unrolled linked list.
 * It is a singly-linked list of nodes, where each node
 * contains up to a fixed number of elements.
 */
export class UnrolledList<T> implements Iterable<T> {
  next?: UnrolledList<T>;
  elements: T[];
  capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.elements = [];
  }

  /** Returns the length of l. */
  get length(): number {
    if (this.next === undefined) {
      return this.elements.length;
    }
    return this.elements.length + this.next.length;
  }

  /** Return whether l is empty. */
  isEmpty() {
    return this.length === 0;
  }

  /** Push values onto the end of the list */
  push(...values: T[]): void {
    for (const value of values) {
      if ((this.next === undefined) && (this.elements.length < this.capacity)) {
        this.elements.push(value);
      } else {
        if (this.next === undefined) {
          this.#grow();
        }
        this.next?.push(value);
      }
    }
  }

  // grow adds a new node as the next of list l. The next pointer of the
  // new node will be pointing at whatever was the next pointer of l
  // pointing at.
  #grow(): void {
    const nextNext = this.next;
    this.next = new UnrolledList(this.capacity);
    this.next.next = nextNext;
  }

  // growDividing adds a new node after l, and puts half of l's elements
  // into the new node.
  #growDividing(): void {
    this.#grow();
    const half = Math.floor(this.elements.length / 2);
    this.next?.elements.push(...this.elements.slice(half));
    this.elements = this.elements.slice(0, half);
  }

  *[Symbol.iterator](): Iterator<T> {
    for (const el of this.elements) {
      yield el;
    }
    if (this.next) {
      yield* this.next;
    }
  }

  findIndex(predicate: (value: T, index?: number) => boolean): number {
    const index = this.elements.findIndex(predicate);
    if (index === -1 && this.next) {
      const nextIndex = this.next.findIndex(predicate);
      return nextIndex < 0 ? nextIndex : this.elements.length + nextIndex;
    }
    return index;
  }

  /**
   * Returns the element in the i-th position in the list and undefined if i < l.length().
   */
  at(i: number): T | undefined {
    const length = this.elements.length;
    if (i < length) {
      return this.elements[i];
    } else if (this.next !== undefined) {
      return this.next.at(i - length);
    }
  }

  static insert<T>(slice: T[], i: number, value: T): T[] {
    return [...slice.slice(0, i), value, ...slice.slice(i)];
  }

  static splice<T>(slice: T[], i: number): [T, T[]] {
    const el = slice[i];
    return [el, [...slice.slice(0, i), ...slice.slice(i + 1)]];
  }

  /**
   * Inserts value at position i in the list.
   * @throws {Error} if i is out of range.
   */
  insert(i: number, value: T): void {
    if (i >= this.elements.length) {
      if (this.next === undefined) {
        throw new Error("Index out of range");
      }
      this.next.insert(i - this.elements.length, value);
    } else if (this.elements.length < this.capacity && i <= this.capacity) {
      this.elements = UnrolledList.insert(this.elements, i, value);
    } else if (this.elements.length === this.capacity) {
      this.#growDividing();
      this.insert(i, value);
    }
  }

  // TODO: We are using elements.length, but we might want to use capacity?
  #set(i: number, value: T): void {
    if (i >= this.elements.length) {
      if (this.next === undefined) {
        throw new Error("Index out of range");
      }
      this.next.#set(i - this.elements.length, value);
    } else {
      this.elements[i] = value;
    }
  }

  // rebalance guarantees that all nodes except the last one are at
  // least half full. If the current node becomes less than half full,
  // move an element from the next node to the current one. If it is
  // possible to fit all the elements in both the current and next node
  // in one node, do it.
  #rebalance(): void {
    const length = this.elements.length;
    const capacity = this.capacity;
    if (this.next === undefined) {
      return;
    } else if (length + this.next.elements.length <= capacity) {
      this.elements.push(...this.next.elements);
      this.next = this.next.next;
    } else if (capacity / 2 > length) {
      const [toBeMoved, remaining] = UnrolledList.splice(
        this.next.elements,
        0,
      );
      this.elements.push(toBeMoved);
      this.next.elements = remaining;
    }
  }

  clone(): UnrolledList<T> {
    const list = new UnrolledList<T>(this.capacity);
    list.elements = [...this.elements];
    if (this.next) {
      list.next = this.next.clone();
    }
    return list;
  }

  /** Delete and return the ith element of the list. */
  remove(i: number): T | undefined {
    const length = this.elements.length;
    if (i < length) {
      const [popped, remaining] = UnrolledList.splice(this.elements, i);
      this.elements = remaining;
      this.#rebalance();
      return popped;
    } else if (this.next) {
      return this.next.remove(i - length);
    }
    return undefined;
  }

  /** Delete and return the ith element of the list. */
  #split(i: number): UnrolledList<T> {
    const length = this.elements.length;
    if (i < length) {
      const [left, right] = [this.elements.slice(0, i), this.elements.slice(i)];
      this.elements = left;
      const ul = new UnrolledList<T>(this.capacity);
      ul.elements = right;
      ul.next = this.next?.clone();
      this.next = undefined;
      this.#rebalance();
      ul.#rebalance();
      return ul;
    } else if (this.next) {
      return this.next.#split(i - length);
    }
    return new UnrolledList(this.capacity);
  }

  static splitAt<T>(
    ul: UnrolledList<T>,
    i: number,
  ): [UnrolledList<T>, UnrolledList<T>] {
    const left = ul.clone();
    const right = left.#split(i);
    return [left, right];
  }

  concat(other: UnrolledList<T>): UnrolledList<T> {
    if (this.next === undefined) {
      this.next = other.clone();
      this.#rebalance();
      return this;
    }
    return this.next.concat(other);
  }

  static concat<T>(
    left: UnrolledList<T>,
    right: UnrolledList<T>,
  ): UnrolledList<T> {
    return left.clone().concat(right);
  }

  /** Delete and return the first element of the list. */
  shift(): T | undefined {
    return this.remove(0);
  }

  pop(): T | undefined {
    return this.remove(this.length - 1);
  }

  unshift(...values: T[]): void {
    const left = new UnrolledList<T>(this.capacity);
    left.push(...values);
    left.concat(this);
    Object.assign(this, left);
  }
}
