/**
 * Compute the rank of a large integer by counting the number of trailing zeros its binary representation.
 * This can also be thought of as the largest power of 2 that divides the integer.
 *
 * @param integer The integer whose rank to compute.
 * @returns The numeric "rank" of the integer.
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
