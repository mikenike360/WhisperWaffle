import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import Layout from '@/layouts/_layout';
import Button from '@/components/ui/button';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletNotConnectedError } from '@demox-labs/aleo-wallet-adapter-base';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import React, { useCallback, useState } from 'react';
import { usePoolData } from '@/hooks/use-pool-data';
import { useUserBalances } from '@/hooks/use-user-balances';
import { useRandomImages } from '@/utils/useRandomImages';
import {
  addLiquidity,
  removeLiquidity,
  calculateOptimalLiquidity,
  canAddLiquidity,
} from '@/utils/addLiquidity';
import { initializePool } from '@/utils/initializePool';

// Token Configuration
const TOKENS = [
  { symbol: 'ALEO', name: 'Aleo', decimals: 9, icon: '/token-icons/aleo.svg' },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, icon: '/token-icons/usdc.svg' },
];

// Helper function to format numbers
const fmtNumber = (n: number | string): string => {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '0.00';
  if (num === 0) return '0.00';
  if (num < 0.0001) return '<0.0001';
  if (num < 1) return num.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  if (num < 1000) return num.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const PoolPage: NextPageWithLayout = () => {
  const { wallet, publicKey } = useWallet();
  const { poolData, loading, error, refreshPoolData } = usePoolData();
  const { balances, loading: balancesLoading, refreshBalances } = useUserBalances();
  const { randomImages, isClient } = useRandomImages();

  // Form state
  const [aleoAmount, setAleoAmount] = useState('');
  const [usdcAmount, setUsdcAmount] = useState('');
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'add' | 'remove'>('add');

  // Check if pool is empty (for initialization)
  const poolIsEmpty = !poolData || (poolData.ra === 0 && poolData.rb === 0);

  // Calculate optimal amounts when ALEO input changes
  const handleAleoChange = useCallback((value: string) => {
    setAleoAmount(value);
    if (poolData && value && !isNaN(parseFloat(value))) {
      const optimal = calculateOptimalLiquidity(parseFloat(value), poolData);
      setUsdcAmount(optimal.usdcAmount.toFixed(6));
    } else if (!value) {
      setUsdcAmount('');
    }
  }, [poolData]);

  // Calculate optimal amounts when USDC input changes
  const handleUsdcChange = useCallback((value: string) => {
    setUsdcAmount(value);
    if (poolData && value && !isNaN(parseFloat(value))) {
      const { ra, rb } = poolData;
      const aleoReserve = ra / 1000000;
      const usdcReserve = rb / 1000000;
      
      if (usdcReserve > 0) {
        const optimalAleo = (parseFloat(value) * aleoReserve) / usdcReserve;
        setAleoAmount(optimalAleo.toFixed(9));
      }
    } else if (!value) {
      setAleoAmount('');
    }
  }, [poolData]);

  // Handle add liquidity
  const handleAddLiquidity = useCallback(async () => {
    if (!publicKey || !wallet) {
      throw new WalletNotConnectedError();
    }

    const aleoAmt = parseFloat(aleoAmount);
    const usdcAmt = parseFloat(usdcAmount);

    if (!aleoAmt || !usdcAmt || aleoAmt <= 0 || usdcAmt <= 0) {
      setTxStatus('Please enter valid amounts');
      return;
    }

    try {
      setIsAddingLiquidity(true);
      setTxStatus('Adding liquidity...');

      let txId: string;

      if (poolIsEmpty) {
        // Initialize pool if empty
        txId = await initializePool(
          wallet.adapter as LeoWalletAdapter,
          publicKey.toString(),
          aleoAmt,
          usdcAmt,
          setTxStatus
        );
      } else {
        // Add to existing pool
        const minLpTokens = 0; // In production, calculate based on slippage tolerance
        txId = await addLiquidity(
          wallet.adapter as LeoWalletAdapter,
          publicKey.toString(),
          aleoAmt,
          usdcAmt,
          minLpTokens,
          setTxStatus
        );
      }

      setTxStatus(`Liquidity added successfully! Transaction: ${txId}`);
      
      // Clear form and refresh data
      setAleoAmount('');
      setUsdcAmount('');
      
      setTimeout(() => {
        refreshPoolData();
        refreshBalances();
      }, 2000);

    } catch (error) {
      console.error('Error adding liquidity:', error);
      setTxStatus(`Error: ${error instanceof Error ? error.message : 'Failed to add liquidity'}`);
    } finally {
      setIsAddingLiquidity(false);
    }
  }, [publicKey, wallet, aleoAmount, usdcAmount, poolIsEmpty, refreshPoolData, refreshBalances]);

  // Get user balances
  const getBalance = (symbol: string): number => {
    if (balances && balances[symbol as keyof typeof balances]) {
      return parseFloat(balances[symbol as keyof typeof balances]);
    }
    return 0;
  };

  // Check if user can add liquidity
  const canAdd = aleoAmount && usdcAmount && 
                parseFloat(aleoAmount) > 0 && parseFloat(usdcAmount) > 0 &&
                parseFloat(aleoAmount) <= getBalance('ALEO') &&
                parseFloat(usdcAmount) <= getBalance('USDC');

  return (
    <div>
      <NextSeo title="WhisperWaffle Pool Management" />
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary via-primary-focus to-primary-content">
        <div className="w-full max-w-4xl bg-white/90 backdrop-blur p-6 rounded-2xl shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img src={randomImages.header.src} alt={randomImages.header.alt} className="w-12 h-12 object-contain" />
              <h1 className="text-3xl font-bold text-gray-800">💧 Pool Management</h1>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/user-dashboard"
                className="text-sm px-4 py-2 rounded-lg border hover:bg-gray-50 text-blue-600 font-medium"
                title="Go to Dashboard"
              >
                🏠 Dashboard
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pool Statistics */}
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Pool Statistics</h2>
                <p className="text-gray-600">Real-time liquidity pool data</p>
              </div>

              <div className="p-6 border rounded-xl bg-gray-50">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-800">Pool Overview</h3>
                  <button
                    onClick={refreshPoolData}
                    className="px-4 py-2 rounded-lg border hover:bg-gray-100 transition-colors disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? '🔄 Loading...' : '🔄 Refresh'}
                  </button>
                </div>
                
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading pool data...</div>
                ) : error ? (
                  <div className="text-center py-8 text-red-500">Error: {error}</div>
                ) : poolData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white rounded-lg border">
                        <div className="text-2xl font-bold text-green-600 mb-2">{fmtNumber(poolData.ra / 1000000)}</div>
                        <div className="text-sm text-gray-600">ALEO Reserve</div>
                        <div className="text-xs text-green-600 mt-1">🟢 Live Data</div>
                      </div>
                      <div className="p-4 bg-white rounded-lg border">
                        <div className="text-2xl font-bold text-blue-600 mb-2">{fmtNumber(poolData.rb / 1000000)}</div>
                        <div className="text-sm text-gray-600">USDC Reserve</div>
                        <div className="text-xs text-blue-600 mt-1">🔵 Live Data</div>
                      </div>
                    </div>
                    
                    {poolIsEmpty && (
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="text-sm text-yellow-800">
                          <div className="font-medium mb-1">🚀 Pool Initialization</div>
                          <div>This pool is empty. You can be the first to add liquidity!</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-sm text-green-800">
                        <div className="font-medium mb-1">✅ Real-time blockchain data</div>
                        <div>Last updated: {new Date(poolData.lastUpdated).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">No pool data available</div>
                )}
              </div>
            </div>

            {/* Liquidity Management */}
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Manage Liquidity</h2>
                <p className="text-gray-600">Add or remove liquidity from the pool</p>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200 mb-6">
                <button
                  onClick={() => setActiveTab('add')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'add'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  ➕ Add Liquidity
                </button>
                <button
                  onClick={() => setActiveTab('remove')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'remove'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  ➖ Remove Liquidity
                </button>
              </div>

              {/* Add Liquidity Tab */}
              {activeTab === 'add' && (
                <div className="space-y-6">
                  {/* ALEO Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">ALEO Amount</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="0.0"
                        value={aleoAmount}
                        onChange={(e) => handleAleoChange(e.target.value)}
                        className="flex-1 border rounded-lg px-3 py-2"
                        min="0"
                        step="0.000001"
                      />
                      <button
                        onClick={() => handleAleoChange(String(getBalance('ALEO') * 0.9995))}
                        className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        MAX
                      </button>
                    </div>
                    <div className="text-xs text-gray-500">
                      Balance: {fmtNumber(getBalance('ALEO'))} ALEO
                    </div>
                  </div>

                  {/* USDC Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">USDC Amount</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="0.0"
                        value={usdcAmount}
                        onChange={(e) => handleUsdcChange(e.target.value)}
                        className="flex-1 border rounded-lg px-3 py-2"
                        min="0"
                        step="0.01"
                      />
                      <button
                        onClick={() => handleUsdcChange(String(getBalance('USDC') * 0.9995))}
                        className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        MAX
                      </button>
                    </div>
                    <div className="text-xs text-gray-500">
                      Balance: {fmtNumber(getBalance('USDC'))} USDC
                    </div>
                  </div>

                  {/* Pool Share Preview */}
                  {aleoAmount && usdcAmount && poolData && !poolIsEmpty && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-800">
                        You will receive approximately{' '}
                        <span className="font-semibold">
                          {((parseFloat(aleoAmount) / (poolData.ra / 1000000)) * 100).toFixed(4)}%
                        </span>{' '}
                        of the pool
                      </div>
                    </div>
                  )}

                  {/* Add Liquidity Button */}
                  <Button
                    onClick={handleAddLiquidity}
                    disabled={!canAdd || isAddingLiquidity || !publicKey}
                    className="w-full"
                  >
                    {!publicKey ? 'Connect Wallet' :
                     isAddingLiquidity ? 'Adding Liquidity...' :
                     poolIsEmpty ? 'Initialize Pool' : 'Add Liquidity'}
                  </Button>
                </div>
              )}

              {/* Remove Liquidity Tab */}
              {activeTab === 'remove' && (
                <div className="space-y-6">
                  <div className="p-6 border rounded-xl bg-gray-50 text-center">
                    <p className="text-gray-500">Remove liquidity functionality coming soon...</p>
                    <p className="text-xs text-gray-400 mt-2">This feature will allow you to withdraw your liquidity from the pool</p>
                  </div>
                </div>
              )}

              {/* Transaction Status */}
              {txStatus && (
                <div className={`p-4 rounded-lg ${
                  txStatus.includes('Error') || txStatus.includes('Failed')
                    ? 'bg-red-50 text-red-800 border border-red-200' 
                    : 'bg-green-50 text-green-800 border border-green-200'
                }`}>
                  <div className="font-medium">Status:</div>
                  <div className="text-sm">{txStatus}</div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Static Waffles */}
        <div className="fixed inset-0 pointer-events-none z-10">
          <div className="absolute top-20 left-10 text-2xl opacity-15">🧇</div>
          <div className="absolute top-40 right-20 text-xl opacity-15">🧇</div>
          <div className="absolute bottom-40 left-20 text-2xl opacity-15">🧇</div>
          <div className="absolute bottom-20 right-10 text-xl opacity-15">🧇</div>
        </div>
        
        {/* Character Images */}
        <div className="fixed inset-0 pointer-events-none z-5">
          <div className="absolute top-10 left-5 opacity-20">
            <img src={randomImages.background1.src} alt={randomImages.background1.alt} className="w-16 h-16 object-contain" />
          </div>
          <div className="absolute top-1/3 right-5 opacity-20">
            <img src={randomImages.background2.src} alt={randomImages.background2.alt} className="w-16 h-16 object-contain" />
          </div>
          <div className="absolute bottom-1/3 left-5 opacity-20">
            <img src={randomImages.background3.src} alt={randomImages.background3.alt} className="w-16 h-16 object-contain" />
          </div>
        </div>
        
        {/* Static Syrup Drops */}
        <div className="fixed inset-0 pointer-events-none z-5">
          <div className="absolute top-0 left-1/4 text-lg opacity-30">🍁</div>
          <div className="absolute top-1/3 right-10 text-lg opacity-25">🍁</div>
          <div className="absolute bottom-1/4 left-10 text-lg opacity-25">🍁</div>
        </div>
      </div>
    </div>
  );
};

PoolPage.getLayout = page => <Layout>{page}</Layout>;
export default PoolPage;