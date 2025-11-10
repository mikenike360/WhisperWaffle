// tokenMetadataFetcher.ts
// Utility to fetch token metadata from curated token list and token_registry.aleo blockchain

import { CURATED_TOKENS } from '@/config/tokens';
import { NETWORK_SUFFIX } from '@/types';

export interface TokenMetadata {
  tokenId: string;
  name: string;
  symbol: string;
  decimals: number;
  supply: string;
  maxSupply: string;
  admin: string;
  externalAuthorizationRequired: boolean;
  externalAuthorizationParty: string;
}

// Explorer endpoints to try
const EXPLORER_ENDPOINTS = [
  `https://api.explorer.aleo.org/v1/${NETWORK_SUFFIX}`,
  'https://api.explorer.aleo.org/v1/mainnet',
  'https://api.explorer.aleo.org/v1/testnet',
  'https://api.explorer.aleo.org/v1',
];

const TOKEN_REGISTRY_PROGRAM = 'token_registry.aleo';

/**
 * Decode u128-encoded ASCII string back to readable text
 * @param value - u128 value as string
 * @returns Decoded ASCII string
 */
export function decodeU128ToString(value: string): string {
  try {
    // Remove 'u128' suffix if present
    const cleanValue = value.replace(/u128$/, '');
    const num = BigInt(cleanValue);
    
    // Convert bigint to ASCII string
    let result = '';
    let temp = num;
    
    while (temp > 0n) {
      const charCode = Number(temp & 0xFFn);
      if (charCode >= 32 && charCode <= 126) { // Printable ASCII range
        result = String.fromCharCode(charCode) + result;
      }
      temp = temp >> 8n;
    }
    
    return result || 'Unknown';
  } catch (error) {
    console.warn('Failed to decode u128 string:', value, error);
    return 'Unknown';
  }
}

/**
 * Parse raw blockchain data into TokenMetadata object
 * @param raw - Raw string from blockchain explorer
 * @returns Parsed TokenMetadata or null if invalid
 */
export function parseTokenMetadata(raw: string): TokenMetadata | null {
  try {
    // Expected format from token_registry.aleo:
    // { token_id: 1field, name: 123456u128, symbol: 789012u128, decimals: 6u8, supply: 1000000u128, max_supply: 1000000000u128, admin: aleo1..., external_authorization_required: true, external_authorization_party: aleo1... }
    
    const tokenIdMatch = raw.match(/token_id:\s*([^,\s]+)/);
    const nameMatch = raw.match(/name:\s*(\d+)u128/);
    const symbolMatch = raw.match(/symbol:\s*(\d+)u128/);
    const decimalsMatch = raw.match(/decimals:\s*(\d+)u8/);
    const supplyMatch = raw.match(/supply:\s*(\d+)u128/);
    const maxSupplyMatch = raw.match(/max_supply:\s*(\d+)u128/);
    const adminMatch = raw.match(/admin:\s*([^,\s]+)/);
    const extAuthRequiredMatch = raw.match(/external_authorization_required:\s*(true|false)/);
    const extAuthPartyMatch = raw.match(/external_authorization_party:\s*([^,\s]+)/);
    
    if (!tokenIdMatch || !nameMatch || !symbolMatch || !decimalsMatch) {
      console.warn('Missing required fields in token metadata:', raw);
      return null;
    }
    
    const name = decodeU128ToString(nameMatch[1]);
    const symbol = decodeU128ToString(symbolMatch[1]);
    
    return {
      tokenId: tokenIdMatch[1],
      name,
      symbol,
      decimals: parseInt(decimalsMatch[1]),
      supply: supplyMatch?.[1] || '0',
      maxSupply: maxSupplyMatch?.[1] || '0',
      admin: adminMatch?.[1] || '',
      externalAuthorizationRequired: extAuthRequiredMatch?.[1] === 'true',
      externalAuthorizationParty: extAuthPartyMatch?.[1] || '',
    };
  } catch (error) {
    console.error('Error parsing token metadata:', error);
    return null;
  }
}

/**
 * Fetch token metadata for a specific token ID
 * @param tokenId - Token ID to fetch metadata for
 * @returns TokenMetadata or null if not found
 */
export async function fetchTokenMetadata(tokenId: string): Promise<TokenMetadata | null> {
  for (const baseUrl of EXPLORER_ENDPOINTS) {
    try {
      const url = `${baseUrl}/program/${TOKEN_REGISTRY_PROGRAM}/mapping/registered_tokens/${encodeURIComponent(tokenId)}`;
      console.log('Fetching token metadata from:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        continue;
      }
      
      const data = await response.json();
      console.log('Token metadata response:', data);
      
      // Extract the raw value from response
      let rawValue = '';
      if (typeof data === 'string') {
        rawValue = data;
      } else if (data && typeof data === 'object') {
        rawValue = data.value || data.mapping_value || data.data || JSON.stringify(data);
      }
      
      if (rawValue) {
        const metadata = parseTokenMetadata(rawValue);
        if (metadata) {
          console.log('Successfully parsed token metadata:', metadata);
          return metadata;
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch token metadata from ${baseUrl}:`, error);
      continue;
    }
  }
  
  console.warn('Failed to fetch token metadata from all endpoints for token:', tokenId);
  return null;
}

/**
 * Fetch all registered tokens from curated token list
 * @returns Array of TokenMetadata objects
 */
export async function fetchAllRegisteredTokens(): Promise<TokenMetadata[]> {
  try {
    console.log('Loading curated token list...');
    
    // Convert curated tokens to TokenMetadata format
    const curatedTokens = CURATED_TOKENS.map(token => ({
      tokenId: token.id,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      supply: '0', // Placeholder - could be fetched from blockchain if needed
      maxSupply: '0', // Placeholder - could be fetched from blockchain if needed
      admin: '', // Placeholder - could be fetched from blockchain if needed
      externalAuthorizationRequired: false,
      externalAuthorizationParty: '',
    }));
    
    console.log(`Loaded ${curatedTokens.length} curated tokens`);
    return curatedTokens;
  } catch (error) {
    console.error('Error loading curated tokens:', error);
    return [];
  }
}

/**
 * Validate token metadata
 * @param metadata - TokenMetadata to validate
 * @returns True if valid, false otherwise
 */
export function validateTokenMetadata(metadata: TokenMetadata): boolean {
  if (!metadata.tokenId || !metadata.name || !metadata.symbol) {
    return false;
  }
  
  if (metadata.decimals < 0 || metadata.decimals > 18) {
    return false;
  }
  
  if (metadata.name.length > 50 || metadata.symbol.length > 10) {
    return false;
  }
  
  return true;
}

/**
 * Get token icon path based on symbol
 * @param symbol - Token symbol
 * @param customIconUrl - Optional custom icon URL
 * @returns Icon path or URL
 */
export function getTokenIconPath(symbol: string, customIconUrl?: string): string {
  if (customIconUrl) {
    return customIconUrl;
  }
  
  // Check curated tokens first
  const curatedToken = CURATED_TOKENS.find(
    token => token.symbol.toLowerCase() === symbol.toLowerCase()
  );
  
  if (curatedToken) {
    return curatedToken.icon;
  }
  
  // Fallback to default icon for custom tokens
  return '/token-icons/default.svg';
}

/**
 * Create a mock token for testing
 * @param tokenId - Token ID
 * @param symbol - Token symbol
 * @param name - Token name
 * @param decimals - Token decimals
 * @returns Mock TokenMetadata
 */
export function createMockToken(
  tokenId: string,
  symbol: string,
  name: string,
  decimals: number = 6
): TokenMetadata {
  return {
    tokenId,
    name,
    symbol,
    decimals,
    supply: '0',
    maxSupply: '1000000000',
    admin: 'aleo1test',
    externalAuthorizationRequired: false,
    externalAuthorizationParty: 'aleo1test',
  };
}
