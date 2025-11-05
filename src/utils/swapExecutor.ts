// swapExecutor.ts
import { Transaction } from '@demox-labs/aleo-wallet-adapter-base';
import { CURRENT_NETWORK, PROGRAM_ID, NATIVE_ALEO_ID } from '../types';
import { getAmountOut, calculateMinOutput, calculatePriceImpact } from './ammCalculations';

// New AMM DEX function names
const SWAP_ALEO_FOR_TOKEN = 'swap_aleo_for_token';
const SWAP_TOKEN_FOR_ALEO = 'swap_token_for_aleo';
const SWAP_TOKENS = 'swap_tokens';
const GET_SWAP_QUOTE = 'get_swap_quote';

// Interface for swap quote
export interface SwapQuote {
  amountOut: number;
  priceImpact: number;
  fee: number;
  route: string[];
}

/**
 * Execute a swap from native ALEO to custom token
 * @param wallet - The user's wallet
 * @param publicKey - The user's public key
 * @param tokenId - ID of the token to swap to
 * @param aleoAmount - Amount of ALEO to swap (in microcredits)
 * @param minTokenOut - Minimum tokens to receive (slippage protection)
 * @returns Promise<boolean> - Success status
 */
export async function swapAleoForToken(
  wallet: any,
  publicKey: string,
  tokenId: string,
  aleoAmount: number,
  minTokenOut: number
): Promise<boolean> {
  try {
    if (!wallet?.adapter) {
      throw new Error('Wallet not connected');
    }
    
    // Calculate fee (in micro credits) - updated for new AMM functions
    const fee = 100000; // 0.1 ALEO for transaction fee
    
    console.log('Swapping ALEO for token with parameters:', {
      tokenId,
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

    // Call the AMM DEX program
    // Parameters: [token_id: field, aleo_in: u128, min_token_out: u128]
    const swapInputs = [
      tokenId,                           // token_id: field
      `${BigInt(aleoAmount)}u128`,       // aleo_in: u128
      `${BigInt(minTokenOut)}u128`        // min_token_out: u128
    ];

    console.log('Submitting AMM swap (ALEO for token):', swapInputs);

    const txDex = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      PROGRAM_ID,
      SWAP_ALEO_FOR_TOKEN,
      swapInputs,
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
 * Execute a swap from custom token to native ALEO
 * @param wallet - The user's wallet
 * @param publicKey - The user's public key
 * @param tokenId - ID of the token to swap from
 * @param tokenAmount - Amount of tokens to swap (in smallest units)
 * @param minAleoOut - Minimum ALEO to receive (slippage protection)
 * @returns Promise<boolean> - Success status
 */
export async function swapTokenForAleo(
  wallet: any,
  publicKey: string,
  tokenId: string,
  tokenAmount: number,
  minAleoOut: number
): Promise<boolean> {
  try {
    if (!wallet?.adapter) {
      throw new Error('Wallet not connected');
    }
    
    // Calculate fee (in micro credits)
    const fee = 100000; // 0.1 ALEO for transaction fee
    
    console.log('Swapping token for ALEO with parameters:', {
      tokenId,
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

    // Call the AMM DEX program
    // Parameters: [token_id: field, token_in: u128, min_aleo_out: u128]
    const swapInputs = [
      tokenId,                           // token_id: field
      `${BigInt(tokenAmount)}u128`,      // token_in: u128
      `${BigInt(minAleoOut)}u128`        // min_aleo_out: u128
    ];

    console.log('Submitting AMM swap (token for ALEO):', swapInputs);

    const txDex = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      PROGRAM_ID,
      SWAP_TOKEN_FOR_ALEO,
      swapInputs,
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
 * Execute a swap between two custom tokens
 * @param wallet - The user's wallet
 * @param publicKey - The user's public key
 * @param token1Id - ID of the token to swap from
 * @param token2Id - ID of the token to swap to
 * @param token1Amount - Amount of token1 to swap (in smallest units)
 * @param minToken2Out - Minimum token2 to receive (slippage protection)
 * @returns Promise<boolean> - Success status
 */
export async function swapTokens(
  wallet: any,
  publicKey: string,
  token1Id: string,
  token2Id: string,
  token1Amount: number,
  minToken2Out: number
): Promise<boolean> {
  try {
    if (!wallet?.adapter) {
      throw new Error('Wallet not connected');
    }
    
    // Calculate fee (in micro credits)
    const fee = 100000; // 0.1 ALEO for transaction fee
    
    console.log('Swapping tokens with parameters:', {
      token1Id,
      token2Id,
      token1Amount,
      minToken2Out,
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

    // Call the AMM DEX program
    // Parameters: [token1_id: field, token2_id: field, token1_in: u128, min_token2_out: u128]
    const swapInputs = [
      token1Id,                           // token1_id: field
      token2Id,                           // token2_id: field
      `${BigInt(token1Amount)}u128`,      // token1_in: u128
      `${BigInt(minToken2Out)}u128`        // min_token2_out: u128
    ];

    console.log('Submitting AMM swap (token for token):', swapInputs);

    const txDex = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      PROGRAM_ID,
      SWAP_TOKENS,
      swapInputs,
      fee,
      false
    );
    await sendAndWait(txDex);

    console.log('Swap tokens completed successfully!');
    return true;

  } catch (error) {
    console.error('Error swapping tokens:', error);
    throw new Error(`Failed to swap tokens: ${error instanceof Error ? error.message : 'An unknown error occurred. Please try again or report it'}`);
  }
}

/**
 * Get a swap quote using AMM pricing
 * @param token1Id - ID of input token
 * @param token2Id - ID of output token
 * @param inputAmount - Amount of input token
 * @param isToken1ToToken2 - Direction of swap (true = token1->token2, false = token2->token1)
 * @param poolReserves - Pool reserves data
 * @returns Swap quote with output amount and pricing info
 */
export function getSwapQuote(
  token1Id: string,
  token2Id: string,
  inputAmount: number,
  isToken1ToToken2: boolean,
  poolReserves?: { reserve1: bigint; reserve2: bigint; swapFee: number }
): SwapQuote | null {
  if (!poolReserves || inputAmount <= 0) {
    return null;
  }

  try {
    const amountIn = BigInt(inputAmount);
    const { reserve1, reserve2, swapFee = 30 } = poolReserves;

    // Determine which reserve is input and which is output
    const reserveIn = isToken1ToToken2 ? reserve1 : reserve2;
    const reserveOut = isToken1ToToken2 ? reserve2 : reserve1;

    // Calculate output amount using AMM formula
    const amountOut = getAmountOut(amountIn, reserveIn, reserveOut, swapFee);
    
    if (amountOut <= 0n) {
      return null;
    }

    // Calculate price impact
    const priceImpact = calculatePriceImpact(amountIn, reserveIn, reserveOut);

    // Calculate fee amount
    const feeAmount = (amountIn * BigInt(swapFee)) / 10000n;

    return {
      amountOut: Number(amountOut),
      priceImpact,
      fee: Number(feeAmount),
      route: isToken1ToToken2 ? [token1Id, token2Id] : [token2Id, token1Id]
    };
  } catch (error) {
    console.error('Error calculating swap quote:', error);
    return null;
  }
}

/**
 * Calculate minimum output with slippage protection
 * @param expectedOutput - Expected output amount
 * @param slippageTolerance - Slippage tolerance in basis points (default 500 = 5%)
 * @returns Minimum output amount
 */
export function calculateMinOutputWithSlippage(
  expectedOutput: number,
  slippageTolerance: number = 500
): number {
  const slippageMultiplier = (10000 - slippageTolerance) / 10000;
  return expectedOutput * slippageMultiplier;
}

/**
 * Get swap quote from on-chain (if available)
 * @param token1Id - ID of input token
 * @param token2Id - ID of output token
 * @param inputAmount - Amount of input token
 * @param isToken1ToToken2 - Direction of swap
 * @returns Promise<number> - Output amount
 */
export async function getOnChainSwapQuote(
  token1Id: string,
  token2Id: string,
  inputAmount: number,
  isToken1ToToken2: boolean
): Promise<number> {
  try {
    // This would call the on-chain get_swap_quote function
    // For now, return 0 as we'll use client-side calculations
    console.log('On-chain quote requested:', {
      token1Id,
      token2Id,
      inputAmount,
      isToken1ToToken2
    });
    
    return 0; // Placeholder - implement actual on-chain call
  } catch (error) {
    console.error('Error getting on-chain quote:', error);
    return 0;
  }
}