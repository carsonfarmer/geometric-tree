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
 * @see https://math.stackexchange.com/a/3530370
 * @see https://stackoverflow.com/a/64958223
 */
// export function geometric(p = 0.5) {
//   const r = Math.random();
//   return Math.floor(Math.log1p(-r) / Math.log1p(-p)) + 1;
// }
export function geometric(p = 0.5) {
  let rank = 1;
  while (Math.random() <= p) {
    rank++;
  }
  return rank;
}

/**
 * Generate a random value from a geometric distribution with probability `p` truncated at `beta`.
 * @param p The probability of success in a Bernoulli trial.
 * @returns A random value from the geometric distribution with parameter `p`.
 * @see https://math.stackexchange.com/a/3530370
 */
export function truncGeometric(beta: number, p = 0.5) {
  const r = Math.random();
  // E[X] = (p^{β−1})/p.
  return Math.floor(
    Math.log(1 - r * (1 - Math.pow(1 - p, beta))) / Math.log(1 - p),
  ) + 1;
}
