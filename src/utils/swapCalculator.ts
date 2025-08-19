// swapCalculator.ts

/**
 * Calculates the output amount for a swap using the AMM formula from the Leo program.
 * Formula: out_amt = (in_fee * rb) / (ra * 1000 + in_fee)
 * where in_fee = amount_in * 997 (0.3% fee)
 *
 * @param amountIn - Input amount in microcredits
 * @param ra - Current ALEO reserve
 * @param rb - Current USDC reserve
 * @returns The output amount in microcredits
 */
export function calculateSwapOutput(amountIn: number, ra: number, rb: number): number {
  if (ra <= 0 || rb <= 0) {
    throw new Error('Reserves must be greater than 0');
  }

  const amountInU128 = amountIn;
  const raU128 = ra;
  const rbU128 = rb;

  // Calculate fee: amount_in * 997 (0.3% fee)
  const inFee = amountInU128 * 997;
  
  // Calculate output: (in_fee * rb) / (ra * 1000 + in_fee)
  const outputAmount = (inFee * rbU128) / (raU128 * 1000 + inFee);
  
  return Math.floor(outputAmount);
}

/**
 * Calculates the minimum output amount based on slippage tolerance.
 *
 * @param expectedOutput - Expected output amount
 * @param slippageTolerance - Slippage tolerance as a percentage (e.g., 0.5 for 0.5%)
 * @returns Minimum output amount
 */
export function calculateMinOutput(expectedOutput: number, slippageTolerance: number): number {
  const slippageMultiplier = 1 - (slippageTolerance / 100);
  return Math.floor(expectedOutput * slippageMultiplier);
}

/**
 * Calculates the price impact of a swap.
 *
 * @param amountIn - Input amount
 * @param ra - Current ALEO reserve
 * @returns Price impact as a percentage
 */
export function calculatePriceImpact(amountIn: number, ra: number): number {
  if (ra <= 0) return 0;
  return (amountIn / ra) * 100;
}

/**
 * Calculates the optimal input amount for a desired output.
 * This is useful for reverse swaps.
 *
 * @param desiredOutput - Desired output amount
 * @param ra - Current ALEO reserve
 * @param rb - Current USDC reserve
 * @returns Required input amount
 */
export function calculateRequiredInput(desiredOutput: number, ra: number, rb: number): number {
  if (ra <= 0 || rb <= 0) {
    throw new Error('Reserves must be greater than 0');
  }

  // Reverse the AMM formula to solve for input
  // out_amt = (in_fee * rb) / (ra * 1000 + in_fee)
  // in_fee = (out_amt * ra * 1000) / (rb - out_amt)
  // amount_in = in_fee / 997
  
  const numerator = desiredOutput * ra * 1000;
  const denominator = rb - desiredOutput;
  
  if (denominator <= 0) {
    throw new Error('Desired output exceeds available reserves');
  }
  
  const inFee = numerator / denominator;
  const amountIn = inFee / 997;
  
  return Math.ceil(amountIn);
}
