// feeCalculator.ts

export interface FeeMapping {
    [functionName: string]: number; // fee in credits
  }
  
  // Fee values obtained from leo execute testing on ww_swap_v13.aleo
  // All fees are exact values, not estimates
  export const defaultFeeValues: FeeMapping = {
    // Core DEX functions (exact fees from testing)
    add_liquidity: 0.276442, // Exact fee for adding liquidity (from testing)
    remove_liquidity: 0.279388, // Exact fee for removing liquidity (from testing)
    initialise_pool: 0.269331, // Exact fee for pool initialization (from testing)
    swap_waleo_for_token: 0.244163, // Exact fee for WALEO → WUSDC swap (from testing)
    swap_token_for_waleo: 0.244163, // Exact fee for WUSDC → WALEO swap (from testing)
    test_connection: 0.001724, // Exact fee for connection test (from testing)
    
    // Token operations (estimated fees)
    transfer_public: 0.04406,
    transfer_private: 0.04406,
    register_token: 0.5000, // Estimated fee for token registration (in credits)
    mint_public: 0.5000, // Estimated fee for token minting (in credits)
  };
  
  /**
   * Returns the fee for a given function in micro credits.
   * (1 credit = 1,000,000 micro credits)
   */
  export function getFeeForFunction(functionName: string): number {
    const feeInCredits = defaultFeeValues[functionName];
    if (feeInCredits === undefined) {
      throw new Error(`No fee value found for function: ${functionName}`);
    }
    return feeInCredits * 1_000_000; // convert credits to micro credits
  }
  