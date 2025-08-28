import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { usePoolData } from '@/hooks/use-pool-data';
import { useUserBalances } from '@/hooks/use-user-balances';
import { swapWaleoForToken, swapTokenForWaleo, getWrappedSwapQuote } from '@/utils/wrappedSwapExecutor';

// Types
type Token = {
  symbol: string;
  name: string;
  address?: string;
  decimals: number;
  icon?: string;
};

// Token list
const TOKENS: Token[] = [
  { symbol: 'WALEO', name: 'Wrapped ALEO', decimals: 6, icon: '/token-icons/aleo.svg' },
  { symbol: 'WUSDC', name: 'Waffle USDC', decimals: 6, icon: '/token-icons/usdc.svg' },
];



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

interface SwapTabProps {
  refreshPoolData: () => Promise<void>;
}

const SwapTab: React.FC<SwapTabProps> = ({ refreshPoolData }) => {
  const { publicKey, wallet } = useWallet();
  const [fromToken, setFromToken] = useState<Token>(TOKENS[0]);
  const [toToken, setToToken] = useState<Token>(TOKENS[1]);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');

  // Hooks
  const { poolData, loading: poolLoading, error: poolError } = usePoolData();
  const { balances, loading: balancesLoading, error: balancesError, refreshBalances } = useUserBalances();

  // Quote calculation using fixed exchange rate (4 wALEO = 1 wUSDC)
  const quote = useMemo(() => {
    if (!fromAmount || Number(fromAmount) <= 0) return null;
    
    try {
      const amountIn = Number(fromAmount);
      const swapQuote = getWrappedSwapQuote(amountIn, fromToken.symbol as 'WALEO' | 'WUSDC');
      
      if (swapQuote.amountOut <= 0) return null;
      
      return {
        amountOut: swapQuote.amountOut.toFixed(6),
        exchangeRate: swapQuote.exchangeRate,
        priceImpactPct: 0, // No price impact with fixed rate
        feePct: 0, // No fees with fixed rate
        route: [fromToken.symbol, toToken.symbol]
      };
    } catch (error) {
      console.error('Quote calculation error:', error);
      return null;
    }
  }, [fromAmount, fromToken, toToken]);

  // Effects
  useEffect(() => {
    if (quote) {
      setToAmount(quote.amountOut);
    } else {
      setToAmount('');
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

  const [isSwapping, setIsSwapping] = useState(false);
  const [swapStatus, setSwapStatus] = useState<string>('');

  const handleSwap = useCallback(async () => {
    if (!publicKey || !wallet) return;
    
    try {
      setIsSwapping(true);
      setSwapStatus('Preparing swap...');
      
      const amountIn = Number(fromAmount);
      if (amountIn <= 0) throw new Error('Invalid input amount');
      
      if (fromToken.symbol === 'WALEO' && toToken.symbol === 'WUSDC') {
        // WALEO → WUSDC
        setSwapStatus('Executing WALEO to WUSDC swap...');
        const minWUSDCOut = Number(toAmount) * 0.995; // 0.5% slippage tolerance
        
        // Convert to smallest units (6 decimals for both tokens)
        const waleoAmount = Math.floor(amountIn * 1000000);
        const minWUSDCOutAmount = Math.floor(minWUSDCOut * 1000000);
        
        const success = await swapWaleoForToken(wallet, waleoAmount, minWUSDCOutAmount);
        if (success) {
          setSwapStatus('Swap completed successfully!');
        } else {
          throw new Error('Swap failed');
        }
        
      } else if (fromToken.symbol === 'WUSDC' && toToken.symbol === 'WALEO') {
        // WUSDC → WALEO
        setSwapStatus('Executing WUSDC to WALEO swap...');
        const minWALEOOut = Number(toAmount) * 0.995; // 0.5% slippage tolerance
        
        // Convert to smallest units (6 decimals for both tokens)
        const wusdcAmount = Math.floor(amountIn * 1000000);
        const minWALEOOutAmount = Math.floor(minWALEOOut * 1000000);
        
        const success = await swapTokenForWaleo(wallet, wusdcAmount, minWALEOOutAmount);
        if (success) {
          setSwapStatus('Swap completed successfully!');
        } else {
          throw new Error('Swap failed');
        }
        
      } else {
        throw new Error('Invalid token pair for swap');
      }
      
      // Refresh balances after successful swap
      await refreshBalances();
      await refreshPoolData();
      
    } catch (error) {
      console.error('Swap error:', error);
      setSwapStatus(`Swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSwapping(false);
    }
  }, [publicKey, wallet, fromToken, toToken, fromAmount, toAmount, refreshBalances, refreshPoolData]);

  // Helper function
  const getBalance = (symbol: string): number => {
    if (balances && balances[symbol as keyof typeof balances]) {
      return parseFloat(balances[symbol as keyof typeof balances]);
    }
    return 0; // Remove mock balances, use real data only
  };

  // Computed values
  const loadingQuote = !quote && fromAmount && Number(fromAmount) > 0;
  const hasBalance = getBalance(fromToken.symbol) >= Number(fromAmount || 0);
  const canSwap = publicKey && fromAmount && Number(fromAmount) > 0 && fromToken.symbol !== toToken.symbol && hasBalance && quote;

  const minReceived = useMemo(() => {
    if (!quote) return '-';
    const out = Number(quote.amountOut || '0');
    const min = out * 0.995; // 0.5% slippage tolerance
    return fmtNumber(min);
  }, [quote]);

  const priceImpactStr = useMemo(() => '0.00%', []); // Fixed rate = no price impact
  const gasEstimate = useMemo(() => '~0.001 ALEO', []);
  const priceDisplay = useMemo(() => {
    if (!quote) return '-';
    return quote.exchangeRate;
  }, [quote]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Swap Tokens</h2>
        <p className="text-gray-600">Before swapping, you must allow the swap contract to swap your tokens using the Token Approvals tab</p>
        <p className="text-gray-600">Fixed Exchange Rate: 4 wALEO = 1 wUSDC</p>
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
          <div className="text-xs text-gray-500">Fixed Rate: No fees</div>
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
            placeholder={loadingQuote ? 'Calculating...' : '0.0'}
            className="border rounded-lg px-4 py-3 w-40 text-right bg-gray-100 text-lg font-medium"
          />
        </div>
      </div>

      {/* Swap Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-gray-600">Exchange Rate:</span>
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
          <div className="flex justify-between">
            <span className="text-blue-700">Rate type:</span>
            <span className="font-medium text-green-600">Fixed Exchange Rate</span>
          </div>
        </div>
        
        <div className="mt-3 p-3 bg-blue-100 rounded-lg">
          <div className="text-xs text-blue-800">
            <strong>💡 Note:</strong> This swap uses wrapped tokens (wALEO ↔ wUSDC). 
            Use the Deposit tab to convert your ALEO to wALEO first. Swaps are now fully functional!
          </div>
        </div>
      </div>

      {/* Swap Status */}
      {swapStatus && (
        <div className={`p-4 rounded-xl border ${
          swapStatus.includes('failed') || swapStatus.includes('error') 
            ? 'bg-red-50 border-red-200 text-red-800' 
            : swapStatus.includes('completed') 
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="text-center font-medium">{swapStatus}</div>
        </div>
      )}

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={!canSwap || loadingQuote || isSwapping}
        className="w-full py-4 px-6 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg"
      >
        {isSwapping ? 'Swapping...' : loadingQuote ? 'Calculating...' : canSwap ? 'Swap Tokens' : 'Enter Amount'}
      </button>
    </div>
  );
};

export default SwapTab;
