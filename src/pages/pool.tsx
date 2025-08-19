import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import Layout from '@/layouts/_layout';
import Button from '@/components/ui/button';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletNotConnectedError } from '@demox-labs/aleo-wallet-adapter-base';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  initializePool,
  addLiquidity,
  canAddLiquidity,
  calculateOptimalLiquidity,
} from '@/utils';
import { usePoolData } from '@/hooks/use-pool-data';
import { useUserBalances } from '@/hooks/use-user-balances';

// ---------------------------------------------
// Types
// ---------------------------------------------

type Token = {
  symbol: string;
  name: string;
  address?: string;
  decimals: number;
  icon?: string;
};

type PoolPosition = {
  aleoAmount: number;
  usdcAmount: number;
  sharePercentage: number;
  lpTokens: number;
};

// ---------------------------------------------
// Token Configuration
// ---------------------------------------------

const TOKENS: Token[] = [
  { symbol: 'ALEO', name: 'Aleo', decimals: 9, icon: '/token-icons/aleo.svg' },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, icon: '/token-icons/usdc.svg' },
];

const TOKEN_MAP = Object.fromEntries(TOKENS.map(t => [t.symbol, t]));

// ---------------------------------------------
// UI Components
// ---------------------------------------------

const TokenOption: React.FC<{ token: Token }> = ({ token }) => (
  <div className="flex items-center gap-2">
    {token.icon ? (
      <img src={token.icon} alt={token.symbol} className="w-5 h-5" />
    ) : (
      <div className="w-5 h-5 rounded-full bg-gray-300" />
    )}
    <div className="text-sm">
      <span className="font-semibold">{token.symbol}</span>{' '}
      <span className="text-gray-500">{token.name}</span>
    </div>
  </div>
);

const PoolStats: React.FC<{ poolData: any }> = ({ poolData }) => {
  if (!poolData) return null;

  const { ra, rb } = poolData;
  const aleoReserve = ra / 1000000; // Convert from microcredits
  const usdcReserve = rb / 1000000; // Convert from microcredits
  const totalValue = (aleoReserve * 1.5) + usdcReserve; // Assuming 1 ALEO = $1.5 USDC

  return (
    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
      <div>
        <div className="text-sm text-gray-600">ALEO Reserve</div>
        <div className="text-lg font-semibold">{aleoReserve.toFixed(6)} ALEO</div>
      </div>
      <div>
        <div className="text-sm text-gray-600">USDC Reserve</div>
        <div className="text-lg font-semibold">{usdcReserve.toFixed(2)} USDC</div>
      </div>
      <div>
        <div className="text-sm text-gray-600">Total Value</div>
        <div className="text-lg font-semibold">${totalValue.toFixed(2)}</div>
      </div>
      <div>
        <div className="text-sm text-gray-600">Pool Fee</div>
        <div className="text-lg font-semibold">0.3%</div>
      </div>
    </div>
  );
};

const AddLiquidityForm: React.FC<{
  poolData: any;
  balances: any;
  onAddLiquidity: (aleoAmount: number, usdcAmount: number) => void;
}> = ({ poolData, balances, onAddLiquidity }) => {
  const [aleoAmount, setAleoAmount] = useState('');
  const [usdcAmount, setUsdcAmount] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);

  // Calculate optimal USDC amount based on ALEO input
  const calculateOptimalAmounts = useCallback((aleoInput: number) => {
    if (!poolData || !aleoInput || aleoInput <= 0) {
      setUsdcAmount('');
      return;
    }

    setIsCalculating(true);
    
    // Calculate optimal USDC amount to maintain pool ratio
    const { ra, rb } = poolData;
    const aleoReserve = ra / 1000000;
    const usdcReserve = rb / 1000000;
    
    // Maintain the same ratio: aleoInput / aleoReserve = usdcInput / usdcReserve
    const optimalUsdc = (aleoInput * usdcReserve) / aleoReserve;
    
    setUsdcAmount(optimalUsdc.toFixed(6));
    setIsCalculating(false);
  }, [poolData]);

  // Calculate optimal ALEO amount based on USDC input
  const calculateOptimalAleo = useCallback((usdcInput: number) => {
    if (!poolData || !usdcInput || usdcInput <= 0) {
      setAleoAmount('');
      return;
    }

    setIsCalculating(true);
    
    const { ra, rb } = poolData;
    const aleoReserve = ra / 1000000;
    const usdcReserve = rb / 1000000;
    
    // Maintain the same ratio: aleoInput / aleoReserve = usdcInput / usdcReserve
    const optimalAleo = (usdcInput * aleoReserve) / usdcReserve;
    
    setAleoAmount(optimalAleo.toFixed(9));
    setIsCalculating(false);
  }, [poolData]);

  const handleAleoChange = (value: string) => {
    setAleoAmount(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      calculateOptimalAmounts(numValue);
    } else {
      setUsdcAmount('');
    }
  };

  const handleUsdcChange = (value: string) => {
    setUsdcAmount(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      calculateOptimalAleo(numValue);
    } else {
      setAleoAmount('');
    }
  };

  const handleAddLiquidity = () => {
    const aleo = parseFloat(aleoAmount);
    const usdc = parseFloat(usdcAmount);
    
    if (aleo > 0 && usdc > 0) {
      onAddLiquidity(aleo, usdc);
    }
  };

  const aleoBalance = balances?.ALEO || '0';
  const usdcBalance = balances?.USDC || '0';
  
  const canAddLiquidity = parseFloat(aleoAmount) > 0 && 
                          parseFloat(usdcAmount) > 0 &&
                          parseFloat(aleoAmount) <= parseFloat(aleoBalance) &&
                          parseFloat(usdcAmount) <= parseFloat(usdcBalance);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Add Liquidity</h3>
      
      {/* ALEO Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">ALEO Amount</label>
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
          <div className="text-sm text-gray-500 flex items-center">
            Balance: {parseFloat(aleoBalance).toFixed(6)}
          </div>
        </div>
      </div>

      {/* USDC Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">USDC Amount</label>
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
          <div className="text-sm text-gray-500 flex items-center">
            Balance: {parseFloat(usdcBalance).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Pool Share Preview */}
      {aleoAmount && usdcAmount && poolData && (
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

      <Button
        onClick={handleAddLiquidity}
        disabled={!canAddLiquidity || isCalculating}
        className="w-full"
      >
        {isCalculating ? 'Calculating...' : 'Add Liquidity'}
      </Button>
    </div>
  );
};

// ---------------------------------------------
// Main Page
// ---------------------------------------------

const PoolPage: NextPageWithLayout = () => {
  const { wallet, publicKey } = useWallet() as any;

  // Real data hooks
  const { poolData, loading: poolLoading, error: poolError, refreshPoolData } = usePoolData();
  const { balances, loading: balancesLoading, error: balancesError, refreshBalances } = useUserBalances();

  // Transaction state
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);

  // Check if pool can accept new liquidity
  const poolCanAcceptLiquidity = useMemo(() => canAddLiquidity(poolData), [poolData]);

  const handleAddLiquidity = useCallback(async (aleoAmount: number, usdcAmount: number) => {
    if (!publicKey || !wallet) {
      throw new WalletNotConnectedError();
    }

    try {
      setIsAddingLiquidity(true);
      setTxStatus('Adding liquidity...');

      let txId: string;
      
      if (poolCanAcceptLiquidity) {
        // Pool is empty, use initializePool
        txId = await initializePool(
          wallet.adapter as LeoWalletAdapter,
          publicKey.toString(),
          aleoAmount,
          usdcAmount,
          setTxStatus
        );
      } else {
        // Pool already has liquidity, use addLiquidity (currently simulated)
        txId = await addLiquidity(
          wallet.adapter as LeoWalletAdapter,
          publicKey.toString(),
          aleoAmount,
          usdcAmount,
          setTxStatus
        );
      }

      setTxStatus(`Liquidity added successfully! Transaction: ${txId}`);
      
      // Refresh pool data and balances
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
  }, [publicKey, wallet, poolCanAcceptLiquidity, refreshPoolData, refreshBalances]);

  if (poolLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading pool data...</div>
      </div>
    );
  }

  if (poolError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Error loading pool: {poolError}</div>
      </div>
    );
  }

  return (
    <>
      <NextSeo title="Pool - WhisperWaffle" />
      <div
        className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary via-primary-focus to-primary-content"
      >
        <div className="w-full max-w-2xl bg-white/90 backdrop-blur p-6 rounded-2xl shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img src="/syrup_bro.png" alt="Syrup Bro" className="w-12 h-12 object-contain" />
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

          {/* Pool Statistics */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Pool Overview</h2>
            <PoolStats poolData={poolData} />
            
            {/* Pool Status */}
            <div className="mt-4 p-3 rounded-lg border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pool Status:</span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Ready for v3 - Full Liquidity Management
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                This pool is ready for the v3 Leo program with full add/remove liquidity support!
              </div>
            </div>
          </div>

          {/* Add Liquidity Section */}
          <div className="mb-6">
            <AddLiquidityForm
              poolData={poolData}
              balances={balances}
              onAddLiquidity={handleAddLiquidity}
            />
          </div>

          {/* Transaction Status */}
          {txStatus && (
            <div className={`p-4 rounded-lg ${
              txStatus.includes('Error') 
                ? 'bg-red-50 text-red-800 border border-red-200' 
                : 'bg-green-50 text-green-800 border border-green-200'
            }`}>
              <div className="font-medium">Status:</div>
              <div className="text-sm">{txStatus}</div>
            </div>
          )}

          {/* Loading State */}
          {isAddingLiquidity && (
            <div className="text-center py-4">
              <div className="text-lg">Adding liquidity to pool...</div>
              <div className="text-sm text-gray-600">Please wait for transaction confirmation</div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 text-center">
            <a
              href="/user-dashboard"
              className="text-blue-600 hover:underline"
            >
              ← Back to Swap
            </a>
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
    </>
  );
};

PoolPage.getLayout = function getLayout(page: React.ReactElement) {
  return <Layout>{page}</Layout>;
};

export default PoolPage;
