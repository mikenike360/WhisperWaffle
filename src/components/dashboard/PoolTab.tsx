import React from 'react';
import { usePoolData } from '@/hooks/use-pool-data';

const PoolTab: React.FC = () => {
  const { poolData, loading: poolLoading, error: poolError, refreshPoolData } = usePoolData();

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Pool Information</h2>
        <p className="text-gray-600">Real-time data from the WhisperWaffle liquidity pool</p>
      </div>
      
      <div className="p-6 border rounded-xl bg-gray-50">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-800">Pool Statistics</h3>
          <button
            onClick={refreshPoolData}
            className="px-4 py-2 rounded-lg border hover:bg-gray-100 transition-colors disabled:opacity-50"
            disabled={poolLoading}
          >
            {poolLoading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
        </div>
        
        {poolLoading ? (
          <div className="text-center py-8 text-gray-500">Loading pool data...</div>
        ) : poolError ? (
          <div className="text-center py-8 text-red-500">Error: {poolError}</div>
        ) : poolData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-white rounded-lg border">
              <div className="text-2xl font-bold text-green-600 mb-2">{(poolData.ra / 1000000).toFixed(6)}</div>
              <div className="text-sm text-gray-600">ALEO Reserve</div>
              <div className="text-xs text-green-600 mt-1">🟢 Live Data</div>
            </div>
            <div className="p-4 bg-white rounded-lg border">
              <div className="text-2xl font-bold text-blue-600 mb-2">{(poolData.rb / 1000000).toFixed(6)}</div>
              <div className="text-sm text-gray-600">Custom Token Reserve</div>
              <div className="text-xs text-blue-600 mt-1">🔵 Test Mode</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No pool data available</div>
        )}
        
        {poolData && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-sm text-green-800">
              <div className="font-medium mb-1">✅ Real-time blockchain data</div>
              <div>Last updated: {new Date(poolData.lastUpdated).toLocaleTimeString()}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PoolTab;
