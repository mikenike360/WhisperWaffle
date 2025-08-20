import React from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useUserBalances } from '@/hooks/use-user-balances';

const BalancesTab: React.FC = () => {
  const { publicKey } = useWallet();
  const { balances, loading: balancesLoading, error: balancesError, refreshBalances } = useUserBalances();

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Your Token Balances</h2>
        <p className="text-gray-600">Real-time balances from your connected wallet</p>
      </div>
      
      <div className="p-6 border rounded-xl bg-gray-50">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-800">Token Holdings</h3>
          <button
            onClick={refreshBalances}
            className="px-4 py-2 rounded-lg border hover:bg-gray-100 transition-colors disabled:opacity-50"
            disabled={balancesLoading}
          >
            {balancesLoading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
        </div>
        
        {balancesLoading ? (
          <div className="text-center py-8 text-gray-500">Loading balances...</div>
        ) : balancesError ? (
          <div className="text-center py-8 text-red-500">Error: {balancesError}</div>
        ) : balances ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-lg border text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">{balances.ALEO}</div>
              <div className="text-sm text-gray-600">ALEO</div>
              <div className="text-xs text-green-600 mt-1">🟢 Live</div>
            </div>
            <div className="p-4 bg-white rounded-lg border text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">{balances.USDC}</div>
              <div className="text-sm text-gray-600">Custom Token</div>
              <div className="text-xs text-blue-600 mt-1">🔵 Test Mode</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No balance data available</div>
        )}
        
        {balances && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-sm text-green-800">
              <div className="font-medium mb-1">✅ Real-time wallet data</div>
              <div>Connected to: {publicKey?.slice(0, 8)}...{publicKey?.slice(-8)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BalancesTab;
