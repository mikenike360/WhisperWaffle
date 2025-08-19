// swapPrivateForPrivate.ts
import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { CURRENT_NETWORK, PROGRAM_ID } from '@/types';

export const SWAP_PRIVATE_FOR_PRIVATE_FUNCTION = 'swap_private_for_private';

// Import the fee calculator function
import { getFeeForFunction } from '@/utils/feeCalculator';

/**
 * Swaps private credits for private USDC tokens.
 *
 * @param wallet - The wallet adapter instance.
 * @param publicKey - The public key of the user performing the swap.
 * @param creditRecord - The private credit record to swap.
 * @param ra - Current ALEO reserve in the pool.
 * @param rb - Current USDC reserve in the pool.
 * @param minOut - Minimum USDC amount to receive (slippage protection).
 * @param recipient - The address to receive the USDC tokens.
 * @param setTxStatus - Function to update the transaction status in the UI.
 * @returns The transaction ID of the submitted swap.
 */
export async function swapPrivateForPrivate(
  wallet: LeoWalletAdapter,
  publicKey: string,
  creditRecord: any, // This should be the private credit record from the wallet
  ra: number,
  rb: number,
  minOut: number,
  recipient: string,
  setTxStatus: (status: string | null) => void,
): Promise<string> {
  // Format the amounts
  const raAmount = `${ra}u128`;
  const rbAmount = `${rb}u128`;
  const minOutAmount = `${minOut}u128`;

  setTxStatus('Swapping private credits for private USDC...');

  // 1. Create the transaction input
  // Note: The credit record is passed as a private input, not in the public input array
  const swapInput = [raAmount, rbAmount, minOutAmount, recipient];

  const fee = getFeeForFunction(SWAP_PRIVATE_FOR_PRIVATE_FUNCTION);
  console.log('Calculated fee (in micro credits):', fee);

  // 2. Build the transaction
  const transTx = Transaction.createTransaction(
    publicKey,
    CURRENT_NETWORK,
    PROGRAM_ID,
    SWAP_PRIVATE_FOR_PRIVATE_FUNCTION,
    swapInput,
    fee,
    true
  );

  // 3. Send the transaction
  const txId = await wallet.requestTransaction(transTx);
  setTxStatus(`Swap submitted: ${txId}`);

  // 4. Poll for finalization
  let finalized = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const status = await wallet.transactionStatus(txId);
    if (status === 'Finalized') {
      finalized = true;
      break;
    }
    await new Promise((res) => setTimeout(res, 2000));
  }

  if (!finalized) {
    throw new Error('Swap not finalized in time.');
  }

  setTxStatus('Swap finalized. USDC tokens sent to recipient.');
  return txId;
}
