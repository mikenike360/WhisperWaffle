import type { NextApiRequest, NextApiResponse } from 'next';
import { IS_MAINNET } from '@/types';

interface PositionKeyResponse {
  positionKey?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PositionKeyResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, poolId } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Address is required' });
  }

  if (!poolId || typeof poolId !== 'string') {
    return res.status(400).json({ error: 'Pool ID is required' });
  }

  try {
    // Use require() instead of import - this works better in server-side Next.js API routes
    // Importing WASM modules at top level causes ERR_UNKNOWN_FILE_EXTENSION errors
    const { Hasher } = require('@doko-js/wasm');
    
    // Determine network
    const network = IS_MAINNET ? 'mainnet' : 'testnet';

    // Create PositionKey struct as a Leo struct string (matching the inline function in Leo)
    // Format: {user: address, pool_id: poolId}
    const leoStruct = `{user: ${address}, pool_id: ${poolId}}`;
    console.log('[API] Position key Leo struct input:', leoStruct);

    // Calculate BHP256 hash
    // Hasher.hash() signature: hash(algorithm, input, outputType, network)
    const positionKeyHash = Hasher.hash('bhp256', leoStruct, 'field', network);
    console.log('[API] Position key BHP256 hash result:', positionKeyHash);

    return res.status(200).json({ positionKey: positionKeyHash });
  } catch (error: any) {
    console.error('[API] Error calculating position key:', error);
    return res.status(500).json({ 
      error: `Failed to calculate position key: ${error?.message || 'Unknown error'}` 
    });
  }
}
