import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';

export interface BalanceRecord {
  owner: string;
  amount: string;
  record: string; // Encrypted record data
}

export interface TokenBalance {
  symbol: string;
  amount: string;
  decimals: number;
  isEncrypted: boolean;
}

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
        // Convert based on token decimals (assuming 6 for USDC, 18 for ETH)
        const decimals = symbol === 'USDC' ? 6 : 18;
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
 * Decrypt balance records using the wallet
 * This is the proper way to get actual balances from encrypted records
 */
export async function decryptBalanceRecords(
  wallet: LeoWalletAdapter,
  publicKey: string
): Promise<BalanceRecord[]> {
  try {
    // This would use the wallet's decryption capabilities
    // to decrypt the balance records from credits.aleo
    console.log('Decrypting balance records for:', publicKey);
    
    // TODO: Implement actual decryption using wallet.adapter methods
    // This might involve:
    // 1. Fetching encrypted records from credits.aleo
    // 2. Using wallet.adapter.decrypt() or similar method
    // 3. Parsing the decrypted data to extract balances
    
    return [];
  } catch (error) {
    console.error('Error decrypting balance records:', error);
    return [];
  }
}

/**
 * Get all balances for a user (ALEO + tokens)
 * This combines direct queries and encrypted record decryption
 */
export async function fetchAllBalances(
  wallet: LeoWalletAdapter,
  publicKey: string
): Promise<{ ALEO: string; USDC: string; ETH: string }> {
  try {
    // Get ALEO balance from credits.aleo
    const aleoBalance = await fetchAleoBalance(publicKey);
    
    // Get token balances (these might also be encrypted records)
    const usdcBalance = await fetchTokenBalance('usdc.aleo', publicKey, 'USDC');
    const ethBalance = await fetchTokenBalance('eth.aleo', publicKey, 'ETH');
    
    // TODO: Implement proper decryption of encrypted records
    // For now, we're using direct queries which may not work for all tokens
    
    return {
      ALEO: aleoBalance,
      USDC: usdcBalance,
      ETH: ethBalance,
    };
  } catch (error) {
    console.error('Error fetching all balances:', error);
    return {
      ALEO: '0.000000',
      USDC: '0.00',
      ETH: '0.0000',
    };
  }
}
