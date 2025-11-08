import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { usePoolData } from '@/hooks/use-pool-data';
import { useUserBalances } from '@/hooks/use-user-balances';
import { useTokenDiscovery, TokenInfo } from '@/hooks/use-token-discovery';
import { swapAleoForToken, swapTokenForAleo, swapTokens, getSwapQuote, calculateMinOutputWithSlippage, checkLiquidity } from '@/utils/swapExecutor';
import { getPoolReserves } from '@/utils/poolDataFetcher';
import { TokenSelector } from '@/components/ui/TokenSelector';
import { NATIVE_ALEO_ID, COMMON_TOKEN_IDS } from '@/types';
import { fetchTokenBalance } from '@/utils/balanceFetcher';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PriceImpactBadge } from '@/components/ui/PriceImpactBadge';
import { SuccessAnimation } from '@/components/ui/SuccessAnimation';

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

interface SwapTabProps {}

const SwapTab: React.FC<SwapTabProps> = () => {
  const { publicKey, wallet } = useWallet();
  const [fromToken, setFromToken] = useState<TokenInfo | null>(null);
  const [toToken, setToToken] = useState<TokenInfo | null>(null);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [poolReserves, setPoolReserves] = useState<{ reserve1: bigint; reserve2: bigint; swapFee: number } | null>(null);
  const [liquidityError, setLiquidityError] = useState<string | null>(null);
  const tokensInitialized = useRef(false);

  // Hooks
  const { poolData, loading: poolLoading, error: poolError, refreshPoolData } = usePoolData();
  const { balances, loading: balancesLoading, error: balancesError, refreshBalances } = useUserBalances();
  const { 
    tokens, 
    loading: tokensLoading, 
    error: tokensError, 
    addCustomToken, 
    refreshTokens 
  } = useTokenDiscovery();
  
  // Store custom token balances (for tokens not in COMMON_TOKEN_IDS)
  const [customTokenBalances, setCustomTokenBalances] = useState<Map<string, number>>(new Map());
  const [loadingCustomBalances, setLoadingCustomBalances] = useState(false);

  // Fetch balances for custom tokens (not in COMMON_TOKEN_IDS)
  useEffect(() => {
    const fetchCustomTokenBalances = async () => {
      if (!publicKey || !tokens.length) return;
      
      setLoadingCustomBalances(true);
      try {
        const balanceMap = new Map<string, number>();
        
        // Filter tokens that aren't in COMMON_TOKEN_IDS
        const customTokens = tokens.filter(token => {
          const isCommon = Object.values(COMMON_TOKEN_IDS).includes(token.id as any);
          return !isCommon && token.id !== NATIVE_ALEO_ID;
        });
        
        const balancePromises = customTokens.map(async (token) => {
          try {
            const balanceStr = await fetchTokenBalance(
              token.id,
              publicKey.toString(),
              token.symbol,
              token.decimals
            );
            const balance = parseFloat(balanceStr || '0');
            return { tokenId: token.id, balance };
          } catch (error) {
            console.error(`Error fetching balance for ${token.symbol}:`, error);
            return { tokenId: token.id, balance: 0 };
          }
        });
        
        const results = await Promise.all(balancePromises);
        results.forEach(({ tokenId, balance }) => {
          balanceMap.set(tokenId, balance);
        });
        
        setCustomTokenBalances(balanceMap);
      } catch (error) {
        console.error('Error fetching custom token balances:', error);
      } finally {
        setLoadingCustomBalances(false);
      }
    };
    
    fetchCustomTokenBalances();
  }, [publicKey, tokens]);

  // Initialize tokens when they're loaded (only once, never reset)
  useEffect(() => {
    // Only initialize if we haven't done so before AND tokens are loaded
    // This will only run once on initial load, never again
    if (!tokensInitialized.current && tokens.length >= 2) {
      // Set ALEO as default from token
      const aleoToken = tokens.find(token => token.id === NATIVE_ALEO_ID);
      if (aleoToken) {
        setFromToken(aleoToken);
        // Set WAFFLE as default to token
        const waffleToken = tokens.find(token => token.id === '42069666field');
        if (waffleToken) {
          setToToken(waffleToken);
        } else {
          // Fallback to first non-ALEO token if WAFFLE not found
          const nonAleoToken = tokens.find(token => token.id !== NATIVE_ALEO_ID);
          if (nonAleoToken) {
            setToToken(nonAleoToken);
          }
        }
        tokensInitialized.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens]); // Only depend on tokens - once initialized, this won't run again

  // Clear amounts when tokens change
  useEffect(() => {
    setFromAmount('');
    setToAmount('');
  }, [fromToken?.id, toToken?.id]);

  // Fetch pool reserves when tokens change
  useEffect(() => {
    const fetchPoolReserves = async () => {
      if (fromToken && toToken && fromToken.id !== toToken.id) {
        console.log('[SwapTab] Fetching pool reserves for:', fromToken.id, '->', toToken.id);
        try {
          const reserves = await getPoolReserves(fromToken.id, toToken.id);
          console.log('[SwapTab] Got pool reserves:', reserves);
          setPoolReserves(reserves);
        } catch (error) {
          console.error('[SwapTab] Error fetching pool reserves:', error);
          setPoolReserves(null);
        }
      } else {
        setPoolReserves(null);
      }
    };
    
    fetchPoolReserves();
  }, [fromToken?.id, toToken?.id]);

  // AMM quote calculation using dynamic pricing
  const quote = useMemo(() => {
    console.log('[SwapTab] Quote calculation - fromAmount:', fromAmount, 'poolReserves:', poolReserves, 'fromToken:', fromToken?.id, 'toToken:', toToken?.id);
    
    if (!fromAmount || Number(fromAmount) <= 0 || !poolReserves || !fromToken || !toToken) {
      console.log('[SwapTab] Quote calculation skipped - missing requirements');
      return null;
    }
    
    try {
      // Convert fromAmount (in whole units like "1" ALEO) to atomic units (microcredits)
      // For ALEO: 6 decimals, so 1 ALEO = 1_000_000 microcredits
      // For tokens: typically 6 decimals
      const amountInWhole = Number(fromAmount);
      const decimals = fromToken?.decimals || 6;
      const amountInAtomic = Math.floor(amountInWhole * Math.pow(10, decimals));
      
      const isToken1ToToken2 = fromToken.id < toToken.id;
      
      // Check liquidity before calculating quote
      const liquidityCheck = checkLiquidity(amountInAtomic, isToken1ToToken2, poolReserves);
      if (!liquidityCheck.isValid) {
        // Return a special object to indicate liquidity error
        return { error: liquidityCheck.error || 'Insufficient liquidity' };
      }
      
      console.log('[SwapTab] Calling getSwapQuote with:', { 
        amountInWhole, 
        amountInAtomic,
        decimals,
        isToken1ToToken2, 
        reserve1: poolReserves.reserve1.toString(), 
        reserve2: poolReserves.reserve2.toString(), 
        swapFee: poolReserves.swapFee 
      });
      
      const swapQuote = getSwapQuote(
        fromToken.id,
        toToken.id,
        amountInAtomic, // Pass atomic units, not whole units
        isToken1ToToken2,
        poolReserves
      );
      
      console.log('[SwapTab] getSwapQuote returned:', swapQuote);
      
      if (!swapQuote || swapQuote.amountOut <= 0) {
        console.log('[SwapTab] Invalid swap quote');
        // If we have an amount but no quote, it's likely a liquidity issue
        if (amountInAtomic > 0) {
          return { error: 'Insufficient liquidity: Not enough tokens in pool' };
        }
        return null;
      }
      
      // Convert output from atomic units back to whole units for display
      const toDecimals = toToken?.decimals || 6;
      const amountOutWhole = swapQuote.amountOut / Math.pow(10, toDecimals);
      
      return {
        amountOut: amountOutWhole.toFixed(6),
        priceImpact: swapQuote.priceImpact,
        fee: swapQuote.fee,
        route: swapQuote.route
      };
    } catch (error) {
      console.error('[SwapTab] Quote calculation error:', error);
      return { error: 'Error calculating swap quote' };
    }
  }, [fromAmount, fromToken, toToken, poolReserves]);

  // Update liquidity error state based on quote
  useEffect(() => {
    if (quote && 'error' in quote) {
      setLiquidityError(quote.error);
    } else {
      setLiquidityError(null);
    }
  }, [quote]);

  // Effects
  useEffect(() => {
    if (quote && !('error' in quote)) {
      setToAmount(quote.amountOut);
    } else {
      setToAmount('');
    }
  }, [quote]);

  // Handlers
  const switchTokens = useCallback(() => {
    if (fromToken && toToken) {
      setFromToken(toToken);
      setToToken(fromToken);
      setFromAmount('');
      setToAmount('');
    }
  }, [fromToken, toToken]);

  const setMax = useCallback(() => {
    if (!fromToken) return;
    const bal = getBalance(fromToken.symbol, fromToken.id);
    if (!isFinite(bal) || bal <= 0) return;
    const max = Math.max(0, bal * 0.9995); // Leave some for gas
    setFromAmount(String(max));
  }, [fromToken, customTokenBalances]);

  const [isSwapping, setIsSwapping] = useState(false);
  const [swapStatus, setSwapStatus] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSwap = useCallback(async () => {
    if (!publicKey || !wallet || !fromToken || !toToken) return;
    
    try {
      setIsSwapping(true);
      setSwapStatus('Preparing swap...');
      
      const amountIn = Number(fromAmount);
      if (amountIn <= 0) throw new Error('Invalid input amount');
      
      // Calculate minimum output with slippage protection
      const expectedOutput = Number(toAmount);
      const minOutput = calculateMinOutputWithSlippage(expectedOutput, 500); // 5% slippage
      
      // Convert to atomic units
      const amountInAtomic = Math.floor(amountIn * Math.pow(10, fromToken.decimals));
      const minOutputAtomic = Math.floor(minOutput * Math.pow(10, toToken.decimals));
      
      let success = false;
      
      if (fromToken.id === NATIVE_ALEO_ID && toToken.id !== NATIVE_ALEO_ID) {
        // ALEO → Token
        setSwapStatus('Executing ALEO to Token swap...');
        success = await swapAleoForToken(wallet, publicKey.toString(), toToken.id, amountInAtomic, minOutputAtomic);
        
      } else if (fromToken.id !== NATIVE_ALEO_ID && toToken.id === NATIVE_ALEO_ID) {
        // Token → ALEO
        setSwapStatus('Executing Token to ALEO swap...');
        success = await swapTokenForAleo(wallet, publicKey.toString(), fromToken.id, amountInAtomic, minOutputAtomic);
        
      } else if (fromToken.id !== NATIVE_ALEO_ID && toToken.id !== NATIVE_ALEO_ID) {
        // Token → Token
        setSwapStatus('Executing Token to Token swap...');
        success = await swapTokens(wallet, publicKey.toString(), fromToken.id, toToken.id, amountInAtomic, minOutputAtomic);
        
      } else {
        throw new Error('Cannot swap ALEO to ALEO');
      }
      
      if (success) {
        setSwapStatus('Swap completed successfully!');
        // Clear amounts after successful swap
        setFromAmount('');
        setToAmount('');
      } else {
        throw new Error('Swap failed');
      }
      
      // Refresh balances after successful swap
      await refreshBalances();
      await refreshPoolData?.();
      
      // Show success animation
      setShowSuccess(true);
      setSwapStatus('Swap completed successfully!');
      
    } catch (error) {
      console.error('Swap error:', error);
      setSwapStatus(`Swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSwapping(false);
    }
  }, [publicKey, wallet, fromToken, toToken, fromAmount, toAmount, refreshBalances, refreshPoolData]);

  // Helper function to get balance for a token
  const getBalance = (symbol: string, tokenId?: string): number => {
    // First check common token balances
    if (balances && balances[symbol as keyof typeof balances]) {
      return parseFloat(balances[symbol as keyof typeof balances]);
    }
    
    // Then check custom token balances by token ID
    if (tokenId && customTokenBalances.has(tokenId)) {
      return customTokenBalances.get(tokenId) || 0;
    }
    
    // Also try to find by token ID from tokens list
    if (tokenId) {
      const token = tokens.find(t => t.id === tokenId);
      if (token && customTokenBalances.has(token.id)) {
        return customTokenBalances.get(token.id) || 0;
      }
    }
    
    return 0;
  };

  // Computed values
  const hasValidQuote = quote && !('error' in quote);
  const loadingQuote = !quote && fromAmount && Number(fromAmount) > 0 && poolReserves !== null && !liquidityError;
  const hasBalance = fromToken ? getBalance(fromToken.symbol, fromToken.id) >= Number(fromAmount || 0) : false;
  const canSwap = publicKey && fromAmount && Number(fromAmount) > 0 && fromToken && toToken && fromToken.id !== toToken.id && hasBalance && hasValidQuote && !liquidityError && poolReserves !== null;

  const minReceived = useMemo(() => {
    if (!hasValidQuote) return '-';
    const out = Number(quote.amountOut || '0');
    const min = calculateMinOutputWithSlippage(out, 500); // 5% slippage
    return fmtNumber(min);
  }, [quote, hasValidQuote]);

  const priceImpactStr = useMemo(() => {
    if (!hasValidQuote) return '0.00%';
    return `${quote.priceImpact.toFixed(2)}%`;
  }, [quote, hasValidQuote]);

  const gasEstimate = useMemo(() => '~0.1 ALEO', []);
  
  const priceDisplay = useMemo(() => {
    if (!hasValidQuote || !poolReserves || !fromToken || !toToken) return '-';
    const rate = Number(toAmount) / Number(fromAmount);
    return `1 ${fromToken.symbol} = ${fmtNumber(rate)} ${toToken.symbol}`;
  }, [hasValidQuote, fromToken, toToken, fromAmount, toAmount]);

  const poolExists = poolReserves !== null;
  const poolEmpty = poolReserves && poolReserves.reserve1 === BigInt(0) && poolReserves.reserve2 === BigInt(0);

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Swap Tokens</h2>
        <p className="text-xs text-gray-600">AMM-powered exchange</p>
      </div>

      <div className="space-y-4">
          {/* Loading/Error States */}
      {tokensLoading && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center text-blue-800 text-sm">
          🔄 Loading tokens...
        </div>
      )}

      {tokensError && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center text-red-800 text-sm">
          ⚠️ Error: {tokensError}
          <button 
            onClick={refreshTokens}
            className="ml-2 text-blue-600 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {!tokensLoading && !tokensError && tokens.length === 0 && (
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-center text-yellow-800 text-sm">
          ⚠️ No tokens available. Add custom tokens to start trading.
        </div>
      )}

      {/* Pool Status */}
      {!poolExists && fromToken && toToken && fromToken.id !== toToken.id && (
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-center text-yellow-800 text-sm">
          ⚠️ Pool not found. Create one in Pool tab.
        </div>
      )}

      {poolEmpty && (
        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 text-center text-orange-800 text-sm">
          ⚠️ Empty pool. Add liquidity first.
        </div>
      )}

      {/* Liquidity Error */}
      {liquidityError && fromAmount && Number(fromAmount) > 0 && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center text-red-800 text-sm">
          ⚠️ {liquidityError}
        </div>
      )}

      {/* Token Selection */}
      <div className="grid grid-cols-2 gap-4">
        <TokenSelector
          tokens={tokens}
          selectedToken={fromToken}
          onTokenSelect={(token) => {
            console.log('[SwapTab] From token selected:', token);
            setFromToken(token);
          }}
          label="From"
          disabled={tokensLoading || tokens.length === 0}
          placeholder="Select token"
          showAddCustomToken={true}
          onTokenAdd={addCustomToken}
        />
        
        <TokenSelector
          tokens={tokens}
          selectedToken={toToken}
          onTokenSelect={(token) => {
            console.log('[SwapTab] To token selected:', token);
            setToToken(token);
          }}
          label="To"
          disabled={tokensLoading || tokens.length === 0}
          placeholder="Select token"
          showAddCustomToken={true}
          onTokenAdd={addCustomToken}
        />
      </div>

      {/* From Amount */}
      {fromToken && (
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-base-content">From</label>
            <div className="text-xs text-base-content/60">
              Balance: {fmtNumber(getBalance(fromToken.symbol, fromToken.id))} {fromToken.symbol}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <img 
              src={fromToken.icon || `/token-icons/${fromToken.symbol.toLowerCase()}.svg`} 
              alt={fromToken.symbol}
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.png';
              }}
            />
            <div className="flex-1">
              <input
                inputMode="decimal"
                placeholder="0.0"
                value={fromAmount}
                onChange={e => setFromAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full text-4xl font-bold bg-transparent border-none outline-none text-base-content placeholder-base-content/40"
              />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <button 
              className="text-sm text-primary hover:text-primary-focus font-medium hover:underline transition-colors" 
              onClick={setMax}
            >
              MAX
            </button>
            <div className="text-xs text-base-content/60">≈ $0.00</div>
          </div>
        </GlassCard>
      )}

      {/* Switch Button */}
      <div className="flex justify-center -my-2 relative z-10">
        <button
          onClick={switchTokens}
          disabled={!fromToken || !toToken}
                      className="w-12 h-12 rounded-full bg-base-100/80 backdrop-blur-xl border border-base-300/30 flex items-center justify-center
                     hover:rotate-180 transition-all duration-500 hover:scale-110
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:rotate-0 disabled:hover:scale-100
                     shadow-lg"
          title="Switch tokens"
        >
          <svg 
            className="w-6 h-6 text-primary" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* To Amount */}
      {toToken && (
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-base-content">To</label>
            <div className="text-xs text-base-content/60">
              Balance: {fmtNumber(getBalance(toToken.symbol, toToken.id))} {toToken.symbol}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <img 
              src={toToken.icon || `/token-icons/${toToken.symbol.toLowerCase()}.svg`} 
              alt={toToken.symbol}
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.png';
              }}
            />
            <div className="flex-1">
              <input
                readOnly
                value={loadingQuote ? '' : (toAmount || '')}
                placeholder={loadingQuote ? 'Calculating...' : '0.0'}
                className="w-full text-4xl font-bold bg-transparent border-none outline-none text-base-content placeholder-base-content/40"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <div className="text-xs text-base-content/60">≈ $0.00</div>
          </div>
        </GlassCard>
      )}

      {/* Swap Details */}
      {hasValidQuote && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Exchange Rate:</span>
            <span className="ml-2 font-medium">{priceDisplay}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Route:</span>
            <span className="ml-2 font-medium">{quote.route.join(' → ')}</span>
          </div>
        </div>
      )}

      {/* Transaction Details */}
      {hasValidQuote && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-medium text-blue-800 mb-2">Transaction Details</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-700">Min received:</span>
              <span className="font-medium">{minReceived}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-blue-700">Price impact:</span>
              <PriceImpactBadge impact={hasValidQuote ? quote.priceImpact : 0} />
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Fee:</span>
              <span className="font-medium">
                {hasValidQuote && poolReserves 
                  ? `${(poolReserves.swapFee / 100).toFixed(2)}%` 
                  : '0.30%'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Gas:</span>
              <span className="font-medium">{gasEstimate}</span>
            </div>
          </div>
        </div>
      )}

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
                      className="w-full py-4 px-6 rounded-2xl bg-primary text-primary-content font-bold text-lg shadow-lg
                   hover:shadow-xl transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                   hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
      >
        {isSwapping ? (
          <>
            <LoadingSpinner size="small" />
            <span>Swapping...</span>
          </>
        ) : loadingQuote ? (
          <>
            <LoadingSpinner size="small" />
            <span>Calculating...</span>
          </>
        ) : liquidityError ? (
          'Insufficient Liquidity'
        ) : !poolExists ? (
          'Pool Not Found'
        ) : poolEmpty ? (
          'Pool Empty'
        ) : canSwap ? (
          'Swap Tokens'
        ) : (
          'Select Tokens'
        )}
      </button>
      
      {/* Success Animation */}
      <SuccessAnimation show={showSuccess} onComplete={() => setShowSuccess(false)} />
      </div>
    </div>
  );
};

export default SwapTab;