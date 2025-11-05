import type { NextApiRequest, NextApiResponse } from 'next';
import { PROGRAM_ID, CURRENT_NETWORK } from '@/types';

interface TestPoolResponse {
  ok: boolean;
  poolId?: string;
  poolData?: any;
  error?: string;
  debug?: any;
}

// Copy the candidateUrls function from pool.ts
const candidateUrls = (programId: string, mapping: string, key?: string) => {
  const urls: string[] = [];
  const keySuffix = key ? `/${key}` : '';
  
  // CURRENT_NETWORK is a WalletAdapterNetwork enum, check by converting to string (case-insensitive)
  const networkStr = CURRENT_NETWORK.toString().toLowerCase();
  const isMainnet = networkStr.includes('mainnet');
  const networkSuffix = isMainnet ? 'mainnet' : 'testnetbeta';
  
  console.log(`[test-pool candidateUrls] CURRENT_NETWORK: ${CURRENT_NETWORK} (${typeof CURRENT_NETWORK}), networkStr: ${networkStr}, isMainnet: ${isMainnet}, networkSuffix: ${networkSuffix}`);
  
  if (isMainnet) {
    urls.push(`https://api.explorer.provable.com/v1/mainnet/program/${programId}/mapping/${mapping}${keySuffix}`);
    urls.push(`https://api.explorer.provable.com/v1/mainnet/program/${programId}/mapping/${mapping}/key${keySuffix}`);
    urls.push(`https://api.explorer.provable.com/v1/mainnet/program/${programId}/mappings/${mapping}${keySuffix}`);
    urls.push(`https://api.explorer.provable.com/v1/mainnet/program/${programId}/mappings/${mapping}/key${keySuffix}`);
  }
  
  urls.push(`https://api.explorer.aleo.org/v1/${networkSuffix}/program/${programId}/mapping/${mapping}${keySuffix}`);
  urls.push(`https://api.explorer.aleo.org/v1/${networkSuffix}/program/${programId}/mapping/${mapping}/key${keySuffix}`);
  urls.push(`https://api.explorer.aleo.org/v1/${networkSuffix}/program/${programId}/mappings/${mapping}${keySuffix}`);
  urls.push(`https://api.explorer.aleo.org/v1/${networkSuffix}/program/${programId}/mappings/${mapping}/key${keySuffix}`);
  
  return urls;
};

async function fetchMappingValue(programId: string, mapping: string, key?: string): Promise<string | null> {
  const urls = candidateUrls(programId, mapping, key);
  
  for (const url of urls) {
    try {
      console.log(`[test-pool] Trying URL: ${url}`);
      const response = await fetch(url, { method: 'GET' });
      
      if (!response.ok) {
        console.log(`[test-pool] URL failed with status ${response.status}: ${url}`);
        continue;
      }
      
      const text = await response.text();
      console.log(`[test-pool] Success! Got response from: ${url}`, text.substring(0, 500));
      return text;
    } catch (error: any) {
      console.log(`[test-pool] Error fetching ${url}:`, error?.message);
      continue;
    }
  }
  
  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestPoolResponse>
) {
  const { token1Id, token2Id, poolId } = req.query;
  
  try {
    const programId = PROGRAM_ID;
    const debug: any = {};
    
    // If poolId is provided, query it directly
    if (poolId && typeof poolId === 'string') {
      debug.directPoolQuery = poolId;
      const poolRaw = await fetchMappingValue(programId, 'pools', poolId);
      debug.poolRaw = poolRaw;
      
      return res.status(200).json({
        ok: true,
        poolId: poolId,
        poolData: poolRaw,
        debug
      });
    }
    
    // If token IDs are provided, calculate pool ID and query
    if (token1Id && token2Id && typeof token1Id === 'string' && typeof token2Id === 'string') {
      debug.token1Id = token1Id;
      debug.token2Id = token2Id;
      
      // Calculate pool ID directly using the same logic as pool-id.ts
      try {
        const { Hasher } = require('@doko-js/wasm');
        
        const orderedToken1 = token1Id < token2Id ? token1Id : token2Id;
        const orderedToken2 = token1Id < token2Id ? token2Id : token1Id;
        const networkStr = CURRENT_NETWORK.toString().toLowerCase();
        const network = networkStr.includes('mainnet') ? 'mainnet' : 'testnet';
        const leoStruct = `{token1: ${orderedToken1}, token2: ${orderedToken2}}`;
        const calculatedPoolId = Hasher.hash('bhp256', leoStruct, 'field', network);
        
        debug.calculatedPoolId = calculatedPoolId;
        debug.orderedToken1 = orderedToken1;
        debug.orderedToken2 = orderedToken2;
        debug.network = network;
        
        if (calculatedPoolId) {
          const poolRaw = await fetchMappingValue(programId, 'pools', calculatedPoolId);
          debug.poolRaw = poolRaw;
          
          return res.status(200).json({
            ok: true,
            poolId: calculatedPoolId,
            poolData: poolRaw,
            debug
          });
        }
      } catch (hashError: any) {
        debug.hashError = hashError?.message || String(hashError);
      }
    }
    
    // Test pool_count and pool_list
    debug.testingPoolCount = true;
    const poolCountRaw = await fetchMappingValue(programId, 'pool_count', 'true');
    debug.poolCountRaw = poolCountRaw;
    
    debug.testingPoolList = true;
    const poolList0 = await fetchMappingValue(programId, 'pool_list', '0u32');
    debug.poolList0 = poolList0;
    
    const poolList0Alt = await fetchMappingValue(programId, 'pool_list', '0');
    debug.poolList0Alt = poolList0Alt;
    
    return res.status(200).json({
      ok: true,
      debug
    });
    
  } catch (error: any) {
    console.error('[test-pool] Error:', error);
    return res.status(500).json({
      ok: false,
      error: error?.message || 'Unknown error',
      debug: { error: String(error) }
    });
  }
}
