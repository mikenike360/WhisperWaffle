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
        <p className="text-gray-600">Real-time balances for ALEO, Wrapped ALEO (wALEO), and Waffle USDC (wUSDC)</p>
        <p className="text-xs text-gray-500 mt-1">Using authorized_balances mapping with BHP256 hash computation</p>
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
        ) : balances && (parseFloat(balances.ALEO) > 0 || parseFloat(balances.WALEO) > 0 || parseFloat(balances.WUSDC) > 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-lg border text-center">
              <div className={`text-2xl font-bold mb-2 ${parseFloat(balances.ALEO) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                {balances.ALEO}
              </div>
              <div className="text-sm text-gray-600">ALEO</div>
              <div className={`text-xs mt-1 ${parseFloat(balances.ALEO) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                {parseFloat(balances.ALEO) > 0 ? '🟢 Native' : '⚪ No Balance'}
              </div>
            </div>
            <div className="p-4 bg-white rounded-lg border text-center">
              <div className={`text-2xl font-bold mb-2 ${parseFloat(balances.WALEO) > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                {balances.WALEO}
              </div>
              <div className="text-sm text-gray-600">Wrapped ALEO</div>
              <div className={`text-xs mt-1 ${parseFloat(balances.WALEO) > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                {parseFloat(balances.WALEO) > 0 ? '🔵 Wrapped' : '⚪ No Balance'}
              </div>
            </div>
            <div className="p-4 bg-white rounded-lg border text-center">
              <div className={`text-2xl font-bold mb-2 ${parseFloat(balances.WUSDC) > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                {balances.WUSDC}
              </div>
              <div className="text-sm text-gray-600">Waffle USDC</div>
              <div className={`text-xs mt-1 ${parseFloat(balances.WUSDC) > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                {parseFloat(balances.WUSDC) > 0 ? '🟣 Waffle' : '⚪ No Balance'}
              </div>
            </div>
          </div>
        ) : balances ? (
          <div className="text-center py-8 text-gray-500">
            <div className="mb-2">No token balances found</div>
            <div className="text-sm text-gray-400">
              This wallet doesn't have any balances for the tracked tokens
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No balance data available</div>
        )}
        
        {balances && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-sm text-green-800">
              <div className="font-medium mb-2">✅ Real-time token balances</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div><strong>ALEO:</strong> Native Aleo credits</div>
                <div><strong>wALEO:</strong> Wrapped ALEO for DEX swaps</div>
                <div><strong>wUSDC:</strong> Waffle USDC token</div>
              </div>
              <div className="mt-2">Connected to: {publicKey?.slice(0, 8)}...{publicKey?.slice(-8)}</div>
              <div className="text-xs mt-1">Using authorized_balances mapping with BHP256 hash computation</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BalancesTab;
