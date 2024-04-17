export function find<T>(
  array: ReadonlyArray<T>,
  predicate: (value: T, index?: number | undefined) => boolean,
): T | undefined {
  return array.find(predicate);
}

export function split<T>(
  array: ReadonlyArray<T>,
  predicate: (value: T, index?: number | undefined) => boolean,
): [ReadonlyArray<T>, T | undefined, ReadonlyArray<T>] {
  const i = array.findIndex(predicate);
  if (i < 0) {
    return [array, undefined, []];
  }
  return [array.slice(0, i), array.at(i), array.slice(i + 1)];
}

export function join<T>(...arrays: ReadonlyArray<T>[]): ReadonlyArray<T> {
  return arrays.flat();
}

export function isEmpty<T>(array: ReadonlyArray<T>): boolean {
  return array.length === 0;
}

export function unshift<T>(
  array: ReadonlyArray<T>,
  ...values: T[]
): Array<T> {
  return [...values, ...array];
}

export function push<T>(
  array: ReadonlyArray<T>,
  ...values: T[]
): Array<T> {
  return [...array, ...values];
}

export function shift<T>(array: ReadonlyArray<T>): [Array<T>, T?] {
  const rest = [...array].slice(1);
  return [rest, array.at(0)];
}

export function pop<T>(array: ReadonlyArray<T>): [Array<T>, T?] {
  const rest = [...array].slice(0, -1);
  return [rest, array.at(-1)];
}

export function pick<T>(array: ReadonlyArray<T>, i: number): T | undefined {
  return array.at(i);
}
