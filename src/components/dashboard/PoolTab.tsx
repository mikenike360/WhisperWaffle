import React, { useState, useEffect } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { usePoolData } from '@/hooks/use-pool-data';
import { useUserBalances } from '@/hooks/use-user-balances';
import { useTokenDiscovery, TokenInfo } from '@/hooks/use-token-discovery';
import { CURATED_TOKENS, CuratedToken } from '@/config/tokens';
import { PoolCard } from '@/components/ui/PoolCard';
import { PoolManagementModal } from '@/components/ui/PoolManagementModal';
import { getPoolList, fetchAllPoolsData, PoolInfo as RealPoolInfo } from '@/utils/poolDataFetcher';
import { NATIVE_ALEO_ID } from '@/types';

interface PoolInfo extends RealPoolInfo {
  exists: boolean;
  isEmpty: boolean;
}

interface PoolPair {
  token1: CuratedToken;
  token2: CuratedToken;
  poolId: string;
}

const PoolTab: React.FC = () => {
  const { publicKey } = useWallet();
  const { refreshPoolData } = usePoolData();
  const { refreshBalances } = useUserBalances();
  const { tokens } = useTokenDiscovery();
  
  // State for pool management
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [poolsData, setPoolsData] = useState<Record<string, PoolInfo>>({});
  const [poolsLoading, setPoolsLoading] = useState(true);
  const [poolsError, setPoolsError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch existing pools from the Aleo program
  useEffect(() => {
    const fetchExistingPools = async () => {
      setPoolsLoading(true);
      setPoolsError(null);
      
      try {
        const poolIds = await getPoolList();
        if (poolIds.length > 0) {
          const poolsInfo = await fetchAllPoolsData(poolIds);
          // Add exists and isEmpty properties to match interface
          const poolsWithMetadata = Object.fromEntries(
            Object.entries(poolsInfo).map(([id, pool]) => [
              id, 
              {
                ...pool,
                exists: true,
                isEmpty: pool.reserve1 === BigInt(0) && pool.reserve2 === BigInt(0)
              }
            ])
          );
          setPoolsData(poolsWithMetadata);
        } else {
          setPoolsData({});
        }
      } catch (error) {
        console.error('Error fetching pools:', error);
        setPoolsError(error instanceof Error ? error.message : 'Failed to fetch pools');
      } finally {
        setPoolsLoading(false);
      }
    };
    
    fetchExistingPools();
  }, []);

  // Handle pool updates
  const handlePoolUpdate = async () => {
    await refreshPoolData?.();
    await refreshBalances?.();
    
    // Refetch pool data
    const poolIds = await getPoolList();
    if (poolIds.length > 0) {
      const poolsInfo = await fetchAllPoolsData(poolIds);
      // Add exists and isEmpty properties to match interface
      const poolsWithMetadata = Object.fromEntries(
        Object.entries(poolsInfo).map(([id, pool]) => [
          id, 
          {
            ...pool,
            exists: true,
            isEmpty: pool.reserve1 === BigInt(0) && pool.reserve2 === BigInt(0)
          }
        ])
      );
      setPoolsData(poolsWithMetadata);
    } else {
      setPoolsData({});
    }
  };

  // Calculate statistics
  const activePoolCount = Object.values(poolsData).length;
  const totalTVL = Object.values(poolsData).reduce((total, pool) => {
    // Mock TVL calculation - in reality you'd need token prices
    const reserve1 = Number(pool.reserve1) / Math.pow(10, 6); // Assume 6 decimals
    const reserve2 = Number(pool.reserve2) / Math.pow(10, 6);
    return total + reserve1 + reserve2;
  }, 0);

  // Convert pool data to pairs for display
  const poolPairs: PoolPair[] = Object.values(poolsData).map(pool => {
    const token1 = CURATED_TOKENS.find(token => token.id === pool.token1Id);
    const token2 = CURATED_TOKENS.find(token => token.id === pool.token2Id);
    
    if (!token1 || !token2) {
      // Fallback for unknown tokens
      const fallbackToken1: CuratedToken = { 
        id: pool.token1Id, 
        symbol: 'UNK1', 
        name: 'Unknown Token 1', 
        decimals: 6, 
        icon: '/token-icons/default.svg',
        verified: false
      };
      const fallbackToken2: CuratedToken = { 
        id: pool.token2Id, 
        symbol: 'UNK2', 
        name: 'Unknown Token 2', 
        decimals: 6, 
        icon: '/token-icons/default.svg',
        verified: false
      };
      return {
        token1: fallbackToken1,
        token2: fallbackToken2,
        poolId: pool.id
      };
    }
    
    return {
      token1,
      token2,
      poolId: pool.id
    };
  });

  const selectedPoolPair = poolPairs.find(pair => pair.poolId === selectedPool);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-1">Liquidity Pools</h2>
          <p className="text-xs text-gray-600">Existing pools on Aleo</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          + Create Pool
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-white rounded-lg border shadow-sm text-center">
          <div className="text-lg font-bold text-blue-600 mb-1">
            {activePoolCount}
          </div>
          <div className="text-xs text-gray-600">Active Pools</div>
        </div>
        
        <div className="p-3 bg-white rounded-lg border shadow-sm text-center">
          <div className="text-lg font-bold text-purple-600 mb-1">
            ${totalTVL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-600">Total TVL</div>
        </div>
      </div>

      {/* Loading State */}
      {poolsLoading && (
        <div className="text-center py-8">
          <div className="text-2xl mb-2">🔄</div>
          <div className="text-sm font-medium text-gray-600">Loading pools...</div>
        </div>
      )}

      {/* Error State */}
      {poolsError && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center text-red-800 text-sm">
          ⚠️ Error: {poolsError}
          <button 
            onClick={() => window.location.reload()}
            className="ml-2 text-blue-600 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Pool Grid */}
      {!poolsLoading && !poolsError && poolPairs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
          {poolPairs.map(pair => (
            <PoolCard
              key={pair.poolId}
              token1={pair.token1}
              token2={pair.token2}
              poolId={pair.poolId}
              poolInfo={poolsData[pair.poolId]}
              onManageClick={() => setSelectedPool(pair.poolId)}
            />
          ))}
        </div>
      )}

      {/* No Pools State */}
      {!poolsLoading && !poolsError && poolPairs.length === 0 && (
        <div className="text-center py-8">
          <div className="text-2xl mb-2">🏊</div>
          <div className="text-sm font-medium text-gray-600 mb-2">No pools exist yet</div>
          <div className="text-xs text-gray-500">Create the first pool to get started</div>
        </div>
      )}

      {/* Pool Management Modal */}
      {selectedPool && selectedPoolPair && (
        <PoolManagementModal
          isOpen={!!selectedPool}
          onClose={() => setSelectedPool(null)}
          token1={selectedPoolPair.token1}
          token2={selectedPoolPair.token2}
          poolId={selectedPool}
          poolInfo={poolsData[selectedPool]}
          onPoolUpdate={handlePoolUpdate}
        />
      )}

      {/* Create Pool Modal */}
      {showCreateModal && (
        <PoolManagementModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          token1={undefined}
          token2={undefined}
          poolId=""
          poolInfo={undefined}
          onPoolUpdate={handlePoolUpdate}
        />
      )}

      {/* Instructions */}
      <div className="p-3 bg-gray-100 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-1">Pool Guide:</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <div>• <strong>Create:</strong> First liquidity provider</div>
          <div>• <strong>Add:</strong> Provide tokens to existing pools</div>
          <div>• <strong>Remove:</strong> Withdraw tokens anytime</div>
        </div>
      </div>
    </div>
  );
};

export default PoolTab;