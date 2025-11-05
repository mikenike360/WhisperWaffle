import React, { useState, useEffect } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useUserBalances } from '@/hooks/use-user-balances';
import { useTokenDiscovery, TokenInfo } from '@/hooks/use-token-discovery';
import { GlassCard } from '@/components/ui/GlassCard';
import { fetchTokenBalance } from '@/utils/balanceFetcher';
import { NATIVE_ALEO_ID } from '@/types';

const BalancesTab: React.FC = () => {
  const { publicKey } = useWallet();
  const { balances, lpPositions, loading: balancesLoading, error: balancesError, refreshBalances } = useUserBalances();
  const { 
    tokens, 
    loading: tokensLoading, 
    error: tokensError, 
    refreshTokens 
  } = useTokenDiscovery();
  
  const [tokenBalances, setTokenBalances] = useState<Array<{
    token: TokenInfo;
    balance: number;
    hasBalance: boolean;
  }>>([]);
  const [customTokenBalances, setCustomTokenBalances] = useState<Map<string, number>>(new Map());
  const [loadingCustomBalances, setLoadingCustomBalances] = useState(false);

  // Fetch balances for tokens that aren't in the common tokens list
  useEffect(() => {
    const fetchCustomTokenBalances = async () => {
      if (!publicKey || tokens.length === 0) return;
      
      setLoadingCustomBalances(true);
      const balanceMap = new Map<string, number>();
      
      // Fetch balances for all tokens that aren't ALEO, TOKEN1, TOKEN2, or TOKEN3
      const tokensToFetch = tokens.filter(token => {
        const symbol = token.symbol;
        return symbol !== 'ALEO' && 
               symbol !== 'TOKEN1' && 
               symbol !== 'TOKEN2' && 
               symbol !== 'TOKEN3';
      });
      
      try {
        const balancePromises = tokensToFetch.map(async (token) => {
          try {
            // Skip native ALEO (handled separately)
            if (token.id === NATIVE_ALEO_ID) {
              return { tokenId: token.id, balance: 0 };
            }
            
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
  }, [tokens, publicKey]);

  // Update token balances when tokens, balances, or custom balances change
  useEffect(() => {
    if (tokens.length > 0 && balances) {
      const tokenBalancesWithAmounts = tokens.map(token => {
        let balance = 0;
        
        // Map token symbols to balance keys for common tokens
        if (token.symbol === 'ALEO') {
          balance = parseFloat(balances.ALEO || '0');
        } else if (token.symbol === 'TOKEN1') {
          balance = parseFloat(balances.TOKEN1 || '0');
        } else if (token.symbol === 'TOKEN2') {
          balance = parseFloat(balances.TOKEN2 || '0');
        } else if (token.symbol === 'TOKEN3') {
          balance = parseFloat(balances.TOKEN3 || '0');
        } else {
          // For other tokens (like WAFFLE), use the custom token balances
          balance = customTokenBalances.get(token.id) || 0;
        }
        
        return {
          token,
          balance,
          hasBalance: balance > 0
        };
      });
      
      setTokenBalances(tokenBalancesWithAmounts);
    }
  }, [tokens, balances, customTokenBalances]);

  const fmtNumber = (n: number | string): string => {
    const num = typeof n === 'string' ? parseFloat(n) : n;
    if (isNaN(num)) return '0.00';
    if (num === 0) return '0.00';
    if (num < 0.0001) return '<0.0001';
    if (num < 1) return num.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
    if (num < 1000) return num.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getTokenIcon = (token: TokenInfo): string => {
    if (token.icon) {
      return token.icon;
    }
    
    const symbolLower = token.symbol.toLowerCase();
    return `/token-icons/${symbolLower}.svg`;
  };

  const getTokenStatus = (token: TokenInfo, hasBalance: boolean): { text: string; color: string; icon: string } => {
    if (token.id === '0field') {
      return {
        text: hasBalance ? '🟢 Native ALEO' : '⚪ No Balance',
        color: hasBalance ? 'text-success' : 'text-base-content/40',
        icon: hasBalance ? '🟢' : '⚪'
      };
    } else if (token.verified) {
      return {
        text: hasBalance ? '🔵 Verified Token' : '⚪ No Balance',
        color: hasBalance ? 'text-primary' : 'text-base-content/40',
        icon: hasBalance ? '🔵' : '⚪'
      };
    } else {
      return {
        text: hasBalance ? '🟡 Custom Token' : '⚪ No Balance',
        color: hasBalance ? 'text-warning' : 'text-base-content/40',
        icon: hasBalance ? '🟡' : '⚪'
      };
    }
  };

  const hasAnyBalance = tokenBalances.some(tb => tb.hasBalance);

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold text-base-content mb-1">Token Balances</h2>
        <p className="text-xs text-base-content/60">Real-time balances for native ALEO and tokens</p>
      </div>

      {/* Token Loading State */}
      {tokensLoading && (
        <GlassCard className="p-3 text-center text-primary text-sm">
          🔄 Loading tokens...
        </GlassCard>
      )}

      {/* Token Error State */}
      {tokensError && (
        <GlassCard className="p-3 text-center text-error text-sm">
          ⚠️ Error: {tokensError}
          <button 
            onClick={refreshTokens}
            className="ml-2 text-primary hover:underline"
          >
            Retry
          </button>
        </GlassCard>
      )}
      
      <GlassCard className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-base-content">Token Holdings</h3>
          <button
            onClick={() => {
              refreshTokens();
              refreshBalances();
              // Trigger custom balance refresh by clearing and re-fetching
              setCustomTokenBalances(new Map());
            }}
            className="px-3 py-1 rounded-lg border border-base-300 bg-base-100 text-base-content hover:bg-base-200 transition-colors disabled:opacity-50 text-sm"
            disabled={tokensLoading || balancesLoading || loadingCustomBalances}
          >
            {(tokensLoading || balancesLoading || loadingCustomBalances) ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
        </div>
        
        {(balancesLoading || loadingCustomBalances) ? (
          <div className="text-center py-6 text-base-content/60 text-sm">Loading balances...</div>
        ) : balancesError ? (
          <div className="text-center py-6 text-error text-sm">Error: {balancesError}</div>
        ) : !tokensLoading && !tokensError && tokens.length === 0 ? (
          <div className="text-center py-6 text-warning text-sm">
            ⚠️ No tokens available. Add custom tokens to see balances.
          </div>
        ) : hasAnyBalance ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {tokenBalances.map(({ token, balance, hasBalance }) => {
              const status = getTokenStatus(token, hasBalance);
              return (
                <GlassCard key={token.id} hover className="p-3 text-center">
                  <div className="mb-2">
                    <img 
                      src={getTokenIcon(token)} 
                      alt={token.name} 
                      className="w-8 h-8 mx-auto"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/token-icons/default.svg';
                      }}
                    />
                  </div>
                  <div className={`text-lg font-bold mb-1 ${hasBalance ? 'text-base-content' : 'text-base-content/40'}`}>
                    {fmtNumber(balance)}
                  </div>
                  <div className="text-sm text-base-content font-medium">{token.symbol}</div>
                  <div className="text-xs text-base-content/60">{token.name}</div>
                  <div className={`text-xs mt-1 ${status.color}`}>
                    {status.text}
                  </div>
                  {!token.verified && (
                    <div className="text-xs text-warning mt-1 bg-warning/10 px-1 py-0.5 rounded">
                      Custom
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-base-content/60">
            <div className="text-2xl mb-2">💰</div>
            <div className="text-sm font-medium mb-1">No Token Balances</div>
            <div className="text-xs">Start by receiving ALEO or adding custom tokens</div>
          </div>
        )}
      </GlassCard>

      {/* LP Positions */}
      {lpPositions && lpPositions.length > 0 && (
        <GlassCard className="p-4 md:p-6">
          <h3 className="text-lg font-semibold text-base-content mb-3">Liquidity Provider Positions</h3>
          <div className="space-y-3">
            {lpPositions.map((position, index) => (
              <GlassCard key={index} hover className="p-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-primary font-medium">Pool:</span>
                    <div className="text-xs font-mono text-base-content/60 truncate">{position.poolId}</div>
                  </div>
                  <div>
                    <span className="text-primary font-medium">LP Tokens:</span>
                    <div className="font-medium text-base-content">{fmtNumber(position.lpTokens)}</div>
                  </div>
                  <div>
                    <span className="text-primary font-medium">Share:</span>
                    <div className="font-medium text-base-content">{position.sharePercentage.toFixed(4)}%</div>
                  </div>
                  <div>
                    <span className="text-primary font-medium">Status:</span>
                    <div className="font-medium text-success">Active</div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-base-300">
                  <div className="text-xs text-base-content/80">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-medium">{position.token1Symbol}:</span> {fmtNumber(position.token1Amount)}
                      </div>
                      <div>
                        <span className="font-medium">{position.token2Symbol}:</span> {fmtNumber(position.token2Amount)}
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard hover className="p-3 text-center">
          <div className="text-lg font-bold text-base-content mb-1">
            {tokenBalances.filter(tb => tb.hasBalance).length}
          </div>
          <div className="text-xs text-base-content/60">With Balance</div>
        </GlassCard>
        
        <GlassCard hover className="p-3 text-center">
          <div className="text-lg font-bold text-base-content mb-1">
            {tokens.filter(t => t.verified).length}
          </div>
          <div className="text-xs text-base-content/60">Verified</div>
        </GlassCard>
      </div>

      {/* Instructions */}
      <GlassCard className="p-3 md:p-4">
        <h4 className="font-medium text-base-content mb-1">Getting Tokens:</h4>
        <div className="text-xs text-base-content/70 space-y-1">
          <div>• <strong>Native ALEO:</strong> Receive from other wallets</div>
          <div>• <strong>Custom Tokens:</strong> Add manually</div>
          <div>• <strong>Verified Tokens:</strong> Auto-discovered</div>
        </div>
      </GlassCard>
    </div>
  );
};

export default BalancesTab;