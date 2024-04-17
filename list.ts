/**
 * The List interface defines the operations that a list data structure should support.
 */
export interface List<T> {
  /**
   * Adds a new element to the end of the list.
   * @param value The value to add.
   * @returns A new list with the added value.
   */
  push(value: T): List<T>;

  /**
   * Removes the last element from the list.
   * @returns A tuple containing the new list and the removed value, if any.
   */
  pop(): List<T>;

  /**
   * Adds a new element to the start of the list.
   * @param value The value to add.
   * @returns A new list with the added value.
   */
  unshift(value: T): List<T>;

  /**
   * Removes the first element from the list.
   * @returns A tuple containing the new list and the removed value, if any.
   */
  shift(): List<T>;

  /**
   * Joins the current list with another list.
   * @param list The list to join with.
   * @returns A new list that is the result of joining the two lists.
   */
  join(list: List<T>): List<T>;

  /**
   * Splits the list into two lists at the first value that satisfies the given predicate.
   * @param predicate The function to determine where to split the list.
   * @returns A tuple containing the two new lists and the split value, if any.
   */
  split(
    predicate: (value: T) => boolean,
  ): [List<T>, T | undefined, List<T>];

  /**
   * Checks if the list is empty.
   * @returns A boolean indicating whether the list is empty.
   */
  isEmpty(): boolean;

  /**
   * Returns an iterator for the values in the list.
   * @returns An iterator for the list.
   */
  [Symbol.iterator](): Iterator<T>;

  /**
   * Finds the first value in the list that satisfies the given predicate.
   * @param predicate The function to test each value.
   * @returns The first value that satisfies the predicate, or undefined if no value is found.
   */
  find(predicate: (value: T) => boolean): T | undefined;

  /**
   * Returns the first value in the list without removing it.
   * @returns The first value in the list, or undefined if the list is empty.
   */
  first(): T | undefined;

  /**
   * Returns the last value in the list without removing it.
   * @returns The last value in the list, or undefined if the list is empty.
   */
  last(): T | undefined;
}

/**
 * The ArrayList class is an implementation of the List interface using an array.
 */
export class ArrayList<T> implements List<T> {
  constructor(public readonly array: T[] = []) {}

  static from<T>(iterable: Iterable<T>): ArrayList<T> {
    return new ArrayList<T>([...iterable]);
  }

  push(value: T): List<T> {
    return new ArrayList([...this.array, value]);
  }

  pop(): List<T> {
    const rest = [...this.array].slice(0, -1);
    return new ArrayList(rest);
  }

  unshift(value: T): List<T> {
    return new ArrayList([value, ...this.array]);
  }

  shift(): List<T> {
    const rest = [...this.array].slice(1);
    return new ArrayList(rest);
  }

  join(list: List<T>): List<T> {
    return new ArrayList([...this.array, ...list]);
  }

  split(
    predicate: (value: T) => boolean,
  ): [List<T>, T | undefined, List<T>] {
    const i = this.array.findIndex(predicate);
    if (i < 0) {
      return [this, undefined, new ArrayList([])];
    }
    return [
      new ArrayList(this.array.slice(0, i)),
      this.array.at(i),
      new ArrayList(this.array.slice(i + 1)),
    ];
  }

  isEmpty(): boolean {
    return this.array.length === 0;
  }

  *[Symbol.iterator](): Iterator<T> {
    yield* this.array;
  }

  find(predicate: (value: T) => boolean): T | undefined {
    return this.array.find(predicate);
  }

  first(): T | undefined {
    return this.array.at(0);
  }

  last(): T | undefined {
    return this.array.at(-1);
  }
}

/**
 * The LinkedList class is an implementation of the List interface using a linked list.
 */
export class LinkedList<T> implements List<T> {
  public readonly head?: T;
  public readonly tail?: LinkedList<T>;
  constructor(head?: T, tail?: LinkedList<T>) {
    this.head = head;
    this.tail = tail?.head === undefined ? undefined : tail;
  }

  /**
   * @param iterable An iterable to create a linked list from.
   * @returns A new linked list with the values from the iterable.
   */
  static from<T>(iterable: Iterable<T>): LinkedList<T> {
    let list = new LinkedList<T>();
    for (const value of iterable) {
      list = list.push(value);
    }
    return list;
  }

  isEmpty(): boolean {
    return this.head === undefined;
  }

  push(value: T): LinkedList<T> {
    if (this.head === undefined) {
      return new LinkedList(value);
    }
    return new LinkedList(
      this.head,
      this.tail?.push(value) ?? new LinkedList(value),
    );
  }

  pop(): LinkedList<T> {
    if (this.head === undefined) {
      return this;
    } else if (this.tail === undefined) {
      return new LinkedList();
    } else {
      return new LinkedList(this.head, this.tail.pop());
    }
  }

  unshift(value: T): LinkedList<T> {
    return new LinkedList(value, this.clone());
  }

  shift(): LinkedList<T> {
    if (this.head === undefined) {
      return this;
    } else {
      return this.tail ?? new LinkedList();
    }
  }

  clone(): LinkedList<T> {
    return new LinkedList(this.head, this.tail);
  }

  *[Symbol.iterator](): Iterator<T> {
    let current: LinkedList<T> | undefined = this.clone();
    while (current !== undefined && current.head !== undefined) {
      yield current.head;
      current = current.tail;
    }
  }

  join(list: LinkedList<T>): LinkedList<T> {
    if (this.head === undefined) {
      return list;
    } else {
      return new LinkedList(
        this.head,
        this.tail?.join(list) ?? list,
      );
    }
  }

  split(
    predicate: (value: T) => boolean,
  ): [LinkedList<T>, T | undefined, LinkedList<T>] {
    if (this.head === undefined) {
      return [new LinkedList(), undefined, new LinkedList()];
    } else if (predicate(this.head!)) {
      return [
        new LinkedList(),
        this.head,
        this.tail ?? new LinkedList(),
      ];
    } else {
      const [before, found, after] = this.tail?.split(predicate) ?? [
        new LinkedList<T>(),
        undefined,
        new LinkedList<T>(),
      ];
      return [
        new LinkedList(this.head, before),
        found,
        after,
      ];
    }
  }

  find(predicate: (value: T) => boolean): T | undefined {
    if (this.head === undefined) {
      return undefined;
    } else if (predicate(this.head)) {
      return this.head;
    } else {
      return this.tail?.find(predicate);
    }
  }

  first(): T | undefined {
    return this.head;
  }

  last(): T | undefined {
    return this.tail?.last() ?? this.head;
  }
}
