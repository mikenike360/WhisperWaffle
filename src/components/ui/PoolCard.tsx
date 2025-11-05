import React from 'react';
import { CuratedToken } from '@/config/tokens';

interface PoolInfo {
  exists: boolean;
  isEmpty: boolean;
  reserve1: bigint;
  reserve2: bigint;
  swapFee?: number;
  poolId?: string;
}

interface PoolCardProps {
  token1: CuratedToken;
  token2: CuratedToken;
  poolId: string;
  poolInfo?: PoolInfo;
  onManageClick: () => void;
}

export const PoolCard: React.FC<PoolCardProps> = ({
  token1,
  token2,
  poolId,
  poolInfo,
  onManageClick,
}) => {
  const getPoolStatus = () => {
    if (!poolInfo?.exists) return 'Not Created';
    if (poolInfo.isEmpty) return 'Empty';
    return 'Active';
  };
  
  const statusColor = {
    'Active': 'bg-green-50 border-green-200 text-green-800',
    'Empty': 'bg-yellow-50 border-yellow-200 text-yellow-800',
    'Not Created': 'bg-gray-50 border-gray-200 text-gray-600',
  };

  const formatAmount = (amount: bigint, decimals: number): string => {
    const num = Number(amount) / Math.pow(10, decimals);
    if (num === 0) return '0';
    if (num < 0.0001) return '<0.0001';
    if (num < 1) return num.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
    if (num < 1000) return num.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const calculateTVL = (poolInfo: PoolInfo): string => {
    // Convert reserves to decimal amounts
    const reserve1 = Number(poolInfo.reserve1) / Math.pow(10, token1.decimals);
    const reserve2 = Number(poolInfo.reserve2) / Math.pow(10, token2.decimals);
    
    // For now, just sum (in reality, you'd need token prices)
    const tvl = reserve1 + reserve2;
    
    return tvl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const calculateAPR = (): number => {
    // Placeholder - would need historical data
    return 12.5;
  };

  const status = getPoolStatus();
  
  return (
    <div className="p-4 border rounded-lg bg-white hover:shadow-md transition-all duration-200 hover:border-blue-200">
      {/* Header with token pair and status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex -space-x-1 flex-shrink-0">
            <img 
              src={token1.icon} 
              alt={token1.symbol} 
              className="w-6 h-6 rounded-full border-2 border-white"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/token-icons/default.svg';
              }}
            />
            <img 
              src={token2.icon} 
              alt={token2.symbol} 
              className="w-6 h-6 rounded-full border-2 border-white"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/token-icons/default.svg';
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-800 truncate">{token1.symbol} / {token2.symbol}</h3>
            <p className="text-xs text-gray-500 truncate">{token1.name} - {token2.name}</p>
          </div>
        </div>
        
        <div className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${statusColor[status]}`}>
          {status}
        </div>
      </div>
      
      {/* Pool Statistics - Only show for active pools */}
      {poolInfo?.exists && !poolInfo.isEmpty && (
        <div className="space-y-2 mb-3">
          {/* Main stats row */}
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">TVL</div>
            <div className="text-sm font-bold text-gray-800">${calculateTVL(poolInfo)}</div>
          </div>
          
          {/* Reserve amounts */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">{token1.symbol}</span>
              <span className="font-medium text-gray-700">{formatAmount(poolInfo.reserve1, token1.decimals)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">{token2.symbol}</span>
              <span className="font-medium text-gray-700">{formatAmount(poolInfo.reserve2, token2.decimals)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Empty states */}
      {!poolInfo?.exists && (
        <div className="text-center py-4 mb-3 bg-gray-50 rounded-lg">
          <div className="text-2xl mb-1">🏊</div>
          <p className="text-gray-600 text-sm font-medium">Pool Not Created</p>
          <p className="text-gray-500 text-xs">Be the first to provide liquidity!</p>
        </div>
      )}

      {poolInfo?.exists && poolInfo.isEmpty && (
        <div className="text-center py-4 mb-3 bg-yellow-50 rounded-lg">
          <div className="text-2xl mb-1">🌊</div>
          <p className="text-gray-600 text-sm font-medium">Pool Empty</p>
          <p className="text-gray-500 text-xs">Add liquidity to activate trading</p>
        </div>
      )}
      
      {/* Action Button */}
      <button
        onClick={onManageClick}
        className={`w-full py-2 px-3 font-medium rounded-lg transition-all duration-200 text-sm ${
          poolInfo?.exists 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-green-600 text-white hover:bg-green-700'
        }`}
      >
        {poolInfo?.exists ? 'Manage Liquidity' : 'Create Pool'}
      </button>
    </div>
  );
};
