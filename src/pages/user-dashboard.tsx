import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import Layout from '@/layouts/_layout';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import React, { useCallback, useState, useEffect } from 'react';
// Removed random images import for cleaner look
// import { useRandomImages } from '@/utils/useRandomImages';
import { SwapTab, PoolTab, BalancesTab } from '@/components/dashboard';
import { useUserBalances } from '@/hooks/use-user-balances';
import { GlassCard } from '@/components/ui/GlassCard';

const SwapPage: NextPageWithLayout = () => {
  const { wallet, publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState<'swap' | 'pool' | 'balances'>('swap');
  const { balances, loading: balancesLoading, refreshBalances } = useUserBalances();
  
  

  const getBalance = (symbol: string): number => {
    if (balances && (balances as any)[symbol]) {
      return parseFloat((balances as any)[symbol]);
    }
    return 0;
  };



  useEffect(() => {
    if (publicKey) {
      refreshBalances();
    }
  }, [publicKey]);

  return (
    <div className="min-h-screen bg-base-200 relative pb-20 pt-4 sm:pt-12">
        <div className="w-full px-4 py-8">
          <NextSeo title="WhisperWaffle Dashboard" />
          <div className="flex flex-col items-center justify-center w-full">
            <GlassCard className="w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden">
              <div className="grid md:grid-cols-5">
                <div className="md:col-span-3 p-6 text-base-content">
                  {/* Header */}
                  <div className="flex items-center justify-center mb-6 w-full">
                    <div className="text-center">
                      <img 
                        src="/logo_dashboard.png" 
                        alt="WhisperWaffle Dashboard" 
                        className="h-36 md:h-48 object-contain mx-auto"
                      />
                    </div>
                  </div>

                  {/* Tab Navigation */}
                  <div className="flex border-b border-base-300 mb-6 gap-1">
                    <button
                      onClick={() => setActiveTab('swap')}
                      className={`px-6 py-3 text-base font-medium border-b-2 transition-all ${
                        activeTab === 'swap'
                          ? 'border-primary text-primary font-bold'
                          : 'border-transparent text-base-content/60 hover:text-primary hover:border-primary/50'
                      }`}
                    >
                      <span className="text-2xl">🧇</span> Swap
                    </button>
                    <button
                      onClick={() => setActiveTab('pool')}
                      className={`px-6 py-3 text-base font-medium border-b-2 transition-all ${
                        activeTab === 'pool'
                          ? 'border-primary text-primary font-bold'
                          : 'border-transparent text-base-content/60 hover:text-primary hover:border-primary/50'
                      }`}
                    >
                      <span className="text-2xl">🌊</span> Pool
                    </button>
                    <button
                      onClick={() => setActiveTab('balances')}
                      className={`px-6 py-3 text-base font-medium border-b-2 transition-all ${
                        activeTab === 'balances'
                          ? 'border-primary text-primary font-bold'
                          : 'border-transparent text-base-content/60 hover:text-primary hover:border-primary/50'
                      }`}
                    >
                      <span className="text-2xl">💰</span> Balances
                    </button>
                    {/* Settings tab temporarily disabled */}
                  </div>

                  {/* Tab Content */}
                  <div className="min-h-[400px]">
                    {activeTab === 'swap' && (
                      <div className="p-6 border rounded-xl bg-white/90 shadow-sm">
                          <SwapTab />
                      </div>
                    )}
                    {activeTab === 'pool' && (
                        <div className="p-6 border rounded-xl bg-white/90 shadow-sm">
                        <PoolTab />
                      </div>
                    )}
                    {activeTab === 'balances' && (
                      <div className="p-6 border rounded-xl bg-white/90 shadow-sm">
                        <BalancesTab />
                              </div>
                            )}
                    {/* Settings content temporarily removed */}
                  </div>
                </div>
                <div className="hidden md:flex md:col-span-2 relative items-center justify-center" style={{ backgroundColor: 'transparent' }}>
                  <img
                    src={
                      activeTab === 'pool'
                        ? '/waffle_pool.png'
                        : activeTab === 'balances'
                        ? '/waffle_bank.png'
                        : activeTab === 'settings'
                        ? '/waffle_settings.png'
                        : '/syrup_swap.png'
                    }
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
            </GlassCard>
          </div>
        </div>
      </div>
  );
};

SwapPage.getLayout = page => <Layout>{page}</Layout>;
export default SwapPage;
