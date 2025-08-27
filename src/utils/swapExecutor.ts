// swapExecutor.ts
import { Transaction } from '@demox-labs/aleo-wallet-adapter-base';
import { CURRENT_NETWORK, PROGRAM_ID } from '../types';

// Swap functions from our DEX program
const SWAP_ALEO_FOR_TOKEN_FUNCTION = 'swap_aleo_for_token_public';
const SWAP_TOKEN_FOR_ALEO_FUNCTION = 'swap_token_for_aleo_public';

// Fixed exchange rate: 4 ALEO = 1 Custom Token
const EXCHANGE_RATE = 4;

/**
 * Execute a swap from ALEO to Custom Token
 * @param wallet - The user's wallet
 * @param aleoAmount - Amount of ALEO to swap (in microcredits)
 * @param minTokenOut - Minimum custom tokens to receive (slippage protection)
 * @returns Promise<boolean> - Success status
 */
export async function swapAleoForToken(
  wallet: any,
  aleoAmount: number,
  minTokenOut: number
): Promise<boolean> {
  try {
    if (!wallet?.adapter?.publicKey) {
      throw new Error('Wallet not connected');
    }

    const publicKey = wallet.adapter.publicKey.toString();
    
    // Calculate fee (in micro credits)
    const fee = 60000; // 0.06 ALEO for transaction fee
    
    console.log('Swapping ALEO for token with parameters:', {
      aleoAmount,
      minTokenOut,
      fee,
      publicKey
    });

    // Helper to submit tx and wait for finalization
    const sendAndWait = async (tx: any) => {
      const id = await wallet.adapter.requestTransaction(tx);
      if (!id) throw new Error('No transaction ID returned from wallet');
      let status = await wallet.adapter.transactionStatus(id);
      let attempts = 0;
      while (status === 'Pending' && attempts < 60) {
        await new Promise((r) => setTimeout(r, 1000));
        status = await wallet.adapter.transactionStatus(id);
        attempts++;
      }
      if (status !== 'Completed' && status !== 'Finalized') {
        throw new Error(`Tx not completed: ${status}`);
      }
      return id;
    };

    // Call the DEX program directly - it handles all transfers internally
    const poolId = '1field';
    const aleoU64 = `${BigInt(aleoAmount)}u64`;
    const minTokenU128 = `${BigInt(minTokenOut)}u128`;

    const dexInputs = [poolId, aleoU64, minTokenU128];
    console.log('Submitting DEX swap (ALEO for token):', dexInputs);

    const txDex = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      PROGRAM_ID,
      SWAP_ALEO_FOR_TOKEN_FUNCTION,
      dexInputs,
      fee,
      false
    );
    await sendAndWait(txDex);

    console.log('Swap ALEO for token completed successfully!');
    return true;

  } catch (error) {
    console.error('Error swapping ALEO for token:', error);
    throw new Error(`Failed to swap ALEO for token: ${error instanceof Error ? error.message : 'An unknown error occurred. Please try again or report it'}`);
  }
}

/**
 * Execute a swap from Custom Token to ALEO
 * @param wallet - The user's wallet
 * @param tokenAmount - Amount of custom tokens to swap (in smallest units)
 * @param minAleoOut - Minimum ALEO to receive (slippage protection)
 * @returns Promise<boolean> - Success status
 */
export async function swapTokenForAleo(
  wallet: any,
  tokenAmount: number,
  minAleoOut: number
): Promise<boolean> {
  try {
    if (!wallet?.adapter?.publicKey) {
      throw new Error('Wallet not connected');
    }

    const publicKey = wallet.adapter.publicKey.toString();
    
    // Calculate fee (in micro credits)
    const fee = 60000; // 0.06 ALEO for transaction fee
    
    console.log('Swapping token for ALEO with parameters:', {
      tokenAmount,
      minAleoOut,
      fee,
      publicKey
    });

    // Helper to submit tx and wait for finalization
    const sendAndWait = async (tx: any) => {
      const id = await wallet.adapter.requestTransaction(tx);
      if (!id) throw new Error('No transaction ID returned from wallet');
      let status = await wallet.adapter.transactionStatus(id);
      let attempts = 0;
      while (status === 'Pending' && attempts < 60) {
        await new Promise((r) => setTimeout(r, 1000));
        status = await wallet.adapter.transactionStatus(id);
        attempts++;
      }
      if (status !== 'Completed' && status !== 'Finalized') {
        throw new Error(`Tx not completed: ${status}`);
      }
      return id;
    };

    // Call the DEX program directly - it handles all transfers internally
    const poolId = '1field';
    const tokenU128 = `${BigInt(tokenAmount)}u128`;
    const minAleoU128 = `${BigInt(minAleoOut)}u128`;

    const dexInputs = [poolId, tokenU128, minAleoU128];
    console.log('Submitting DEX swap (token for ALEO):', dexInputs);

    const txDex = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      PROGRAM_ID,
      SWAP_TOKEN_FOR_ALEO_FUNCTION,
      dexInputs,
      fee,
      false
    );
    await sendAndWait(txDex);

    console.log('Swap token for ALEO completed successfully!');
    return true;

  } catch (error) {
    console.error('Error swapping token for ALEO:', error);
    throw new Error(`Failed to swap token for ALEO: ${error instanceof Error ? error.message : 'An unknown error occurred. Please try again or report it'}`);
  }
}

/**
 * Get a swap quote based on the fixed exchange rate
 * @param amountIn - Input amount
 * @param fromToken - Token being swapped from ('ALEO' or 'TOKEN')
 * @returns Swap quote with output amount and exchange rate
 */
export function getSwapQuote(amountIn: number, fromToken: 'ALEO' | 'TOKEN') {
  if (fromToken === 'ALEO') {
    // ALEO → Token: divide by 4
    const tokenOut = amountIn / EXCHANGE_RATE;
    return {
      amountOut: tokenOut,
      exchangeRate: `4 ALEO = 1 Custom Token`,
      direction: 'ALEO_TO_TOKEN'
    };
  } else {
    // Token → ALEO: multiply by 4
    const aleoOut = amountIn * EXCHANGE_RATE;
    return {
      amountOut: aleoOut,
      exchangeRate: `1 Custom Token = 4 ALEO`,
      direction: 'TOKEN_TO_ALEO'
    };
  }
}
