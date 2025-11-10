import type { NextApiRequest, NextApiResponse } from 'next';
import { CURRENT_RPC_URL, PROGRAM_ID, IS_MAINNET, NETWORK_SUFFIX } from '@/types';

interface LiquidityPosition {
  user: string;
  poolId: string;
  lpTokens: string;
  token1Amount: string;
  token2Amount: string;
}

interface LiquidityPositionResponse {
  ok: boolean;
  position?: LiquidityPosition;
  error?: string;
}

// Try multiple likely explorer endpoints to fetch AMM DEX mappings
const candidateUrls = (programId: string, mapping: string, key?: string) => {
  const urls: string[] = [];
  const keySuffix = key ? `/${encodeURIComponent(key)}` : '';
  
  // Provable explorer patterns
  urls.push(`https://api.explorer.provable.com/v1/${NETWORK_SUFFIX}/program/${programId}/mapping/${mapping}${keySuffix}`);
  urls.push(`https://api.explorer.provable.com/v1/${NETWORK_SUFFIX}/program/${programId}/mapping/${mapping}/key${keySuffix}`);
  urls.push(`https://api.explorer.provable.com/v1/${NETWORK_SUFFIX}/program/${programId}/mappings/${mapping}${keySuffix}`);
  urls.push(`https://api.explorer.provable.com/v1/${NETWORK_SUFFIX}/program/${programId}/mappings/${mapping}/key${keySuffix}`);

  if (!IS_MAINNET) {
    const base = CURRENT_RPC_URL.replace(/\/$/, '');
    urls.push(`${base}/testnet/program/${programId}/mapping/${mapping}${keySuffix}`);
    urls.push(`${base}/testnet/program/${programId}/mapping/${mapping}/key${keySuffix}`);
    urls.push(`${base}/testnet/program/${programId}/mappings/${mapping}${keySuffix}`);
    urls.push(`${base}/testnet/program/${programId}/mappings/${mapping}/key${keySuffix}`);
  }

  // Aleo explorer patterns
  urls.push(`https://api.explorer.aleo.org/v1/${NETWORK_SUFFIX}/program/${programId}/mapping/${mapping}${keySuffix}`);
  urls.push(`https://api.explorer.aleo.org/v1/${NETWORK_SUFFIX}/program/${programId}/mapping/${mapping}/key${keySuffix}`);
  urls.push(`https://api.explorer.aleo.org/v1/${NETWORK_SUFFIX}/program/${programId}/mappings/${mapping}${keySuffix}`);
  urls.push(`https://api.explorer.aleo.org/v1/${NETWORK_SUFFIX}/program/${programId}/mappings/${mapping}/key${keySuffix}`);
  
  return urls;
};

function parseLiquidityPosition(raw: string): LiquidityPosition | null {
  // Expect something like:
  // { user_address: aleo1..., pool_id: 1field, lp_tokens: 1000000u128, timestamp: 1234567890u64 }
  // Note: The struct only contains user_address, pool_id, lp_tokens, and timestamp
  // token1Amount and token2Amount are calculated separately based on the pool reserves and user's share
  
  // Try parsing as JSON first (if the API returns JSON)
  try {
    const json = JSON.parse(raw);
    if (json.user_address && json.pool_id && typeof json.lp_tokens === 'string') {
      return {
        user: json.user_address,
        poolId: json.pool_id,
        lpTokens: json.lp_tokens.replace(/u\d+$/, ''), // Remove type suffix
        token1Amount: '0', // Will be calculated in the frontend
        token2Amount: '0', // Will be calculated in the frontend
      };
    }
  } catch {
    // Not JSON, try parsing as Leo struct string
  }
  
  // Parse Leo struct format
  const userMatch = raw.match(/user_address:\s*([^,\s}]+)/);
  const poolIdMatch = raw.match(/pool_id:\s*([^,\s}]+)/);
  const lpTokensMatch = raw.match(/lp_tokens:\s*(\d+)u128/);
  
  if (!userMatch || !poolIdMatch || !lpTokensMatch) {
    // Try alternative field names
    const userMatchAlt = raw.match(/user:\s*([^,\s}]+)/);
    if (userMatchAlt && poolIdMatch && lpTokensMatch) {
      return {
        user: userMatchAlt[1],
        poolId: poolIdMatch[1],
        lpTokens: lpTokensMatch[1],
        token1Amount: '0', // Will be calculated in the frontend
        token2Amount: '0', // Will be calculated in the frontend
      };
    }
    return null;
  }
  
  return {
    user: userMatch[1],
    poolId: poolIdMatch[1],
    lpTokens: lpTokensMatch[1],
    token1Amount: '0', // Will be calculated in the frontend
    token2Amount: '0', // Will be calculated in the frontend
  };
}

async function fetchMappingValue(programId: string, mapping: string, key?: string): Promise<string | null> {
  const urls = candidateUrls(programId, mapping, key);
  
  for (const url of urls) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) {
        continue;
      }
      
      const text = await response.text();
      
      // Try to parse as JSON first
      try {
        const json = JSON.parse(text);
        const value = json.value || json.mapping_value || json.data || text;
        return value;
      } catch {
        // Not JSON, return raw text
        return text;
      }
    } catch {
      continue;
    }
  }
  
  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LiquidityPositionResponse>
) {
  try {
    const programId = PROGRAM_ID;
    const { address, poolId } = req.query;
    
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ 
        ok: false, 
        error: 'User address is required' 
      });
    }
    
    if (!poolId || typeof poolId !== 'string') {
      return res.status(400).json({ 
        ok: false, 
        error: 'Pool ID is required' 
      });
    }
    
    // Calculate position key using the same logic as the Aleo program
    // In the Leo program, it uses: let position_key: field = (caller_address as field) + pool_id;
    // But to query the mapping, we need to use the same calculation
    // The mapping key is calculated as: (address as field) + pool_id
    // Since field addition in Leo is not simple string concat, we need to hash it properly
    // However, looking at the actual code, it seems to use simple field addition
    // Let's try using BHP256 hash of a struct like the inline function suggests, or try the simple addition
    
    // Try multiple approaches to find the correct position key
    let raw: string | null = null;
    let lastError: Error | null = null;
    
    // Approach 1: Try BHP256 hash (matching get_position_key inline function)
    try {
      // Construct full URL for internal API call
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers.host || 'localhost:3000';
      const positionKeyUrl = `${protocol}://${host}/api/position-key?address=${encodeURIComponent(address)}&poolId=${encodeURIComponent(poolId)}`;
      
      const positionKeyResponse = await fetch(positionKeyUrl);
      if (positionKeyResponse.ok) {
        const positionKeyData = await positionKeyResponse.json();
        if (positionKeyData.positionKey) {
          console.log('[API] Position key (BHP256 hash):', positionKeyData.positionKey);
          raw = await fetchMappingValue(programId, 'liquidity_positions', positionKeyData.positionKey);
        }
      }
    } catch (error: any) {
      console.warn('[API] BHP256 hash approach failed:', error);
      lastError = error;
    }
    
    // Approach 2: Try simple concatenation (if BHP256 didn't work)
    if (!raw) {
      const simpleKey = `${address}${poolId}`;
      console.log('[API] Trying simple position key:', simpleKey);
      raw = await fetchMappingValue(programId, 'liquidity_positions', simpleKey);
    }
    
    // Approach 3: Try with underscore separator (if simple didn't work)
    if (!raw) {
      const underscoreKey = `${address}_${poolId}`;
      console.log('[API] Trying underscore position key:', underscoreKey);
      raw = await fetchMappingValue(programId, 'liquidity_positions', underscoreKey);
    }
    
    if (!raw) {
      return res.status(404).json({ 
        ok: false, 
        error: `No liquidity position found for user ${address} in pool ${poolId}. Tried multiple key formats.` 
      });
    }
    
    const position = parseLiquidityPosition(raw);
    if (!position) {
      return res.status(500).json({ 
        ok: false, 
        error: 'Could not parse liquidity position data' 
      });
    }
    
    return res.status(200).json({ 
      ok: true, 
      position
    });
    
  } catch (error: any) {
    return res.status(500).json({ 
      ok: false, 
      error: error?.message || 'Unknown server error' 
    });
  }
}