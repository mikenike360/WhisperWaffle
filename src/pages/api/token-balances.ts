import type { NextApiRequest, NextApiResponse } from 'next';
import { client, programRpcClient } from '@/components/aleo/rpc';

const EXPLORER_BASE = 'https://api.explorer.aleo.org/v1/testnet';
const TOKEN_REGISTRY_PROGRAM = 'token_registry.aleo';

type BalanceItem = {
  address: string;
  balance: string; // normalized string per decimals
  rawBalance: string; // integer string
  decimals: number;
  key: string; // balances mapping key (..field)
  tokenId: string;
  lastSeenTx?: string;
};

type Data =
  | { items: BalanceItem[]; count: number; debug?: any }
  | { error: string; debug?: any };

function extractBalancesKeysDeep(obj: any, keys: Set<string>) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const item of obj) extractBalancesKeysDeep(item, keys);
    return;
  }
  const mappingName = (obj.mapping_name || obj.mapping || obj.name || obj.mappingName || '').toString();
  if (typeof obj.key === 'string' && obj.key.endsWith('field')) {
    // Prefer explicit balances mapping name
    if (mappingName === 'balances') {
      keys.add(obj.key);
    } else {
      // Fallback: if value looks like a balances struct, accept
      const val = obj.value && typeof obj.value === 'object' ? obj.value : obj;
      if (
        (typeof val.balance === 'string' && /u\d+$/.test(val.balance)) ||
        (typeof val.token_id !== 'undefined' && typeof val.account === 'string')
      ) {
        keys.add(obj.key);
      }
    }
  }
  for (const k of Object.keys(obj)) extractBalancesKeysDeep(obj[k], keys);
}

function parseAccount(raw: any): string | null {
  try {
    if (!raw) return null;
    if (typeof raw === 'string') {
      const m = raw.match(/account:\s*(aleo1[0-9a-z]+)\b/i);
      return m ? m[1] : null;
    }
    const v = raw.value && typeof raw.value === 'object' ? raw.value : raw;
    if (typeof v.account === 'string') return v.account;
    return null;
  } catch {
    return null;
  }
}

function parseBalance(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    const m = raw.match(/balance:\s*(\d+)u\d+/i);
    return m ? m[1] : null;
  }
  const v = raw.value && typeof raw.value === 'object' ? raw.value : raw;
  if (typeof v.balance === 'string') return v.balance;
  return null;
}

async function fetchMappingByKey(balanceKey: string): Promise<any | null> {
  const url = `${EXPLORER_BASE}/program/${TOKEN_REGISTRY_PROGRAM}/mapping/balances/${encodeURIComponent(balanceKey)}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  return r.json();
}

function normalize(amount: string, decimals: number): string {
  const num = parseInt(amount, 10);
  return (num / Math.pow(10, decimals)).toFixed(2);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { tokenId, pages, max, decimals, address, debug } = req.query as {
    tokenId?: string;
    pages?: string;
    max?: string;
    decimals?: string;
    address?: string;
    debug?: string;
  };

  if (!tokenId) {
    return res.status(400).json({ error: 'Missing required query param: tokenId' });
  }

  const pageCount = Number.isFinite(Number(pages)) ? Number(pages) : 5;
  const maxPerPage = Number.isFinite(Number(max)) ? Number(max) : 100;
  const tokenDecimals = Number.isFinite(Number(decimals)) ? Number(decimals) : 6;
  const addressFilter = address?.toLowerCase();

  try {
    async function requestProgramTxIds(programId: string, functionName: string, page: number, max: number): Promise<string[]> {
      try {
        const r1: any = await programRpcClient.request('aleoTransactionsForProgram', {
          program_id: programId,
          function_name: functionName,
          page,
          max_transactions: max,
        });
        if (debug) console.log('[scan] rpc snake_case result received', { functionName, page, ok: !!r1 });
        const list1Raw = Array.isArray(r1)
          ? r1
          : r1?.transactions || [];
        const list1 = list1Raw
          .map((t: any) => (typeof t === 'string' ? t : t?.transaction?.id || t?.id))
          .filter(Boolean);
        if (debug) console.log('[scan] rpc snake_case ids', { functionName, page, count: list1.length, sample: list1.slice(0, 3) });
        if (list1 && list1.length) return list1 as string[];
      } catch {}
      try {
        const r2: any = await programRpcClient.request('aleoTransactionsForProgram', {
          programId: programId,
          functionName: functionName,
          page,
          maxTransactions: max,
        });
        if (debug) console.log('[scan] rpc camelCase result received', { functionName, page, ok: !!r2 });
        const list2Raw = Array.isArray(r2)
          ? r2
          : r2?.transactions || [];
        const list2 = list2Raw
          .map((t: any) => (typeof t === 'string' ? t : t?.transaction?.id || t?.id))
          .filter(Boolean);
        if (debug) console.log('[scan] rpc camelCase ids', { functionName, page, count: list2.length, sample: list2.slice(0, 3) });
        if (list2 && list2.length) return list2 as string[];
      } catch {}
      return [];
    }

    const functionNames = ['mint_public', 'transfer_public', 'transfer_from_public'];
    const candidate: Record<string, { key: string; lastSeenTx: string }> = {};
    const scanned: any = { pages: pageCount, max: maxPerPage, tokenId, checkedTxs: [] as string[], candidateCount: 0 };

    for (const fn of functionNames) {
      for (let page = 0; page < pageCount; page++) {
        try {
          const ids = await requestProgramTxIds(TOKEN_REGISTRY_PROGRAM, fn, page, maxPerPage);
          if (debug) console.log('[scan] page ids', { functionName: fn, page, count: ids.length, sample: ids.slice(0, 3) });

          for (const id of ids) {
            try {
              const txResp = await fetch(`${EXPLORER_BASE}/transaction/${id}`);
              if (!txResp.ok) continue;
              const tx = await txResp.json();
              if (debug) console.log('[scan] fetched tx', { id });
              const text = JSON.stringify(tx);
              if (!text.includes('balances')) continue;
              if (!text.includes(`${tokenId}`)) continue;
              // Traverse JSON to find mapping writes for balances and collect keys
              const foundKeys = new Set<string>();
              extractBalancesKeysDeep(tx, foundKeys);
              if (debug) console.log('[scan] found keys', { id, count: foundKeys.size, keys: Array.from(foundKeys).slice(0, 5) });
              for (const k of foundKeys) candidate[k] = { key: k, lastSeenTx: id };
              if (debug) scanned.checkedTxs.push(id);
            } catch {
              // ignore errors per tx
            }
          }
        } catch {
          // ignore page errors
        }
      }
    }

    // Fetch mapping values and build result set
    const items: BalanceItem[] = [];
    const seenAddresses = new Set<string>();
    if (debug) {
      scanned.candidateCount = Object.keys(candidate).length;
      console.log('[scan] total candidate keys', scanned.candidateCount);
    }

    for (const k of Object.keys(candidate)) {
      if (debug) console.log('[scan] fetch mapping by key', { key: k });
      const raw = await fetchMappingByKey(k);
      if (!raw) continue;
      const acct = parseAccount(raw);
      const bal = parseBalance(raw);
      if (debug) console.log('[scan] parsed mapping', { key: k, account: acct, balance: bal });
      if (!acct || !bal) continue;
      if (addressFilter && acct.toLowerCase() !== addressFilter) continue;
      // Unique by address; keep the most recent seen
      if (seenAddresses.has(acct.toLowerCase())) continue;
      seenAddresses.add(acct.toLowerCase());
      items.push({
        address: acct,
        balance: normalize(bal, tokenDecimals),
        rawBalance: bal,
        decimals: tokenDecimals,
        key: k,
        tokenId,
        lastSeenTx: candidate[k]?.lastSeenTx,
      });
    }

    // Sort: highest balance first
    items.sort((a, b) => parseInt(b.rawBalance, 10) - parseInt(a.rawBalance, 10));

    if (debug) console.log('[scan] finished', { items: items.length });
    return res.status(200).json({ items, count: items.length, debug: debug ? scanned : undefined });
  } catch (err: any) {
    return res.status(500).json({ error: `Unexpected error: ${err?.message || String(err)}`, debug: debug ? true : undefined });
  }
}


