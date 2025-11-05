import { Transaction } from '@demox-labs/aleo-wallet-adapter-base';
import { PROGRAM_ID, CURRENT_NETWORK } from '../types';

/**
 * Tests basic contract connectivity by calling the test_connection function
 * @param wallet - The connected wallet
 * @param publicKey - The user's public key
 * @returns Promise<boolean> - True if successful, false otherwise
 */
export async function testContractConnection(wallet: any, publicKey: string): Promise<boolean> {
  try {
    console.log('🧪 Testing contract connection...');
    console.log('📋 Program ID:', PROGRAM_ID);
    console.log('📋 Network:', CURRENT_NETWORK);
    console.log('📋 PublicKey:', publicKey);
    
    // Detailed wallet structure logging
    console.log('🔍 Full wallet object:', wallet);
    console.log('🔍 Wallet keys:', Object.keys(wallet || {}));
    console.log('🔍 Wallet.adapter:', wallet?.adapter);
    console.log('🔍 Wallet.adapter keys:', wallet?.adapter ? Object.keys(wallet.adapter) : 'NO ADAPTER');
    console.log('🔍 wallet.adapter.requestTransaction type:', typeof wallet?.adapter?.requestTransaction);
    console.log('🔍 wallet.adapter.connected:', wallet?.adapter?.connected);
    console.log('🔍 wallet.adapter.connecting:', wallet?.adapter?.connecting);
    console.log('🔍 wallet.adapter.readyState:', wallet?.adapter?.readyState);
    
    // Try calling test_connection function (simple no-arg test)
    // FIXED: Use publicKey as string like transfer-test does
    const transaction = Transaction.createTransaction(
      publicKey.toString(),
      CURRENT_NETWORK,
      PROGRAM_ID,
      'test_connection', // Function name
      [], // No arguments needed
      10000, // Minimal fee for testing
      false // Fee is public
    );

    console.log('📝 Transaction created:', transaction);
    console.log('📝 Transaction.transitions:', transaction.transitions);
    console.log('📝 Transaction.address:', transaction.address);
    console.log('📝 Transaction.chainId:', transaction.chainId);
    
    // Log transition details like initializePool does
    if (transaction.transitions && transaction.transitions.length > 0) {
      const transition = transaction.transitions[0];
      console.log('=== TRANSITION DETAILS ===');
      console.log('Transition program:', transition.program);
      console.log('Transition functionName:', transition.functionName);
      console.log('Transition inputs:', transition.inputs);
      console.log('Transition tpk:', (transition as any).tpk);
      console.log('Transition tcm:', (transition as any).tcm);
    }
    console.log('=== END TRANSACTION DEBUG ===');
    
    // Use the same pattern as the working tokenRegistration utility
    if (!wallet.adapter || !wallet.adapter.requestTransaction) {
      throw new Error('Wallet adapter not available or missing requestTransaction method');
    }
    
    console.log('🚀 About to call wallet.adapter.requestTransaction...');
    const txId = await wallet.adapter.requestTransaction(transaction);
    console.log('🚀 requestTransaction returned:', txId);
    
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
