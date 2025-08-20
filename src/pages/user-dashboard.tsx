import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import Layout from '@/layouts/_layout';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import React, { useCallback, useState } from 'react';
import { useRandomImages } from '@/utils/useRandomImages';
import { SwapTab, PoolTab, BalancesTab, SettingsTab } from '@/components/dashboard';
import { usePoolData } from '@/hooks/use-pool-data';
import { useUserBalances } from '@/hooks/use-user-balances';
import { addLiquidity, removeLiquidity, calculateOptimalLiquidity, canAddLiquidity } from '@/utils/addLiquidity';

const SwapPage: NextPageWithLayout = () => {
  const { wallet, publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState<'swap' | 'pool' | 'balances' | 'settings'>('swap');
  const { randomImages, isClient } = useRandomImages();
  // Tabs managed here; tab content handled by components
  const sideImage =
    activeTab === 'pool'
      ? '/waffle_pool.png'
      : activeTab === 'balances'
      ? '/waffle_bank.png'
      : activeTab === 'settings'
      ? '/waffle_settings.png'
      : '/syrup_swap.png';
  const { poolData, loading: poolLoading, error: poolError } = usePoolData();
  const { balances, loading: balancesLoading, refreshBalances } = useUserBalances();
  const [aleoAmount, setAleoAmount] = useState('');
  const [usdcAmount, setUsdcAmount] = useState('');
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [poolSubTab, setPoolSubTab] = useState<'add' | 'remove'>('add');
  const [lpToBurn, setLpToBurn] = useState('');
  const [minAleoOut, setMinAleoOut] = useState('');
  const [minTokenOut, setMinTokenOut] = useState('');

  const handleAleoChange = useCallback((value: string) => {
    setAleoAmount(value);
    if (poolData && value && !isNaN(parseFloat(value))) {
      const optimal = calculateOptimalLiquidity(parseFloat(value), poolData);
      setUsdcAmount(optimal.usdcAmount.toFixed(6));
    } else if (!value) {
      setUsdcAmount('');
    }
  }, [poolData]);

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

  const getBalance = (symbol: string): number => {
    if (balances && (balances as any)[symbol]) {
      return parseFloat((balances as any)[symbol]);
    }
    return 0;
  };

  const canAdd = aleoAmount && usdcAmount &&
    parseFloat(aleoAmount) > 0 && parseFloat(usdcAmount) > 0 &&
    parseFloat(aleoAmount) <= getBalance('ALEO') &&
    parseFloat(usdcAmount) <= getBalance('USDC');

  const handleAddLiquidity = useCallback(async () => {
    if (!publicKey || !wallet) return;
    const aleoAmt = parseFloat(aleoAmount);
    const usdcAmt = parseFloat(usdcAmount);
    if (!aleoAmt || !usdcAmt || aleoAmt <= 0 || usdcAmt <= 0) {
      setTxStatus('Please enter valid amounts');
      return;
    }
    try {
      setIsAddingLiquidity(true);
      setTxStatus('Adding liquidity...');

      const aleoMicrocredits = Math.floor(aleoAmt * 1000000);
      const usdcUnits = Math.floor(usdcAmt * 1000000);
      const minLpTokens = 0; // MVP

      const success = await addLiquidity(
        wallet,
        aleoMicrocredits,
        usdcUnits,
        minLpTokens,
        poolData || undefined
      );

      if (success) {
        setTxStatus('Liquidity added');
        setAleoAmount('');
        setUsdcAmount('');
        setTimeout(() => refreshBalances(), 1500);
      } else {
        setTxStatus('Failed to add liquidity');
      }
    } catch (e: any) {
      setTxStatus(`Error: ${e?.message || 'Failed to add liquidity'}`);
    } finally {
      setIsAddingLiquidity(false);
    }
  }, [publicKey, wallet, aleoAmount, usdcAmount, poolData, refreshBalances]);

  const canRemove = lpToBurn && minAleoOut && minTokenOut &&
    parseFloat(lpToBurn) > 0 && parseFloat(minAleoOut) >= 0 && parseFloat(minTokenOut) >= 0;

  const handleRemoveLiquidity = useCallback(async () => {
    if (!publicKey || !wallet) return;
    const lp = parseFloat(lpToBurn);
    const minAleo = parseFloat(minAleoOut);
    const minTok = parseFloat(minTokenOut);
    if (!lp || lp <= 0) {
      setTxStatus('Please enter a valid LP amount');
      return;
    }
    try {
      setIsAddingLiquidity(true);
      setTxStatus('Removing liquidity...');
      const lpUnits = Math.floor(lp * 1_000_000);
      const minAleoUnits = Math.floor((isNaN(minAleo) ? 0 : minAleo) * 1_000_000);
      const minTokUnits = Math.floor((isNaN(minTok) ? 0 : minTok) * 1_000_000);
      const ok = await removeLiquidity(wallet, lpUnits, minAleoUnits, minTokUnits, poolData || undefined);
      if (ok) {
        setTxStatus('Liquidity removed');
        setLpToBurn('');
        setMinAleoOut('');
        setMinTokenOut('');
        setTimeout(() => refreshBalances(), 1500);
      } else {
        setTxStatus('Failed to remove liquidity');
      }
    } catch (e: any) {
      setTxStatus(`Error: ${e?.message || 'Failed to remove liquidity'}`);
    } finally {
      setIsAddingLiquidity(false);
    }
  }, [publicKey, wallet, lpToBurn, minAleoOut, minTokenOut, poolData, refreshBalances]);

  return (
    <div>
      <NextSeo title="WhisperWaffle Dashboard" />
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary via-primary-focus to-primary-content">
        <div className="w-full max-w-4xl rounded-2xl shadow-lg bg-amber-100/80 backdrop-blur-sm border border-amber-200 overflow-hidden">
          <div className="grid md:grid-cols-5">
            <div className="md:col-span-3 p-6 text-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img src={randomImages.header.src} alt={randomImages.header.alt} className="w-12 h-12 object-contain" />
              <h1 className="text-3xl font-bold text-gray-800">🧇 WhisperWaffle Dashboard</h1>
            </div>
            <div className="flex items-center gap-2" />
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('swap')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'swap'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🔄 Swap
            </button>
            <button
              onClick={() => setActiveTab('pool')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pool'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Pool Info
            </button>
            <button
              onClick={() => setActiveTab('balances')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'balances'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💰 Balances
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ⚙️ Settings
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === 'swap' && <SwapTab />}
            {activeTab === 'pool' && (
              <div className="grid grid-cols-1 gap-6">
                {/* Pool Stats */}
                <div className="p-6 border rounded-xl bg-white/80">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">Pool Overview</h3>
                    <button
                      onClick={() => window.location.reload()}
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white rounded-lg border">
                        <div className="text-2xl font-bold text-green-600 mb-2">{(poolData.ra / 1_000_000).toLocaleString()}</div>
                        <div className="text-sm text-gray-600">ALEO Reserve</div>
                      </div>
                      <div className="p-4 bg-white rounded-lg border">
                        <div className="text-2xl font-bold text-blue-600 mb-2">{(poolData.rb / 1_000_000).toLocaleString()}</div>
                        <div className="text-sm text-gray-600">Custom Token Reserve</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No pool data available</div>
                  )}
                </div>

                {/* Sub-tabs: Add / Remove */}
                <div className="p-2 rounded-xl bg-white/70 border">
                  <div className="flex border-b border-gray-200 mb-4">
                    <button
                      onClick={() => setPoolSubTab('add')}
                      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        poolSubTab === 'add'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      ➕ Add Liquidity
                    </button>
                    <button
                      onClick={() => setPoolSubTab('remove')}
                      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        poolSubTab === 'remove'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      ➖ Remove Liquidity
                    </button>
                  </div>

                  {poolSubTab === 'add' && (
                    <div className="space-y-4 p-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">ALEO Amount</label>
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
                        <div className="text-xs text-gray-500">Balance: {getBalance('ALEO').toFixed(6)} ALEO</div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Custom Token Amount</label>
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
                        <div className="text-xs text-gray-500">Balance: {getBalance('USDC').toFixed(6)} USDC</div>
                      </div>

                      <button
                        onClick={handleAddLiquidity}
                        disabled={!canAdd || isAddingLiquidity || !publicKey}
                        className="w-full bg-amber-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {!publicKey ? 'Connect Wallet' : isAddingLiquidity ? 'Adding Liquidity...' : 'Add Liquidity'}
                      </button>
                      {txStatus && (
                        <div className={`p-3 rounded-lg ${txStatus.startsWith('Error') ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
                          {txStatus}
                        </div>
                      )}
                    </div>
                  )}

                  {poolSubTab === 'remove' && (
                    <div className="space-y-4 p-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">LP Tokens to Burn</label>
                        <input
                          type="number"
                          placeholder="0.0"
                          value={lpToBurn}
                          onChange={(e) => setLpToBurn(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2"
                          min="0"
                          step="0.000001"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Min ALEO Out</label>
                          <input
                            type="number"
                            placeholder="0.0"
                            value={minAleoOut}
                            onChange={(e) => setMinAleoOut(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2"
                            min="0"
                            step="0.000001"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Min Token Out</label>
                          <input
                            type="number"
                            placeholder="0.0"
                            value={minTokenOut}
                            onChange={(e) => setMinTokenOut(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleRemoveLiquidity}
                        disabled={!canRemove || isAddingLiquidity || !publicKey}
                        className="w-full bg-red-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {!publicKey ? 'Connect Wallet' : isAddingLiquidity ? 'Removing...' : 'Remove Liquidity'}
                      </button>
                      {txStatus && (
                        <div className={`p-3 rounded-lg ${txStatus.startsWith('Error') ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
                          {txStatus}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'balances' && <BalancesTab />}
            {activeTab === 'settings' && <SettingsTab />}
          </div>
            </div>
            <div className="hidden md:flex md:col-span-2 relative items-center justify-center">
              <img
                src={sideImage}
                alt={
                  activeTab === 'pool'
                    ? 'Waffle Pool'
                    : activeTab === 'balances'
                    ? 'Waffle Bank'
                    : activeTab === 'settings'
                    ? 'Waffle Settings'
                    : 'Syrup Swap'
                }
                className="max-w-full max-h-full object-contain p-4"
              />
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

SwapPage.getLayout = page => <Layout>{page}</Layout>;
export default SwapPage;
