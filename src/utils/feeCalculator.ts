// feeCalculator.ts

export interface FeeMapping {
  [functionName: string]: number; // fee in credits
}

// Fee values for the new AMM DEX functions
// These are estimates based on the new function complexity
export const defaultFeeValues: FeeMapping = {
  // AMM DEX Core functions
  swap_aleo_for_token: 0.100000, // Native ALEO to token swap
  swap_token_for_aleo: 0.100000, // Token to native ALEO swap
  swap_tokens: 0.100000, // Token to token swap
  get_swap_quote: 0.001000, // Quote calculation (read-only)
  
  // Pool creation functions
  create_pool_native_aleo: 0.150000, // Create ALEO + token pool
  create_pool_tokens: 0.150000, // Create token + token pool
  
  // Liquidity management functions
  add_liquidity_native_aleo: 0.120000, // Add liquidity to ALEO + token pool
  add_liquidity_tokens: 0.120000, // Add liquidity to token + token pool
  remove_liquidity_native_aleo: 0.120000, // Remove liquidity from ALEO + token pool
  remove_liquidity_tokens: 0.120000, // Remove liquidity from token + token pool
  
  // Legacy functions (for backward compatibility)
  add_liquidity: 0.276442, // Old wrapped credits function
  remove_liquidity: 0.279388, // Old wrapped credits function
  initialise_pool: 0.269331, // Old wrapped credits function
  
  // Token operations
  transfer_public: 0.04406,
  transfer_private: 0.04406,
  register_token: 0.5000, // Token registration
  mint_public: 0.5000, // Token minting
  
  // Utility functions
  test_connection: 0.001724,
};

/**
 * Returns the fee for a given function in micro credits.
 * (1 credit = 1,000,000 micro credits)
 */
export function getFeeForFunction(functionName: string): number {
  const feeInCredits = defaultFeeValues[functionName];
  if (feeInCredits === undefined) {
    console.warn(`No fee value found for function: ${functionName}, using default 0.1 credits`);
    return 0.1 * 1_000_000; // Default fee in micro credits
  }
  return feeInCredits * 1_000_000; // convert credits to micro credits
}

/**
 * Calculate AMM swap fee based on input amount and fee rate
 * @param inputAmount - Input amount in smallest units
 * @param feeRate - Fee rate in basis points (default 30 = 0.3%)
 * @returns Fee amount in smallest units
 */
export function calculateSwapFee(inputAmount: number, feeRate: number = 30): number {
  return Math.floor((inputAmount * feeRate) / 10000);
}

/**
 * Calculate protocol fee from swap fee
 * @param swapFeeAmount - Swap fee amount
 * @param protocolFeeRate - Protocol fee rate in basis points (default 5 = 0.05%)
 * @returns Protocol fee amount
 */
export function calculateProtocolFee(swapFeeAmount: number, protocolFeeRate: number = 5): number {
  return Math.floor((swapFeeAmount * protocolFeeRate) / 10000);
}

/**
 * Calculate total transaction cost including gas fees
 * @param functionName - Function name
 * @param inputAmount - Input amount (for fee calculations)
 * @returns Total cost in micro credits
 */
export function calculateTotalCost(functionName: string, inputAmount?: number): number {
  const gasFee = getFeeForFunction(functionName);
  
  // For swap functions, add estimated swap fees
  if (functionName.includes('swap') && inputAmount) {
    const swapFee = calculateSwapFee(inputAmount);
    return gasFee + swapFee;
  }
  
  return gasFee;
}