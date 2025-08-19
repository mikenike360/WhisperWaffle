import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import Layout from '@/layouts/_layout';
import Button from '@/components/ui/button';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletNotConnectedError } from '@demox-labs/aleo-wallet-adapter-base';
import React, { useCallback, useState } from 'react';
import { initializePool } from '@/utils/initializePool';
import { usePoolData } from '@/hooks/use-pool-data';
import { useUserBalances } from '@/hooks/use-user-balances';
import { PROGRAM_ID } from '@/types';

const AdminPage: NextPageWithLayout = () => {
  const { wallet, publicKey } = useWallet();
  const { poolData, loading: poolLoading, error: poolError, refreshPoolData } = usePoolData();
  const { balances, loading: balancesLoading, refreshBalances } = useUserBalances();

  // Form state
  const [aleoAmount, setAleoAmount] = useState('1000');
  const [usdcAmount, setUsdcAmount] = useState('1500');
  const [isInitializing, setIsInitializing] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  // Check if pool is already initialized
  const poolIsInitialized = poolData && poolData.ra > 0 && poolData.rb > 0;

  // Handle pool initialization
  const handleInitializePool = useCallback(async () => {
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
      setIsInitializing(true);
      setTxStatus('Initializing pool...');

      const txId = await initializePool(
        wallet,
        publicKey,
        aleoAmt,
        usdcAmt,
        setTxStatus
      );

      setTxStatus(`Pool initialized successfully! TX: ${txId}`);
      
      // Refresh pool data and balances
      setTimeout(() => {
        refreshPoolData();
        refreshBalances();
      }, 2000);

    } catch (error) {
      console.error('Pool initialization error:', error);
      setTxStatus(
        error instanceof Error 
          ? `Error: ${error.message}` 
          : 'Failed to initialize pool'
      );
    } finally {
      setIsInitializing(false);
    }
  }, [wallet, publicKey, aleoAmount, usdcAmount, refreshPoolData, refreshBalances]);

  // Clear status after 10 seconds
  React.useEffect(() => {
    if (txStatus) {
      const timer = setTimeout(() => setTxStatus(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [txStatus]);

  // Format numbers for display
  const fmtNumber = (n: number): string => {
    if (n === 0) return '0.00';
    if (n < 0.0001) return '<0.0001';
    if (n < 1) return n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
    if (n < 1000) return n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <>
      <NextSeo
        title="Admin - WhisperWaffle DEX"
        description="Administrative functions for WhisperWaffle DEX including pool initialization and management."
      />

      <div className="min-h-screen bg-gradient-to-br from-primary via-primary-focus to-primary-content">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src="/waffle_bro.png" alt="Admin Waffle" className="w-16 h-16 object-contain" />
              <h1 className="text-4xl md:text-5xl font-bold text-primary-content">
                🛠️ Admin Panel
              </h1>
            </div>
            <p className="text-lg text-primary-content/80 max-w-2xl mx-auto">
              Administrative functions for WhisperWaffle DEX v3
            </p>
          </div>

          {/* Program Info */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-8 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">📋 Program Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-white/70">Program ID:</span>
                <p className="text-white font-mono text-sm break-all">{PROGRAM_ID}</p>
              </div>
              <div>
                <span className="text-white/70">Network:</span>
                <p className="text-white">Testnet Beta</p>
              </div>
            </div>
          </div>

          {/* Pool Status */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-8 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">💧 Pool Status</h2>
            
            {poolLoading ? (
              <div className="flex items-center gap-2 text-white/70">
                <div className="loading loading-spinner loading-sm"></div>
                <span>Checking pool status...</span>
              </div>
            ) : poolError ? (
              <div className="alert alert-warning">
                <span>⚠️ Pool not initialized: {poolError}</span>
              </div>
            ) : poolIsInitialized ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-success/20 rounded-lg p-4 border border-success/30">
                  <div className="text-success font-semibold">✅ Pool Initialized</div>
                  <div className="text-white/80 text-sm mt-1">Pool is ready for trading</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-white/70 text-sm">ALEO Reserve</div>
                  <div className="text-white font-bold">{fmtNumber(poolData.ra / 1000000)} ALEO</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-white/70 text-sm">USDC Reserve</div>
                  <div className="text-white font-bold">{fmtNumber(poolData.rb / 1000000)} USDC</div>
                </div>
              </div>
            ) : (
              <div className="alert alert-error">
                <span>❌ Pool not initialized - Use the form below to initialize</span>
              </div>
            )}
          </div>

          {/* User Balances */}
          {publicKey && (
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-8 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4">💰 Your Balances</h2>
              
              {balancesLoading ? (
                <div className="flex items-center gap-2 text-white/70">
                  <div className="loading loading-spinner loading-sm"></div>
                  <span>Loading balances...</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-white/70 text-sm">ALEO Balance</div>
                      <div className="text-white font-bold">
                        {balances?.ALEO ? `${balances.ALEO} ALEO` : '0.000000 ALEO'}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-white/70 text-sm">Available for Admin</div>
                      <div className="text-white font-bold">
                        {balances?.ALEO ? `${(parseFloat(balances.ALEO) - 10).toFixed(6)} ALEO` : '0.000000 ALEO'}
                      </div>
                      <div className="text-white/60 text-xs mt-1">(Keeping 10 ALEO for fees)</div>
                    </div>
                  </div>
                  
                  {/* Additional Balance Info */}
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                    <h3 className="text-blue-300 font-semibold mb-2">ℹ️ Balance Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-blue-200">USDC:</span>
                        <span className="text-white ml-2">{balances?.USDC || '0.00'}</span>
                      </div>
                      <div>
                        <span className="text-blue-200">ETH:</span>
                        <span className="text-white ml-2">{balances?.ETH || '0.0000'}</span>
                      </div>
                      <div>
                        <span className="text-blue-200">Source:</span>
                        <span className="text-white ml-2">Blockchain</span>
                      </div>
                    </div>
                    <p className="text-blue-200 text-xs mt-2">
                      ALEO balance is fetched from credits.aleo program. Token balances may show 0 if not yet implemented.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Pool Initialization Form */}
          {!poolIsInitialized && publicKey && (
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-8 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-6">🚀 Initialize Pool</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    ALEO Amount
                  </label>
                  <input
                    type="number"
                    value={aleoAmount}
                    onChange={(e) => setAleoAmount(e.target.value)}
                    className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:border-white/40 focus:ring-2 focus:ring-white/20"
                    placeholder="e.g., 1000"
                    step="0.000001"
                    min="0"
                  />
                  <p className="text-white/60 text-xs mt-1">
                    Initial ALEO liquidity (will be converted to microcredits)
                  </p>
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    USDC Amount
                  </label>
                  <input
                    type="number"
                    value={usdcAmount}
                    onChange={(e) => setUsdcAmount(e.target.value)}
                    className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:border-white/40 focus:ring-2 focus:ring-white/20"
                    placeholder="e.g., 1500"
                    step="0.000001"
                    min="0"
                  />
                  <p className="text-white/60 text-xs mt-1">
                    Initial USDC liquidity (sets initial price ratio)
                  </p>
                </div>
              </div>

              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <h3 className="text-yellow-300 font-semibold mb-2">⚠️ Important Notes</h3>
                <ul className="text-yellow-200 text-sm space-y-1">
                  <li>• Pool can only be initialized once</li>
                  <li>• This sets the initial price ratio (1 ALEO = {parseFloat(usdcAmount) / parseFloat(aleoAmount) || 1.5} USDC)</li>
                  <li>• Make sure you have sufficient ALEO balance</li>
                  <li>• Transaction fees will be deducted from your balance</li>
                </ul>
              </div>

              <Button
                onClick={handleInitializePool}
                disabled={isInitializing || !aleoAmount || !usdcAmount}
                className="w-full btn btn-primary btn-lg"
              >
                {isInitializing ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Initializing Pool...
                  </>
                ) : (
                  '🚀 Initialize Pool'
                )}
              </Button>
            </div>
          )}

          {/* Connection Prompt */}
          {!publicKey && (
            <div className="bg-white/10 backdrop-blur rounded-2xl p-8 text-center border border-white/20">
              <div className="text-6xl mb-4">🔗</div>
              <h2 className="text-2xl font-semibold text-white mb-4">Connect Your Wallet</h2>
              <p className="text-white/80 mb-6">
                Admin functions require a connected wallet to interact with the blockchain.
              </p>
              <p className="text-yellow-300 text-sm">
                ⚠️ Only the program owner can initialize the pool
              </p>
            </div>
          )}

          {/* Transaction Status */}
          {txStatus && (
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-3">📡 Transaction Status</h3>
              <div className="bg-black/20 rounded-lg p-4 font-mono text-sm text-white/90 break-all">
                {txStatus}
              </div>
            </div>
          )}
        </div>

        {/* Background Decoration */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-10 left-10 text-2xl opacity-10">🛠️</div>
          <div className="absolute top-10 right-10 text-2xl opacity-10">⚙️</div>
          <div className="absolute bottom-10 left-10 text-2xl opacity-10">🔧</div>
          <div className="absolute bottom-10 right-10 text-2xl opacity-10">⚡</div>
        </div>
      </div>
    </>
  );
};

AdminPage.getLayout = (page) => <Layout>{page}</Layout>;
export default AdminPage;
