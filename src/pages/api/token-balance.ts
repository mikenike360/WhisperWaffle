import type { NextApiRequest, NextApiResponse } from 'next';
import { client, programRpcClient } from '@/components/aleo/rpc';
import { NETWORK_SUFFIX } from '@/types';

// Authorized balance lookup by attempting composite key (address.public, token_id)
// Uses authorized_balances mapping to show spendable tokens (not locked ones)

const EXPLORER_BASE = `https://api.explorer.aleo.org/v1/${NETWORK_SUFFIX}`;
const TOKEN_REGISTRY_PROGRAM = 'token_registry.aleo';

type Data =
  | { balance: string; raw: any; compositeKey?: string }
  | { error: string; hint?: string; compositeKey?: string };

// Simple in-memory cache: (address|tokenId) -> balancesKey
const keyCache = new Map<string, string>();

async function fetchAuthorizedBalanceByKey(balanceKey: string, tokenDecimals: number) {
  const keyPath = encodeURIComponent(balanceKey);
  const url = `${EXPLORER_BASE}/program/${TOKEN_REGISTRY_PROGRAM}/mapping/authorized_balances/${keyPath}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const data = await r.json();
  let balanceRaw: string | undefined;
  if (data && typeof data === 'object') {
    const v = (data as any).value && typeof (data as any).value === 'object' ? (data as any).value : data;
    if (typeof v.balance === 'string') balanceRaw = v.balance;
  }
  if (!balanceRaw && typeof data === 'string') {
    const m = (data as string).match(/balance:\s*(\d+)u\d+/i);
    if (m) balanceRaw = m[1];
  }
  if (!balanceRaw) return null;
  const amount = parseInt(balanceRaw, 10);
  const display = (amount / Math.pow(10, tokenDecimals)).toFixed(2);
  return { balance: display, raw: data } as { balance: string; raw: any };
}

function extractAccountFromRaw(raw: any): string | null {
  try {
    if (!raw) return null;
    let obj: any = null;
    if (typeof raw === 'string') {
      const m = raw.match(/account:\s*(aleo1[0-9a-z]+)\b/i);
      return m ? m[1] : null;
    }
    if (typeof raw === 'object') {
      obj = (raw as any).value && typeof (raw as any).value === 'object' ? (raw as any).value : raw;
      if (obj && typeof obj.account === 'string') return obj.account;
    }
    return null;
  } catch {
    return null;
  }
}

async function requestProgramTxIds(programId: string, functionName: string, page: number, max: number): Promise<string[]> {
  try {
    const r1: any = await programRpcClient.request('aleoTransactionsForProgram', {
      program_id: programId,
      function_name: functionName,
      page,
      max_transactions: max,
    });
    const list1Raw = Array.isArray(r1) ? r1 : r1?.transactions || [];
    const list1 = list1Raw
      .map((t: any) => (typeof t === 'string' ? t : t?.transaction?.id || t?.id))
      .filter(Boolean);
    if (list1 && list1.length) return list1 as string[];
  } catch {}
  try {
    const r2: any = await programRpcClient.request('aleoTransactionsForProgram', {
      programId: programId,
      functionName: functionName,
      page,
      maxTransactions: max,
    });
    const list2Raw = Array.isArray(r2) ? r2 : r2?.transactions || [];
    const list2 = list2Raw
      .map((t: any) => (typeof t === 'string' ? t : t?.transaction?.id || t?.id))
      .filter(Boolean);
    if (list2 && list2.length) return list2 as string[];
  } catch {}
  return [];
}

async function discoverBalanceKey(address: string, tokenId: string, pages: number, max: number): Promise<string | null> {
  try {
    console.log(`[API] Scanning ${pages} pages for ${tokenId} transactions...`);
    
    // Scan recent mint_public, transfer_public, and transfer_from_public transactions
    const functions = ['mint_public', 'transfer_public', 'transfer_from_public'];
    
    for (const func of functions) {
      for (let page = 1; page <= pages; page++) {
        try {
          const txIds = await requestProgramTxIds(TOKEN_REGISTRY_PROGRAM, func, page, max);
          console.log(`[API] Found ${txIds.length} ${func} transactions on page ${page}`);
          
          for (const txId of txIds) {
            try {
              // Get transaction details
              const txUrl = `${EXPLORER_BASE}/transaction/${txId}`;
              const txResponse = await fetch(txUrl);
              if (!txResponse.ok) continue;
              
              const txData = await txResponse.json();
              console.log(`[API] Transaction ${txId} data:`, txData);
              
              // Look for balance keys in the transaction output
              if (txData && txData.execution && txData.execution.transitions) {
                for (const transition of txData.execution.transitions) {
                  if (transition.program_id === TOKEN_REGISTRY_PROGRAM && 
                      transition.function_name === func) {
                    
                    // Check if this transition involves our token and address
                    const args = transition.arguments || [];
                    if (args.length >= 3) {
                      const txTokenId = args[0];
                      const txAddress = args[1];
                      
                      if (txTokenId === tokenId && txAddress === address) {
                        // Found a relevant transaction, look for balance keys
                        if (transition.outputs && transition.outputs.length > 0) {
                          for (const output of transition.outputs) {
                            if (output.type === 'public' && output.value && output.value.includes('field')) {
                              // This might be a balance key
                              console.log(`[API] Potential balance key found: ${output.value}`);
                              return output.value;
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            } catch (txError) {
              console.warn(`[API] Error processing transaction ${txId}:`, txError);
              continue;
            }
          }
        } catch (pageError) {
          console.warn(`[API] Error on page ${page}:`, pageError);
          continue;
        }
      }
    }
    
    console.log(`[API] No balance key found after scanning ${pages} pages`);
    return null;
  } catch (error) {
    console.error('[API] Error in discoverBalanceKey:', error);
    return null;
  }
}

// Use the proper BHP256 implementation from @doko-js/wasm
async function bhp256Hash(address: string, tokenId: string): Promise<string> {
  try {
    console.log('[API] Using @doko-js/wasm BHP256 for address and tokenId');
    
    // Import the WASM module using require
    const { Hasher } = require('@doko-js/wasm');
    
    // The WASM binary needs to be accessible - it should be in .next/server/vendor-chunks/
    // We'll use a relative path from the build output
    const wasmPath = require('path').join(process.cwd(), '.next/server/vendor-chunks/wasm_bg.wasm');
    console.log('[API] WASM binary path:', wasmPath);
    
    // The correct input format is a Leo struct: {account: address, token_id: tokenId}
    // This matches the documentation examples and produces the correct hash
    const leoStruct = `{account: ${address}, token_id: ${tokenId}}`;
    console.log('[API] Leo struct input:', leoStruct);
    
    const hash = Hasher.hash('bhp256', leoStruct, 'field', NETWORK_SUFFIX);
    console.log('[API] BHP256 hash result:', hash);
    return hash;
  } catch (error) {
    console.error('[API] Error using BHP256 hash:', error);
    throw new Error(`Failed to compute BHP256 hash: ${error}`);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { address, tokenId, balanceKey, decimals } = req.query as {
    address?: string;
    tokenId?: string;
    balanceKey?: string;
    decimals?: string;
  };

  const tokenDecimals = Number.isFinite(Number(decimals)) ? Number(decimals) : 6;

  // Fast path: direct lookup by balances mapping key
  if (balanceKey) {
    try {
      const result = await fetchAuthorizedBalanceByKey(balanceKey, tokenDecimals);
      if (result) return res.status(200).json(result);
      return res.status(404).json({ error: 'Balance key not found or has no value' });
    } catch (err: any) {
      console.error('[API] Error in balanceKey lookup:', err);
      return res.status(500).json({ error: `Unexpected error: ${err?.message || String(err)}` });
    }
  }

  if (!address || !tokenId) {
    return res.status(400).json({ error: 'Missing required query params: address, tokenId (or provide balanceKey)' });
  }

  try {
    console.log('[API] Computing composite key for:', { address, tokenId });
    // Try composite key first: (address.public, token_id)
    const compositeKey = await bhp256Hash(address, tokenId);
    console.log('[API] Computed composite key:', compositeKey);
    
    const keyPath = encodeURIComponent(compositeKey);
          const url = `${EXPLORER_BASE}/program/${TOKEN_REGISTRY_PROGRAM}/mapping/authorized_balances/${keyPath}`;
    console.log('[API] Fetching from URL:', url);

    const r = await fetch(url);
    console.log('[API] Response status:', r.status);
    
    if (r.ok) {
      const data = await r.json();
      console.log('[API] Response data:', data);
      console.log('[API] Response data type:', typeof data);
      console.log('[API] Response data length:', data ? (typeof data === 'string' ? data.length : Object.keys(data).length) : 'null/undefined');
      // Accept both object and string responses
      let valueString = '';
      let obj: any = null;
      if (typeof data === 'string') {
        valueString = data;
      } else if (data && typeof data === 'object') {
        if (typeof (data as any).value === 'string') {
          valueString = (data as any).value;
        } else if ((data as any).value && typeof (data as any).value === 'object') {
          obj = (data as any).value;
        } else {
          obj = data;
        }
      }

      let balanceRaw: string | undefined;
      if (obj) {
        if (obj.token_id && `${obj.token_id}` !== `${tokenId}`) {
          return res.status(404).json({ error: 'Composite key resolved but token_id mismatch' });
        }
        if (obj.account && `${obj.account}`.toLowerCase() !== address.toLowerCase()) {
          return res.status(404).json({ error: 'Composite key resolved but account mismatch' });
        }
        if (typeof obj.balance === 'string') {
          balanceRaw = obj.balance;
        }
      }
      if (!balanceRaw && valueString) {
        const m = valueString.match(/balance:\s*(\d+)u\d+/i);
        if (m) balanceRaw = m[1];
      }

      if (balanceRaw) {
        const amount = parseInt(balanceRaw, 10);
        const display = (amount / Math.pow(10, tokenDecimals)).toFixed(2);
        return res.status(200).json({ balance: display, raw: data, compositeKey });
      }

      // If we got a 200 response but no meaningful balance data, 
      // return 0.00 immediately - no need to go through discovery
      console.log('[API] Got 200 response but no meaningful balance data, returning 0.00');
      return res.status(200).json({ balance: '0.00', raw: data, compositeKey });
    }

    // If we get here, the BHP256 hash didn't return a valid balance
    // Return 0.00 immediately instead of going through slow discovery process
    console.log('[API] No balance found for computed key, returning 0.00 immediately');
    return res.status(200).json({ 
      balance: '0.00', 
      raw: null,
      compositeKey
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Unexpected error: ${err?.message || String(err)}` });
  }
}


