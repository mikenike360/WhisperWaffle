function formatUnknownError(error: unknown, context: string): string {
  try {
    if (error instanceof Error) {
      return error.message || error.toString();
    }
    if (error === null || error === undefined) {
      return `${context}: Unknown error (null/undefined)`;
    }
    if (typeof error === 'string') {
      return `${context}: ${error}`;
    }
    if (typeof error === 'object') {
      return `${context}: ${JSON.stringify(error)}`;
    }
    return `${context}: ${String(error)}`;
  } catch (formatErr) {
    console.warn(`[${context}] Failed to format error`, formatErr, error);
    return `${context}: Unformatted error`;
  }
}
// addLiquidity.ts
import { Transaction } from '@demox-labs/aleo-wallet-adapter-base';
import { CURRENT_NETWORK, PROGRAM_ID, NATIVE_ALEO_ID } from '../types';
import { calculateLPTokens, calculateOptimalLiquidity, validatePoolRatio } from './ammCalculations';

// New AMM DEX function names
const CREATE_POOL_NATIVE_ALEO = 'create_pool_native_aleo';
const CREATE_POOL_TOKENS = 'create_pool_tokens';
const ADD_LIQUIDITY_NATIVE_ALEO = 'add_liquidity_native_aleo';
const ADD_LIQUIDITY_TOKENS = 'add_liquidity_tokens';
const REMOVE_LIQUIDITY_NATIVE_ALEO = 'remove_liquidity_native_aleo';
const REMOVE_LIQUIDITY_TOKENS = 'remove_liquidity_tokens';

function normalizeMinLpTokens(
  value: number | bigint | undefined | null,
  context: string
): bigint {
  try {
    if (typeof value === 'bigint') {
      if (value < 0n) {
        console.warn(`[${context}] Received negative bigint for min LP tokens. Resetting to 0.`);
        return 0n;
      }
      return value;
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        console.warn(`[${context}] Received non-finite number for min LP tokens (${value}). Resetting to 0.`);
        return 0n;
      }
      const floored = Math.floor(value);
      if (floored < 0) {
        console.warn(`[${context}] Received negative number for min LP tokens (${value}). Resetting to 0.`);
        return 0n;
      }
      return BigInt(floored);
    }

    if (value !== undefined && value !== null) {
      console.warn(`[${context}] Unsupported min LP token value type. Resetting to 0.`, value);
    }
  } catch (error) {
    console.warn(`[${context}] Failed to normalize min LP tokens. Resetting to 0.`, error);
  }

  return 0n;
}

// Interface for pool data
export interface PoolData {
  reserve1: bigint;
  reserve2: bigint;
  lpTotalSupply: bigint;
  swapFee: number;
  protocolFee: number;
  poolType: number;
}

// Interface for liquidity position
export interface LiquidityPosition {
  userAddress: string;
  poolId: string;
  lpTokens: bigint;
  timestamp: number;
}

/**
 * Create a new pool with native ALEO and a custom token
 * @param wallet - The user's wallet
 * @param publicKey - The user's public key
 * @param tokenId - ID of the custom token
 * @param aleoAmount - Amount of native ALEO to add (in microcredits)
 * @param tokenAmount - Amount of custom token to add (in smallest units)
 * @param swapFee - Swap fee in basis points (default 30 = 0.3%)
 * @param minLpTokens - Minimum LP tokens to receive (slippage protection)
 * @returns Promise<boolean> - Success status
 */
export async function createPoolNativeAleo(
  wallet: any,
  publicKey: string,
  tokenId: string,
  aleoAmount: number,
  tokenAmount: number,
  swapFee: number = 30,
  minLpTokens: number | bigint
): Promise<boolean> {
  try {
    if (!wallet?.adapter) {
      throw new Error('Wallet not connected');
    }

    // Validate config
    if (!PROGRAM_ID || !CURRENT_NETWORK) {
      throw new Error(`Missing config: PROGRAM_ID=${PROGRAM_ID}, NETWORK=${CURRENT_NETWORK}`);
    }

    // Validate inputs
    if (!publicKey || !publicKey.startsWith('aleo1')) {
      throw new Error(`Invalid publicKey: ${publicKey}`);
    }
    if (!tokenId || typeof tokenId !== 'string') {
      throw new Error('Invalid token ID');
    }
    
    if (!aleoAmount || !tokenAmount || isNaN(aleoAmount) || isNaN(tokenAmount) || aleoAmount <= 0 || tokenAmount <= 0) {
      throw new Error('Invalid amounts - aleoAmount and tokenAmount must be positive numbers');
    }
    
    const minLpBigInt = normalizeMinLpTokens(minLpTokens, 'createPoolNativeAleo');

    console.log('Validation passed - all inputs valid');
    
    // Calculate fee (in micro credits)
    const fee = 150000; // 0.15 ALEO for pool creation
    
    console.log('Creating pool (native ALEO + token) with parameters:', {
      tokenId,
      aleoAmount,
      tokenAmount,
      swapFee,
      minLpTokens: minLpBigInt.toString(),
      fee,
      publicKey
    });

    // Validate pool creation ratios
    if (!validatePoolRatio(BigInt(aleoAmount), BigInt(tokenAmount))) {
      throw new Error('Invalid pool ratio - amounts too extreme');
    }

    // Call the AMM DEX program
    // Parameters: [token_id: field, aleo_amount: u128, token_amount: u128, swap_fee: u16, min_lp: u128]
    const createPoolInputs = [
      tokenId,                           // token_id: field
      `${BigInt(aleoAmount)}u128`,       // aleo_amount: u128
      `${BigInt(tokenAmount)}u128`,      // token_amount: u128
      `${swapFee}u16`,                   // swap_fee: u16
      `${minLpBigInt}u128`       // min_lp: u128
    ];

    console.log('Submitting AMM pool creation (native ALEO + token):', {
      inputs: createPoolInputs,
      aleoAmount,
      tokenAmount,
      swapFee,
      minLpTokens,
      tokenId,
      publicKey,
      network: CURRENT_NETWORK,
      programId: PROGRAM_ID,
      transition: CREATE_POOL_NATIVE_ALEO
    });

    // Create the transaction
    const txDex = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      PROGRAM_ID,
      CREATE_POOL_NATIVE_ALEO,
      createPoolInputs,
      fee,
      false
    );
    
    // Check transaction object
    if (!txDex) {
      throw new Error('Transaction.createTransaction returned null/undefined');
    }
    if (!txDex.transitions || txDex.transitions.length === 0) {
      throw new Error(
        `Transaction missing transitions. Raw transaction: ${JSON.stringify(txDex)}`
      );
    }
    if (!txDex.address || !txDex.chainId) {
      throw new Error(
        `Transaction missing required fields (address or chainId). Raw transaction: ${JSON.stringify(
          txDex
        )}`
      );
    }

    console.log('Transaction object validated successfully');
    console.log('Transaction created successfully:', {
      tx: txDex,
      address: txDex?.address,
      chainId: txDex?.chainId,
      transitions: txDex?.transitions,
      fee: txDex?.fee,
      feePrivate: txDex?.feePrivate,
      transitionCount: txDex?.transitions?.length
    });
    
    // Log each transition in detail
    if (txDex.transitions.length > 0) {
      const transition = txDex.transitions[0];
      console.log('First transition details:', {
        program: transition.program,
        functionName: transition.functionName,
        inputs: transition.inputs,
        id: transition.id,
        tpk: (transition as any).tpk,
        tcm: (transition as any).tcm
      });
    }

    // Submit the transaction through the wallet adapter (direct call like working examples)
    let txId: string;
    try {
      txId = await wallet.adapter.requestTransaction(txDex);
      console.log('Transaction submitted with ID:', txId);
    } catch (walletError: any) {
      console.error('Wallet adapter error details (createPoolNativeAleo):', {
        message: walletError?.message,
        code: walletError?.code,
        name: walletError?.name,
        stack: walletError?.stack,
        fullError: walletError,
        inputs: createPoolInputs,
        publicKey,
        tokenId,
        aleoAmount,
        tokenAmount,
        swapFee,
        minLpTokens,
        network: CURRENT_NETWORK,
      });
      throw walletError;
    }
    
    // Poll for finalization (matching working pattern from other utils)
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
        await new Promise((res) => setTimeout(res, 2000));
      }
    }

    if (!finalized) {
      throw new Error('Transaction not finalized in time. Check the transaction ID manually.');
    }
    
    console.log('Transaction finalized successfully!');

    console.log('Pool created successfully!');
    return true;

  } catch (error) {
    const message = formatUnknownError(error, 'createPoolNativeAleo');
    console.error('Error creating pool (native ALEO):', {
      error,
      message,
      params: {
        tokenId,
        aleoAmount,
        tokenAmount,
        swapFee,
        minLpTokens,
        network: CURRENT_NETWORK,
        program: PROGRAM_ID,
      },
    });
    throw new Error(message);
  }
}

/**
 * Create a new pool with two custom tokens
 * @param wallet - The user's wallet
 * @param publicKey - The user's public key
 * @param token1Id - ID of the first token
 * @param token2Id - ID of the second token
 * @param token1Amount - Amount of first token to add (in smallest units)
 * @param token2Amount - Amount of second token to add (in smallest units)
 * @param swapFee - Swap fee in basis points (default 30 = 0.3%)
 * @param minLpTokens - Minimum LP tokens to receive (slippage protection)
 * @returns Promise<boolean> - Success status
 */
export async function createPoolTokens(
  wallet: any,
  publicKey: string,
  token1Id: string,
  token2Id: string,
  token1Amount: number,
  token2Amount: number,
  swapFee: number = 30,
  minLpTokens: number | bigint
): Promise<boolean> {
  try {
    if (!wallet?.adapter) {
      throw new Error('Wallet not connected');
    }

    // Validate config
    if (!PROGRAM_ID || !CURRENT_NETWORK) {
      throw new Error(`Missing config: PROGRAM_ID=${PROGRAM_ID}, NETWORK=${CURRENT_NETWORK}`);
    }

    // Validate inputs
    if (!publicKey || !publicKey.startsWith('aleo1')) {
      throw new Error(`Invalid publicKey: ${publicKey}`);
    }
    if (!token1Id || typeof token1Id !== 'string' || !token2Id || typeof token2Id !== 'string') {
      throw new Error('Invalid token IDs');
    }
    
    if (!token1Amount || !token2Amount || isNaN(token1Amount) || isNaN(token2Amount) || token1Amount <= 0 || token2Amount <= 0) {
      throw new Error('Invalid amounts - must be positive numbers');
    }
    
    const minLpBigInt = normalizeMinLpTokens(minLpTokens, 'createPoolTokens');

    console.log('Validation passed - all inputs valid');
    
    // Calculate fee (in micro credits)
    const fee = 150000; // 0.15 ALEO for pool creation
    
    console.log('Creating pool (token + token) with parameters:', {
      token1Id,
      token2Id,
      token1Amount,
      token2Amount,
      swapFee,
      minLpTokens: minLpBigInt.toString(),
      fee,
      publicKey
    });

    // Validate pool creation ratios
    if (!validatePoolRatio(BigInt(token1Amount), BigInt(token2Amount))) {
      throw new Error('Invalid pool ratio - amounts too extreme');
    }

    // Call the AMM DEX program
    // Parameters: [token1_id: field, token2_id: field, token1_amount: u128, token2_amount: u128, swap_fee: u16, min_lp: u128]
    const createPoolInputs = [
      token1Id,                           // token1_id: field
      token2Id,                           // token2_id: field
      `${BigInt(token1Amount)}u128`,       // token1_amount: u128
      `${BigInt(token2Amount)}u128`,      // token2_amount: u128
      `${swapFee}u16`,                    // swap_fee: u16
      `${minLpBigInt}u128`        // min_lp: u128
    ];

    console.log('Submitting AMM pool creation (token + token):', createPoolInputs);

    // Create the transaction
    const txDex = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      PROGRAM_ID,
      CREATE_POOL_TOKENS,
      createPoolInputs,
      fee,
      false
    );
    
    // Check transaction object
    if (!txDex) {
      throw new Error('Transaction.createTransaction returned null/undefined');
    }
    if (!txDex.transitions || txDex.transitions.length === 0) {
      throw new Error('Transaction missing transitions');
    }
    if (!txDex.address || !txDex.chainId) {
      throw new Error('Transaction missing required fields (address or chainId)');
    }

    console.log('Transaction object validated successfully');
    console.log('Transaction created:', txDex);

    // Submit the transaction through the wallet adapter (direct call like working examples)
    let txId: string;
    try {
      txId = await wallet.adapter.requestTransaction(txDex);
      console.log('Transaction submitted with ID:', txId);
    } catch (walletError: any) {
      console.error('Wallet adapter error details:', {
        message: walletError?.message,
        code: walletError?.code,
        name: walletError?.name,
        stack: walletError?.stack,
        fullError: walletError
      });
      throw walletError;
    }
    
    // Poll for finalization (matching working pattern from other utils)
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
        await new Promise((res) => setTimeout(res, 2000));
      }
    }

    if (!finalized) {
      throw new Error('Transaction not finalized in time. Check the transaction ID manually.');
    }
    
    console.log('Transaction finalized successfully!');

    console.log('Pool created successfully!');
    return true;

  } catch (error) {
    const message = formatUnknownError(error, 'createPoolTokens');
    console.error('Error creating pool (token-token):', error, message);
    throw new Error(message);
  }
}

/**
 * Add liquidity to a native ALEO + token pool
 * @param wallet - The user's wallet
 * @param publicKey - The user's public key
 * @param tokenId - ID of the custom token
 * @param aleoAmount - Amount of native ALEO to add (in microcredits)
 * @param tokenAmount - Amount of custom token to add (in smallest units)
 * @param minLpTokens - Minimum LP tokens to receive (slippage protection)
 * @returns Promise<boolean> - Success status
 */
export async function addLiquidityNativeAleo(
  wallet: any,
  publicKey: string,
  tokenId: string,
  aleoAmount: number,
  tokenAmount: number,
  minLpTokens: number | bigint
): Promise<boolean> {
  try {
    if (!wallet?.adapter) {
      throw new Error('Wallet not connected');
    }
    
    // Calculate fee (in micro credits)
    const fee = 120000; // 0.12 ALEO for add liquidity
    
    console.log('Adding liquidity (native ALEO + token) with parameters:', {
      tokenId,
      aleoAmount,
      tokenAmount,
      minLpTokens,
      fee,
      publicKey
    });

    const minLpBigInt = normalizeMinLpTokens(minLpTokens, 'addLiquidityNativeAleo');

    // Call the AMM DEX program
    // Parameters: [token_id: field, aleo_amount: u128, token_amount: u128, min_lp: u128]
    const addLiquidityInputs = [
      tokenId,                           // token_id: field
      `${BigInt(aleoAmount)}u128`,       // aleo_amount: u128
      `${BigInt(tokenAmount)}u128`,      // token_amount: u128
      `${minLpBigInt}u128`       // min_lp: u128
    ];

    console.log('Submitting AMM add liquidity (native ALEO + token):', addLiquidityInputs);

    const txDex = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      PROGRAM_ID,
      ADD_LIQUIDITY_NATIVE_ALEO,
      addLiquidityInputs,
      fee,
      false
    );
    
    console.log('Transaction created:', txDex);

    // Submit the transaction through the wallet adapter (direct call like working examples)
    const txId = await wallet.adapter.requestTransaction(txDex);
    console.log('Transaction submitted with ID:', txId);
    
    // Poll for finalization (matching working pattern from other utils)
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
        await new Promise((res) => setTimeout(res, 2000));
      }
    }

    if (!finalized) {
      throw new Error('Transaction not finalized in time. Check the transaction ID manually.');
    }
    
    console.log('Transaction finalized successfully!');

    console.log('Liquidity added successfully!');
    return true;

  } catch (error) {
    const message = formatUnknownError(error, 'addLiquidityNativeAleo');
    console.error('Error adding liquidity (native ALEO):', error, message);
    throw new Error(message);
  }
}

/**
 * Add liquidity to a token + token pool
 * @param wallet - The user's wallet
 * @param publicKey - The user's public key
 * @param token1Id - ID of the first token
 * @param token2Id - ID of the second token
 * @param token1Amount - Amount of first token to add (in smallest units)
 * @param token2Amount - Amount of second token to add (in smallest units)
 * @param minLpTokens - Minimum LP tokens to receive (slippage protection)
 * @returns Promise<boolean> - Success status
 */
export async function addLiquidityTokens(
  wallet: any,
  publicKey: string,
  token1Id: string,
  token2Id: string,
  token1Amount: number,
  token2Amount: number,
  minLpTokens: number | bigint
): Promise<boolean> {
  try {
    if (!wallet?.adapter) {
      throw new Error('Wallet not connected');
    }
    
    // Calculate fee (in micro credits)
    const fee = 120000; // 0.12 ALEO for add liquidity
    
    console.log('Adding liquidity (token + token) with parameters:', {
      token1Id,
      token2Id,
      token1Amount,
      token2Amount,
      minLpTokens,
      fee,
      publicKey
    });

    const minLpBigInt = normalizeMinLpTokens(minLpTokens, 'addLiquidityTokens');

    // Call the AMM DEX program
    // Parameters: [token1_id: field, token2_id: field, token1_amount: u128, token2_amount: u128, min_lp: u128]
    const addLiquidityInputs = [
      token1Id,                           // token1_id: field
      token2Id,                           // token2_id: field
      `${BigInt(token1Amount)}u128`,      // token1_amount: u128
      `${BigInt(token2Amount)}u128`,      // token2_amount: u128
      `${minLpBigInt}u128`        // min_lp: u128
    ];

    console.log('Submitting AMM add liquidity (token + token):', addLiquidityInputs);

    const txDex = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      PROGRAM_ID,
      ADD_LIQUIDITY_TOKENS,
      addLiquidityInputs,
      fee,
      false
    );
    
    console.log('Transaction created:', txDex);

    // Submit the transaction through the wallet adapter (direct call like working examples)
    const txId = await wallet.adapter.requestTransaction(txDex);
    console.log('Transaction submitted with ID:', txId);
    
    // Poll for finalization (matching working pattern from other utils)
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
        await new Promise((res) => setTimeout(res, 2000));
      }
    }

    if (!finalized) {
      throw new Error('Transaction not finalized in time. Check the transaction ID manually.');
    }
    
    console.log('Transaction finalized successfully!');

    console.log('Liquidity added successfully!');
    return true;

  } catch (error) {
    const message = formatUnknownError(error, 'addLiquidityTokens');
    console.error('Error adding liquidity (token-token):', error, message);
    throw new Error(message);
  }
}

export async function removeLiquidityNativeAleo(
  wallet: any,
  publicKey: string,
  tokenId: string,
  lpTokensToBurn: bigint,
  minAleoOut: bigint,
  minTokenOut: bigint,
  expectedAleoOut: bigint,
  expectedTokenOut: bigint
): Promise<boolean> {
  try {
    if (!wallet?.adapter) {
      throw new Error('Wallet not connected');
    }
    if (expectedAleoOut < minAleoOut || expectedTokenOut < minTokenOut) {
      throw new Error('Expected outputs must be greater than or equal to minimum outputs');
    }
    
    // Calculate fee (in micro credits)
    const fee = 120000; // 0.12 ALEO for remove liquidity
    
    console.log('Removing liquidity (native ALEO + token) with parameters:', {
      tokenId,
      lpTokensToBurn: lpTokensToBurn.toString(),
      minAleoOut: minAleoOut.toString(),
      minTokenOut: minTokenOut.toString(),
      expectedAleoOut: expectedAleoOut.toString(),
      expectedTokenOut: expectedTokenOut.toString(),
      fee,
      publicKey
    });

    // Parameters: [token_id: field, lp_tokens_to_burn: u128, min_aleo_out: u128, min_token_out: u128, expected_aleo_out: u128, expected_token_out: u128]
    const removeLiquidityInputs = [
      tokenId,
      `${lpTokensToBurn.toString()}u128`,
      `${minAleoOut.toString()}u128`,
      `${minTokenOut.toString()}u128`,
      `${expectedAleoOut.toString()}u128`,
      `${expectedTokenOut.toString()}u128`
    ];

    console.log('Submitting AMM remove liquidity (native ALEO + token):', removeLiquidityInputs);

    const txDex = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      PROGRAM_ID,
      REMOVE_LIQUIDITY_NATIVE_ALEO,
      removeLiquidityInputs,
      fee,
      false
    );
    
    console.log('Transaction created:', txDex);

    const txId = await wallet.adapter.requestTransaction(txDex);
    console.log('Transaction submitted with ID:', txId);
    
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
        await new Promise((res) => setTimeout(res, 2000));
      }
    }

    if (!finalized) {
      throw new Error('Transaction not finalized in time. Check the transaction ID manually.');
    }
    
    console.log('Transaction finalized successfully!');
    console.log('Liquidity removed successfully!');
    return true;

  } catch (error) {
    console.error('Error removing liquidity:', error);
    throw new Error(`Failed to remove liquidity: ${error instanceof Error ? error.message : 'An unknown error occurred. Please try again or report it'}`);
  }
}

export async function removeLiquidityTokens(
  wallet: any,
  publicKey: string,
  token1Id: string,
  token2Id: string,
  lpTokensToBurn: bigint,
  minToken1Out: bigint,
  minToken2Out: bigint,
  expectedToken1Out: bigint,
  expectedToken2Out: bigint
): Promise<boolean> {
  try {
    if (!wallet?.adapter) {
      throw new Error('Wallet not connected');
    }
    if (expectedToken1Out < minToken1Out || expectedToken2Out < minToken2Out) {
      throw new Error('Expected outputs must be greater than or equal to minimum outputs');
    }
    
    // Calculate fee (in micro credits)
    const fee = 120000; // 0.12 ALEO for remove liquidity
    
    console.log('Removing liquidity (token + token) with parameters:', {
      token1Id,
      token2Id,
      lpTokensToBurn: lpTokensToBurn.toString(),
      minToken1Out: minToken1Out.toString(),
      minToken2Out: minToken2Out.toString(),
      expectedToken1Out: expectedToken1Out.toString(),
      expectedToken2Out: expectedToken2Out.toString(),
      fee,
      publicKey
    });

    // Parameters: [token1_id: field, token2_id: field, lp_tokens_to_burn: u128, min_token1_out: u128, min_token2_out: u128, expected_token1_out: u128, expected_token2_out: u128]
    const removeLiquidityInputs = [
      token1Id,
      token2Id,
      `${lpTokensToBurn.toString()}u128`,
      `${minToken1Out.toString()}u128`,
      `${minToken2Out.toString()}u128`,
      `${expectedToken1Out.toString()}u128`,
      `${expectedToken2Out.toString()}u128`
    ];

    console.log('Submitting AMM remove liquidity (token + token):', removeLiquidityInputs);

    const txDex = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      PROGRAM_ID,
      REMOVE_LIQUIDITY_TOKENS,
      removeLiquidityInputs,
      fee,
      false
    );
    
    console.log('Transaction created:', txDex);

    const txId = await wallet.adapter.requestTransaction(txDex);
    console.log('Transaction submitted with ID:', txId);
    
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
        await new Promise((res) => setTimeout(res, 2000));
      }
    }

    if (!finalized) {
      throw new Error('Transaction not finalized in time. Check the transaction ID manually.');
    }
    
    console.log('Transaction finalized successfully!');
    console.log('Liquidity removed successfully!');
    return true;

  } catch (error) {
    console.error('Error removing liquidity:', error);
    throw new Error(`Failed to remove liquidity: ${error instanceof Error ? error.message : 'An unknown error occurred. Please try again or report it'}`);
  }
}

/**
 * Calculate optimal liquidity amounts to maintain pool ratio
 * @param token1Amount - Amount of token1 user wants to add
 * @param poolData - Current pool state data
 * @returns Optimal amounts for both tokens
 */
export function calculateOptimalLiquidityAmounts(
  token1Amount: number,
  poolData: PoolData
): { token1Amount: number; token2Amount: number } {
  if (!poolData || token1Amount <= 0) {
    return { token1Amount: 0, token2Amount: 0 };
  }

  const { reserve1, reserve2 } = poolData;
  
  if (reserve1 === 0n || reserve2 === 0n) {
    console.log('Pool has zero reserves - cannot calculate optimal amounts');
    return { token1Amount, token2Amount: token1Amount }; // Assume 1:1 ratio for new pools
  }
  
  // Calculate optimal token2 amount to maintain ratio
  const optimalToken2 = calculateOptimalLiquidity(BigInt(token1Amount), reserve1, reserve2);
  
  return { 
    token1Amount, 
    token2Amount: Number(optimalToken2) 
  };
}

/**
 * Calculate LP tokens to mint based on pool state
 * @param token1Amount - Amount of token1 being added
 * @param token2Amount - Amount of token2 being added
 * @param poolData - Current pool state data
 * @returns LP tokens to mint
 */
export function calculateLPTokensToMint(
  token1Amount: number,
  token2Amount: number,
  poolData: PoolData
): number {
  if (!poolData || token1Amount <= 0 || token2Amount <= 0) {
    return 0;
  }

  const { reserve1, reserve2, lpTotalSupply } = poolData;
  
  const lpTokens = calculateLPTokens(
    BigInt(token1Amount),
    BigInt(token2Amount),
    reserve1,
    reserve2,
    lpTotalSupply
  );
  
  return Number(lpTokens);
}

/**
 * Checks if the pool can accept new liquidity
 * @param poolData - Current pool state data
 * @returns True if pool can accept liquidity
 */
export function canAddLiquidity(poolData: PoolData | null): boolean {
  return poolData !== null && poolData.reserve1 > 0n && poolData.reserve2 > 0n;
}
