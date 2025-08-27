// wrappedSwapExecutor.ts
import { Transaction } from '@demox-labs/aleo-wallet-adapter-base';
import { CURRENT_NETWORK, PROGRAM_ID } from '../types';

// Swap functions from our updated DEX program
const SWAP_WALEO_FOR_TOKEN_FUNCTION = 'swap_waleo_for_token';
const SWAP_TOKEN_FOR_WALEO_FUNCTION = 'swap_token_for_waleo';

// Fixed exchange rate: 4 wALEO = 1 wUSDC
const EXCHANGE_RATE = 4;

/**
 * Execute a swap from WALEO to WUSDC
 * @param wallet - The user's wallet
 * @param waleoAmount - Amount of WALEO to swap (in smallest units)
 * @param minWUSDCOut - Minimum WUSDC to receive (slippage protection)
 * @returns Promise<boolean> - Success status
 */
export async function swapWaleoForToken(
  wallet: any,
  waleoAmount: number,
  minWUSDCOut: number
): Promise<boolean> {
  try {
    if (!wallet?.adapter?.publicKey) {
      throw new Error('Wallet not connected');
    }

    const publicKey = wallet.adapter.publicKey.toString();
    
    // Calculate fee (in micro credits) - Updated based on leo execute testing
    const fee = 244163; // 0.244163 ALEO for swap_waleo_for_token (from testing)
    
    console.log('Swapping WALEO for WUSDC with parameters:', {
      waleoAmount,
      minWUSDCOut,
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

    // Call the DEX program to swap WALEO for WUSDC
    const poolId = '1field';
    const waleoU128 = `${BigInt(waleoAmount)}u128`;
    const minWUSDCOutU128 = `${BigInt(minWUSDCOut)}u128`;

    const dexInputs = [poolId, waleoU128, minWUSDCOutU128];
    console.log('Submitting DEX swap (WALEO for WUSDC):', dexInputs);

    const txDex = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      PROGRAM_ID,
      SWAP_WALEO_FOR_TOKEN_FUNCTION,
      dexInputs,
      fee,
      false
    );
    await sendAndWait(txDex);

    console.log('Swap WALEO for WUSDC completed successfully!');
    return true;

  } catch (error) {
    console.error('Error swapping WALEO for WUSDC:', error);
    throw new Error(`Failed to swap WALEO for WUSDC: ${error instanceof Error ? error.message : 'An unknown error occurred. Please try again or report it'}`);
  }
}

/**
 * Execute a swap from WUSDC to WALEO
 * @param wallet - The user's wallet
 * @param wusdcAmount - Amount of WUSDC to swap (in smallest units)
 * @param minWaleoOut - Minimum WALEO to receive (slippage protection)
 * @returns Promise<boolean> - Success status
 */
export async function swapTokenForWaleo(
  wallet: any,
  wusdcAmount: number,
  minWaleoOut: number
): Promise<boolean> {
  try {
    if (!wallet?.adapter?.publicKey) {
      throw new Error('Wallet not connected');
    }

    const publicKey = wallet.adapter.publicKey.toString();
    
    // Calculate fee (in micro credits) - Updated based on leo execute testing
    const fee = 244163; // 0.244163 ALEO for swap_token_for_waleo (from testing)
    
    console.log('Swapping WUSDC for WALEO with parameters:', {
      wusdcAmount,
      minWaleoOut,
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

    // Call the DEX program to swap WUSDC for WALEO
    const poolId = '1field';
    const wusdcU128 = `${BigInt(wusdcAmount)}u128`;
    const minWaleoOutU128 = `${BigInt(minWaleoOut)}u128`;

    const dexInputs = [poolId, wusdcU128, minWaleoOutU128];
    console.log('Submitting DEX swap (WUSDC for WALEO):', dexInputs);

    const txDex = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      PROGRAM_ID,
      SWAP_TOKEN_FOR_WALEO_FUNCTION,
      dexInputs,
      fee,
      false
    );
    await sendAndWait(txDex);

    console.log('Swap WUSDC for WALEO completed successfully!');
    return true;

  } catch (error) {
    console.error('Error swapping WUSDC for WALEO:', error);
    throw new Error(`Failed to swap WUSDC for WALEO: ${error instanceof Error ? error.message : 'An unknown error occurred. Please try again or report it'}`);
  }
}

/**
 * Get a swap quote for the fixed exchange rate
 * @param amountIn - Amount of input token
 * @param fromToken - Input token symbol ('WALEO' or 'WUSDC')
 * @returns Object with amountOut and exchangeRate
 */
export function getWrappedSwapQuote(amountIn: number, fromToken: 'WALEO' | 'WUSDC') {
  if (fromToken === 'WALEO') {
    // 4 WALEO = 1 WUSDC
    return {
      amountOut: amountIn / EXCHANGE_RATE,
      exchangeRate: `4 WALEO = 1 WUSDC`
    };
  } else {
    // 1 WUSDC = 4 WALEO
    return {
      amountOut: amountIn * EXCHANGE_RATE,
      exchangeRate: `1 WUSDC = 4 WALEO`
    };
  }
}
