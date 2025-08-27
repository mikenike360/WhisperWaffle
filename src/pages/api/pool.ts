import type { NextApiRequest, NextApiResponse } from 'next';
import { CURRENT_NETWORK, CURRENT_RPC_URL, PROGRAM_ID } from '@/types';

interface PoolResponse {
  ok: boolean;
  ra?: number; // Wrapped ALEO reserve
  rb?: number; // Waffle USDC reserve
  raw?: any;
  error?: string;
}

// Try multiple likely explorer endpoints to fetch mapping value
const candidateUrls = (programId: string) => {
  const urls: string[] = [];
  // Provable testnet patterns
  urls.push(`${CURRENT_RPC_URL.replace(/\/$/, '')}/testnet/program/${programId}/mapping/pools/1field`);
  urls.push(`${CURRENT_RPC_URL.replace(/\/$/, '')}/testnet/program/${programId}/mapping/pools/key/1field`);
  urls.push(`${CURRENT_RPC_URL.replace(/\/$/, '')}/testnet/program/${programId}/mappings/pools/1field`);
  urls.push(`${CURRENT_RPC_URL.replace(/\/$/, '')}/testnet/program/${programId}/mappings/pools/key/1field`);
  // Aleo explorer testnetbeta patterns
  urls.push(`https://api.explorer.aleo.org/v1/testnetbeta/program/${programId}/mapping/pools/1field`);
  urls.push(`https://api.explorer.aleo.org/v1/testnetbeta/program/${programId}/mapping/pools/key/1field`);
  urls.push(`https://api.explorer.aleo.org/v1/testnetbeta/program/${programId}/mappings/pools/1field`);
  urls.push(`https://api.explorer.aleo.org/v1/testnetbeta/program/${programId}/mappings/pools/key/1field`);
  return urls;
};

function parseMappingValue(raw: string) {
  // Expect something like:
  // { id: 1field, token1_id: 0field, token2_id: 987...field, reserve1: 20000000u128, reserve2: 5000000u128, ... }
  const reserve1Match = raw.match(/reserve1:\s*(\d+)u128/);
  const reserve2Match = raw.match(/reserve2:\s*(\d+)u128/);
  if (!reserve1Match || !reserve2Match) return null;
  const ra = Number(reserve1Match[1]);
  const rb = Number(reserve2Match[1]);
  return { ra, rb };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PoolResponse>
) {
  try {
    const programId = PROGRAM_ID;
    const urls = candidateUrls(programId);

    let lastErr: any = null;
    for (const url of urls) {
      try {
        const r = await fetch(url, { method: 'GET' });
        if (!r.ok) {
          lastErr = `HTTP ${r.status}`;
          continue;
        }
        const text = await r.text();
        // Some explorers return JSON; if so, try to extract a value-like field first
        let raw = text;
        try {
          const json = JSON.parse(text);
          // Try common fields
          raw = (json.value as string) || (json.mapping_value as string) || (json.data as string) || text;
        } catch (_) {
          // Not JSON, keep raw text
        }
        const parsed = parseMappingValue(raw);
        if (parsed) {
          return res.status(200).json({ ok: true, ra: parsed.ra, rb: parsed.rb, raw });
        }
        // If cannot parse but got content, return raw for debugging
        return res.status(200).json({ ok: true, raw });
      } catch (e: any) {
        lastErr = e?.message || String(e);
        continue;
      }
    }
    return res.status(502).json({ ok: false, error: `Failed to fetch mapping from explorers: ${lastErr ?? 'unknown error'}` });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error?.message || 'Unknown server error' });
  }
}


