// mintTokens.ts
import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { CURRENT_NETWORK } from '@/types';
import { getFeeForFunction } from '@/utils/feeCalculator';

export const MINT_TOKENS_FUNCTION = 'mint_public';

export interface TokenMintingData {
  tokenId: string;
  amount: string;
  recipient: string;
  nonce: string;
}

/**
 * Mints new tokens for a registered token contract.
 *
 * @param wallet - The wallet adapter instance.
 * @param publicKey - The public key of the user minting tokens.
 * @param tokenData - The token minting data.
 * @param setTxStatus - Function to update the transaction status in the UI.
 * @returns The transaction ID of the submitted token minting.
 */
export async function mintTokens(
  wallet: any,
  publicKey: string,
  tokenData: TokenMintingData,
  setTxStatus: (status: string | null) => void,
): Promise<string> {
  setTxStatus('Preparing token minting...');

  try {
    // Validate required fields
    if (!tokenData.tokenId || !tokenData.recipient || !tokenData.amount || !tokenData.nonce) {
      throw new Error('Token ID, recipient address, amount, and nonce are required');
    }

    setTxStatus('Building token minting transaction...');

    // Prepare the inputs array for the Leo program
    // function mint_public: input r0 as field.public, r1 as address.public, r2 as u128.public, r3 as u32.public
    const inputs = [
      tokenData.tokenId,           // r0: token_id (field)
      tokenData.recipient,         // r1: recipient address
      `${tokenData.amount}u128`,   // r2: amount to mint (u128)
      `${tokenData.nonce}u32`      // r3: nonce (u32)
    ];

    console.log('Token minting inputs:', inputs);

    // Calculate the fee for this transaction
    const fee = getFeeForFunction(MINT_TOKENS_FUNCTION);
    console.log('Calculated fee (in micro credits):', fee);

    setTxStatus('Creating transaction...');

    // Create the transaction using the wallet adapter
    // The last parameter (false) means the fee is public (visible on-chain)
    const transaction = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      'token_registry.aleo', // Use the same program as token registration
      MINT_TOKENS_FUNCTION,
      inputs,
      fee,
      false // Fee is public
    );

    console.log('Created transaction:', transaction);

    setTxStatus('Requesting wallet signature...');

    // Submit the transaction through the wallet adapter
    const txId = await wallet.adapter.requestTransaction(transaction);
    console.log('Transaction submitted with ID:', txId);

    setTxStatus(`Token minting submitted: ${txId}`);

    // Poll for transaction finalization
    setTxStatus('Waiting for transaction finalization...');
    let finalized = false;
    
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        // Check transaction status using the wallet adapter
        const status = await wallet.adapter.transactionStatus(txId);
        console.log(`Transaction status check ${attempt + 1}: ${status}`);
        
        if (status === 'Finalized') {
          finalized = true;
          break;
        }
        
        await new Promise((res) => setTimeout(res, 2000));
      } catch (error) {
        console.log(`Status check attempt ${attempt + 1} failed:`, error);
        // Continue polling even if status check fails
        await new Promise((res) => setTimeout(res, 2000));
      }
    }

    if (!finalized) {
      throw new Error('Token minting not finalized in time. Check the transaction ID manually.');
    }

    setTxStatus('Token minting finalized successfully!');
    return txId;

  } catch (error) {
    console.error('Error minting tokens:', error);
    throw new Error(`Failed to mint tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
