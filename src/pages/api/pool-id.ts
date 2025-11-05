import type { NextApiRequest, NextApiResponse } from 'next';
import { CURRENT_NETWORK } from '@/types';

interface PoolIdResponse {
  ok: boolean;
  poolId?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PoolIdResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { token1Id, token2Id } = req.query;

  if (!token1Id || !token2Id || typeof token1Id !== 'string' || typeof token2Id !== 'string') {
    return res.status(400).json({ 
      ok: false, 
      error: 'Missing required query params: token1Id, token2Id' 
    });
  }

  try {
    // Ensure consistent ordering (smaller token ID first) - matches Leo program
    const orderedToken1 = token1Id < token2Id ? token1Id : token2Id;
    const orderedToken2 = token1Id < token2Id ? token2Id : token1Id;
    
    // Use BHP256 hash to match the Leo program's get_pool_id function
    // The Leo program uses: BHP256::hash_to_field(PoolKey { token1: ordered_token1, token2: ordered_token2 })
    const { Hasher } = require('@doko-js/wasm');
    
    // Determine network for hash calculation
    // CURRENT_NETWORK is a WalletAdapterNetwork enum, check by converting to string (case-insensitive)
    const networkStr = CURRENT_NETWORK.toString().toLowerCase();
    const network = networkStr.includes('mainnet') ? 'mainnet' : 'testnet';
    
    // Format as Leo struct: {token1: field, token2: field}
    const leoStruct = `{token1: ${orderedToken1}, token2: ${orderedToken2}}`;
    
    const poolId = Hasher.hash('bhp256', leoStruct, 'field', network);
    
    return res.status(200).json({ 
      ok: true, 
      poolId 
    });
  } catch (error: any) {
    console.error('Error computing pool ID:', error);
    return res.status(500).json({ 
      ok: false, 
      error: `Failed to compute pool ID: ${error?.message || 'Unknown error'}` 
    });
  }
}
