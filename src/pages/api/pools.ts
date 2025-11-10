import type { NextApiRequest, NextApiResponse } from 'next';
import { CURRENT_RPC_URL, PROGRAM_ID, IS_MAINNET, NETWORK_SUFFIX } from '@/types';

interface PoolInfo {
  id: string;
  token1Id: string;
  token2Id: string;
  reserve1: string;
  reserve2: string;
  lpTotalSupply: string;
  swapFee: number;
  protocolFee: number;
  poolType: number;
}

interface PoolsResponse {
  ok: boolean;
  pools?: PoolInfo[];
  poolCount?: number;
  error?: string;
}

// Try multiple likely explorer endpoints to fetch AMM DEX mappings
const candidateUrls = (programId: string, mapping: string, key?: string) => {
  const urls: string[] = [];
  const keySuffix = key ? `/${key}` : '';
  
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

function parsePoolInfo(raw: string): PoolInfo | null {
  // Expect something like:
  // { id: 1field, token1_id: 0field, token2_id: 987...field, reserve1: 20000000u128, reserve2: 5000000u128, lp_total_supply: 1000000u128, swap_fee: 30u16, protocol_fee: 5u16, pool_type: 0u8 }
  const idMatch = raw.match(/id:\s*([^,\s]+)/);
  const token1Match = raw.match(/token1_id:\s*([^,\s]+)/);
  const token2Match = raw.match(/token2_id:\s*([^,\s]+)/);
  const reserve1Match = raw.match(/reserve1:\s*(\d+)u128/);
  const reserve2Match = raw.match(/reserve2:\s*(\d+)u128/);
  const lpSupplyMatch = raw.match(/lp_total_supply:\s*(\d+)u128/);
  const swapFeeMatch = raw.match(/swap_fee:\s*(\d+)u16/);
  const protocolFeeMatch = raw.match(/protocol_fee:\s*(\d+)u16/);
  const poolTypeMatch = raw.match(/pool_type:\s*(\d+)u8/);
  
  if (!idMatch || !token1Match || !token2Match || !reserve1Match || !reserve2Match) {
    return null;
  }
  
  return {
    id: idMatch[1],
    token1Id: token1Match[1],
    token2Id: token2Match[1],
    reserve1: reserve1Match[1],
    reserve2: reserve2Match[1],
    lpTotalSupply: lpSupplyMatch?.[1] || '0',
    swapFee: swapFeeMatch ? parseInt(swapFeeMatch[1]) : 30,
    protocolFee: protocolFeeMatch ? parseInt(protocolFeeMatch[1]) : 5,
    poolType: poolTypeMatch ? parseInt(poolTypeMatch[1]) : 0,
  };
}

function parsePoolCount(raw: string): number {
  // Expect something like: "5u32" (as JSON string, so might have quotes)
  // Handle both quoted and unquoted strings
  let cleaned = raw.trim();
  // Remove surrounding quotes if present
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  const match = cleaned.match(/^(\d+)u32$/);
  const count = match ? parseInt(match[1], 10) : 0;
  console.log(`[parsePoolCount] Raw: "${raw}", Cleaned: "${cleaned}", Count: ${count}`);
  return count;
}

async function fetchMappingValue(programId: string, mapping: string, key?: string): Promise<string | null> {
  const urls = candidateUrls(programId, mapping, key);
  
  for (const url of urls) {
    try {
      console.log(`[fetchMappingValue] Trying URL: ${url}`);
      const response = await fetch(url, { method: 'GET' });
      
      if (!response.ok) {
        console.log(`[fetchMappingValue] URL failed with status ${response.status}: ${url}`);
        continue;
      }
      
      const text = await response.text();
      console.log(`[fetchMappingValue] Success! Got response from: ${url}`, text.substring(0, 200));
      
      // Try to parse as JSON first
      try {
        const json = JSON.parse(text);
        // If it's already a string (like "1u32"), return it directly
        if (typeof json === 'string') {
          return json;
        }
        // Otherwise try to extract value from object
        const value = json.value || json.mapping_value || json.data || text;
        return typeof value === 'string' ? value : JSON.stringify(value);
      } catch {
        // Not JSON, return raw text
        return text;
      }
    } catch (error: any) {
      console.log(`[fetchMappingValue] Error fetching ${url}:`, error?.message);
      continue;
    }
  }
  
  console.log(`[fetchMappingValue] All URLs failed for mapping "${mapping}" with key "${key}"`);
  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PoolsResponse>
) {
  try {
    const programId = PROGRAM_ID;
    console.log('[API /pools] Fetching pools for program:', programId);
    
    // Fetch pool count
    // pool_count mapping is bool => u32, where the key is true
    // Try multiple formats: 'true', 'true.bool', '1', '1.bool'
    let poolCountRaw = await fetchMappingValue(programId, 'pool_count', 'true');
    console.log('[API /pools] pool_count with "true":', poolCountRaw);
    
    if (!poolCountRaw) {
      poolCountRaw = await fetchMappingValue(programId, 'pool_count', 'true.bool');
      console.log('[API /pools] pool_count with "true.bool":', poolCountRaw);
    }
    
    if (!poolCountRaw) {
      poolCountRaw = await fetchMappingValue(programId, 'pool_count', '1');
      console.log('[API /pools] pool_count with "1":', poolCountRaw);
    }
    
    if (!poolCountRaw) {
      poolCountRaw = await fetchMappingValue(programId, 'pool_count', '1.bool');
      console.log('[API /pools] pool_count with "1.bool":', poolCountRaw);
    }
    
    const poolCount = poolCountRaw ? parsePoolCount(poolCountRaw) : 0;
    console.log('[API /pools] Parsed pool count:', poolCount);
    
    const pools: PoolInfo[] = [];
    
    // Fetch pool list and individual pool data
    // pool_list mapping is u32 => field, so we need to format keys
    // Try multiple formats: "0u32", "0", "0.public", etc.
    for (let i = 0; i < poolCount; i++) {
      console.log(`[API /pools] Fetching pool at index ${i}`);
      
      // Try different key formats - the Provable API uses "0u32" format
      let poolIdRaw = await fetchMappingValue(programId, 'pool_list', `${i}u32`);
      if (!poolIdRaw) {
        // Also try without u32 suffix
        poolIdRaw = await fetchMappingValue(programId, 'pool_list', `${i}`);
        console.log(`[API /pools] pool_list[${i}] with "${i}":`, poolIdRaw);
      }
      // Note: Provable API uses "0u32" format, so that should work
      
      console.log(`[API /pools] pool_list[${i}] raw value:`, poolIdRaw);
      
      if (poolIdRaw) {
        // Parse pool ID from raw value - could be just the field value or wrapped in a struct
        let poolId: string | null = null;
        
        // Try to extract field value - could be just "123field" or wrapped
        const fieldMatch = poolIdRaw.match(/(\d+field)/);
        if (fieldMatch) {
          poolId = fieldMatch[1];
          console.log(`[API /pools] Extracted pool ID (field match): ${poolId}`);
        } else {
          // Try to match any field-like value
          const anyFieldMatch = poolIdRaw.match(/^([^\s,}]+)$/);
          if (anyFieldMatch) {
            poolId = anyFieldMatch[1];
            console.log(`[API /pools] Extracted pool ID (any match): ${poolId}`);
          }
        }
        
        if (poolId) {
          console.log(`[API /pools] Fetching pool data for pool ID: ${poolId}`);
          const poolRaw = await fetchMappingValue(programId, 'pools', poolId);
          console.log(`[API /pools] Pool raw data:`, poolRaw);
          
          if (poolRaw) {
            // The pools mapping returns a JSON string, so we need to parse it
            // It might be double-encoded: first as JSON string with escaped newlines, then as JSON
            let poolDataString = poolRaw;
            try {
              // Try parsing as JSON first (it might be a JSON-encoded string)
              const parsed = JSON.parse(poolRaw);
              if (typeof parsed === 'string') {
                poolDataString = parsed;
              } else {
                poolDataString = poolRaw;
              }
            } catch {
              // Not JSON, use as-is
              poolDataString = poolRaw;
            }
            
            console.log(`[API /pools] Pool data string (after JSON parse):`, poolDataString);
            const poolInfo = parsePoolInfo(poolDataString);
            console.log(`[API /pools] Parsed pool info:`, poolInfo);
            if (poolInfo) {
              pools.push(poolInfo);
            } else {
              console.log(`[API /pools] Failed to parse pool info for pool ID: ${poolId}`);
            }
          } else {
            console.log(`[API /pools] No pool data found for pool ID: ${poolId}`);
          }
        } else {
          console.log(`[API /pools] Failed to extract pool ID from raw value: ${poolIdRaw}`);
        }
      } else {
        console.log(`[API /pools] No pool_list value found at index ${i}`);
      }
    }
    
    console.log('[API /pools] Returning pools:', { pools, poolCount });
    
    return res.status(200).json({ 
      ok: true, 
      pools,
      poolCount
    });
  } catch (error: any) {
    console.error('[API /pools] Error:', error);
    return res.status(500).json({ 
      ok: false, 
      error: error?.message || 'Unknown server error' 
    });
  }
}
