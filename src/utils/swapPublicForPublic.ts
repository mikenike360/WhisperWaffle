// swapPublicForPublic.ts
import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { CURRENT_NETWORK, PROGRAM_ID } from '@/types';

export const SWAP_PUBLIC_FOR_PUBLIC_FUNCTION = 'swap_public_for_public';

// Import the fee calculator function
import { getFeeForFunction } from '@/utils/feeCalculator';

/**
 * Swaps public ALEO for public USDC tokens.
 *
 * @param wallet - The wallet adapter instance.
 * @param publicKey - The public key of the user performing the swap.
 * @param aleoAmount - The amount of ALEO to swap (in microcredits).
 * @param ra - Current ALEO reserve in the pool.
 * @param rb - Current USDC reserve in the pool.
 * @param minOut - Minimum USDC amount to receive (slippage protection).
 * @param setTxStatus - Function to update the transaction status in the UI.
 * @returns The transaction ID of the submitted swap.
 */
export async function swapPublicForPublic(
  wallet: LeoWalletAdapter,
  publicKey: string,
  aleoAmount: number,
  ra: number,
  rb: number,
  minOut: number,
  setTxStatus: (status: string | null) => void,
): Promise<string> {
  // Format the amounts
  const aleoAmountForSwap = `${aleoAmount}000000u64`;
  const raAmount = `${ra}u128`;
  const rbAmount = `${rb}u128`;
  const minOutAmount = `${minOut}u128`;

  setTxStatus('Swapping ALEO for public USDC...');

  // 1. Create the transaction input
  const swapInput = [aleoAmountForSwap, raAmount, rbAmount, minOutAmount];

  const fee = getFeeForFunction(SWAP_PUBLIC_FOR_PUBLIC_FUNCTION);
  console.log('Calculated fee (in micro credits):', fee);

  // 2. Build the transaction
  const transTx = Transaction.createTransaction(
    publicKey,
    CURRENT_NETWORK,
    PROGRAM_ID,
    SWAP_PUBLIC_FOR_PUBLIC_FUNCTION,
    swapInput,
    fee,
    true
  );

  // 3. Send the transaction
  const txId = await wallet.adapter.requestTransaction(transTx);
  setTxStatus(`Swap submitted: ${txId}`);

  // 4. Poll for finalization
  let finalized = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const status = await wallet.adapter.transactionStatus(txId);
    if (status === 'Finalized') {
      finalized = true;
      break;
    }
    await new Promise((res) => setTimeout(res, 2000));
  }

  if (!finalized) {
    throw new Error('Swap not finalized in time.');
  }

  setTxStatus('Swap finalized. Pool state updated.');
  return txId;
}
