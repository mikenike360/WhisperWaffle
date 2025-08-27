import { useCallback, useState } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import Layout from '../layouts/_layout';

export default function ApiTestPage() {
  const DEFAULT_TOKEN_ID = '42069187360field';
  const DEFAULT_DECIMALS = '6';
  const { wallet, publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [tokenId, setTokenId] = useState(DEFAULT_TOKEN_ID);
  const [decimals, setDecimals] = useState(DEFAULT_DECIMALS);

  const scanMyBalance = useCallback(async () => {
    setLoading(true);
    setError(null);
    setScanResult(null);
    console.log('[client] Starting scan for token:', tokenId);
    console.log('[client] Connected wallet:', publicKey);
    try {
      if (!publicKey) throw new Error('Wallet not connected');
      const qs = new URLSearchParams({ tokenId: tokenId, decimals: decimals, address: publicKey });
      console.log('[client] Calling API:', `/api/token-balance?${qs.toString()}`);
      const r = await fetch(`/api/token-balance?${qs.toString()}`);
      const data = await r.json();
      console.log('[client] API response:', data);
      if (!r.ok) throw new Error(data?.error || 'Request failed');
      setScanResult(data);
    } catch (e: any) {
      console.error('[client] Error:', e);
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [publicKey, tokenId, decimals]);

  return (
    <Layout>
      <div className="w-full flex items-start justify-center p-6 pt-32">
        <div className="w-full max-w-xl bg-base-200 rounded-box p-6 shadow">
                  <h1 className="text-2xl font-bold mb-4">Authorized Token Balance Scanner</h1>
        <p className="text-sm text-gray-600 mb-4">
          Shows spendable tokens (authorized balances) - locked tokens are not displayed
        </p>
        <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token ID
              </label>
              <input
                type="text"
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                placeholder="e.g., 42069187360field"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Decimals
              </label>
              <input
                type="number"
                value={decimals}
                onChange={(e) => setDecimals(e.target.value)}
                placeholder="6"
                min="0"
                max="18"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            
            <div className="text-sm text-gray-600">
              <span className="font-medium">Connected wallet:</span> {publicKey || 'Not connected'}
            </div>
          </div>
          <button
            className="btn btn-primary w-full"
            onClick={scanMyBalance}
            disabled={loading || !publicKey}
          >
            {loading ? 'Scanning…' : 'Scan my authorized balance'}
          </button>

          <div className="mt-6">
            {error && (
              <div className="alert alert-error mb-4">
                <span>{error}</span>
              </div>
            )}
            {scanResult && (
              <pre className="whitespace-pre-wrap bg-base-300 p-4 rounded-box overflow-x-auto">
                {JSON.stringify(scanResult, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}


