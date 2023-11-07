export function splitAt<T>(
  array: ReadonlyArray<T>,
  i: number,
): [ReadonlyArray<T>, ReadonlyArray<T>] {
  return [array.slice(0, i), array.slice(i)];
}

export function findIndex<T>(
  array: ReadonlyArray<T>,
  predicate: (value: T, index?: number | undefined) => boolean,
): number {
  return array.findIndex(predicate);
}

export function concat<T>(...arrays: ReadonlyArray<T>[]): ReadonlyArray<T> {
  return arrays.flat();
}

export function isEmpty<T>(array: ReadonlyArray<T>): boolean {
  return array.length === 0;
}

export function pushFront<T>(
  array: ReadonlyArray<T>,
  ...values: T[]
): ReadonlyArray<T> {
  return [...values, ...array];
}

export function pushBack<T>(
  array: ReadonlyArray<T>,
  ...values: T[]
): ReadonlyArray<T> {
  return [...array, ...values];
}

export function popFront<T>(array: ReadonlyArray<T>): ReadonlyArray<T> {
  return [...array].slice(1);
}

export function popBack<T>(array: ReadonlyArray<T>): ReadonlyArray<T> {
  return [...array].slice(0, -1);
}

export function peekFront<T>(array: ReadonlyArray<T>): T | undefined {
  return array.at(0);
}

export function peekBack<T>(array: ReadonlyArray<T>): T | undefined {
  return array.at(-1);
}

export function pick<T>(array: ReadonlyArray<T>, i: number): T | undefined {
  return array.at(i);
}
