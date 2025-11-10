// tokens.ts
// Curated token list configuration for WhisperWaffle DEX

export interface CuratedToken {
  id: string;           // Token ID on Aleo (e.g., "1field")
  symbol: string;       // Display symbol (e.g., "USDT")
  name: string;         // Full name (e.g., "Tether USD")
  decimals: number;     // Token decimals
  icon: string;         // Path to icon
  verified: boolean;    // Always true for curated tokens
  description?: string; // Optional description
  website?: string;     // Optional website URL
}

export const CURATED_TOKENS: CuratedToken[] = [
  {
    id: '0field',
    symbol: 'ALEO',
    name: 'Aleo',
    decimals: 6,
    icon: '/token-icons/aleo.svg',
    verified: true,
    description: 'Native Aleo token',
  },
  {
    id: '1field', // TBD - need actual token ID
    symbol: 'vETH',
    name: 'Virtual Ethereum',
    decimals: 18,
    icon: '/token-icons/veth.svg',
    verified: true,
  },
  {
    id: '2field', // TBD - need actual token ID
    symbol: 'pALEO',
    name: 'Pooled ALEO',
    decimals: 6,
    icon: '/token-icons/paleo.svg',
    verified: true,
  },
  {
    id: '3field', // TBD - need actual token ID
    symbol: 'vUSDC',
    name: 'Virtual USD Coin',
    decimals: 6,
    icon: '/token-icons/vusdc.svg',
    verified: true,
  },
  {
    id: '4field', // TBD - need actual token ID
    symbol: 'vUSDT',
    name: 'Virtual Tether',
    decimals: 6,
    icon: '/token-icons/vusdt.svg',
    verified: true,
  },
  {
    id: '5field', // TBD - need actual token ID
    symbol: 'RATS',
    name: 'RATS Token',
    decimals: 6,
    icon: '/token-icons/rats.svg',
    verified: true,
  },
  {
    id: '42field', // Updated Waffle token ID
    symbol: 'WAFFLE',
    name: 'Waffle Token',
    decimals: 6,
    icon: '/token-icons/waffle.svg',
    verified: true,
    description: 'WhisperWaffle DEX native token',
  },
];

/**
 * Get curated token by ID
 */
export function getCuratedTokenById(tokenId: string): CuratedToken | undefined {
  return CURATED_TOKENS.find(token => token.id === tokenId);
}

/**
 * Get curated token by symbol
 */
export function getCuratedTokenBySymbol(symbol: string): CuratedToken | undefined {
  return CURATED_TOKENS.find(token => 
    token.symbol.toLowerCase() === symbol.toLowerCase()
  );
}

/**
 * Check if a token ID is in the curated list
 */
export function isCuratedToken(tokenId: string): boolean {
  return CURATED_TOKENS.some(token => token.id === tokenId);
}

/**
 * Get all curated token IDs
 */
export function getCuratedTokenIds(): string[] {
  return CURATED_TOKENS.map(token => token.id);
}

/**
 * Get all curated token symbols
 */
export function getCuratedTokenSymbols(): string[] {
  return CURATED_TOKENS.map(token => token.symbol);
}
