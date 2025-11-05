import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { COMMON_TOKEN_IDS, TOKEN_DECIMALS } from '@/types';

/**
 * Fetch native ALEO balance from credits.aleo program
 * This queries the account mapping which contains encrypted balance records
 */
export async function fetchAleoBalance(publicKey: string): Promise<string> {
  try {
    // Query the credits.aleo program account mapping
    const response = await fetch(`https://api.explorer.aleo.org/v1/mainnet/program/credits.aleo/mapping/account/${publicKey}`);
    
    if (response.ok) {
      const accountData = await response.json();
      console.log('Account data from credits.aleo:', accountData);
      
      // The account mapping returns the balance directly as a string like "187130u64"
      if (accountData && typeof accountData === 'string') {
        // Parse the balance string (e.g., "187130u64" -> 187130)
        const match = accountData.match(/^(\d+)u64$/);
        if (match) {
          const microcredits = parseInt(match[1]);
          const aleo = (microcredits / 1000000).toFixed(6); // Convert to ALEO
          console.log(`Parsed balance: ${microcredits} microcredits = ${aleo} ALEO`);
          return aleo;
        }
      }
      
      // Fallback: try to parse as JSON object
      if (accountData && typeof accountData === 'object') {
        if (accountData.balance) {
          const microcredits = parseInt(accountData.balance);
          return (microcredits / 1000000).toFixed(6);
        }
        
        if (accountData.records && Array.isArray(accountData.records)) {
          console.log('Found encrypted balance records:', accountData.records.length);
          // These records need to be decrypted by the wallet to get actual balances
          return '0.000000'; // Placeholder until decryption is implemented
        }
      }
      
      console.log('Unexpected account data format:', accountData);
      return '0.000000';
    } else if (response.status === 404) {
      console.log('No account found in credits.aleo for:', publicKey);
      return '0.000000';
    } else {
      console.warn('Failed to fetch credits.aleo account data:', response.status);
      return '0.000000';
    }
  } catch (error) {
    console.error('Error fetching ALEO balance from credits.aleo:', error);
    return '0.000000';
  }
}

/**
 * Fetch token balance from token_registry.aleo using our API
 * This queries custom token balances for the AMM DEX
 */
export async function fetchTokenBalance(
  tokenId: string,
  publicKey: string,
  symbol: string,
  decimals: number = 6
): Promise<string> {
  try {
    console.log(`Fetching ${symbol} balance for:`, publicKey);
    
    const url = `/api/token-balance?address=${encodeURIComponent(publicKey)}&tokenId=${encodeURIComponent(tokenId)}&decimals=${decimals}`;
    console.log(`Fetching ${symbol} balance from:`, url);
    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      console.log(`API response for ${symbol} balance:`, data);
      
      if (data.balance) {
        return data.balance;
      }
      
      return decimals === 6 ? '0.000000' : '0.00';
    } else {
      // Handle different error cases
      const errorData = await response.json().catch(() => ({}));
      console.warn(`Failed to fetch ${symbol} balance:`, response.status, errorData);
      
      if (response.status === 404) {
        // No balance found for this address/token combination
        console.log(`No ${symbol} balance found for address - returning 0`);
        return decimals === 6 ? '0.000000' : '0.00';
      } else {
        // Other error - return 0 but log the issue
        console.error(`Error fetching ${symbol} balance:`, errorData);
        return decimals === 6 ? '0.000000' : '0.00';
      }
    }
  } catch (error) {
    console.error(`Error fetching ${symbol} balance:`, error);
    return decimals === 6 ? '0.000000' : '0.00';
  }
}

/**
 * Fetch LP token balance from the AMM DEX contract
 * This queries the liquidity_positions mapping for user's LP tokens
 */
export async function fetchLPTokenBalance(
  poolId: string,
  publicKey: string
): Promise<string> {
  try {
    console.log(`Fetching LP token balance for pool ${poolId} and user:`, publicKey);
    
    // This would query the AMM DEX contract's liquidity_positions mapping
    // For now, return mock data as the actual implementation would require
    // querying the deployed contract's mappings
    
    // Mock implementation - in real app, this would query:
    // /api/liquidity-position?address=${publicKey}&poolId=${poolId}
    
    return '0.000000';
  } catch (error) {
    console.error('Error fetching LP token balance:', error);
    return '0.000000';
  }
}

/**
 * Get all balances for a user (Native ALEO + Custom Tokens)
 * Updated for the new AMM DEX system
 */
export async function fetchAllBalances(
  wallet: LeoWalletAdapter,
  publicKey: string
): Promise<{ ALEO: string; TOKEN1: string; TOKEN2: string; TOKEN3: string }> {
  try {
    console.log('Starting balance fetch for AMM DEX:', publicKey);
    
    // Get native ALEO balance from credits.aleo
    const aleoBalance = await fetchAleoBalance(publicKey);
    console.log('Native ALEO balance fetched:', aleoBalance);
    
    // Get custom token balances from token_registry.aleo
    const [token1Balance, token2Balance, token3Balance] = await Promise.all([
      fetchTokenBalance(COMMON_TOKEN_IDS.TOKEN1, publicKey, 'TOKEN1', TOKEN_DECIMALS.TOKEN1),
      fetchTokenBalance(COMMON_TOKEN_IDS.TOKEN2, publicKey, 'TOKEN2', TOKEN_DECIMALS.TOKEN2),
      fetchTokenBalance(COMMON_TOKEN_IDS.TOKEN3, publicKey, 'TOKEN3', TOKEN_DECIMALS.TOKEN3),
    ]);
    
    console.log('Token balances fetched:', { token1Balance, token2Balance, token3Balance });
    
    console.log('Final AMM DEX balances:', { 
      ALEO: aleoBalance, 
      TOKEN1: token1Balance, 
      TOKEN2: token2Balance, 
      TOKEN3: token3Balance 
    });
    
    return {
      ALEO: aleoBalance,
      TOKEN1: token1Balance,
      TOKEN2: token2Balance,
      TOKEN3: token3Balance,
    };
  } catch (error) {
    console.error('Error fetching all AMM DEX balances:', error);
    return {
      ALEO: '0.000000',
      TOKEN1: '0.000000',
      TOKEN2: '0.000000',
      TOKEN3: '0.000000',
    };
  }
}

/**
 * Get LP token balances for all pools where user has liquidity
 * This would query the AMM DEX contract for user's LP positions
 */
export async function fetchAllLPTokenBalances(
  publicKey: string
): Promise<Array<{ poolId: string; token1Symbol: string; token2Symbol: string; lpTokens: string; share: string }>> {
  try {
    console.log('Fetching all LP token balances for:', publicKey);
    
    // This would query the AMM DEX contract to get all pools where user has liquidity
    // For now, return empty array as mock data
    
    // In real implementation, this would:
    // 1. Query the pool_list mapping to get all pool IDs
    // 2. For each pool, query liquidity_positions mapping for user's position
    // 3. Return array of LP positions with pool info
    
    return [];
  } catch (error) {
    console.error('Error fetching LP token balances:', error);
    return [];
  }
}

/**
 * Legacy function for backward compatibility
 * Maps old token names to new AMM DEX structure
 */
export async function fetchLegacyBalances(
  wallet: LeoWalletAdapter,
  publicKey: string
): Promise<{ ALEO: string; WUSDC: string }> {
  const balances = await fetchAllBalances(wallet, publicKey);
  
  return {
    ALEO: balances.ALEO,
    WUSDC: balances.TOKEN2, // Map TOKEN2 to WUSDC for backward compatibility
  };
}