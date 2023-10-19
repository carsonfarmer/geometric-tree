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

export function split<T>(array: T[], index: number): [T[], T[]] {
  const left = array.slice(0, index);
  const right = array.slice(index);
  return [left, right];
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
