// poolDataFetcher.ts
// Functions to fetch pool information from the AMM DEX contract

import { PROGRAM_ID, NATIVE_ALEO_ID } from '../types';
import { getPoolId } from './ammCalculations';

// Interface for pool information
export interface PoolInfo {
  id: string;
  token1Id: string;
  token2Id: string;
  reserve1: bigint;
  reserve2: bigint;
  lpTotalSupply: bigint;
  swapFee: number;
  protocolFee: number;
  poolType: number;
}

// Interface for liquidity position
export interface LiquidityPosition {
  userAddress: string;
  poolId: string;
  lpTokens: bigint;
  timestamp: number;
}

// Interface for pool fees
export interface PoolFees {
  lpFeesToken1: bigint;
  lpFeesToken2: bigint;
  protocolFeesToken1: bigint;
  protocolFeesToken2: bigint;
}

/**
 * Get pool ID for a token pair (matches Leo BHP256 hash)
 * @param token1Id - First token ID
 * @param token2Id - Second token ID
 * @returns Pool ID string
 */
// Re-export getPoolId from ammCalculations
export { getPoolId } from './ammCalculations';

// Legacy alias for backward compatibility
export const calculatePoolId = getPoolId;

/**
 * Fetch pool information from on-chain
 * @param poolId - Pool ID
 * @returns Pool information or null if not found
 */
export async function getPoolInfo(poolId: string): Promise<PoolInfo | null> {
  try {
    console.log('Fetching pool info for:', poolId);
    
    const response = await fetch(`/api/pool-info?id=${encodeURIComponent(poolId)}`);
    if (!response.ok) {
      console.warn(`Pool ${poolId} not found`);
      return null;
    }
    
    const data = await response.json();
    if (!data.ok || !data.pool) {
      return null;
    }
    
    // Convert string values to bigint
    return {
      id: data.pool.id,
      token1Id: data.pool.token1Id,
      token2Id: data.pool.token2Id,
      reserve1: BigInt(data.pool.reserve1),
      reserve2: BigInt(data.pool.reserve2),
      lpTotalSupply: BigInt(data.pool.lpTotalSupply),
      swapFee: data.pool.swapFee,
      protocolFee: data.pool.protocolFee,
      poolType: data.pool.poolType
    };
  } catch (error) {
    console.error('Error fetching pool info:', error);
    return null;
  }
}

/**
 * Fetch user's liquidity position from the AMM program
 * @param userAddress - User's address
 * @param poolId - Pool ID
 * @returns User's liquidity position or null
 */
export async function getUserLiquidityPosition(
  userAddress: string, 
  poolId: string
): Promise<LiquidityPosition | null> {
  try {
    console.log('Fetching user liquidity position:', { userAddress, poolId });
    
    const response = await fetch(`/api/liquidity-position?address=${encodeURIComponent(userAddress)}&poolId=${encodeURIComponent(poolId)}`);
    if (!response.ok) {
      console.warn(`No liquidity position found for user ${userAddress} in pool ${poolId}`);
      return null;
    }
    
    const data = await response.json();
    if (!data.ok || !data.position) {
      return null;
    }
    
    return {
      userAddress: data.position.user,
      poolId: data.position.poolId,
      lpTokens: BigInt(data.position.lpTokens),
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error fetching user liquidity position:', error);
    return null;
  }
}

/**
 * Get all pools for a user
 * @param userAddress - User's address
 * @returns Array of pools where user has liquidity
 */
export async function getUserPools(userAddress: string): Promise<PoolInfo[]> {
  try {
    // This would query all pools and check user's positions
    // For now, return empty array
    console.log('Fetching user pools for:', userAddress);
    
    return [];
  } catch (error) {
    console.error('Error fetching user pools:', error);
    return [];
  }
}

/**
 * Get pool fees accumulated
 * @param poolId - Pool ID
 * @returns Pool fees information
 */
export async function getPoolFees(poolId: string): Promise<PoolFees | null> {
  try {
    // This would query the on-chain pool_fees_accumulated mapping
    console.log('Fetching pool fees for:', poolId);
    
    return {
      lpFeesToken1: 0n,
      lpFeesToken2: 0n,
      protocolFeesToken1: 0n,
      protocolFeesToken2: 0n
    };
  } catch (error) {
    console.error('Error fetching pool fees:', error);
    return null;
  }
}

/**
 * Check if a pool exists
 * @param poolId - Pool ID
 * @returns True if pool exists
 */
export async function poolExists(poolId: string): Promise<boolean> {
  try {
    const poolInfo = await getPoolInfo(poolId);
    return poolInfo !== null && poolInfo.id !== '0field';
  } catch (error) {
    console.error('Error checking pool existence:', error);
    return false;
  }
}

/**
 * Get pool count (total number of pools)
 * @returns Total number of pools
 */
export async function getPoolCount(): Promise<number> {
  try {
    console.log('Fetching pool count');
    
    const response = await fetch('/api/pools');
    if (!response.ok) {
      console.warn('Failed to fetch pool count');
      return 0;
    }
    
    const data = await response.json();
    if (!data.ok) {
      return 0;
    }
    
    return data.poolCount || 0;
  } catch (error) {
    console.error('Error fetching pool count:', error);
    return 0;
  }
}

/**
 * Get pool list (all pool IDs)
 * @returns Array of pool IDs
 */
export async function getPoolList(): Promise<string[]> {
  try {
    console.log('Fetching pool list');
    
    const response = await fetch('/api/pools');
    if (!response.ok) {
      console.warn('Failed to fetch pool list');
      return [];
    }
    
    const data = await response.json();
    if (!data.ok || !data.pools) {
      return [];
    }
    
    return data.pools.map((pool: any) => pool.id);
  } catch (error) {
    console.error('Error fetching pool list:', error);
    return [];
  }
}

/**
 * Get swap quote from on-chain
 * @param token1Id - Input token ID
 * @param token2Id - Output token ID
 * @param inputAmount - Input amount
 * @param isToken1ToToken2 - Direction of swap
 * @returns Output amount or 0 if error
 */
export async function getOnChainSwapQuote(
  token1Id: string,
  token2Id: string,
  inputAmount: number,
  isToken1ToToken2: boolean
): Promise<number> {
  try {
    // This would call the on-chain get_swap_quote function
    console.log('Getting on-chain swap quote:', {
      token1Id,
      token2Id,
      inputAmount,
      isToken1ToToken2
    });
    
    return 0; // Mock data - implement actual on-chain call
  } catch (error) {
    console.error('Error getting on-chain swap quote:', error);
    return 0;
  }
}

/**
 * Get pool reserves for a token pair
 * @param token1Id - First token ID
 * @param token2Id - Second token ID
 * @returns Pool reserves or null if pool doesn't exist
 */
export async function getPoolReserves(
  token1Id: string,
  token2Id: string
): Promise<{ reserve1: bigint; reserve2: bigint; swapFee: number } | null> {
  try {
    const poolId = await getPoolId(token1Id, token2Id);
    const poolInfo = await getPoolInfo(poolId);
    
    if (!poolInfo) {
      return null;
    }
    
    // Determine which reserve corresponds to which token
    const isToken1First = poolInfo.token1Id === token1Id;
    const reserve1 = isToken1First ? poolInfo.reserve1 : poolInfo.reserve2;
    const reserve2 = isToken1First ? poolInfo.reserve2 : poolInfo.reserve1;
    
    return {
      reserve1,
      reserve2,
      swapFee: poolInfo.swapFee
    };
  } catch (error) {
    console.error('Error getting pool reserves:', error);
    return null;
  }
}

/**
 * Calculate user's share of pool value
 * @param userAddress - User's address
 * @param poolId - Pool ID
 * @returns User's share in both tokens
 */
export async function calculateUserPoolShare(
  userAddress: string,
  poolId: string
): Promise<{ token1Share: bigint; token2Share: bigint } | null> {
  try {
    const [poolInfo, userPosition] = await Promise.all([
      getPoolInfo(poolId),
      getUserLiquidityPosition(userAddress, poolId)
    ]);
    
    if (!poolInfo || !userPosition || userPosition.lpTokens === 0n) {
      return null;
    }
    
    // Calculate user's share
    const share = userPosition.lpTokens / poolInfo.lpTotalSupply;
    const token1Share = (poolInfo.reserve1 * share) / poolInfo.lpTotalSupply;
    const token2Share = (poolInfo.reserve2 * share) / poolInfo.lpTotalSupply;
    
    return { token1Share, token2Share };
  } catch (error) {
    console.error('Error calculating user pool share:', error);
    return null;
  }
}

/**
 * Get all available token pairs
 * @returns Array of token pairs
 */
export async function getAvailableTokenPairs(): Promise<Array<{ token1Id: string; token2Id: string; poolId: string }>> {
  try {
    const poolList = await getPoolList();
    const pairs = [];
    
    for (const poolId of poolList) {
      const poolInfo = await getPoolInfo(poolId);
      if (poolInfo) {
        pairs.push({
          token1Id: poolInfo.token1Id,
          token2Id: poolInfo.token2Id,
          poolId: poolInfo.id
        });
      }
    }
    
    return pairs;
  } catch (error) {
    console.error('Error getting available token pairs:', error);
    return [];
  }
}

/**
 * Validate pool creation parameters
 * @param token1Id - First token ID
 * @param token2Id - Second token ID
 * @param amount1 - Amount of first token
 * @param amount2 - Amount of second token
 * @returns True if parameters are valid
 */
export function validatePoolCreation(
  token1Id: string,
  token2Id: string,
  amount1: number,
  amount2: number
): boolean {
  // Check if tokens are different
  if (token1Id === token2Id) {
    return false;
  }
  
  // Check minimum liquidity (1000 units)
  const MIN_LIQUIDITY = 1000;
  if (amount1 < MIN_LIQUIDITY || amount2 < MIN_LIQUIDITY) {
    return false;
  }
  
  // Check maximum ratio (10000:1)
  const MAX_RATIO = 10000;
  const ratio = amount2 > amount1 ? (amount2 / amount1) : (amount1 / amount2);
  if (ratio > MAX_RATIO) {
    return false;
  }
  
  return true;
}

/**
 * Fetch all pool data for multiple pool IDs
 * @param poolIds - Array of pool IDs to fetch
 * @returns Record of pool ID to pool info
 */
export async function fetchAllPoolsData(poolIds: string[]): Promise<Record<string, PoolInfo>> {
  const poolsData: Record<string, PoolInfo> = {};
  
  for (const poolId of poolIds) {
    try {
      const poolInfo = await getPoolInfo(poolId);
      if (poolInfo) {
        poolsData[poolId] = poolInfo;
      }
    } catch (error) {
      console.warn(`Failed to fetch pool ${poolId}:`, error);
    }
  }
  
  return poolsData;
}
