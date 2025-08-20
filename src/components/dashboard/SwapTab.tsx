import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import {
  calculateSwapOutput,
  calculatePriceImpact,
} from '@/utils';
import { usePoolData } from '@/hooks/use-pool-data';
import { useUserBalances } from '@/hooks/use-user-balances';

// Types
type Token = {
  symbol: string;
  name: string;
  address?: string;
  decimals: number;
  icon?: string;
};

type Pool = {
  a: string;
  b: string;
  reserveA: bigint;
  reserveB: bigint;
  feeBps: number;
};

// Token list
const TOKENS: Token[] = [
  { symbol: 'ALEO', name: 'Aleo', decimals: 9, icon: '/token-icons/aleo.svg' },
  { symbol: 'USDC', name: 'Custom Token (Test)', decimals: 6, icon: '/token-icons/usdc.svg' },
];

// Mock balances
const mockBalances: Record<string, string> = {
  ALEO: '1234.56789',
  USDC: '1001.00', // Your minted custom tokens
};

// Helper functions
const toAtomic = (amt: string, decimals: number): bigint => {
  if (!amt) return BigInt(0);
  const [intPart, fracRaw] = amt.split('.');
  const frac = (fracRaw || '').slice(0, decimals).padEnd(decimals, '0');
  const s = `${intPart || '0'}${frac}`.replace(/0+(?=\d)/, '');
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

const fmtNumber = (n: number | string): string => {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '0.00';
  if (num === 0) return '0.00';
  if (num < 0.0001) return '<0.0001';
  if (num < 1) return num.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  if (num < 1000) return num.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Token Option Component
const TokenOption: React.FC<{ token: Token }> = ({ token }) => (
  <div className="flex items-center gap-2">
    <img src={token.icon} alt={token.name} className="w-6 h-6" />
    <div className="text-left">
      <div className="font-medium">{token.symbol}</div>
      <div className="text-xs text-gray-500">{token.name}</div>
    </div>
  </div>
);

const SwapTab: React.FC = () => {
  const { publicKey, wallet } = useWallet();
  const [fromToken, setFromToken] = useState<Token>(TOKENS[0]);
  const [toToken, setToToken] = useState<Token>(TOKENS[1]);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');

  // Hooks
  const { poolData, loading: poolLoading, error: poolError, refreshPoolData } = usePoolData();
  const { balances, loading: balancesLoading, error: balancesError, refreshBalances } = useUserBalances();

  // Dynamic pools
  const pools = useMemo(() => {
    if (!poolData) return [];
    
    return [
      {
        a: 'ALEO',
        b: 'USDC',
        reserveA: BigInt(poolData.ra || 0),
        reserveB: BigInt(poolData.rb || 0),
        feeBps: 25, // 0.25%
      }
    ];
  }, [poolData]);

  // Quote calculation
  const quote = useMemo(() => {
    if (!fromAmount || !pools.length) return null;
    
    try {
      const pool = pools[0];
      const amountIn = Number(toAtomic(fromAmount, fromToken.decimals));
      const result = calculateSwapOutput(amountIn, Number(pool.reserveA), Number(pool.reserveB));
      
      return {
        amountOut: fromAtomic(BigInt(result), toToken.decimals),
        priceImpactPct: calculatePriceImpact(amountIn, Number(pool.reserveA)),
        feePct: (pool.feeBps / 10000) * 100,
        route: [fromToken.symbol, toToken.symbol],
      };
    } catch (error) {
      console.error('Quote calculation error:', error);
      return null;
    }
  }, [fromAmount, fromToken, toToken, pools]);

  // Effects
  useEffect(() => {
    if (quote) {
      setToAmount(quote.amountOut);
    }
  }, [quote]);

  // Handlers
  const switchTokens = useCallback(() => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount('');
    setToAmount('');
  }, [fromToken, toToken]);

  const setMax = useCallback(() => {
    const bal = getBalance(fromToken.symbol);
    if (!isFinite(bal) || bal <= 0) return;
    const max = Math.max(0, bal * 0.9995);
    setFromAmount(String(max));
  }, [fromToken.symbol]);

  const handleSwap = useCallback(async () => {
    if (!publicKey || !wallet) return;
    
    try {
      // Implementation for swap
      console.log('Swap initiated:', { fromToken, toToken, fromAmount, toAmount });
    } catch (error) {
      console.error('Swap error:', error);
    }
  }, [publicKey, wallet, fromToken, toToken, fromAmount, toAmount]);

  // Helper function
  const getBalance = (symbol: string): number => {
    if (balances && balances[symbol as keyof typeof balances]) {
      return parseFloat(balances[symbol as keyof typeof balances]);
    }
    return parseFloat(mockBalances[symbol] || '0');
  };

  // Computed values
  const loadingQuote = !quote && fromAmount && Number(fromAmount) > 0;
  const hasBalance = getBalance(fromToken.symbol) >= Number(fromAmount || 0);
  const canSwap = publicKey && fromAmount && Number(fromAmount) > 0 && fromToken.symbol !== toToken.symbol && hasBalance && quote;

  const minReceived = useMemo(() => {
    if (!quote) return '-';
    const out = Number(quote.amountOut || '0');
    const min = out * 0.995; // 0.5% slippage
    return fmtNumber(min);
  }, [quote]);

  const priceImpactStr = useMemo(() => quote ? `${quote.priceImpactPct.toFixed(2)}%` : '-', [quote]);
  const gasEstimate = useMemo(() => '~0.001 ALEO', []);
  const priceDisplay = useMemo(() => {
    if (!quote || !fromAmount) return '-';
    const price = Number(quote.amountOut) / Number(fromAmount);
    return `1 ${fromToken.symbol} = ${price.toFixed(6)} ${toToken.symbol}`;
  }, [quote, fromAmount, fromToken.symbol, toToken.symbol]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Swap Tokens</h2>
        
      </div>

      {/* From */}
      <div className="p-4 rounded-xl bg-gray-50 border">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">From</label>
          <div className="text-xs text-gray-500">Balance: {fmtNumber(getBalance(fromToken.symbol))}</div>
        </div>
        <div className="flex gap-3 items-center">
          <button className="flex-1 border rounded-lg px-4 py-3 text-left bg-white hover:bg-gray-50 transition-colors">
            <TokenOption token={fromToken} />
          </button>
          <input
            inputMode="decimal"
            placeholder="0.0"
            value={fromAmount}
            onChange={e => setFromAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            className="border rounded-lg px-4 py-3 w-40 text-right text-lg font-medium"
          />
        </div>
        <div className="mt-3 flex justify-between items-center">
          <button className="text-sm text-blue-600 hover:underline font-medium" onClick={setMax}>
            MAX
          </button>
          <div className="text-xs text-gray-500">Fee: ~{quote ? `${quote.feePct.toFixed(2)}%` : '-'}</div>
        </div>
      </div>

      {/* Switch Button */}
      <div className="flex justify-center">
        <button
          onClick={switchTokens}
          className="rounded-full border-2 border-gray-300 px-4 py-2 bg-white hover:bg-gray-50 transition-colors text-lg"
          title="Switch tokens"
        >
          ↓↑
        </button>
      </div>

      {/* To */}
      <div className="p-4 rounded-xl bg-gray-50 border">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">To</label>
          <div className="text-xs text-gray-500">Balance: {fmtNumber(getBalance(toToken.symbol))}</div>
        </div>
        <div className="flex gap-3 items-center">
          <button className="flex-1 border rounded-lg px-4 py-3 text-left bg-white hover:bg-gray-50 transition-colors">
            <TokenOption token={toToken} />
          </button>
          <input
            readOnly
            value={loadingQuote ? '' : (toAmount || '')}
            placeholder={loadingQuote ? 'Fetching quote…' : '0.0'}
            className="border rounded-lg px-4 py-3 w-40 text-right bg-gray-100 text-lg font-medium"
          />
        </div>
      </div>

      {/* Swap Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-gray-600">Price:</span>
          <span className="ml-2 font-medium">{priceDisplay}</span>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-gray-600">Route:</span>
          <span className="ml-2 font-medium">{quote ? quote.route.join(' → ') : '-'}</span>
        </div>
      </div>

      {/* Transaction Details */}
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
        <h3 className="font-medium text-blue-800 mb-3">Transaction Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-700">Minimum received:</span>
            <span className="font-medium">{minReceived} {toToken.symbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-700">Price impact:</span>
            <span className="font-medium">{priceImpactStr}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-700">Estimated gas:</span>
            <span className="font-medium">{gasEstimate}</span>
          </div>
        </div>
      </div>

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={!canSwap || loadingQuote}
        className="w-full py-4 px-6 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg"
      >
        {loadingQuote ? 'Fetching Quote...' : canSwap ? 'Swap Tokens' : 'Enter Amount'}
      </button>
    </div>
  );
};

export default SwapTab;
