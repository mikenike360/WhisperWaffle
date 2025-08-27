import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { CUSTOM_TOKEN_DECIMALS } from '@/types';

// These interfaces are no longer needed since we're using the working API endpoint
// export interface BalanceRecord {
//   owner: string;
//   amount: string;
//   record: string; // Encrypted record data
// }

// export interface TokenBalance {
//   symbol: string;
//   amount: string;
//   decimals: number;
//   isEncrypted: boolean;
// }

/**
 * Fetch ALEO balance from credits.aleo program
 * This queries the account mapping which contains encrypted balance records
 */
export async function fetchAleoBalance(publicKey: string): Promise<string> {
  try {
    // Query the credits.aleo program account mapping
    const response = await fetch(`https://api.explorer.aleo.org/v1/testnet/program/credits.aleo/mapping/account/${publicKey}`);
    
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
 * Fetch token balance from a specific token contract
 * This would query the token's balance mapping for the user's address
 */
export async function fetchTokenBalance(
  tokenProgram: string, 
  publicKey: string, 
  symbol: string
): Promise<string> {
  try {
    // Query the token program's balance mapping
    const response = await fetch(`https://api.explorer.aleo.org/v1/testnet/program/${tokenProgram}/mapping/account/${publicKey}`);
    
    if (response.ok) {
      const balanceData = await response.json();
      console.log(`${symbol} balance data:`, balanceData);
      
      if (balanceData && balanceData.amount) {
        // Convert based on token decimals (assuming 6 for USDC)
        const decimals = 6;
        const amount = parseInt(balanceData.amount);
        return (amount / Math.pow(10, decimals)).toFixed(decimals === 6 ? 2 : 4);
      }
      
      return symbol === 'USDC' ? '0.00' : '0.0000';
    } else if (response.status === 404) {
      console.log(`No ${symbol} balance found for:`, publicKey);
      return symbol === 'USDC' ? '0.00' : '0.0000';
    } else {
      console.warn(`Failed to fetch ${symbol} balance:`, response.status);
      return symbol === 'USDC' ? '0.00' : '0.0000';
    }
  } catch (error) {
    console.error(`Error fetching ${symbol} balance:`, error);
    return symbol === 'USDC' ? '0.00' : '0.0000';
  }
}

/**
 * Fetch custom token balance from token_registry.aleo using our new API
 * This now uses the working BHP256 hash computation
 */
export async function fetchCustomTokenBalance(
  publicKey: string
): Promise<string> {
  try {
    console.log('Fetching custom token balance for:', publicKey);
    
    // Use our new API endpoint that computes the correct BHP256 hash
    const TOKEN_ID = '42069187360666field'; // Updated to correct wUSDC token ID
    const DECIMALS = CUSTOM_TOKEN_DECIMALS;
    
    const url = `/api/token-balance?address=${encodeURIComponent(publicKey)}&tokenId=${encodeURIComponent(TOKEN_ID)}&decimals=${DECIMALS}`;
    console.log('Fetching custom token balance from:', url);
    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      console.log('API response for custom token balance:', data);
      
      if (data.balance) {
        return data.balance;
      }
      
      return '0.00';
    } else {
      // Handle different error cases
      const errorData = await response.json().catch(() => ({}));
      console.warn('Failed to fetch custom token balance:', response.status, errorData);
      
      if (response.status === 404) {
        // No balance found for this address/token combination
        console.log('No balance found for address - returning 0.00');
        return '0.00';
      } else {
        // Other error - return 0.00 but log the issue
        console.error('Error fetching custom token balance:', errorData);
        return '0.00';
      }
    }
  } catch (error) {
    console.error('Error fetching custom token balance:', error);
    return '0.00';
  }
}

/**
 * Fetch wALEO balance from token_registry.aleo
 * This queries the wrapped ALEO token balance for the user's address
 */
export async function fetchWrappedAleoBalance(
  publicKey: string
): Promise<string> {
  try {
    console.log('Fetching wALEO balance for:', publicKey);
    
    // Use the wrapped ALEO token ID from your deployed program
    const WRAPPED_ALEO_ID = '68744147421264673966385360field';
    const DECIMALS = 6; // wALEO has 6 decimals like ALEO
    
    const url = `/api/token-balance?address=${encodeURIComponent(publicKey)}&tokenId=${encodeURIComponent(WRAPPED_ALEO_ID)}&decimals=${DECIMALS}`;
    console.log('Fetching wALEO balance from:', url);
    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      console.log('API response for wALEO balance:', data);
      
      if (data.balance) {
        return data.balance;
      }
      
      return '0.000000';
    } else {
      // Handle different error cases
      const errorData = await response.json().catch(() => ({}));
      console.warn('Failed to fetch wALEO balance:', response.status, errorData);
      
      if (response.status === 404) {
        // No balance found for this address/token combination
        console.log('No wALEO balance found for address - returning 0.000000');
        return '0.000000';
      } else {
        // Other error - return 0.000000 but log the issue
        console.error('Error fetching wALEO balance:', errorData);
        return '0.000000';
      }
    }
  } catch (error) {
    console.error('Error fetching wALEO balance:', error);
    return '0.000000';
  }
}

// This function is no longer needed since we're using the working API endpoint
// export async function decryptBalanceRecords(
//   wallet: LeoWalletAdapter,
//   publicKey: string
// ): Promise<BalanceRecord[]> {
//   // Removed - no longer needed with working BHP256 hash computation
// }

/**
 * Get all balances for a user (ALEO + wALEO + wUSDC)
 * This now uses our working API endpoints for accurate balance fetching
 */
export async function fetchAllBalances(
  wallet: LeoWalletAdapter,
  publicKey: string
): Promise<{ ALEO: string; WALEO: string; WUSDC: string }> {
  try {
    console.log('Starting balance fetch for:', publicKey);
    
    // Get ALEO balance from credits.aleo
    const aleoBalance = await fetchAleoBalance(publicKey);
    console.log('ALEO balance fetched:', aleoBalance);
    
    // Get wALEO balance from token_registry.aleo
    const waleoBalance = await fetchWrappedAleoBalance(publicKey);
    console.log('wALEO balance fetched:', waleoBalance);
    
    // Get custom token balance using our new working API
    const wusdcBalance = await fetchCustomTokenBalance(publicKey);
    console.log('wUSDC balance fetched:', wusdcBalance);
    
    console.log('Final balances:', { ALEO: aleoBalance, WALEO: waleoBalance, WUSDC: wusdcBalance });
    
    return {
      ALEO: aleoBalance,
      WALEO: waleoBalance,
      WUSDC: wusdcBalance,
    };
  } catch (error) {
    console.error('Error fetching all balances:', error);
    return {
      ALEO: '0.000000',
      WALEO: '0.000000',
      WUSDC: '0.00',
    };
  }
}
