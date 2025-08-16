import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import Layout from '@/layouts/_layout';
import Button from '@/components/ui/button';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletNotConnectedError } from '@demox-labs/aleo-wallet-adapter-base';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ---------------------------------------------
// Types
// ---------------------------------------------

type Token = {
  symbol: string;
  name: string;
  address?: string; // placeholder – wire to on-chain registry if you have one
  decimals: number;
  icon?: string; // local/static path if you have assets
};

type Pool = {
  a: string; // symbol
  b: string; // symbol
  reserveA: bigint; // atomic units for token a
  reserveB: bigint; // atomic units for token b
  feeBps: number; // e.g. 25 = 0.25%
};

// ---------------------------------------------
// Token list (customize for your network)
// ---------------------------------------------

const TOKENS: Token[] = [
  { symbol: 'ALEO', name: 'Aleo', decimals: 9, icon: '/token-icons/aleo.svg' },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, icon: '/token-icons/usdc.svg' },
  { symbol: 'ETH', name: 'Ether', decimals: 18, icon: '/token-icons/eth.svg' },
];

const TOKEN_MAP = Object.fromEntries(TOKENS.map(t => [t.symbol, t]));

// ---------------------------------------------
// Mock Balances / Allowances (replace with wallet+RPC)
// ---------------------------------------------

const initialBalances: Record<string, string> = {
  ALEO: '1234.56789',
  USDC: '2500',
  ETH: '5.4321',
};

// allowances in *atomic* units keyed by token symbol -> spender (router)
const initialAllowances: Record<string, bigint> = {
  ALEO: 0n,
  USDC: 0n,
  ETH: 0n,
};

// ---------------------------------------------
// Mock Pools (constant-product AMM)
// ---------------------------------------------

// Helper to scale human strings to atomic bigint
const toAtomic = (amt: string, decimals: number): bigint => {
  if (!amt) return 0n;
  const [intPart, fracRaw] = amt.split('.');
  const frac = (fracRaw || '').slice(0, decimals).padEnd(decimals, '0');
  const s = `${intPart || '0'}${frac}`.replace(/^0+(?=\d)/, '');
  return BigInt(s || '0');
};

const fromAtomic = (amt: bigint, decimals: number): string => {
  const sign = amt < 0 ? '-' : '';
  const x = amt < 0 ? -amt : amt;
  const s = x.toString().padStart(decimals + 1, '0');
  const intPart = s.slice(0, -decimals) || '0';
  const fracPart = s.slice(-decimals).replace(/0+$/, '');
  return sign + intPart + (fracPart ? `.${fracPart}` : '');
};

const pools: Pool[] = [
  // ALEO/USDC pool
  {
    a: 'ALEO',
    b: 'USDC',
    // ~1 ALEO ≈ 0.75 USDC at start (choose any numbers you like)
    reserveA: toAtomic('1000000', TOKEN_MAP['ALEO'].decimals),
    reserveB: toAtomic('750000', TOKEN_MAP['USDC'].decimals),
    feeBps: 25,
  },
  // USDC/ETH pool
  {
    a: 'USDC',
    b: 'ETH',
    reserveA: toAtomic('1000000', TOKEN_MAP['USDC'].decimals),
    reserveB: toAtomic('300', TOKEN_MAP['ETH'].decimals),
    feeBps: 25,
  },
  // (Optional) Direct ALEO/ETH pool (thin liquidity to make routing interesting)
  {
    a: 'ALEO',
    b: 'ETH',
    reserveA: toAtomic('100000', TOKEN_MAP['ALEO'].decimals),
    reserveB: toAtomic('20', TOKEN_MAP['ETH'].decimals),
    feeBps: 25,
  },
];

const findPool = (x: string, y: string) => pools.find(p =>
  (p.a === x && p.b === y) || (p.a === y && p.b === x)
);

// Quote a direct swap on a constant-product pool
function quoteDirect(
  from: Token,
  to: Token,
  amountInHuman: string,
  pool: Pool,
): { amountOut: string; priceImpactPct: number; route: string[]; feePct: number } | null {
  const amountIn = toAtomic(amountInHuman, from.decimals);
  if (amountIn <= 0n) return null;

  const isForward = pool.a === from.symbol && pool.b === to.symbol;
  const rIn = isForward ? pool.reserveA : pool.reserveB;
  const rOut = isForward ? pool.reserveB : pool.reserveA;

  const feeBps = pool.feeBps;
  const feeMultiplier = BigInt(10000 - feeBps);
  const amountInAfterFee = (amountIn * feeMultiplier) / 10000n;

  // x*y=k: out = rOut * dx / (rIn + dx)
  const numerator = rOut * amountInAfterFee;
  const denominator = rIn + amountInAfterFee;
  if (denominator === 0n) return null;
  const amountOut = numerator / denominator;

  // Price impact estimation: compare spot vs execution price
  // spot price ~ rOut / rIn (in atomic terms adjusted for decimals)
  const spotPrice = Number(rOut) / Number(rIn);
  const execPrice = Number(amountOut) / Number(amountInAfterFee);
  const impact = Math.max(0, (spotPrice - execPrice) / spotPrice) * 100;

  return {
    amountOut: fromAtomic(amountOut, to.decimals),
    priceImpactPct: impact,
    route: [from.symbol, to.symbol],
    feePct: feeBps / 100,
  };
}

// Try direct then two-hop via USDC and choose better output
function bestRouteQuote(from: Token, to: Token, amountInHuman: string) {
  const direct = findPool(from.symbol, to.symbol);
  const via = TOKEN_MAP['USDC'];

  let best: null | {
    amountOut: string;
    priceImpactPct: number;
    route: string[];
    feePct: number;
  } = null;

  if (direct) {
    best = quoteDirect(from, to, amountInHuman, direct);
  }

  if (via && from.symbol !== 'USDC' && to.symbol !== 'USDC') {
    const p1 = findPool(from.symbol, 'USDC');
    const p2 = findPool('USDC', to.symbol);
    if (p1 && p2) {
      const leg1 = quoteDirect(from, via, amountInHuman, p1);
      if (leg1) {
        const leg2 = quoteDirect(via, to, leg1.amountOut, p2);
        if (leg2) {
          const candidate = {
            amountOut: leg2.amountOut,
            priceImpactPct: leg1.priceImpactPct + leg2.priceImpactPct,
            route: [from.symbol, 'USDC', to.symbol],
            feePct: (p1.feeBps + p2.feeBps) / 100,
          };
          if (!best || Number(candidate.amountOut) > Number(best.amountOut)) best = candidate;
        }
      }
    }
  }

  return best;
}

// Format helpers
const fmtNumber = (v: string | number, maxFrac = 6) => {
  const n = typeof v === 'string' ? Number(v) : v;
  if (!isFinite(n)) return '0';
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
};

// ---------------------------------------------
// UI Components (inline for simplicity)
// ---------------------------------------------

const TokenOption: React.FC<{ token: Token }> = ({ token }) => (
  <div className="flex items-center gap-2">
    {token.icon ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={token.icon} alt={token.symbol} className="w-5 h-5" />
    ) : (
      <div className="w-5 h-5 rounded-full bg-gray-300" />
    )}
    <div className="text-sm"><span className="font-semibold">{token.symbol}</span> <span className="text-gray-500">{token.name}</span></div>
  </div>
);

const TokenSelectModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSelect: (t: Token) => void;
  exclude?: string;
}> = ({ open, onClose, onSelect, exclude }) => {
  const [q, setQ] = useState('');
  const filtered = useMemo(
    () => TOKENS.filter(t => (
      (!exclude || t.symbol !== exclude) &&
      (t.symbol.toLowerCase().includes(q.toLowerCase()) || t.name.toLowerCase().includes(q.toLowerCase()))
    )),
    [q, exclude]
  );

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <input
            autoFocus
            placeholder="Search name or symbol"
            value={q}
            onChange={e => setQ(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <div className="max-h-80 overflow-y-auto divide-y">
          {filtered.map(t => (
            <button
              key={t.symbol}
              onClick={() => { onSelect(t); onClose(); }}
              className="w-full text-left py-3 hover:bg-gray-50"
            >
              <div className="px-1"><TokenOption token={t} /></div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center text-gray-500 py-8">No tokens match</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------
// Main Page
// ---------------------------------------------

const SwapPage: NextPageWithLayout = () => {
  const { publicKey }: { publicKey: string | null | undefined } = useWallet() as any;

  // swap state
  const [fromToken, setFromToken] = useState<Token>(TOKEN_MAP['ALEO']);
  const [toToken, setToToken] = useState<Token>(TOKEN_MAP['USDC']);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [invertPrice, setInvertPrice] = useState(false);

  // balances/allowances (mock)
  const [balances, setBalances] = useState<Record<string, string>>(initialBalances);
  const [allowances, setAllowances] = useState<Record<string, bigint>>(initialAllowances);

  // settings
  const [slippage, setSlippage] = useState<number>(() => {
    const saved = (typeof window !== 'undefined') ? window.localStorage.getItem('slippage') : null;
    return saved ? Number(saved) : 0.5; // %
  });
  const [deadlineMins, setDeadlineMins] = useState<number>(() => {
    const saved = (typeof window !== 'undefined') ? window.localStorage.getItem('deadlineMins') : null;
    return saved ? Number(saved) : 20;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  // token selector modals
  const [selecting, setSelecting] = useState<'from' | 'to' | null>(null);

  // quoting
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const lastQuoteRef = useRef<number>(0);

  const balanceFrom = Number(balances[fromToken.symbol] || '0');
  const hasBalance = fromAmount ? Number(fromAmount) <= balanceFrom : true;

  const quote = useMemo(() => {
    if (!fromAmount || isNaN(Number(fromAmount)) || Number(fromAmount) <= 0) return null;
    return bestRouteQuote(fromToken, toToken, fromAmount);
  }, [fromAmount, fromToken, toToken]);

  const priceDisplay = useMemo(() => {
    if (!quote) return '-';
    const inN = Number(fromAmount);
    const outN = Number(quote.amountOut || '0');
    if (!isFinite(inN) || inN <= 0 || !isFinite(outN) || outN <= 0) return '-';
    const p = invertPrice ? (inN / outN) : (outN / inN);
    return invertPrice
      ? `1 ${toToken.symbol} = ${fmtNumber(p)} ${fromToken.symbol}`
      : `1 ${fromToken.symbol} = ${fmtNumber(p)} ${toToken.symbol}`;
  }, [quote, invertPrice, fromAmount, fromToken, toToken]);

  // Debounce the UI to simulate async quoting
  useEffect(() => {
    const now = Date.now();
    lastQuoteRef.current = now;
    if (!fromAmount) { setToAmount(''); setQuoteError(null); return; }

    setLoadingQuote(true); setQuoteError(null);
    const id = setTimeout(() => {
      if (lastQuoteRef.current !== now) return; // out of date
      if (!quote) { setToAmount(''); setQuoteError('Route not found or amount too small'); setLoadingQuote(false); return; }
      setToAmount(quote.amountOut);
      setLoadingQuote(false);
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromAmount, fromToken.symbol, toToken.symbol]);

  // persist settings
  useEffect(() => { try { localStorage.setItem('slippage', String(slippage)); } catch {}
  }, [slippage]);
  useEffect(() => { try { localStorage.setItem('deadlineMins', String(deadlineMins)); } catch {}
  }, [deadlineMins]);

  const swapDisabledReason = useMemo(() => {
    if (!publicKey) return 'Connect wallet to continue';
    if (!fromAmount || Number(fromAmount) <= 0) return 'Enter an amount';
    if (fromToken.symbol === toToken.symbol) return 'Tokens must be different';
    if (!hasBalance) return 'Insufficient balance';
    if (!quote) return 'No route';
    return null;
  }, [publicKey, fromAmount, fromToken, toToken, hasBalance, quote]);

  const needsApproval = useMemo(() => {
    const allowance = allowances[fromToken.symbol] || 0n;
    const needed = toAtomic(fromAmount || '0', fromToken.decimals);
    return allowance < needed;
  }, [allowances, fromToken, fromAmount]);

  const handleApprove = async () => {
    if (!publicKey) throw new WalletNotConnectedError();
    // TODO: call token contract approve(router, MAX_UINT) here
    setAllowances(prev => ({ ...prev, [fromToken.symbol]: toAtomic('1000000000', fromToken.decimals) }));
  };

  const handleSwap = useCallback(() => {
    if (!publicKey) throw new WalletNotConnectedError();
    if (!quote) return;

    // TODO: integrate real DEX swap logic here
    // 1) validate allowance (and approve if needed)
    // 2) build swap tx with chosen route + slippage + deadline
    // 3) sign & submit via wallet

    // Mock: update balances locally
    const inAmt = Number(fromAmount);
    const outAmt = Number(quote.amountOut);

    setBalances(prev => ({
      ...prev,
      [fromToken.symbol]: fmtNumber(Math.max(0, Number(prev[fromToken.symbol] || '0') - inAmt), 9),
      [toToken.symbol]: fmtNumber((Number(prev[toToken.symbol] || '0') + outAmt), 9),
    }));

    // Reset input
    setFromAmount('');
  }, [publicKey, quote, fromAmount, fromToken.symbol, toToken.symbol]);

  const switchTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    // carry over output as new input for UX niceness
    if (toAmount) setFromAmount(toAmount);
  };

  const setMax = () => {
    const bal = Number(balances[fromToken.symbol] || '0');
    if (!isFinite(bal) || bal <= 0) return;
    // leave tiny buffer for fees on source token if needed
    const max = Math.max(0, bal * 0.9995);
    setFromAmount(String(max));
  };

  const minReceived = useMemo(() => {
    if (!quote) return '-';
    const out = Number(quote.amountOut || '0');
    const min = out * (1 - slippage / 100);
    return fmtNumber(min);
  }, [quote, slippage]);

  const priceImpactStr = useMemo(() => quote ? `${quote.priceImpactPct.toFixed(2)}%` : '-', [quote]);

  const gasEstimate = useMemo(() => {
    // Mocked gas/fee estimate – replace with RPC call
    return '~0.002 ETH';
  }, []);

  return (
    <>
      <NextSeo title="Swap" />
      <div
        className="flex flex-col items-center justify-center min-h-screen"
        style={{
          backgroundImage: `url('waffle.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="w-full max-w-md bg-white/90 backdrop-blur p-6 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Swap</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSettingsOpen(v => !v)}
                className="text-sm px-3 py-1 rounded-lg border hover:bg-gray-50"
                title="Settings"
              >⚙️</button>
              <button
                onClick={() => setInvertPrice(v => !v)}
                className="text-sm px-3 py-1 rounded-lg border hover:bg-gray-50"
                title="Invert Price"
              >⇄</button>
            </div>
          </div>

          {/* From */}
          <div className="mb-3 p-3 rounded-xl bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">From</label>
              <div className="text-xs text-gray-500">Balance: {fmtNumber(balances[fromToken.symbol] || '0')}</div>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setSelecting('from')}
                className="flex-1 border rounded-lg px-3 py-2 text-left bg-white hover:bg-gray-50"
              >
                <TokenOption token={fromToken} />
              </button>
              <input
                inputMode="decimal"
                placeholder="0.0"
                value={fromAmount}
                onChange={e => setFromAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className="border rounded-lg px-3 py-2 w-36 text-right"
              />
            </div>
            <div className="mt-2 flex justify-between">
              <button className="text-xs text-blue-600 hover:underline" onClick={setMax}>MAX</button>
              <div className="text-xs text-gray-500">Pays fee: ~{quote ? `${quote.feePct.toFixed(2)}%` : '-'} </div>
            </div>
          </div>

          {/* Switch */}
          <div className="flex justify-center my-2">
            <button onClick={switchTokens} className="rounded-full border px-3 py-1 bg-white hover:bg-gray-50" title="Switch tokens">↓↑</button>
          </div>

          {/* To */}
          <div className="mb-3 p-3 rounded-xl bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">To</label>
              <div className="text-xs text-gray-500">Balance: {fmtNumber(balances[toToken.symbol] || '0')}</div>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setSelecting('to')}
                className="flex-1 border rounded-lg px-3 py-2 text-left bg-white hover:bg-gray-50"
              >
                <TokenOption token={toToken} />
              </button>
              <input
                readOnly
                value={loadingQuote ? '' : (toAmount || '')}
                placeholder={loadingQuote ? 'Fetching quote…' : '0.0'}
                className="border rounded-lg px-3 py-2 w-36 text-right bg-gray-100"
              />
            </div>
          </div>

          {/* Price / Route */}
          <div className="text-sm text-gray-600 mb-3">
            <div className="flex justify-between"><span>Price</span><span>{priceDisplay}</span></div>
            <div className="flex justify-between"><span>Route</span><span>{quote ? quote.route.join(' → ') : '-'}</span></div>
          </div>

          {/* Details */}
          <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 mb-4">
            <div className="flex justify-between"><span>Minimum received</span><span>{minReceived} {toToken.symbol}</span></div>
            <div className="flex justify-between"><span>Price impact</span><span>{priceImpactStr}</span></div>
            <div className="flex justify-between"><span>Estimated gas</span><span>{gasEstimate}</span></div>
            <div className="flex justify-between"><span>Tx deadline</span><span>{deadlineMins} min</span></div>
          </div>

          {/* Errors */}
          {quoteError && (
            <div className="text-red-600 text-sm mb-2">{quoteError}</div>
          )}
          {!hasBalance && (
            <div className="text-red-600 text-sm mb-2">Insufficient {fromToken.symbol} balance</div>
          )}

          {/* Action Buttons */}
          {publicKey ? (
            needsApproval ? (
              <Button className="w-full" onClick={handleApprove} disabled={!!swapDisabledReason}>Approve {fromToken.symbol}</Button>
            ) : (
              <Button className="w-full" onClick={handleSwap} disabled={!!swapDisabledReason}>
                {swapDisabledReason ? swapDisabledReason : 'Swap'}
              </Button>
            )
          ) : (
            <Button className="w-full" onClick={() => alert('Wire this to your wallet connect flow')}>
              Connect Wallet
            </Button>
          )}

          {/* Settings Panel */}
          {settingsOpen && (
            <div className="mt-4 p-3 border rounded-xl">
              <div className="font-semibold mb-2">Settings</div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm">Slippage tolerance</div>
                  <div className="text-xs text-gray-500">Auto: try 0.5–1% for most pairs</div>
                </div>
                <div className="flex items-center gap-2">
                  {[0.1, 0.5, 1].map(p => (
                    <button
                      key={p}
                      className={`px-3 py-1 rounded-lg border ${slippage === p ? 'bg-black text-white' : 'bg-white hover:bg-gray-50'}`}
                      onClick={() => setSlippage(p)}
                    >{p}%</button>
                  ))}
                  <input
                    value={slippage}
                    onChange={e => setSlippage(Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
                    className="w-20 border rounded-lg px-2 py-1 text-right"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm">Transaction deadline</div>
                  <div className="text-xs text-gray-500">Cancels if pending longer than this</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={deadlineMins}
                    onChange={e => setDeadlineMins(Math.max(1, Math.min(120, Number(e.target.value) || 0)))}
                    className="w-20 border rounded-lg px-2 py-1 text-right"
                  />
                  <span className="text-sm">min</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Token selectors */}
      <TokenSelectModal
        open={selecting === 'from'}
        onClose={() => setSelecting(null)}
        onSelect={t => {
          setFromToken(t);
          if (t.symbol === toToken.symbol) setToToken(fromToken);
        }}
        exclude={toToken.symbol}
      />
      <TokenSelectModal
        open={selecting === 'to'}
        onClose={() => setSelecting(null)}
        onSelect={t => {
          setToToken(t);
          if (t.symbol === fromToken.symbol) setFromToken(toToken);
        }}
        exclude={fromToken.symbol}
      />
    </>
  );
};

SwapPage.getLayout = page => <Layout>{page}</Layout>;
export default SwapPage;
