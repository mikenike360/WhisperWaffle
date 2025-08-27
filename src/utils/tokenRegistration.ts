// tokenRegistration.ts
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { CURRENT_NETWORK } from '@/types';

// Import the fee calculator function
import { getFeeForFunction } from '@/utils/feeCalculator';



export interface TokenRegistrationData {
  tokenId: string;
  name: string;
  symbol: string;
  decimals: string;
  maxSupply: string;
  externalAuthorizationRequired: boolean;
  externalAuthorizationParty: string; // Address of the external authorization party
}

export const TOKEN_REGISTRY_PROGRAM = 'token_registry.aleo';
export const REGISTER_TOKEN_FUNCTION = 'register_token';

/**
 * Converts ASCII text to u128 representation as required by Aleo programs.
 * This converts each character to its ASCII value and combines them into a single u128.
 * 
 * @param text - The text to convert
 * @returns The u128 representation as a string
 */
function convertTextToU128(text: string): string {
  if (!text || text.length === 0) return '0';
  
  let result = BigInt(0);
  for (let i = 0; i < text.length; i++) {
    const charCode = BigInt(text.charCodeAt(i));
    result = result * BigInt(256) + charCode;
  }
  
  return result.toString();
}

/**
 * Registers a new token on the Aleo blockchain using the token_registry.aleo program.
 * This function uses the wallet to sign and submit the transaction properly.
 *
 * @param wallet - The wallet adapter instance.
 * @param publicKey - The public key of the user registering the token.
 * @param tokenData - The token registration data.
 * @param setTxStatus - Function to update the transaction status in the UI.
 * @returns The transaction ID of the submitted token registration.
 */
export async function registerToken(
  wallet: any,
  publicKey: string,
  tokenData: TokenRegistrationData,
  setTxStatus: (status: string | null) => void,
): Promise<string> {
  setTxStatus('Preparing token registration...');

  try {
    // Validate required fields
    if (!tokenData.tokenId || !tokenData.name || !tokenData.symbol || !tokenData.externalAuthorizationParty) {
      throw new Error('Token ID, name, symbol, and external authorization party are required');
    }

    setTxStatus('Building token registration transaction...');

    // Prepare the inputs array for the Leo program
    // register_token(token_id, name, symbol, decimals, max_supply, external_authorization_required, external_authorization_party)
    
    // Convert name and symbol to u128 (ASCII text represented in bits)
    const nameAsU128 = convertTextToU128(tokenData.name);
    const symbolAsU128 = convertTextToU128(tokenData.symbol);
    
    const inputs = [
      tokenData.tokenId, // token_id: field
      `${nameAsU128}u128`, // name: u128 (ASCII text represented in bits)
      `${symbolAsU128}u128`, // symbol: u128 (ASCII text represented in bits)
      `${tokenData.decimals}u8`, // decimals: u8
      `${tokenData.maxSupply}u128`, // max_supply: u128
      tokenData.externalAuthorizationRequired.toString(), // external_authorization_required: bool
      tokenData.externalAuthorizationParty // external_authorization_party: address
    ];

    console.log('Token registration inputs:', inputs);
    console.log('Input types:', inputs.map(input => typeof input));
    console.log('External auth party address:', tokenData.externalAuthorizationParty);

    // Calculate the fee for this transaction
    const fee = getFeeForFunction(REGISTER_TOKEN_FUNCTION);
    console.log('Calculated fee (in micro credits):', fee);

    setTxStatus('Creating transaction...');

    // Create the transaction using the wallet adapter
    // The last parameter (false) means the fee is public (visible on-chain)
    const transaction = Transaction.createTransaction(
      publicKey,
      CURRENT_NETWORK,
      TOKEN_REGISTRY_PROGRAM,
      REGISTER_TOKEN_FUNCTION,
      inputs,
      fee,
      false // Fee is public
    );

    console.log('Created transaction:', transaction);

    setTxStatus('Requesting wallet signature...');

  // Submit the transaction through the wallet adapter
  const txId = await wallet.adapter.requestTransaction(transaction);
    console.log('Transaction submitted with ID:', txId);

    setTxStatus(`Token registration submitted: ${txId}`);

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
      throw new Error('Token registration not finalized in time. Check the transaction ID manually.');
    }

    setTxStatus('Token registration finalized successfully!');
    return txId;

  } catch (error) {
    console.error('Error registering token:', error);
    throw new Error(`Failed to register token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates token registration data before submission.
 * 
 * @param tokenData - The token data to validate.
 * @returns Array of validation errors, empty if valid.
 */
export function validateTokenData(tokenData: TokenRegistrationData): string[] {
  const errors: string[] = [];

  if (!tokenData.tokenId || tokenData.tokenId.trim() === '') {
    errors.push('Token ID is required');
  }

  if (!tokenData.name || tokenData.name.trim() === '') {
    errors.push('Token name is required');
  }

  if (!tokenData.symbol || tokenData.symbol.trim() === '') {
    errors.push('Token symbol is required');
  }

  const decimals = parseInt(tokenData.decimals);
  if (isNaN(decimals) || decimals < 0 || decimals > 18) {
    errors.push('Decimals must be between 0 and 18');
  }

  const maxSupply = BigInt(tokenData.maxSupply);
  if (maxSupply <= 0) {
    errors.push('Max supply must be greater than 0');
  }

  if (!tokenData.externalAuthorizationParty || tokenData.externalAuthorizationParty.trim() === '') {
    errors.push('External authorization party address is required');
  }

  if (!tokenData.externalAuthorizationParty.startsWith('aleo1')) {
    errors.push('External authorization party must be a valid Aleo address (starting with aleo1)');
  }

  return errors;
}

/**
 * Formats token data for display in the UI.
 * 
 * @param tokenData - The token data to format.
 * @returns Formatted token data object.
 */
export function formatTokenDataForDisplay(tokenData: TokenRegistrationData) {
  return {
    ...tokenData,
    maxSupplyFormatted: formatLargeNumber(tokenData.maxSupply),
    decimalsFormatted: `${tokenData.decimals} decimal places`,
    authStatus: tokenData.externalAuthorizationRequired ? 'External Auth Required' : 'No External Auth'
  };
}

/**
 * Formats large numbers for better readability.
 * 
 * @param value - The number value as a string.
 * @returns Formatted number string.
 */
function formatLargeNumber(value: string): string {
  const num = BigInt(value);
  if (num < 1000) return value;
  
  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
  let magnitude = 0;
  let divisor = BigInt(1);
  
  while (num >= divisor * BigInt(1000) && magnitude < suffixes.length - 1) {
    divisor *= BigInt(1000);
    magnitude++;
  }
  
  const quotient = Number(num / divisor);
  const remainder = Number(num % divisor);
  
  if (remainder === 0) {
    return `${quotient}${suffixes[magnitude]}`;
  } else {
    const decimal = (remainder / Number(divisor)).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
    return `${quotient}.${decimal}${suffixes[magnitude]}`;
  }
}
