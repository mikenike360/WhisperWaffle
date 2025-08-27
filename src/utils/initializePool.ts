// initializePool.ts
import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { CURRENT_NETWORK, PROGRAM_ID } from '@/types';

export const INITIALIZE_POOL_FUNCTION = 'create_pool_public';

// Import the fee calculator function
import { getFeeForFunction } from '@/utils/feeCalculator';

/**
 * Initializes the swap pool with starting reserves of ALEO and USDC.
 *
 * @param wallet - The wallet adapter instance.
 * @param publicKey - The public key of the user initializing the pool.
 * @param aleoAmount - The amount of ALEO to initialize the pool with (in microcredits).
 * @param usdcAmount - The amount of USDC to initialize the pool with (in microcredits).
 * @param setTxStatus - Function to update the transaction status in the UI.
 * @returns The transaction ID of the submitted pool initialization.
 */
export async function initializePool(
  wallet: any,
  publicKey: string,
  aleoAmount: number,
  usdcAmount: number,
  setTxStatus: (status: string | null) => void,
): Promise<string> {
  setTxStatus('Preparing pool initialization...');
  
  try {
    // Validate inputs
    if (!wallet || !wallet.adapter) {
      throw new Error('Invalid wallet: missing adapter');
    }
    if (!publicKey || publicKey.trim() === '') {
      throw new Error('Invalid public key');
    }
    if (!aleoAmount || aleoAmount <= 0) {
      throw new Error('Invalid ALEO amount');
    }
    if (!usdcAmount || usdcAmount <= 0) {
      throw new Error('Invalid custom token amount');
    }

    setTxStatus('Building pool initialization transaction...');

    // 1. Create the transaction input - use proper Leo type format
    const inputs = [
      `${aleoAmount}000000u64`,         // ALEO amount in microcredits (u64 as expected by Leo)
      `${usdcAmount}u128`,              // Custom token amount (u128 as expected by Leo)
      `${usdcAmount * 1000000}u128`    // min_lp: u128 (minimum LP tokens to receive)
    ];
    console.log('Pool initialization inputs:', inputs);

    const fee = getFeeForFunction(INITIALIZE_POOL_FUNCTION);
    console.log('Calculated fee (in micro credits):', fee);
    console.log('Fee type:', typeof fee);
    console.log('Fee value:', fee);

    setTxStatus('Creating transaction...');

    // Debug: Log all parameters
    console.log('Transaction parameters:', {
      publicKey,
      network: CURRENT_NETWORK,
      programId: PROGRAM_ID,
      function: INITIALIZE_POOL_FUNCTION,
      inputs: inputs,
      fee,
      feePrivate: false
    });
    
    // 2. Build the transaction - use the v10 program ID
    const transaction = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      PROGRAM_ID,
      INITIALIZE_POOL_FUNCTION,
      inputs,
      fee,
      false // Fee is public
    );

    console.log('Created transaction:', transaction);
    
    // Log raw transaction data for debugging
    console.log('=== RAW TRANSACTION DEBUG ===');
    console.log('Transaction object:', JSON.stringify(transaction, null, 2));
    console.log('Transaction address:', transaction.address);
    console.log('Transaction chainId:', transaction.chainId);
    console.log('Transaction transitions:', transaction.transitions);
    console.log('Transaction fee:', transaction.fee);
    console.log('Transaction feePrivate:', transaction.feePrivate);
    
    // Log each transition in detail
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

    setTxStatus('Requesting wallet signature...');

    // 3. Send the transaction - use exact same pattern as token registration
    const txId = await wallet.adapter.requestTransaction(transaction);
    console.log('Transaction submitted with ID:', txId);
    setTxStatus(`Pool initialization submitted: ${txId}`);

    // 4. Poll for finalization
    setTxStatus('Waiting for transaction finalization...');
    let finalized = false;
    
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        const status = await wallet.adapter.transactionStatus(txId);
        console.log(`Transaction status check ${attempt + 1}: ${status}`);
        
        if (status === 'Finalized') {
          finalized = true;
          break;
        }
        
        await new Promise((res) => setTimeout(res, 2000));
      } catch (error) {
        console.log(`Status check attempt ${attempt + 1} failed:`, error);
        // Continue polling even if status check fails
        await new Promise((res) => setTimeout(res, 2000));
      }
    }

    if (!finalized) {
      throw new Error('Pool initialization not finalized in time. Check the transaction ID manually.');
    }

    setTxStatus('Pool initialization finalized successfully!');
    return txId;

  } catch (error) {
    console.error('Error initializing pool:', error);
    throw new Error(`Failed to initialize pool: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
