// addLiquidity.ts
import { Transaction } from '@demox-labs/aleo-wallet-adapter-base';
import { CURRENT_NETWORK, PROGRAM_ID } from '../types';

// v10 functions
const ADD_LIQUIDITY_FUNCTION = 'add_liquidity_public';
const CREATE_POOL_FUNCTION = 'create_pool_public';
const REMOVE_LIQUIDITY_FUNCTION = 'remove_liquidity_public';

// Interface for pool data
interface PoolData {
  ra: number;
  rb: number;
  lastUpdated?: number;
}

/**
 * Add liquidity to the WhisperWaffle pool
 * @param wallet - The user's wallet
 * @param aleoAmount - Amount of WALEO to add (in smallest units, 6 decimals)
 * @param usdcAmount - Amount of WUSDC to add (in smallest units, 6 decimals)
 * @param minLpTokens - Minimum LP tokens to receive (slippage protection)
 * @param currentPoolData - Current pool state data
 * @returns Promise<boolean> - Success status
 */
export async function addLiquidity(
  wallet: any,
  aleoAmount: number,
  usdcAmount: number,
  minLpTokens: number,
  currentPoolData?: PoolData
): Promise<boolean> {
  try {
    if (!wallet?.adapter?.publicKey) {
      throw new Error('Wallet not connected');
    }

    const publicKey = wallet.adapter.publicKey.toString();
    
    // Calculate fee (in micro credits) - Updated based on leo execute testing
    const fee = 276442; // 0.276442 ALEO for add_liquidity_public (from testing)
    
    console.log('Adding liquidity with parameters:', {
      waleoAmount: aleoAmount, // Amount of WALEO (in smallest units)
      wusdcAmount: usdcAmount, // Amount of WUSDC (in smallest units)
      minLpTokens,
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

    // Determine if pool exists: call our API (returns ra/rb)
    let isNewPool = false;
    try {
      const r = await fetch('/api/pool');
      const d = await r.json();
      isNewPool = !(d && d.ok && typeof d.ra === 'number' && typeof d.rb === 'number' && (d.ra > 0 || d.rb > 0));
    } catch (_) {
      // If unable to fetch, default to add flow
      isNewPool = false;
    }

    // Call the DEX program directly - it handles all transfers internally
    const poolId = '1field'; // Updated to match program's actual pool ID
    const waleoU128 = `${BigInt(aleoAmount)}u128`; // Changed from u64 to u128 for wrapped ALEO
    const wusdcU128 = `${BigInt(usdcAmount)}u128`; // Changed variable name for clarity
    const minLpU128 = `${BigInt(minLpTokens)}u128`;

    const functionName = isNewPool ? CREATE_POOL_FUNCTION : ADD_LIQUIDITY_FUNCTION;
    const stateInputs = isNewPool
      ? [waleoU128, wusdcU128, minLpU128] // create_pool_public expects (waleo, wusdc, min_lp)
      : [poolId, waleoU128, wusdcU128, minLpU128]; // add_liquidity_public expects (pool_id, waleo, wusdc, min_lp)

    console.log(`Submitting DEX liquidity operation (${functionName}):`, stateInputs);

    const txDex = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      PROGRAM_ID,
      functionName,
      stateInputs,
      fee,
      false
    );
    await sendAndWait(txDex);

    console.log('Liquidity added successfully!');
    return true;

  } catch (error) {
    console.error('Error adding liquidity:', error);
    throw new Error(`Failed to add liquidity: ${error instanceof Error ? error.message : 'An unknown error occurred. Please try again or report it'}`);
  }
}

/**
 * Remove liquidity from the WhisperWaffle pool
 * @param wallet - The user's wallet
 * @param lpTokensToBurn - Number of LP tokens to burn
 * @param minAleoOut - Minimum ALEO to receive (slippage protection)
 * @param minUsdcOut - Minimum custom token to receive (slippage protection)
 * @param currentPoolData - Current pool state data
 * @returns Promise<boolean> - Success status
 */
export async function removeLiquidity(
  wallet: any,
  lpTokensToBurn: number,
  minAleoOut: number,
  minUsdcOut: number,
  currentPoolData?: PoolData
): Promise<boolean> {
  try {
    if (!wallet?.adapter?.publicKey) {
      throw new Error('Wallet not connected');
    }

    const publicKey = wallet.adapter.publicKey.toString();
    
    // Calculate fee (in micro credits) - Updated based on leo execute testing
    const fee = 279388; // 0.279388 ALEO for remove_liquidity_public (from testing)
    
    console.log('Removing liquidity with parameters:', {
      lpTokensToBurn,
      minAleoOut,
      minUsdcOut,
      fee,
      publicKey
    });

    // Call the DEX program directly - it handles all transfers internally
    const poolId = '1field';
    
    // Create the transaction inputs for remove_liquidity_public
    // Function signature: remove_liquidity_public(pool_id: field, lp_tokens_to_burn: u128, min_aleo_out: u128, min_token_out: u128)
    const removeLiquidityInput = [
      poolId,                           // pool_id: field
      `${lpTokensToBurn}u128`,          // lp_tokens_to_burn: u128
      `${minAleoOut}u128`,              // min_aleo_out: u128 (ALEO)
      `${minUsdcOut}u128`               // min_token_out: u128 (custom token)
    ];

    console.log('Creating remove liquidity transaction with inputs:', removeLiquidityInput);

    // Create the transaction
    const transTx = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      PROGRAM_ID,
      REMOVE_LIQUIDITY_FUNCTION,
      removeLiquidityInput,
      fee,
      false // Fee is public
    );

    console.log('Transaction created:', transTx);

    // Request transaction execution
    const txId = await wallet.adapter.requestTransaction(transTx);
    
    if (!txId) {
      throw new Error('No transaction ID returned from wallet');
    }

    console.log('Transaction submitted with ID:', txId);

    // Wait for transaction status
    let status = await wallet.adapter.transactionStatus(txId);
    let attempts = 0;
    const maxAttempts = 30; // Wait up to 30 seconds

    while (status === 'Pending' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      status = await wallet.adapter.transactionStatus(txId);
      attempts++;
      console.log(`Transaction status (attempt ${attempts}):`, status);
    }

    if (status === 'Finalized') {
      console.log('Liquidity removed successfully!');
      return true;
    } else {
      throw new Error(`Transaction failed with status: ${status}`);
    }

  } catch (error) {
    console.error('Error removing liquidity:', error);
    throw new Error(`Failed to remove liquidity: ${error instanceof Error ? error.message : 'An unknown error occurred. Please try again or report it'}`);
  }
}

/**
 * Checks if the pool can accept new liquidity.
 * With v10, pools can always accept new liquidity.
 */
export function canAddLiquidity(poolData: any): boolean {
  // In v10, pools can always accept new liquidity
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
  // Calculate optimal amounts based on current pool ratios
  const aleoReserve = ra / 1000000; // Convert from microcredits
  const usdcReserve = rb / 1000000; // Convert from smallest units
  
  console.log(`Current reserves: ${aleoReserve} wALEO, ${usdcReserve} wUSDC`);
  
  if (aleoReserve === 0 || usdcReserve === 0) {
    console.log('Pool has zero reserves - cannot calculate optimal amounts');
    return { aleoAmount: aleoInput, usdcAmount: aleoInput * 1.5 }; // Assume 1 ALEO = $1.5 USDC
  }
  
  // Maintain the same ratio: aleoInput / aleoReserve = usdcInput / usdcReserve
  const optimalUsdc = (aleoInput * usdcReserve) / aleoReserve;
  
  return { aleoAmount: aleoInput, usdcAmount: optimalUsdc };
}

/**
 * Fetches user's liquidity position from the v10 program.
 */
export async function getUserPosition(publicKey: string): Promise<{
  aleoAmount: number;
  usdcAmount: number;
  lpTokens: number;
  timestamp: number;
} | null> {
  try {
    // This would call the get_user_liquidity_position function on the Leo program
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
