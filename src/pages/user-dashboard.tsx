import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import Layout from '@/layouts/_layout';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import React, { useState } from 'react';
import { SwapTab, PoolTab, BalancesTab, SettingsTab } from '@/components/dashboard';

const SwapPage: NextPageWithLayout = () => {
  const { publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState<'swap' | 'pool' | 'balances' | 'settings'>('swap');

  return (
    <div>
      <NextSeo title="WhisperWaffle Dashboard" />
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary via-primary-focus to-primary-content">
        <div className="w-full max-w-4xl bg-white/90 backdrop-blur p-6 rounded-2xl shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img src="/waffle_bro.png" alt="Waffle Bro" className="w-12 h-12 object-contain" />
              <h1 className="text-3xl font-bold text-gray-800">🧇 WhisperWaffle Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/pool"
                className="text-sm px-4 py-2 rounded-lg border hover:bg-gray-50 text-blue-600 font-medium"
                title="Manage Pool"
              >
                💧 Pool Management
              </a>
            </div>
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
            {activeTab === 'pool' && <PoolTab />}
            {activeTab === 'balances' && <BalancesTab />}
            {activeTab === 'settings' && <SettingsTab />}
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
            <img src="/waffle_bro.png" alt="Waffle Bro" className="w-16 h-16 object-contain" />
          </div>
          <div className="absolute top-1/3 right-5 opacity-20">
            <img src="/syrup_bro.png" alt="Syrup Bro" className="w-16 h-16 object-contain" />
          </div>
          <div className="absolute bottom-1/3 left-5 opacity-20">
            <img src="/butter_baby.png" alt="Butter Baby" className="w-16 h-16 object-contain" />
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
