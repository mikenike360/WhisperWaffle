import { NextApiRequest, NextApiResponse } from 'next';

const EXPLORER_BASE = 'https://api.explorer.aleo.org/v1/testnet';
const TOKEN_REGISTRY_PROGRAM = 'token_registry.aleo';

type Data = 
  | { approved: boolean; allowance: any; message: string; allowanceKey?: string }
  | { error: string; hint?: string; allowanceKey?: string };

// Use the same BHP256 hash function as the balance API
async function bhp256Hash(tokenId: string, account: string, spender: string): Promise<string> {
  try {
    console.log('[API] Using @doko-js/wasm BHP256 for allowance key');
    
    // Import the WASM module using require
    const { Hasher } = require('@doko-js/wasm');
    
    // Try the same order as balances: {account, token_id, spender}
    // This matches the pattern from your balance API
    const leoStruct = `{account: ${account}, token_id: ${tokenId}, spender: ${spender}}`;
    console.log('[API] Leo struct input for allowance:', leoStruct);
    
    const hash = Hasher.hash('bhp256', leoStruct, 'field', 'testnet');
    console.log('[API] BHP256 hash result for allowance:', hash);
    return hash;
  } catch (error) {
    console.error('[API] Error using BHP256 hash for allowance:', error);
    throw new Error(`Failed to compute BHP256 hash for allowance: ${error}`);
  }
}

async function fetchAllowanceByKey(allowanceKey: string) {
  const keyPath = encodeURIComponent(allowanceKey);
  const url = `${EXPLORER_BASE}/program/${TOKEN_REGISTRY_PROGRAM}/mapping/allowances/${keyPath}`;
  console.log('[API] Fetching allowance from URL:', url);
  
  const r = await fetch(url);
  if (!r.ok) return null;
  
  const data = await r.json();
  console.log('[API] Allowance response data:', data);
  
  // If we get data back, it means an allowance exists (approved)
  // If we get 404 or no data, it means no allowance (not approved)
  return data;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tokenId, account, spender } = req.query;

  if (!tokenId || !account || !spender) {
    return res.status(400).json({ 
      error: 'Missing required query params: tokenId, account, spender' 
    });
  }

  try {
    console.log('[API] Computing allowance key for:', { tokenId, account, spender });
    console.log('[API] Token ID type:', typeof tokenId, 'Value:', tokenId);
    console.log('[API] Account type:', typeof account, 'Value:', account);
    console.log('[API] Spender type:', typeof spender, 'Value:', spender);
    
    // Compute the allowance key using BHP256 hash
    const allowanceKey = await bhp256Hash(tokenId as string, account as string, spender as string);
    console.log('[API] Computed allowance key:', allowanceKey);
    console.log('[API] Allowance key type:', typeof allowanceKey, 'Length:', allowanceKey?.length);
    
    // Query the allowances mapping
    const allowance = await fetchAllowanceByKey(allowanceKey);
    
    if (allowance) {
      // If we get data back, the token is approved
      return res.status(200).json({ 
        approved: true, 
        allowance: allowance,
        message: 'Token is approved for spending',
        allowanceKey
      });
    } else {
      // If no data, the token is not approved
      return res.status(200).json({ 
        approved: false, 
        allowance: null,
        message: 'No allowance found - token not approved',
        allowanceKey
      });
    }
    
  } catch (error) {
    console.error('[API] Error checking allowance:', error);
    return res.status(500).json({ 
      error: `Failed to check allowance: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}
