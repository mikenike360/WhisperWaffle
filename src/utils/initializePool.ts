// initializePool.ts
import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { CURRENT_NETWORK, PROGRAM_ID } from '@/types';

export const INITIALIZE_POOL_FUNCTION = 'initialise_pool';

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
  wallet: LeoWalletAdapter,
  publicKey: string,
  aleoAmount: number,
  usdcAmount: number,
  setTxStatus: (status: string | null) => void,
): Promise<string> {
  // Format the amounts (e.g. if aleoAmount = 1000, then "1000000000u64")
  const aleoAmountForTransfer = `${aleoAmount}000000u64`;
  const usdcAmountForTransfer = `${usdcAmount}u128`;

  setTxStatus('Initializing swap pool...');

  // 1. Create the transaction input
  const initializeInput = [aleoAmountForTransfer, usdcAmountForTransfer];

  const fee = getFeeForFunction(INITIALIZE_POOL_FUNCTION);
  console.log('Calculated fee (in micro credits):', fee);

  // 2. Build the transaction
  const transTx = Transaction.createTransaction(
    publicKey,
    CURRENT_NETWORK,
    PROGRAM_ID,
    INITIALIZE_POOL_FUNCTION,
    initializeInput,
    fee,
    true
  );

  // 3. Send the transaction
  const txId = await wallet.requestTransaction(transTx);
  setTxStatus(`Pool initialization submitted: ${txId}`);

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
    throw new Error('Pool initialization not finalized in time.');
  }

  setTxStatus('Pool initialization finalized.');
  return txId;
}
