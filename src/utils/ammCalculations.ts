// ammCalculations.ts
// AMM helper functions for constant product formula calculations

/**
 * Calculate output amount using constant product formula (x * y = k)
 * @param amountIn - Input amount
 * @param reserveIn - Reserve of input token
 * @param reserveOut - Reserve of output token
 * @param swapFee - Swap fee in basis points (default 30 = 0.3%)
 * @returns Output amount
 */
export function getAmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  swapFee: number = 30 // 0.3%
): bigint {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) {
    return 0n;
  }

  // Apply swap fee: amountInWithFee = amountIn * (10000 - swapFee) / 10000
  const amountInWithFee = (amountIn * BigInt(10000 - swapFee)) / 10000n;
  
  // Calculate output: numerator = amountInWithFee * reserveOut
  const numerator = amountInWithFee * reserveOut;
  
  // Calculate denominator: reserveIn + amountInWithFee
  const denominator = reserveIn + amountInWithFee;
  
  // Return output amount
  return numerator / denominator;
}

/**
 * Calculate price impact percentage
 * @param amountIn - Input amount
 * @param reserveIn - Reserve of input token
 * @param reserveOut - Reserve of output token
 * @returns Price impact as percentage (0-100)
 */
export function calculatePriceImpact(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): number {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) {
    return 0;
  }

  // Current price (before swap)
  const currentPrice = Number(reserveOut) / Number(reserveIn);
  
  // Price after swap (without fees for impact calculation)
  const newReserveIn = reserveIn + amountIn;
  const newReserveOut = reserveOut - getAmountOut(amountIn, reserveIn, reserveOut, 0);
  const newPrice = Number(newReserveOut) / Number(newReserveIn);
  
  // Calculate price impact
  const priceImpact = Math.abs((newPrice - currentPrice) / currentPrice) * 100;
  
  return priceImpact;
}

/**
 * Calculate optimal liquidity amounts to maintain pool ratio
 * @param token1Amount - Amount of token1 user wants to add
 * @param reserve1 - Current reserve of token1
 * @param reserve2 - Current reserve of token2
 * @returns Optimal amount of token2 to add
 */
export function calculateOptimalLiquidity(
  token1Amount: bigint,
  reserve1: bigint,
  reserve2: bigint
): bigint {
  if (token1Amount <= 0n || reserve1 <= 0n || reserve2 <= 0n) {
    return 0n;
  }

  // Maintain the same ratio: token1Amount / reserve1 = token2Amount / reserve2
  return (token1Amount * reserve2) / reserve1;
}

/**
 * Calculate LP tokens to mint
 * @param token1Amount - Amount of token1 being added
 * @param token2Amount - Amount of token2 being added
 * @param reserve1 - Current reserve of token1
 * @param reserve2 - Current reserve of token2
 * @param lpTotalSupply - Current total LP token supply
 * @returns LP tokens to mint
 */
export function calculateLPTokens(
  token1Amount: bigint,
  token2Amount: bigint,
  reserve1: bigint,
  reserve2: bigint,
  lpTotalSupply: bigint
): bigint {
  if (token1Amount <= 0n || token2Amount <= 0n) {
    return 0n;
  }

  // For first deposit (lpTotalSupply = 0), use geometric mean
  if (lpTotalSupply === 0n) {
    return sqrtApprox(token1Amount * token2Amount);
  }

  // For subsequent deposits, use proportional calculation
  const lpFromToken1 = (token1Amount * lpTotalSupply) / reserve1;
  const lpFromToken2 = (token2Amount * lpTotalSupply) / reserve2;
  
  // Return the smaller amount to maintain ratio
  return lpFromToken1 < lpFromToken2 ? lpFromToken1 : lpFromToken2;
}

/**
 * Approximate square root using Newton's method
 * @param x - Number to find square root of
 * @returns Approximate square root
 */
export function sqrtApprox(x: bigint): bigint {
  if (x < 0n) return 0n;
  if (x === 0n) return 0n;
  if (x === 1n) return 1n;

  let z = (x + 1n) / 2n;
  let y = x;
  
  while (z < y) {
    y = z;
    z = (x / z + z) / 2n;
  }
  
  return y;
}

/**
 * Validate pool creation ratios to prevent extreme initial ratios
 * @param amount1 - Amount of token1
 * @param amount2 - Amount of token2
 * @param maxRatio - Maximum allowed ratio (default 100000 = 100000:1)
 * @returns True if ratio is valid
 */
export function validatePoolRatio(
  amount1: bigint,
  amount2: bigint,
  maxRatio: number = 100000 // Increased from 10000 to 100000 for more flexibility
): boolean {
  if (amount1 <= 0n || amount2 <= 0n) {
    return false;
  }

  const ratio = amount2 > amount1 
    ? Number(amount2) / Number(amount1)
    : Number(amount1) / Number(amount2);
  
  console.log('Validating pool ratio:', {
    amount1: amount1.toString(),
    amount2: amount2.toString(),
    ratio,
    maxRatio,
    isValid: ratio <= maxRatio
  });
  
  return ratio <= maxRatio;
}

/**
 * Calculate minimum output amount with slippage protection
 * @param expectedOutput - Expected output amount
 * @param slippageTolerance - Slippage tolerance in basis points (default 500 = 5%)
 * @returns Minimum output amount
 */
export function calculateMinOutput(
  expectedOutput: bigint,
  slippageTolerance: number = 500 // 5%
): bigint {
  const slippageMultiplier = BigInt(10000 - slippageTolerance);
  return (expectedOutput * slippageMultiplier) / 10000n;
}

/**
 * Calculate swap fee amount
 * @param amountIn - Input amount
 * @param swapFee - Swap fee in basis points (default 30 = 0.3%)
 * @returns Fee amount
 */
export function calculateSwapFee(
  amountIn: bigint,
  swapFee: number = 30
): bigint {
  return (amountIn * BigInt(swapFee)) / 10000n;
}

/**
 * Calculate protocol fee amount
 * @param swapFeeAmount - Swap fee amount
 * @param protocolFee - Protocol fee in basis points (default 5 = 0.05%)
 * @returns Protocol fee amount
 */
export function calculateProtocolFee(
  swapFeeAmount: bigint,
  protocolFee: number = 5
): bigint {
  return (swapFeeAmount * BigInt(protocolFee)) / 10000n;
}

/**
 * Get pool ID for token pair (matches Leo BHP256 hash)
 * @param token1Id - First token ID
 * @param token2Id - Second token ID
 * @returns Pool ID string
 */
export async function getPoolId(token1Id: string, token2Id: string): Promise<string> {
  // Ensure consistent ordering (smaller token ID first) - matches Leo program
  const orderedToken1 = token1Id < token2Id ? token1Id : token2Id;
  const orderedToken2 = token1Id < token2Id ? token2Id : token1Id;
  
  // Use BHP256 hash to match the Leo program's get_pool_id function
  // The Leo program uses: BHP256::hash_to_field(PoolKey { token1: ordered_token1, token2: ordered_token2 })
  // We call the API endpoint to compute this on the server side (WASM can't run in client-side code)
  try {
    const response = await fetch(
      `/api/pool-id?token1Id=${encodeURIComponent(orderedToken1)}&token2Id=${encodeURIComponent(orderedToken2)}`
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.ok || !data.poolId) {
      throw new Error(data.error || 'Failed to get pool ID from API');
    }
    
    return data.poolId;
  } catch (error) {
    console.error('Error computing pool ID:', error);
    // Fallback to concatenation if API call fails (shouldn't happen in production)
    // This won't work for actual pool lookups, but prevents crashes
    return `${orderedToken1}_${orderedToken2}`;
  }
}

/**
 * Calculate LP token value in terms of underlying tokens
 * @param lpTokens - User's LP token amount
 * @param lpTotalSupply - Total LP token supply
 * @param reserve1 - Reserve of token1
 * @param reserve2 - Reserve of token2
 * @returns Object with token1 and token2 values
 */
export function calculateLPValue(
  lpTokens: bigint,
  lpTotalSupply: bigint,
  reserve1: bigint,
  reserve2: bigint
): { token1Value: bigint; token2Value: bigint } {
  if (lpTokens <= 0n || lpTotalSupply <= 0n) {
    return { token1Value: 0n, token2Value: 0n };
  }

  const share = lpTokens / lpTotalSupply;
  const token1Value = (reserve1 * share) / lpTotalSupply;
  const token2Value = (reserve2 * share) / lpTotalSupply;

  return { token1Value, token2Value };
}
