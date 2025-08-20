// feeCalculator.ts

export interface FeeMapping {
    [functionName: string]: number; // fee in credits
  }
  
  // Hard-coded fee values in credits
  export const defaultFeeValues: FeeMapping = {
    //You can use Leo Playground to get the fee values for each function
    // https://playground.aleo.org/
    transfer_public: 0.04406,
    transfer_private: 0.04406,
    register_token: 0.5000, // Estimated fee for token registration (in credits)
    mint_public: 0.5000, // Estimated fee for token minting (in credits)
    add_liquidity: 0.06000, // Estimated fee for adding liquidity (in credits)
    remove_liquidity: 0.06000, // Estimated fee for removing liquidity (in credits)
    initialise_pool: 0.07000, // Estimated fee for pool initialization (in credits)
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
  