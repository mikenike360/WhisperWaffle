// addLiquidity.ts
import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { CURRENT_NETWORK, PROGRAM_ID } from '@/types';

// Import the fee calculator function
import { getFeeForFunction } from '@/utils/feeCalculator';

// New v3 program ID (update this after deploying)
export const PROGRAM_ID_V3 = 'ww_swap_v3.aleo';

export const ADD_LIQUIDITY_FUNCTION = 'add_liquidity';
export const REMOVE_LIQUIDITY_FUNCTION = 'remove_liquidity';
export const GET_USER_POSITION_FUNCTION = 'get_user_position';
export const GET_POOL_STATE_FUNCTION = 'get_pool_state';

/**
 * Adds liquidity to an existing swap pool using the v3 Leo program.
 *
 * @param wallet - The wallet adapter instance.
 * @param publicKey - The public key of the user adding liquidity.
 * @param aleoAmount - The amount of ALEO to add to the pool.
 * @param usdcAmount - The amount of USDC to add to the pool.
 * @param minLpTokens - Minimum LP tokens to receive (slippage protection).
 * @param setTxStatus - Function to update the transaction status in the UI.
 * @returns The transaction ID of the submitted liquidity addition.
 */
export async function addLiquidity(
  wallet: LeoWalletAdapter,
  publicKey: string,
  aleoAmount: number,
  usdcAmount: number,
  minLpTokens: number,
  setTxStatus: (status: string | null) => void,
): Promise<string> {
  setTxStatus('Preparing to add liquidity...');

  try {
    // Format the amounts for the Leo program
    const aleoAmountForTransfer = `${aleoAmount}000000u64`; // Convert to microcredits
    const usdcAmountForTransfer = `${usdcAmount}u128`;

    setTxStatus('Building add liquidity transaction...');

    // Get current pool state for the transaction
    // Note: In a real implementation, you'd fetch this from the blockchain
    const currentPoolState = {
      ra: 1100, // This should come from real pool data
      rb: 4547, // This should come from real pool data
    };

    // 1. Create the transaction input
    const addLiquidityInput = [
      aleoAmountForTransfer,
      usdcAmountForTransfer,
      `${currentPoolState.ra}u128`,
      `${currentPoolState.rb}u128`,
      `${minLpTokens}u128`
    ];

    const fee = getFeeForFunction(ADD_LIQUIDITY_FUNCTION);
    console.log('Calculated fee (in micro credits):', fee);

    // 2. Build the transaction
    const transTx = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      PROGRAM_ID_V3, // Use v3 program
      ADD_LIQUIDITY_FUNCTION,
      addLiquidityInput,
      fee,
      true
    );

    // 3. Send the transaction
    const txId = await wallet.requestTransaction(transTx);
    setTxStatus(`Liquidity addition submitted: ${txId}`);

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
      throw new Error('Liquidity addition not finalized in time.');
    }

    setTxStatus('Liquidity addition finalized successfully!');
    return txId;

  } catch (error) {
    console.error('Error adding liquidity:', error);
    throw new Error(`Failed to add liquidity: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Removes liquidity from the pool using the v3 Leo program.
 */
export async function removeLiquidity(
  wallet: LeoWalletAdapter,
  publicKey: string,
  lpTokensToBurn: number,
  minAleoOut: number,
  minUsdcOut: number,
  setTxStatus: (status: string | null) => void,
): Promise<string> {
  setTxStatus('Preparing to remove liquidity...');

  try {
    // Get current pool state for the transaction
    const currentPoolState = {
      ra: 1100, // This should come from real pool data
      rb: 4547, // This should come from real pool data
    };

    const removeLiquidityInput = [
      `${lpTokensToBurn}u128`,
      `${currentPoolState.ra}u128`,
      `${currentPoolState.rb}u128`,
      `${minAleoOut}u128`,
      `${minUsdcOut}u128`
    ];

    const fee = getFeeForFunction(REMOVE_LIQUIDITY_FUNCTION);
    console.log('Calculated fee (in micro credits):', fee);

    const transTx = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      PROGRAM_ID_V3,
      REMOVE_LIQUIDITY_FUNCTION,
      removeLiquidityInput,
      fee,
      true
    );

    const txId = await wallet.requestTransaction(transTx);
    setTxStatus(`Liquidity removal submitted: ${txId}`);

    // Poll for finalization
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
      throw new Error('Liquidity removal not finalized in time.');
    }

    setTxStatus('Liquidity removal finalized successfully!');
    return txId;

  } catch (error) {
    console.error('Error removing liquidity:', error);
    throw new Error(`Failed to remove liquidity: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Checks if the pool can accept new liquidity.
 * With v3, pools can always accept new liquidity.
 */
export function canAddLiquidity(poolData: any): boolean {
  // In v3, pools can always accept new liquidity
  return true;
}

/**
 * Calculates the optimal liquidity amounts to maintain pool ratio.
 */
export function calculateOptimalLiquidity(
  aleoInput: number,
  poolData: any
): { aleoAmount: number; usdcAmount: number } {
  if (!poolData || aleoInput <= 0) {
    return { aleoAmount: 0, usdcAmount: 0 };
  }

  const { ra, rb } = poolData;
  const aleoReserve = ra / 1000000; // Convert from microcredits
  const usdcReserve = rb / 1000000; // Convert from microcredits
  
  if (aleoReserve === 0 || usdcReserve === 0) {
    // If pool is empty, use the input amounts as-is
    return { aleoAmount: aleoInput, usdcAmount: aleoInput * 1.5 }; // Assume 1 ALEO = $1.5 USDC
  }
  
  // Maintain the same ratio: aleoInput / aleoReserve = usdcInput / usdcReserve
  const optimalUsdc = (aleoInput * usdcReserve) / aleoReserve;
  
  return { aleoAmount: aleoInput, usdcAmount: optimalUsdc };
}

/**
 * Fetches user's liquidity position from the v3 program.
 */
export async function getUserPosition(publicKey: string): Promise<{
  aleoAmount: number;
  usdcAmount: number;
  lpTokens: number;
  timestamp: number;
} | null> {
  try {
    // This would call the get_user_position function on the Leo program
    // For now, return mock data
    return {
      aleoAmount: 0,
      usdcAmount: 0,
      lpTokens: 0,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error fetching user position:', error);
    return null;
  }
}
