import { useState, useEffect } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { fetchAllBalances } from '../utils/balanceFetcher';
import { getPoolList, getUserLiquidityPosition, getPoolInfo } from '../utils/poolDataFetcher';
import { COMMON_TOKEN_IDS } from '../types';

interface UserBalances {
  ALEO: string;
  TOKEN1: string;
  TOKEN2: string;
  TOKEN3: string;
}

interface LPPosition {
  poolId: string;
  token1Symbol: string;
  token2Symbol: string;
  lpTokens: string;
  sharePercentage: number;
  token1Amount: string;
  token2Amount: string;
}

export const useUserBalances = () => {
  const { wallet, publicKey } = useWallet();
  const [balances, setBalances] = useState<UserBalances>({
    ALEO: '0',
    TOKEN1: '0',
    TOKEN2: '0',
    TOKEN3: '0',
  });
  const [lpPositions, setLpPositions] = useState<LPPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = async () => {
    if (!publicKey || !wallet) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch native ALEO and token balances
      const realBalances = await fetchAllBalances(wallet.adapter as LeoWalletAdapter, publicKey.toString());
      
      // Update balances with new token structure
      const updatedBalances: UserBalances = {
        ALEO: realBalances.ALEO || '0',
        TOKEN1: realBalances.TOKEN1 || '0',
        TOKEN2: realBalances.TOKEN2 || '0',
        TOKEN3: realBalances.TOKEN3 || '0',
      };
      
      setBalances(updatedBalances);

      // Fetch LP positions
      try {
        const poolIds = await getPoolList();
        const positions: LPPosition[] = [];
        
        for (const poolId of poolIds) {
          const position = await getUserLiquidityPosition(publicKey.toString(), poolId);
          if (position && position.lpTokens > 0n) {
            const poolInfo = await getPoolInfo(poolId);
            if (poolInfo) {
              // Calculate share percentage
              const sharePercentage = poolInfo.lpTotalSupply > 0n 
                ? (Number(position.lpTokens) / Number(poolInfo.lpTotalSupply)) * 100
                : 0;
              
              // Calculate token amounts based on share
              const token1Amount = poolInfo.reserve1 > 0n 
                ? (position.lpTokens * poolInfo.reserve1) / poolInfo.lpTotalSupply
                : 0n;
              const token2Amount = poolInfo.reserve2 > 0n 
                ? (position.lpTokens * poolInfo.reserve2) / poolInfo.lpTotalSupply
                : 0n;
              
              positions.push({
                poolId,
                token1Symbol: poolInfo.token1Id,
                token2Symbol: poolInfo.token2Id,
                lpTokens: position.lpTokens.toString(),
                sharePercentage,
                token1Amount: token1Amount.toString(),
                token2Amount: token2Amount.toString(),
              });
            }
          }
        }
        
        setLpPositions(positions);
      } catch (lpError) {
        console.warn('Error fetching LP positions:', lpError);
        setLpPositions([]);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
      console.error('Error fetching balances:', err);
      
      // Set zero balances on error
      setBalances({
        ALEO: '0',
        TOKEN1: '0',
        TOKEN2: '0',
        TOKEN3: '0',
      });
      setLpPositions([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshBalances = () => {
    fetchBalances();
  };

  useEffect(() => {
    fetchBalances();
  }, [publicKey, wallet]);

  return {
    balances,
    lpPositions,
    loading,
    error,
    refreshBalances,
  };
};

// Legacy function - keeping for backward compatibility but updated
export const fetchRealUserBalances = async (
  wallet: LeoWalletAdapter,
  publicKey: string
): Promise<UserBalances> => {
  const realBalances = await fetchAllBalances(wallet, publicKey);
  
  return {
    ALEO: realBalances.ALEO || '0',
    TOKEN1: realBalances.TOKEN1 || '0',
    TOKEN2: realBalances.TOKEN2 || '0',
    TOKEN3: realBalances.TOKEN3 || '0',
  };
};