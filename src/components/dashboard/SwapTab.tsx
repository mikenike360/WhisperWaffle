import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { usePoolData } from '@/hooks/use-pool-data';
import { useUserBalances } from '@/hooks/use-user-balances';
import { useTokenDiscovery, TokenInfo } from '@/hooks/use-token-discovery';
import { swapAleoForToken, swapTokenForAleo, swapTokens, getSwapQuote, checkLiquidity, SwapExecutionResult } from '@/utils/swapExecutor';
import { getAmountOut } from '@/utils/ammCalculations';
import { getPoolReserves } from '@/utils/poolDataFetcher';
import { TokenSelector } from '@/components/ui/TokenSelector';
import { NATIVE_ALEO_ID, COMMON_TOKEN_IDS, TOKEN_IDS, IS_MAINNET } from '@/types';
import { fetchTokenBalance } from '@/utils/balanceFetcher';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PriceImpactBadge } from '@/components/ui/PriceImpactBadge';
import { SuccessAnimation } from '@/components/ui/SuccessAnimation';
import { useSettings, MIN_SLIPPAGE_BPS, SLIPPAGE_LIMIT_BPS } from '@/context/SettingsContext';
import { useTransactionStatus } from '@/hooks/useTransactionStatus';

// Helper functions
const toAtomic = (amt: string, decimals: number): bigint => {
  if (!amt) return BigInt(0);
  const [intPartRaw, fracRaw = ''] = amt.split('.');
  const intPart = intPartRaw && intPartRaw.length ? BigInt(intPartRaw) : 0n;
  const wholeMultiplier = 10n ** BigInt(decimals);
  const frac = fracRaw.slice(0, decimals).padEnd(decimals, '0');
  const fractionalPart = frac.length ? BigInt(frac) : 0n;
  return intPart * wholeMultiplier + fractionalPart;
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

const formatTxId = (id: string) => (id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id);
const explorerTxUrl = (id: string) =>
  `${IS_MAINNET ? 'https://explorer.aleo.org/transaction/' : 'https://explorer.aleo.org/testnet/transaction/'}${id}`;

const MIN_SUGGESTED_SLIPPAGE_BPS = 50; // 0.5%
const MAX_SUGGESTED_SLIPPAGE_BPS = 4500; // 45%
const SLIPPAGE_BUFFER_BPS = 50; // +0.5%
const MAX_AUTOMATIC_SLIPPAGE_BPS = 4500; // 45%

const calculateShareBps = (part: bigint, whole: bigint): number | null => {
  if (whole <= 0n) return null;
  return Number((part * 10000n) / whole);
};

const bigintToUnits = (value: bigint, decimals: number): number => {
  if (decimals <= 0) return Number(value);
  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  const remainder = value % scale;
  const fractional = Number(remainder) / Number(scale);
  return Number(whole) + fractional;
};

interface SwapTabProps {}

const SwapTab: React.FC<SwapTabProps> = () => {
  const { publicKey, wallet } = useWallet();
  const { slippageBps: contextSlippageBps, setSlippageBps: persistSlippageBps } = useSettings();
  const [slippageBps, setSlippageBpsState] = useState<number>(contextSlippageBps);
  const slippagePercent = slippageBps / 100;
  const slippageFactor = useMemo(() => BigInt(10000 - slippageBps), [slippageBps]);
  const [fromToken, setFromToken] = useState<TokenInfo | null>(null);
  const [toToken, setToToken] = useState<TokenInfo | null>(null);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [poolReserves, setPoolReserves] = useState<{ reserve1: bigint; reserve2: bigint; swapFee: number; token1Id: string; token2Id: string } | null>(null);
  const [liquidityError, setLiquidityError] = useState<string | null>(null);
  const [autoAppliedSlippageBps, setAutoAppliedSlippageBps] = useState<number | null>(null);
  const [autoSlippageReason, setAutoSlippageReason] = useState<'depth' | 'dynamic' | null>(null);
  const tokensInitialized = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clampSlippageBps = useCallback(
    (value: number) => Math.min(SLIPPAGE_LIMIT_BPS, Math.max(MIN_SLIPPAGE_BPS, Math.round(value))),
    []
  );

  const directionMinSlippageBps = useMemo(() => {
    if (!fromToken || !toToken) return null;
    if (fromToken.id === NATIVE_ALEO_ID && toToken.id === TOKEN_IDS.WAFFLE) {
      return 1000;
    }
    return null;
  }, [fromToken?.id, toToken?.id]);

  const applySlippageBps = useCallback(
    (value: number) => {
      const enforcedMinimum = directionMinSlippageBps ?? MIN_SLIPPAGE_BPS;
      const normalized = clampSlippageBps(Math.max(value, enforcedMinimum));
      setSlippageBpsState(normalized);
      persistSlippageBps(normalized);
      return normalized;
    },
    [clampSlippageBps, persistSlippageBps, directionMinSlippageBps]
  );

  useEffect(() => {
    setSlippageBpsState(contextSlippageBps);
  }, [contextSlippageBps]);

  useEffect(() => {
    // reset slippage to default when tokens change to avoid stale suggestions
    setSlippageBpsState(contextSlippageBps);
    setShowSlippageSuggestion(false);
    setAutoAppliedSlippageBps(null);
    setAutoSlippageReason(null);
  }, [contextSlippageBps, fromToken?.id, toToken?.id]);

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
        const waffleToken = tokens.find(token => token.id === TOKEN_IDS.WAFFLE);
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

  const loadPoolReserves = useCallback(
    async (context: string = 'manual') => {
      if (!fromToken || !toToken || fromToken.id === toToken.id) {
        setPoolReserves(null);
        return;
      }

      console.log(`[SwapTab] Fetching pool reserves (${context}) for:`, fromToken.id, '->', toToken.id);
      try {
        const reserves = await getPoolReserves(fromToken.id, toToken.id);
        console.log('[SwapTab] Got pool reserves:', reserves);
        setPoolReserves(reserves);
      } catch (error) {
        console.error(`[SwapTab] Error fetching pool reserves (${context}):`, error);
        setPoolReserves(null);
      }
    },
    [fromToken?.id, toToken?.id]
  );

  // Fetch pool reserves when tokens change
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await loadPoolReserves('token-change');
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [loadPoolReserves]);

  // Periodically refresh pool reserves to keep quotes current
  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!fromToken || !toToken || fromToken.id === toToken.id) {
      return;
    }

    refreshTimerRef.current = setInterval(() => {
      loadPoolReserves('auto-refresh');
    }, 7000);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [fromToken?.id, toToken?.id, loadPoolReserves]);

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
      const decimals = fromToken?.decimals || 6;
      const amountInAtomic = toAtomic(fromAmount, decimals);
      
      let isToken1ToToken2 = true;
      if (poolReserves) {
        if (poolReserves.token1Id === fromToken.id && poolReserves.token2Id === toToken.id) {
          isToken1ToToken2 = true;
        } else if (poolReserves.token1Id === toToken.id && poolReserves.token2Id === fromToken.id) {
          isToken1ToToken2 = false;
        }
      }
      
      // Check liquidity before calculating quote
      const liquidityCheck = checkLiquidity(amountInAtomic, isToken1ToToken2, poolReserves);
      if (!liquidityCheck.isValid) {
        // Return a special object to indicate liquidity error
        return { error: liquidityCheck.error || 'Insufficient liquidity' };
      }
      
      console.log('[SwapTab] Calling getSwapQuote with:', { 
        amountInWhole: Number(fromAmount),
        amountInAtomic: amountInAtomic.toString(),
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
      
      if (!swapQuote || swapQuote.amountOutAtomic <= 0n) {
        console.log('[SwapTab] Invalid swap quote');
        // If we have an amount but no quote, it's likely a liquidity issue
        if (amountInAtomic > 0n) {
          return { error: 'Insufficient liquidity: Not enough tokens in pool' };
        }
        return null;
      }
      
      // Convert output from atomic units back to whole units for display
      const toDecimals = toToken?.decimals || 6;
      const amountOutWhole = fromAtomic(swapQuote.amountOutAtomic, toDecimals);
      
      return {
        amountOut: amountOutWhole,
        amountOutAtomic: swapQuote.amountOutAtomic,
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
    if (quote && !('error' in quote) && toToken) {
      const minAtomic = (quote.amountOutAtomic * slippageFactor) / 10000n;
      const minDisplayRaw = fromAtomic(minAtomic, toToken.decimals);
      setToAmount(fmtNumber(minDisplayRaw));
    } else {
      setToAmount('');
    }
  }, [quote, toToken, slippageFactor]);

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

  const [showSuccess, setShowSuccess] = useState(false);
  const {
    isPending,
    statusMessage,
    txId: finalizedTxId,
    error: transactionError,
    start: startTransaction,
    update: updateTransaction,
    succeed: succeedTransaction,
    fail: failTransaction,
  } = useTransactionStatus();

  const handleSwap = useCallback(async () => {
    if (!publicKey || !wallet || !fromToken || !toToken) return;
    
    try {
      startTransaction('Preparing swap...');
      
      const amountInAtomic = toAtomic(fromAmount, fromToken.decimals);
      if (amountInAtomic <= 0n) {
        throw new Error('Invalid input amount');
      }
      
      if (!poolReserves) {
        throw new Error('Pool reserves unavailable');
      }
      const latestReserves = await getPoolReserves(fromToken.id, toToken.id);
      if (!latestReserves) {
        throw new Error('Failed to refresh pool reserves');
      }
      setPoolReserves(latestReserves);
      const effectiveReserves = latestReserves;
 
      let isToken1ToToken2 = true;
      if (effectiveReserves.token1Id === fromToken.id && effectiveReserves.token2Id === toToken.id) {
        isToken1ToToken2 = true;
      } else if (effectiveReserves.token1Id === toToken.id && effectiveReserves.token2Id === fromToken.id) {
        isToken1ToToken2 = false;
      } else {
        // Fallback to previous determination in quote
        isToken1ToToken2 = true;
      }
       
      const reserveIn = isToken1ToToken2 ? effectiveReserves.reserve1 : effectiveReserves.reserve2;
      const reserveOut = isToken1ToToken2 ? effectiveReserves.reserve2 : effectiveReserves.reserve1;
       
      const outputAtomic = getAmountOut(amountInAtomic, reserveIn, reserveOut, poolReserves.swapFee);
      if (outputAtomic <= 0n) {
        throw new Error('Insufficient liquidity for swap');
      }

      const slippageBpsBigInt = BigInt(slippageBps);
      const slippageDiscount = slippageBpsBigInt > 0n
        ? (outputAtomic * slippageBpsBigInt + 9999n) / 10000n
        : 0n;
      let executionOutputAtomic = outputAtomic > slippageDiscount
        ? outputAtomic - slippageDiscount
        : 0n;

      if (executionOutputAtomic <= 0n && outputAtomic > 0n) {
        executionOutputAtomic = outputAtomic;
      }
      if (executionOutputAtomic > outputAtomic) {
        executionOutputAtomic = outputAtomic;
      }

      console.log('[SwapTab] Prepared swap payload', {
        fromToken: { id: fromToken.id, symbol: fromToken.symbol },
        toToken: { id: toToken.id, symbol: toToken.symbol },
        aleoIn: fromToken.id === NATIVE_ALEO_ID ? amountInAtomic.toString() : undefined,
        tokenIn: fromToken.id !== NATIVE_ALEO_ID ? amountInAtomic.toString() : undefined,
        poolId: `${fromToken.id}-${toToken.id}`,
        poolReserves,
        reserveIn: reserveIn.toString(),
        reserveOut: reserveOut.toString(),
        swapFee: poolReserves.swapFee,
        quotedOut: outputAtomic.toString(),
        executionOut: executionOutputAtomic.toString(),
        slippageBps,
        priceImpact: quote && !('error' in quote) ? quote.priceImpact : null
      });
      
      const statusUpdater = (message: string) => {
        updateTransaction(message);
      };
      let txResult: SwapExecutionResult | null = null;
      
      if (fromToken.id === NATIVE_ALEO_ID && toToken.id !== NATIVE_ALEO_ID) {
        // ALEO → Token
        txResult = await swapAleoForToken(
          wallet,
          publicKey.toString(),
          toToken.id,
          amountInAtomic,
          executionOutputAtomic,
          executionOutputAtomic,
          statusUpdater
        );
        
      } else if (fromToken.id !== NATIVE_ALEO_ID && toToken.id === NATIVE_ALEO_ID) {
        // Token → ALEO
        txResult = await swapTokenForAleo(
          wallet,
          publicKey.toString(),
          fromToken.id,
          amountInAtomic,
          executionOutputAtomic,
          executionOutputAtomic,
          statusUpdater
        );
        
      } else if (fromToken.id !== NATIVE_ALEO_ID && toToken.id !== NATIVE_ALEO_ID) {
        // Token → Token
        txResult = await swapTokens(
          wallet,
          publicKey.toString(),
          fromToken.id,
          toToken.id,
          amountInAtomic,
          executionOutputAtomic,
          executionOutputAtomic,
          statusUpdater
        );
        
      } else {
        throw new Error('Cannot swap ALEO to ALEO');
      }
      
      if (!txResult) {
        throw new Error('Swap failed to finalize');
      }
      
      updateTransaction('Transaction finalized! Updating balances...');
      
      // Refresh balances after successful swap
      await refreshBalances();
      await refreshPoolData?.();

      // Clear amounts after successful swap
      setFromAmount('');
      setToAmount('');

      succeedTransaction(txResult.txId, `Swap finalized: ${formatTxId(txResult.txId)}`);
      setShowSuccess(true);
      
    } catch (error) {
      console.error('Swap error:', error);
      const message = `Swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      failTransaction(message);
      setShowSuccess(false);
    }
  }, [publicKey, wallet, fromToken, toToken, fromAmount, refreshBalances, refreshPoolData, poolReserves, slippageFactor, slippageBps, quote, startTransaction, updateTransaction, succeedTransaction, failTransaction]);

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
  const priceImpactTooHigh = useMemo(() => {
    if (!quote || 'error' in quote) return false;
    return quote.priceImpact > slippagePercent;
  }, [quote, slippagePercent]);

  const suggestedSlippageBps = useMemo(() => {
    if (!quote || 'error' in quote) return null;
    if (!poolReserves || !fromToken || !toToken) return null;
    if (!fromAmount || Number(fromAmount) <= 0) return null;

    const fromDecimals = fromToken.decimals ?? 6;
    const toDecimals = toToken.decimals ?? 6;
    const amountInAtomic = toAtomic(fromAmount, fromDecimals);
    if (amountInAtomic <= 0n) return null;

    let isToken1ToToken2 = true;
    if (poolReserves.token1Id === fromToken.id && poolReserves.token2Id === toToken.id) {
      isToken1ToToken2 = true;
    } else if (poolReserves.token1Id === toToken.id && poolReserves.token2Id === fromToken.id) {
      isToken1ToToken2 = false;
    }

    const reserveIn = isToken1ToToken2 ? poolReserves.reserve1 : poolReserves.reserve2;
    const reserveOut = isToken1ToToken2 ? poolReserves.reserve2 : poolReserves.reserve1;
    if (reserveIn <= 0n || reserveOut <= 0n) return null;

    const priceImpactPercent = quote.priceImpact ?? 0;
    const impactBps = Math.max(0, Math.ceil(priceImpactPercent * 100));
    let dynamicBps = Math.max(MIN_SUGGESTED_SLIPPAGE_BPS, impactBps + SLIPPAGE_BUFFER_BPS);

    const tradeShareBps = calculateShareBps(amountInAtomic, reserveIn) ?? 0;
    const outShareBps = calculateShareBps(quote.amountOutAtomic, reserveOut) ?? 0;
    const severityBps = Math.max(tradeShareBps, outShareBps);

    const severityMultiplier = 1 + Math.min(3, severityBps / 400);
    dynamicBps = Math.ceil(dynamicBps * severityMultiplier);

    if (severityBps > 800) {
      dynamicBps += 400;
    } else if (severityBps > 400) {
      dynamicBps += 200;
    }

    const fromAmountNumber = Number(fromAmount);
    if (!Number.isNaN(fromAmountNumber)) {
      if (fromAmountNumber >= 1) {
        dynamicBps += Math.ceil(fromAmountNumber * 40); // +0.4% per ALEO/token
      }
      if (fromAmountNumber >= 5) {
        dynamicBps += 250;
      }
    }

    const reserveOutUnits = bigintToUnits(reserveOut, toDecimals);
    if (reserveOutUnits < 250) {
      dynamicBps += 350;
    } else if (reserveOutUnits < 500) {
      dynamicBps += 250;
    } else if (reserveOutUnits < 1000) {
      dynamicBps += 150;
    }

    if (priceImpactPercent > 5) {
      dynamicBps += 250;
    }
    if (priceImpactPercent > 10) {
      dynamicBps += 400;
    }

    const enforcedMin = directionMinSlippageBps ?? MIN_SUGGESTED_SLIPPAGE_BPS;
    dynamicBps = Math.max(dynamicBps, enforcedMin);
    dynamicBps = Math.min(dynamicBps, MAX_AUTOMATIC_SLIPPAGE_BPS);
    dynamicBps = clampSlippageBps(dynamicBps);

    return dynamicBps;
  }, [
    quote,
    poolReserves,
    fromAmount,
    fromToken,
    toToken,
    directionMinSlippageBps,
    clampSlippageBps,
  ]);

  const [showSlippageSuggestion, setShowSlippageSuggestion] = useState(false);

  useEffect(() => {
    if (!suggestedSlippageBps || !fromAmount || Number(fromAmount) <= 0) {
      setShowSlippageSuggestion(false);
      return;
    }
    if (suggestedSlippageBps > slippageBps) {
      setShowSlippageSuggestion(true);
    } else {
      setShowSlippageSuggestion(false);
    }
  }, [suggestedSlippageBps, slippageBps, fromAmount, fromToken?.id, toToken?.id]);

  const swapExceedsSlippageCap = useMemo(() => {
    if (!suggestedSlippageBps) return false;
    return suggestedSlippageBps >= MAX_SUGGESTED_SLIPPAGE_BPS && suggestedSlippageBps > slippageBps;
  }, [suggestedSlippageBps, slippageBps]);

  useEffect(() => {
    if (!directionMinSlippageBps) return;
    if (slippageBps >= directionMinSlippageBps) return;
    const normalized = applySlippageBps(directionMinSlippageBps);
    setAutoAppliedSlippageBps(normalized);
    setAutoSlippageReason('depth');
    setShowSlippageSuggestion(false);
  }, [directionMinSlippageBps, slippageBps, applySlippageBps]);

  useEffect(() => {
    if (!suggestedSlippageBps || swapExceedsSlippageCap) return;
    if (!fromAmount || Number(fromAmount) <= 0) return;
    const target = Math.max(suggestedSlippageBps, directionMinSlippageBps ?? 0);
    if (target > slippageBps) {
      const normalized = applySlippageBps(target);
      setAutoAppliedSlippageBps(normalized);
      setAutoSlippageReason('dynamic');
      setShowSlippageSuggestion(false);
    }
  }, [suggestedSlippageBps, swapExceedsSlippageCap, fromAmount, slippageBps, applySlippageBps, directionMinSlippageBps]);

  useEffect(() => {
    if (autoAppliedSlippageBps && slippageBps !== autoAppliedSlippageBps) {
      setAutoAppliedSlippageBps(null);
      setAutoSlippageReason(null);
    }
  }, [autoAppliedSlippageBps, slippageBps]);

  const canSwap =
    publicKey &&
    fromAmount &&
    Number(fromAmount) > 0 &&
    fromToken &&
    toToken &&
    fromToken.id !== toToken.id &&
    hasBalance &&
    hasValidQuote &&
    !liquidityError &&
    poolReserves !== null &&
    !priceImpactTooHigh &&
    !swapExceedsSlippageCap;

  const minReceived = useMemo(() => {
    if (!hasValidQuote || !toToken) return '-';
    const outAtomic = quote.amountOutAtomic;
    const minAtomic = (outAtomic * slippageFactor) / 10000n;
    const minDisplayRaw = fromAtomic(minAtomic, toToken.decimals);
    return `${fmtNumber(minDisplayRaw)} ${toToken.symbol}`;
  }, [quote, hasValidQuote, toToken, slippageFactor]);

  const priceImpactStr = useMemo(() => {
    if (!hasValidQuote) return '0.00%';
    return `${quote.priceImpact.toFixed(2)}%`;
  }, [quote, hasValidQuote]);

  const gasEstimate = useMemo(() => '~0.1 ALEO', []);
  
  const priceDisplay = useMemo(() => {
    if (!hasValidQuote || !fromToken || !toToken || !fromAmount) return '-';
    const amountAtomic = toAtomic(fromAmount, fromToken.decimals);
    if (amountAtomic === 0n) return '-';
    const outAtomic = quote.amountOutAtomic;
    const minAtomic = (outAtomic * slippageFactor) / 10000n;
    const unitAtomic = 10n ** BigInt(fromToken.decimals);
    const minPerUnitAtomic = (minAtomic * unitAtomic) / amountAtomic;
    const minPerUnitRaw = fromAtomic(minPerUnitAtomic, toToken.decimals);
    return `1 ${fromToken.symbol} ≈ ${fmtNumber(minPerUnitRaw)} ${toToken.symbol} (minimum after ${slippagePercent.toFixed(2)}% slippage)`;
  }, [hasValidQuote, quote, fromToken, toToken, fromAmount, slippageFactor, slippagePercent]);

  const poolExists = poolReserves !== null;
  const poolEmpty = poolReserves && poolReserves.reserve1 === BigInt(0) && poolReserves.reserve2 === BigInt(0);

  return (
    <div className="space-y-4">
      {isPending && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/70 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-4 bg-white/90 border border-primary/40 shadow-xl rounded-3xl px-10 py-8">
            <div className="text-5xl animate-waffle-bounce-gentle">🧇</div>
            <LoadingSpinner size="small" />
            <p className="text-sm font-semibold text-gray-700 text-center">
              {statusMessage || 'Waiting for transaction to finalize...'}
            </p>
          </div>
        </div>
      )}
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

      {priceImpactTooHigh && quote && !('error' in quote) && (
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-center text-yellow-800 text-sm">
          ⚠️ Price impact ({quote.priceImpact.toFixed(2)}%) is above your current slippage tolerance ({slippagePercent.toFixed(2)}%).
          {showSlippageSuggestion && suggestedSlippageBps && ` Suggested tolerance: ${(suggestedSlippageBps / 100).toFixed(2)}%.`}
        </div>
      )}
      {swapExceedsSlippageCap && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center text-red-800 text-sm">
          This trade would require more than {(MAX_SUGGESTED_SLIPPAGE_BPS / 100).toFixed(2)}% slippage. Reduce the amount or add liquidity.
        </div>
      )}
      {autoAppliedSlippageBps && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center text-blue-800 text-sm">
          {autoSlippageReason === 'depth'
            ? `Slippage tolerance automatically raised to ${(autoAppliedSlippageBps / 100).toFixed(2)}% for ALEO → WAFFLE trades with shallow ALEO reserves. Review the quote before confirming.`
            : `Adaptive slippage set to ${(autoAppliedSlippageBps / 100).toFixed(2)}% based on pool depth, price impact, and trade size. Review the quote before confirming.`}
        </div>
      )}
      {showSlippageSuggestion && suggestedSlippageBps && !swapExceedsSlippageCap && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center text-blue-800 text-sm flex flex-col gap-2">
          <span>
            Suggested slippage tolerance: {(suggestedSlippageBps / 100).toFixed(2)}% (current {slippagePercent.toFixed(2)}%).
          </span>
          <div className="flex justify-center gap-2">
            <button
              className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
              onClick={() => {
                applySlippageBps(suggestedSlippageBps);
                setShowSlippageSuggestion(false);
                setAutoAppliedSlippageBps(null);
                setAutoSlippageReason(null);
              }}
            >
              Apply suggestion
            </button>
            <button
              className="px-3 py-1 rounded-full bg-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-300 transition-colors"
              onClick={() => setShowSlippageSuggestion(false)}
            >
              Dismiss
            </button>
          </div>
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
            <span className="text-gray-600">Minimum rate:</span>
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
              <span className="text-blue-700">Receive at least:</span>
              <span className="font-medium">{minReceived}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-blue-700">Price impact:</span>
              <PriceImpactBadge impact={hasValidQuote ? quote.priceImpact : 0} />
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Slippage tolerance:</span>
              <span className="font-medium">{slippagePercent.toFixed(2)}%</span>
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
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border ${
            transactionError
              ? 'bg-red-50 border-red-200 text-red-800'
              : finalizedTxId && !isPending
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="text-center font-medium">{statusMessage}</div>
          {finalizedTxId && !transactionError && (
            <div className="text-center text-xs mt-1 text-current">
              Tx{' '}
              <a
                href={explorerTxUrl(finalizedTxId)}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {formatTxId(finalizedTxId)}
              </a>
            </div>
          )}
        </div>
      )}
      {transactionError && (
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-center text-yellow-800 text-sm">
          Tip: if swaps keep failing, try increasing your slippage tolerance in Settings or add more liquidity to this pool.
        </div>
      )}

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={!canSwap || loadingQuote || isPending}
                      className="w-full py-4 px-6 rounded-2xl bg-primary text-primary-content font-bold text-lg shadow-lg
                   hover:shadow-xl transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                   hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
      >
        {isPending ? (
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
        ) : priceImpactTooHigh ? (
          'Adjust Slippage'
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