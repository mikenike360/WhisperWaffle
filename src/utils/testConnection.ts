import { Transaction } from '@demox-labs/aleo-wallet-adapter-base';
import { PROGRAM_ID, CURRENT_NETWORK } from '../types';

/**
 * Tests basic contract connectivity by calling the get_pool_info function
 * @param wallet - The connected wallet
 * @param publicKey - The user's public key
 * @returns Promise<boolean> - True if successful, false otherwise
 */
export async function testContractConnection(wallet: any, publicKey: string): Promise<boolean> {
  try {
    console.log('🧪 Testing contract connection...');
    console.log('📋 Program ID:', PROGRAM_ID);
    console.log('🔍 Wallet object:', wallet);
    console.log('🔍 Wallet adapter:', wallet.adapter);
    
    // Try calling get_pool_info with pool_id = 1field (which should exist)
    const transaction = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      PROGRAM_ID,
      'get_pool_info', // Function name
      ['1field'], // pool_id = 1field
      10000, // Minimal fee for testing
      false // Fee is public
    );

    console.log('📝 Transaction created:', transaction);
    
    // Use the same pattern as the working tokenRegistration utility
    if (!wallet.adapter || !wallet.adapter.requestTransaction) {
      throw new Error('Wallet adapter not available or missing requestTransaction method');
    }
    
    const txId = await wallet.adapter.requestTransaction(transaction);
    
    if (txId) {
      console.log('✅ Contract connection test successful! Transaction ID:', txId);
      return true;
    } else {
      console.log('❌ No transaction ID returned');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Contract connection test failed:', error);
    return false;
  }
}
