import type { NextApiRequest, NextApiResponse } from 'next';
import { CURATED_TOKENS } from '@/config/tokens';
import { fetchTokenMetadata, validateTokenMetadata } from '@/utils/tokenMetadataFetcher';

interface TokenInfo {
  tokenId: string;
  symbol: string;
  name: string;
  decimals: number;
  supply: string;
  maxSupply: string;
  admin: string;
  verified: boolean;
}

interface TokensResponse {
  ok: boolean;
  tokens?: TokenInfo[];
  error?: string;
}

// Simple in-memory cache
let tokenCache: { tokens: TokenInfo[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Convert CuratedToken to TokenInfo format
 */
function convertCuratedTokenToTokenInfo(token: any): TokenInfo {
  return {
    tokenId: token.id,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    supply: '0', // Placeholder
    maxSupply: '0', // Placeholder
    admin: '', // Placeholder
    verified: true, // All curated tokens are verified
  };
}

/**
 * Get cached tokens if still valid
 */
function getCachedTokens(): TokenInfo[] | null {
  if (tokenCache && Date.now() - tokenCache.timestamp < CACHE_TTL) {
    return tokenCache.tokens;
  }
  return null;
}

/**
 * Cache tokens
 */
function setCachedTokens(tokens: TokenInfo[]): void {
  tokenCache = {
    tokens,
    timestamp: Date.now(),
  };
}

/**
 * Fetch tokens from curated list
 */
async function fetchTokens(): Promise<TokenInfo[]> {
  // Check cache first
  const cachedTokens = getCachedTokens();
  if (cachedTokens) {
    console.log('Returning cached tokens');
    return cachedTokens;
  }

  try {
    console.log('Loading curated tokens...');
    
    // Convert curated tokens to TokenInfo format
    const tokens: TokenInfo[] = CURATED_TOKENS.map(convertCuratedTokenToTokenInfo);
    
    // Cache the results
    setCachedTokens(tokens);
    
    console.log(`Successfully loaded ${tokens.length} curated tokens`);
    return tokens;
  } catch (error) {
    console.error('Error loading curated tokens:', error);
    
    // Return cached tokens if available, even if expired
    if (tokenCache) {
      console.log('Returning expired cached tokens due to error');
      return tokenCache.tokens;
    }
    
    // Return empty array as fallback
    return [];
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TokensResponse>
) {
  try {
    const { tokenId } = req.query;
    
    if (tokenId && typeof tokenId === 'string') {
      // Fetch specific token metadata
      console.log('Fetching metadata for token:', tokenId);
      
      const metadata = await fetchTokenMetadata(tokenId);
      if (!metadata) {
        return res.status(404).json({
          ok: false,
          error: `Token ${tokenId} not found`
        });
      }
      
      if (!validateTokenMetadata(metadata)) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid token metadata'
        });
      }
      
      const tokenInfo = convertToTokenInfo(metadata);
      
      return res.status(200).json({
        ok: true,
        tokens: [tokenInfo]
      });
    } else {
      // Fetch all tokens
      const tokens = await fetchTokens();
      
      return res.status(200).json({
        ok: true,
        tokens
      });
    }
  } catch (error: any) {
    console.error('API error:', error);
    
    return res.status(500).json({
      ok: false,
      error: error?.message || 'Failed to fetch tokens'
    });
  }
}
