/**
 * Compute the rank of a large integer by counting the number of trailing zeros its binary representation.
 * This can also be thought of as the largest power of 2 that divides the integer.
 * We can interpret this count as the outcome of a series of Bernoulli trials with success probability 0.5,
 * such that the computed "rank" represents the number of failures (zeros) before the first success (one).
 * @param integer The integer from which to compute the rank.
 * @returns The numeric "rank" of the input integer.
 */
export function rank(integer: bigint) {
  const binary = integer.toString(2);
  let count = 0;
  for (let i = binary.length - 1; i >= 0; i--) {
    if (binary[i] === "0") {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Generate a random value from a geometric distribution with probability `p`.
 * This function uses the inverse transform method to generate random values.
 * @param p The probability of success in a Bernoulli trial.
 * @returns A random value from the geometric distribution with parameter `p`.
 */
export function geometric(p: number) {
  return Math.floor(Math.log(Math.random()) / Math.log(1 - p));
}

export function pad<T>(
  array: T[],
  length: number,
  front = false,
): (T | undefined)[] {
  const padding = Array.from(
    { length: length - array.length },
    () => undefined,
  );
  return front ? [...padding, ...array] : [...array, ...padding];
}

/**
 * Find all indices of array where predicate returns `true`.
 * @param array The array to process.
 * @param predicate The function invoked per iteration.
 * @returns Returns an array of all indices for which the predicate function returns `true`.
 */
export function splits<T>(
  array: ReadonlyArray<T>,
  predicate: (element: T, index: number) => boolean,
): ReadonlyArray<number> {
  const initial: number[] = [];
  return array.reduce(
    (indices, element, index) =>
      predicate(element, index) ? [...indices, index] : indices,
    initial,
  );
}

/**
 * Split an array into multiple subsets using an array of indices.
 * The elements at the "found" indices are not included in the subsets.
 * @param array The array to process.
 * @param indices The indices at which to split the original array.
 * @returns Returns an array of the resulting subsets.
 */
export function subsets<T>(
  array: ReadonlyArray<T>,
  indices: ReadonlyArray<number>,
): ReadonlyArray<ReadonlyArray<T>> {
  const indexes = [-1, ...indices, array.length];
  return indexes
    .map((value, index, arr) =>
      index < arr.length - 1 ? array.slice(value + 1, arr[index + 1]) : null
    )
    .filter((x) => x != null) as unknown as T[][];
}
