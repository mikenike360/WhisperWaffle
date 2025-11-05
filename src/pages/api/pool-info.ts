import type { NextApiRequest, NextApiResponse } from 'next';
import { CURRENT_NETWORK, CURRENT_RPC_URL, PROGRAM_ID } from '@/types';

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

interface PoolInfoResponse {
  ok: boolean;
  pool?: PoolInfo;
  error?: string;
}

// Try multiple likely explorer endpoints to fetch AMM DEX mappings
const candidateUrls = (programId: string, mapping: string, key?: string) => {
  const urls: string[] = [];
  const keySuffix = key ? `/${key}` : '';
  
  // Determine network suffix based on CURRENT_NETWORK
  // CURRENT_NETWORK is a WalletAdapterNetwork enum, check by converting to string (case-insensitive)
  const networkStr = CURRENT_NETWORK.toString().toLowerCase();
  const isMainnet = networkStr.includes('mainnet');
  const networkSuffix = isMainnet ? 'mainnet' : 'testnetbeta';
  
  // Provable patterns (using explorer.provable.com for mainnet)
  if (isMainnet) {
    // Provable mainnet API patterns
    urls.push(`https://api.explorer.provable.com/v1/mainnet/program/${programId}/mapping/${mapping}${keySuffix}`);
    urls.push(`https://api.explorer.provable.com/v1/mainnet/program/${programId}/mapping/${mapping}/key${keySuffix}`);
    urls.push(`https://api.explorer.provable.com/v1/mainnet/program/${programId}/mappings/${mapping}${keySuffix}`);
    urls.push(`https://api.explorer.provable.com/v1/mainnet/program/${programId}/mappings/${mapping}/key${keySuffix}`);
  } else {
    // Provable testnet patterns
    urls.push(`${CURRENT_RPC_URL.replace(/\/$/, '')}/testnet/program/${programId}/mapping/${mapping}${keySuffix}`);
    urls.push(`${CURRENT_RPC_URL.replace(/\/$/, '')}/testnet/program/${programId}/mapping/${mapping}/key${keySuffix}`);
    urls.push(`${CURRENT_RPC_URL.replace(/\/$/, '')}/testnet/program/${programId}/mappings/${mapping}${keySuffix}`);
    urls.push(`${CURRENT_RPC_URL.replace(/\/$/, '')}/testnet/program/${programId}/mappings/${mapping}/key${keySuffix}`);
  }
  
  // Aleo explorer patterns
  urls.push(`https://api.explorer.aleo.org/v1/${networkSuffix}/program/${programId}/mapping/${mapping}${keySuffix}`);
  urls.push(`https://api.explorer.aleo.org/v1/${networkSuffix}/program/${programId}/mapping/${mapping}/key${keySuffix}`);
  urls.push(`https://api.explorer.aleo.org/v1/${networkSuffix}/program/${programId}/mappings/${mapping}${keySuffix}`);
  urls.push(`https://api.explorer.aleo.org/v1/${networkSuffix}/program/${programId}/mappings/${mapping}/key${keySuffix}`);
  
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
  res: NextApiResponse<PoolInfoResponse>
) {
  try {
    const programId = PROGRAM_ID;
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ 
        ok: false, 
        error: 'Pool ID is required' 
      });
    }
    
    // Fetch specific pool
    const raw = await fetchMappingValue(programId, 'pools', id);
    
    if (!raw) {
      return res.status(404).json({ 
        ok: false, 
        error: `Pool ${id} not found` 
      });
    }
    
    const poolInfo = parsePoolInfo(raw);
    if (!poolInfo) {
      return res.status(500).json({ 
        ok: false, 
        error: 'Could not parse pool data' 
      });
    }
    
    return res.status(200).json({ 
      ok: true, 
      pool: poolInfo
    });
  } catch (error: any) {
    return res.status(500).json({ 
      ok: false, 
      error: error?.message || 'Unknown server error' 
    });
  }
}
