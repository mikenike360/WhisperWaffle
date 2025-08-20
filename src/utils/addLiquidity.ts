// addLiquidity.ts
import { Transaction } from '@demox-labs/aleo-wallet-adapter-base';
import { CURRENT_NETWORK, PROGRAM_ID } from '../types';

// v9 functions
const ADD_LIQUIDITY_FUNCTION = 'add_liquidity_public';
const CREATE_POOL_FUNCTION = 'create_pool_public';
const REMOVE_LIQUIDITY_FUNCTION = 'remove_liquidity';

// External programs
const CREDITS_PROGRAM = 'credits.aleo';
const TOKEN_REGISTRY_PROGRAM = 'token_registry.aleo';

// MVP custody address (holds pool assets)
const CUSTODY_ADDRESS = 'aleo1xh0ncflwkfzga983lwujsha729c8nwu7phfn8aw7h3gahhj0ms8qytrxec';

// Custom token id used in the program (keep in sync with Leo const TOKEN_ID)
const CUSTOM_TOKEN_ID = '987654321987654321field';

// Interface for pool data
interface PoolData {
  ra: number;
  rb: number;
  lastUpdated?: number;
}

/**
 * Add liquidity to the WhisperWaffle pool
 * @param wallet - The user's wallet
 * @param aleoAmount - Amount of ALEO to add (in microcredits)
 * @param usdcAmount - Amount of custom token to add (in smallest units)
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
    
    // Calculate fee (in micro credits)
    const fee = 60000; // 0.06 ALEO for transaction fee
    
    console.log('Adding liquidity with parameters:', {
      aleoAmount,
      usdcAmount,
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

    // 1) Transfer ALEO (u64) to custody
    const creditsInputs = [CUSTODY_ADDRESS, `${BigInt(aleoAmount)}u64`];
    const txCredits = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      CREDITS_PROGRAM,
      'transfer_public',
      creditsInputs,
      fee,
      false
    );
    console.log('Submitting credits transfer:', creditsInputs);
    await sendAndWait(txCredits);

    // 2) Transfer custom token (u128) to custody
    const tokenInputs = [CUSTOM_TOKEN_ID, CUSTODY_ADDRESS, `${BigInt(usdcAmount)}u128`];
    const txToken = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      TOKEN_REGISTRY_PROGRAM,
      'transfer_public',
      tokenInputs,
      fee,
      false
    );
    console.log('Submitting token transfer:', tokenInputs);
    await sendAndWait(txToken);

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

    // 3) Warm-up: call test_connection once to mitigate SDK exposure lag
    try {
      const warmupTx = Transaction.createTransaction(
        publicKey,
        CURRENT_NETWORK,
        PROGRAM_ID,
        'test_connection',
        [],
        fee,
        false
      );
      console.log('Submitting warm-up call (test_connection)');
      await sendAndWait(warmupTx);
    } catch (e) {
      console.warn('Warm-up call failed, proceeding anyway:', e);
    }

    // 4) State update on our DEX program
    const poolId = '1field';
    const aleoU64 = `${BigInt(aleoAmount)}u64`;
    const tokenU128 = `${BigInt(usdcAmount)}u128`;
    const minLpU128 = `${BigInt(minLpTokens)}u128`;

    const functionName = isNewPool ? CREATE_POOL_FUNCTION : ADD_LIQUIDITY_FUNCTION;
    const stateInputs = isNewPool
      ? [CUSTODY_ADDRESS, aleoU64, tokenU128, minLpU128]
      : [poolId, CUSTODY_ADDRESS, aleoU64, tokenU128, minLpU128];

    console.log(`Submitting DEX state update (${functionName}):`, stateInputs);

    const attemptDex = async () => {
      const txDex = Transaction.createTransaction(
        publicKey,
        CURRENT_NETWORK,
        PROGRAM_ID,
        functionName,
        stateInputs,
        fee,
        false
      );
      return sendAndWait(txDex);
    };

    // Retry a few times to dodge transient "Invalid Aleo program: undefined"
    const delays = [500, 1500, 3000];
    let lastErr: any = null;
    for (let i = 0; i < delays.length; i++) {
      try {
        await attemptDex();
        lastErr = null;
        break;
      } catch (e: any) {
        lastErr = e;
        const msg = (e?.message || '').toString();
        if (msg.includes('Invalid Aleo program')) {
          console.warn(`DEX call attempt ${i + 1} failed with program exposure error, retrying after ${delays[i]}ms`);
          await new Promise((r) => setTimeout(r, delays[i]));
          // Re-run warmup once more before retry
          try {
            const warm2 = Transaction.createTransaction(
              publicKey,
              CURRENT_NETWORK,
              PROGRAM_ID,
              'test_connection',
              [],
              fee,
              false
            );
            await sendAndWait(warm2);
          } catch (_) {}
          continue;
        }
        break;
      }
    }
    if (lastErr) throw lastErr;

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
    
    // Calculate fee (in micro credits)
    const fee = 60000; // 0.06 ALEO for transaction fee
    
    console.log('Removing liquidity with parameters:', {
      lpTokensToBurn,
      minAleoOut,
      minUsdcOut,
      fee,
      publicKey
    });

    // For v6, we need to specify the pool_id (using 1field for now)
    const poolId = '1field';
    
    // Create the transaction inputs for remove_liquidity
    // Function signature: remove_liquidity(pool_id: field, lp_tokens_to_burn: u128, min_token1_out: u128, min_token2_out: u128)
    const removeLiquidityInput = [
      poolId,                           // pool_id: field
      `${lpTokensToBurn}u128`,          // lp_tokens_to_burn: u128
      `${minAleoOut}u128`,              // min_token1_out: u128 (ALEO)
      `${minUsdcOut}u128`               // min_token2_out: u128 (custom token)
    ];

    console.log('Creating transaction with inputs:', removeLiquidityInput);

    // Create the transaction
    const transTx = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      PROGRAM_ID, // Use v6 program
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
 * With v4, pools can always accept new liquidity.
 */
export function canAddLiquidity(poolData: any): boolean {
      // In v4, pools can always accept new liquidity
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
 * Fetches user's liquidity position from the v4 program.
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
