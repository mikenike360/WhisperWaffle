import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import Layout from '@/layouts/_layout';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import React, { useCallback, useState, useEffect } from 'react';
import { useRandomImages } from '@/utils/useRandomImages';
import { SwapTab, PoolTab, BalancesTab, SettingsTab } from '@/components/dashboard';
import { usePoolData } from '@/hooks/use-pool-data';
import { useUserBalances } from '@/hooks/use-user-balances';
import { addLiquidity, removeLiquidity, calculateOptimalLiquidity, canAddLiquidity } from '@/utils/addLiquidity';
import { checkBothTokenAllowances } from '@/utils/allowanceChecker';
import { Transaction } from '@demox-labs/aleo-wallet-adapter-base';
import { CURRENT_NETWORK } from '@/types';

const SwapPage: NextPageWithLayout = () => {
  const { wallet, publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState<'swap' | 'pool' | 'balances' | 'settings' | 'deposit'>('swap');
  const { randomImages, isClient } = useRandomImages();
  // Tabs managed here; tab content handled by components
  const sideImage =
    activeTab === 'pool'
      ? '/waffle_pool.png'
      : activeTab === 'balances'
      ? '/waffle_bank.png'
      : activeTab === 'settings'
      ? '/waffle_settings.png'
      : activeTab === 'deposit'
      ? '/waffle_bank.png'
      : '/syrup_swap.png';
  const { poolData, loading: poolLoading, error: poolError, refreshPoolData } = usePoolData();
  const { balances, loading: balancesLoading, refreshBalances } = useUserBalances();
  const [aleoAmount, setAleoAmount] = useState('');
  const [usdcAmount, setUsdcAmount] = useState('');
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [poolSubTab, setPoolSubTab] = useState<'add' | 'remove'>('add');
  const [lpToBurn, setLpToBurn] = useState('');
  const [minAleoOut, setMinAleoOut] = useState('');
  const [minTokenOut, setMinTokenOut] = useState('');
  
  // Deposit state variables
  const [depositAleoAmount, setDepositAleoAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositTxStatus, setDepositTxStatus] = useState<string | null>(null);
  
  // Withdraw state variables
  const [withdrawWaleoAmount, setWithdrawWaleoAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawTxStatus, setWithdrawTxStatus] = useState<string | null>(null);
  
  // Deposit/Withdraw sub-tab state
  const [depositSubTab, setDepositSubTab] = useState<'deposit' | 'withdraw'>('deposit');
  
  // Swap sub-tab state
  const [swapSubTab, setSwapSubTab] = useState<'swap' | 'approvals'>('swap');
  
  // Approval state variables (NEW - not replacing anything)
  const [waleoApproved, setWaleoApproved] = useState<boolean>(false);
  const [wusdcApproved, setWusdcApproved] = useState<boolean>(false);
  const [isCheckingApprovals, setIsCheckingApprovals] = useState<boolean>(true);
  const [isApprovingWaleo, setIsApprovingWaleo] = useState<boolean>(false);
  const [isApprovingWusdc, setIsApprovingWusdc] = useState<boolean>(false);
  const [approvalStatus, setApprovalStatus] = useState<string>('Checking approvals...');

  // Note: aleoAmount now represents wALEO amount for liquidity operations
  // depositAleoAmount represents native ALEO amount for wrapping
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
      const waleoReserve = ra / 1000000; // Wrapped ALEO reserve
      const wusdcReserve = rb / 1000000; // Waffle USDC reserve
      if (wusdcReserve > 0) {
        const optimalWaleo = (parseFloat(value) * waleoReserve) / wusdcReserve;
        setAleoAmount(optimalWaleo.toFixed(6));
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
    parseFloat(aleoAmount) <= getBalance('WALEO') &&
    parseFloat(usdcAmount) <= getBalance('WUSDC');

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

  // Handle ALEO deposit to get wALEO
  const handleDepositAleo = useCallback(async () => {
    if (!publicKey || !wallet) return;
    
    const aleoAmt = parseFloat(depositAleoAmount);
    if (!aleoAmt || aleoAmt <= 0) {
      setDepositTxStatus('Please enter a valid ALEO amount');
      return;
    }

    if (aleoAmt > getBalance('ALEO')) {
      setDepositTxStatus('Insufficient ALEO balance');
      return;
    }

    try {
      setIsDepositing(true);
      setDepositTxStatus('Depositing ALEO...');

      // Convert to microcredits (6 decimals)
      const aleoMicrocredits = Math.floor(aleoAmt * 1000000);

      // Create transaction using the correct API
      const transaction = Transaction.createTransaction(
        publicKey,
        CURRENT_NETWORK,
        'ww_swap_wrapped_credits_v1.aleo',
        'deposit_credits_public_signer',
        [`${aleoMicrocredits}u64`], // Explicitly format as u64
        500000, // fee in microcredits (0.5 ALEO) - TODO: Update to exact fee when available
        false
      );

      // Submit and wait for completion
      const id = await wallet.adapter.requestTransaction(transaction);
      if (!id) throw new Error('No transaction ID returned from wallet');
      
      let status = await wallet.adapter.transactionStatus(id);
      let attempts = 0;
      while (status === 'Pending' && attempts < 60) {
        await new Promise((r) => setTimeout(r, 1000));
        status = await wallet.adapter.transactionStatus(id);
        attempts++;
      }
      
      if (status === 'Completed' || status === 'Finalized') {
        setDepositTxStatus('ALEO deposited successfully! You now have wALEO tokens.');
        setDepositAleoAmount('');
        setTimeout(() => refreshBalances(), 1500);
      } else {
        setDepositTxStatus(`Transaction failed with status: ${status}`);
      }
    } catch (e: any) {
      setDepositTxStatus(`Error: ${e?.message || 'Failed to deposit ALEO'}`);
    } finally {
      setIsDepositing(false);
    }
  }, [publicKey, wallet, depositAleoAmount, refreshBalances]);

  // Handle wALEO withdrawal to get ALEO back
  const handleWithdrawWaleo = useCallback(async () => {
    if (!publicKey || !wallet) return;
    
    const waleoAmt = parseFloat(withdrawWaleoAmount);
    if (!waleoAmt || waleoAmt <= 0) {
      setWithdrawTxStatus('Please enter a valid wALEO amount');
      return;
    }

    if (waleoAmt > getBalance('WALEO')) {
      setWithdrawTxStatus('Insufficient wALEO balance');
      return;
    }

    try {
      setIsWithdrawing(true);
      setWithdrawTxStatus('Withdrawing wALEO...');

      // Convert to smallest units (6 decimals)
      const waleoUnits = Math.floor(waleoAmt * 1000000);

      // Create transaction using the correct API
      const transaction = Transaction.createTransaction(
        publicKey,
        CURRENT_NETWORK,
        'ww_swap_wrapped_credits_v1.aleo',
        'withdraw_credits_public_signer',
        [`${waleoUnits}u64`], // Explicitly format as u64
        500000, // fee in microcredits (0.5 ALEO) - TODO: Update to exact fee when available
        false
      );

      // Submit and wait for completion
      const id = await wallet.adapter.requestTransaction(transaction);
      if (!id) throw new Error('No transaction ID returned from wallet');
      
      let status = await wallet.adapter.transactionStatus(id);
      let attempts = 0;
      while (status === 'Pending' && attempts < 60) {
        await new Promise((r) => setTimeout(r, 1000));
        status = await wallet.adapter.transactionStatus(id);
        attempts++;
      }
      
      if (status === 'Completed' || status === 'Finalized') {
        setWithdrawTxStatus('wALEO withdrawn successfully! You now have ALEO back.');
        setWithdrawWaleoAmount('');
        setTimeout(() => refreshBalances(), 1500);
      } else {
        setWithdrawTxStatus(`Transaction failed with status: ${status}`);
      }
    } catch (e: any) {
      setWithdrawTxStatus(`Error: ${e?.message || 'Failed to withdraw wALEO'}`);
    } finally {
      setIsWithdrawing(false);
    }
  }, [publicKey, wallet, withdrawWaleoAmount, refreshBalances]);

  // Approval functions (NEW - not replacing anything)
  const checkApprovals = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      setIsCheckingApprovals(true);
      setApprovalStatus('Checking existing approvals...');
      
      const { waleoApproved, wusdcApproved } = await checkBothTokenAllowances(
        publicKey, 
        'aleo1xyu6ndzryyelv46m583arr86zq9mplkany4lhtf4e3yn92xw6vrqm9y5uq' // main swap program address
      );
      
      setWaleoApproved(waleoApproved);
      setWusdcApproved(wusdcApproved);
      
      if (waleoApproved && wusdcApproved) {
        setApprovalStatus('Both tokens appear to be approved!');
      } else if (waleoApproved === false && wusdcApproved === false) {
        setApprovalStatus('No token approvals found - approvals may be needed');
      }
      
    } catch (error) {
      console.error('Error checking approvals:', error);
      setApprovalStatus('Error checking approvals');
    } finally {
      setIsCheckingApprovals(false);
    }
  }, [publicKey, wallet]); // Only depend on publicKey to run once when wallet connects

  const approveWaleo = useCallback(async () => {
    if (!publicKey || !wallet) return;
    
    try {
      setIsApprovingWaleo(true);
      setApprovalStatus('Approving wALEO...');
      
      // Create approval transaction for wALEO
      const transaction = Transaction.createTransaction(
        publicKey,
        CURRENT_NETWORK,
        'token_registry.aleo',
        'approve_public',
        [
          '68744147421264673966385360field', // wALEO token ID
          'aleo1xyu6ndzryyelv46m583arr86zq9mplkany4lhtf4e3yn92xw6vrqm9y5uq', // main swap program address
          '1000000000000u128' // approval amount (1 trillion units)
        ],
        500000, // fee in microcredits (0.5 ALEO)
        false
      );

      // Submit and wait for completion
      const id = await wallet.adapter.requestTransaction(transaction);
      if (!id) throw new Error('No transaction ID returned from wallet');

      let status = await wallet.adapter.transactionStatus(id);
      let attempts = 0;
      while (status === 'Pending' && attempts < 60) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        status = await wallet.adapter.transactionStatus(id);
        attempts++;
      }

      if (status === 'Completed' || status === 'Finalized') {
        setWaleoApproved(true);
        setApprovalStatus('wALEO approved successfully!');
      } else {
        setApprovalStatus(`wALEO approval failed with status: ${status}`);
      }
      
    } catch (error: any) {
      setApprovalStatus(`Error approving wALEO: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsApprovingWaleo(false);
    }
  }, [publicKey, wallet]);

  const approveWusdc = useCallback(async () => {
    if (!publicKey || !wallet) return;
    
    try {
      setIsApprovingWusdc(true);
      setApprovalStatus('Approving wUSDC...');
      
      // Create approval transaction for wUSDC
      const transaction = Transaction.createTransaction(
        publicKey,
        CURRENT_NETWORK,
        'token_registry.aleo',
        'approve_public',
        [
          '42069187360666field', // wUSDC token ID
          'aleo1xyu6ndzryyelv46m583arr86zq9mplkany4lhtf4e3yn92xw6vrqm9y5uq', // main swap program address
          '1000000000000u128' // approval amount (1 trillion units)
        ],
        500000, // fee in microcredits (0.5 ALEO)
        false
      );

      // Submit and wait for completion
      const id = await wallet.adapter.requestTransaction(transaction);
      if (!id) throw new Error('No transaction ID returned from wallet');

      let status = await wallet.adapter.transactionStatus(id);
      let attempts = 0;
      while (status === 'Pending' && attempts < 60) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        status = await wallet.adapter.transactionStatus(id);
        attempts++;
      }

      if (status === 'Completed' || status === 'Finalized') {
        setWusdcApproved(true);
        setApprovalStatus('wUSDC approved successfully!');
      } else {
        setApprovalStatus(`wUSDC approval failed with status: ${status}`);
      }
      
    } catch (error: any) {
      setApprovalStatus(`Error approving wUSDC: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsApprovingWusdc(false);
    }
  }, [publicKey, wallet]);

  // Check if both tokens are approved
  const bothTokensApproved = waleoApproved && wusdcApproved;

  useEffect(() => {
    if (publicKey) {
      refreshBalances();
      refreshPoolData();
      checkApprovals(); // NEW: Add approval check
    }
  }, [publicKey]); // Only depend on publicKey to run once when wallet connects

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-focus to-primary-content relative pb-20 pt-4 sm:pt-12">
        {/* Dashboard content - no more approval overlay blocking access */}

        {/* Existing Dashboard Content - PRESERVED EXACTLY AS IS */}
        <div className="w-full px-4 py-8">
          <NextSeo title="WhisperWaffle Dashboard" />
          <div className="flex flex-col items-center justify-center w-full">
            <div className="w-full max-w-4xl rounded-2xl shadow-lg bg-amber-100/80 backdrop-blur-sm border border-amber-200 overflow-hidden">
              <div className="grid md:grid-cols-5">
                <div className="md:col-span-3 p-6 text-gray-800">
                  {/* Header */}
                  {/* <div className="flex items-center justify-center mb-6 w-full">
                    <div className="text-center">
                      <img src="/logo.png" alt="WhisperWaffle Logo" className="h-32 md:h-48 lg:h-72 object-contain mx-auto" />
                    </div>
                  </div> */}

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
                      🌊 Pool
                    </button>
                    <button
                      onClick={() => setActiveTab('deposit')}
                      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'deposit'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      💸 Wrap Aleo
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
                    {activeTab === 'swap' && (
                      <div className="p-6 border rounded-xl bg-white/90 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-semibold text-gray-800">Token Swap</h3>
                        </div>
                        
                        {/* Sub-tabs: Swap / Approvals */}
                        <div className="flex border-b border-gray-200 mb-4">
                          <button
                            onClick={() => setSwapSubTab('swap')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                              swapSubTab === 'swap'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            🔄 Swap Tokens
                          </button>
                          <button
                            onClick={() => setSwapSubTab('approvals')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                              swapSubTab === 'approvals'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            🔐 Token Approvals
                          </button>
                        </div>

                        {swapSubTab === 'swap' && (
                          <SwapTab refreshPoolData={refreshPoolData} />
                        )}

                        {swapSubTab === 'approvals' && (
                          <div className="space-y-6">
                            {/* Approval Status */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-3 rounded-lg border">
                                <div className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded-full ${waleoApproved ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                  <span className="font-medium">Wrapped ALEO (wALEO)</span>
                                </div>
                                <span className={`text-sm ${waleoApproved ? 'text-green-600' : 'text-gray-500'}`}>
                                  {waleoApproved ? '✓ Approved' : 'Pending'}
                                </span>
                              </div>

                              <div className="flex items-center justify-between p-3 rounded-lg border">
                                <div className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded-full ${wusdcApproved ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                  <span className="font-medium">Waffle USDC (wUSDC)</span>
                                </div>
                                <span className={`text-sm ${wusdcApproved ? 'text-green-600' : 'text-gray-500'}`}>
                                  {wusdcApproved ? '✓ Approved' : 'Pending'}
                                </span>
                              </div>
                            </div>

                            {/* Approval Buttons */}
                            <div className="space-y-3">
                              {!waleoApproved && (
                                <button
                                  onClick={approveWaleo}
                                  disabled={isApprovingWaleo || !publicKey}
                                  className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {!publicKey ? 'Connect Wallet' : isApprovingWaleo ? 'Approving wALEO...' : 'Approve wALEO'}
                                </button>
                              )}

                              {!wusdcApproved && (
                                <button
                                  onClick={approveWusdc}
                                  disabled={isApprovingWusdc || !publicKey}
                                  className="w-full bg-purple-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {!publicKey ? 'Connect Wallet' : isApprovingWusdc ? 'Approving wUSDC...' : 'Approve wUSDC'}
                                </button>
                              )}
                            </div>

                            {/* Status Message */}
                            {approvalStatus && (
                              <div className="mt-4 p-3 rounded-lg bg-gray-50 text-sm text-gray-700">
                                {approvalStatus}
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="space-y-2">
                              <button
                                onClick={checkApprovals}
                                disabled={isCheckingApprovals}
                                className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg text-sm hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {isCheckingApprovals ? 'Checking...' : 'Check Approval Status'}
                              </button>

                              {/* <button
                                onClick={() => {
                                  refreshBalances();
                                  setTimeout(() => checkApprovals(), 1000);
                                }}
                                className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg text-sm hover:bg-blue-600 transition-colors"
                              >
                                Refresh Balances & Check Approvals
                              </button> */}
                            </div>

                            {/* Progress Indicator */}
                            <div className="mt-4">
                              <div className="flex justify-between text-sm text-gray-600 mb-1">

                                <span>Approval Progress</span>
                                
                                <span>{waleoApproved && wusdcApproved ? '2/2' : `${(waleoApproved ? 1 : 0) + (wusdcApproved ? 1 : 0)}/2`}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${((waleoApproved ? 1 : 0) + (wusdcApproved ? 1 : 0)) * 50}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Info Box */}
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="text-sm text-blue-800">
                                <strong>About Token Approvals:</strong>
                                <ul className="mt-2 list-disc list-inside space-y-1">
                                  <li>Approvals allow the DEX to spend your tokens</li>
                                  <li>You need to approve both wALEO and wUSDC</li>
                                  <li>Approvals are one-time and secure</li>
                                  <li>You can revoke approvals anytime</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {activeTab === 'pool' && (
                      <div className="grid grid-cols-1 gap-6">
                        {/* Pool Stats */}
                        <div className="p-6 border rounded-xl bg-white/90 shadow-sm">
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
                                <div className="text-sm text-gray-600">Wrapped ALEO Reserve</div>
                              </div>
                              <div className="p-4 bg-white rounded-lg border">
                                <div className="text-2xl font-bold text-blue-600 mb-2">{(poolData.rb / 1_000_000).toLocaleString()}</div>
                                <div className="text-sm text-gray-600">Waffle USDC Reserve</div>
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
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Wrapped ALEO Amount</label>
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    placeholder="0.0"
                                    value={aleoAmount}
                                    onChange={(e) => handleAleoChange(e.target.value)}
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    min="0"
                                    step="0.000001"
                                  />
                                  <button
                                    onClick={() => handleAleoChange(String(getBalance('WALEO') * 0.9995))}
                                    className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                  >
                                    MAX
                                  </button>
                                </div>
                                <div className="text-xs text-gray-500">Balance: {getBalance('WALEO').toFixed(6)} wALEO</div>
                              </div>

                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Waffle USDC Amount</label>
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    placeholder="0.0"
                                    value={usdcAmount}
                                    onChange={(e) => handleUsdcChange(e.target.value)}
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    min="0"
                                    step="0.01"
                                  />
                                  <button
                                    onClick={() => handleUsdcChange(String(getBalance('WUSDC') * 0.9995))}
                                    className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                  >
                                    MAX
                                  </button>
                                </div>
                                <div className="text-xs text-gray-500">Balance: {getBalance('WUSDC').toFixed(6)} wUSDC</div>
                              </div>

                              <button
                                onClick={handleAddLiquidity}
                                disabled={!canAdd || isAddingLiquidity || !publicKey}
                                className="w-full bg-amber-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {!publicKey ? 'Connect Wallet' : isAddingLiquidity ? 'Adding Liquidity...' : 'Add Liquidity'}
                              </button>
                              
                              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="text-xs text-blue-800">
                                  <strong>💡 Note:</strong> You need wALEO tokens to add liquidity. 
                                  Use the Deposit tab to convert your ALEO to wALEO first.
                                </div>
                              </div>
                              
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
                                  <label className="text-sm font-medium text-gray-700 mb-2 block">Min Wrapped ALEO Out</label>
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
                                  <label className="text-sm font-medium text-gray-700 mb-2 block">Min Waffle USDC Out</label>
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
                    {activeTab === 'deposit' && (
                      <div className="p-6 border rounded-xl bg-white/90 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-semibold text-gray-800">Wrapped Token Operations</h3>
                        </div>
                        
                        {/* Sub-tabs: Deposit / Withdraw */}
                        <div className="flex border-b border-gray-200 mb-4">
                          <button
                            onClick={() => setDepositSubTab('deposit')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                              depositSubTab === 'deposit'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            💰 Deposit ALEO
                          </button>
                          <button
                            onClick={() => setDepositSubTab('withdraw')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                              depositSubTab === 'withdraw'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            🔄 Withdraw wALEO
                          </button>
                        </div>

                        {depositSubTab === 'deposit' && (
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-2 block">ALEO Amount to Deposit</label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  placeholder="0.0"
                                  value={depositAleoAmount}
                                  onChange={(e) => setDepositAleoAmount(e.target.value)}
                                  className="flex-1 border rounded-lg px-3 py-2"
                                  min="0"
                                  step="0.000001"
                                />
                                <button
                                  onClick={() => setDepositAleoAmount(String(getBalance('ALEO') * 0.9995))}
                                  className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                  MAX
                                </button>
                              </div>
                              <div className="text-xs text-gray-500">Balance: {getBalance('ALEO').toFixed(6)} ALEO</div>
                            </div>

                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="text-sm text-blue-800">
                                <strong>What happens when you deposit:</strong>
                                <ul className="mt-2 list-disc list-inside space-y-1">
                                  <li>Your ALEO is sent to the wrapped credits program</li>
                                  <li>You receive wALEO tokens in return (1:1 ratio)</li>
                                  <li>wALEO tokens can be used for swaps in the DEX</li>
                                  <li>You can withdraw wALEO back to ALEO anytime</li>
                                </ul>
                              </div>
                            </div>

                            <button
                              onClick={handleDepositAleo}
                              disabled={!depositAleoAmount || isDepositing || !publicKey}
                              className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {!publicKey ? 'Connect Wallet' : isDepositing ? 'Depositing...' : 'Deposit ALEO'}
                            </button>
                            
                            {depositTxStatus && (
                              <div className={`p-3 rounded-lg ${depositTxStatus.startsWith('Error') ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
                                {depositTxStatus}
                              </div>
                            )}
                          </div>
                        )}

                        {depositSubTab === 'withdraw' && (
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-2 block">wALEO Amount to Withdraw</label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  placeholder="0.0"
                                  value={withdrawWaleoAmount}
                                  onChange={(e) => setWithdrawWaleoAmount(e.target.value)}
                                  className="flex-1 border rounded-lg px-3 py-2"
                                  min="0"
                                  step="0.000001"
                                />
                                <button
                                  onClick={() => setWithdrawWaleoAmount(String(getBalance('WALEO') * 0.9995))}
                                  className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                  MAX
                                </button>
                              </div>
                              <div className="text-xs text-gray-500">Balance: {getBalance('WALEO').toFixed(6)} wALEO</div>
                            </div>

                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                              <div className="text-sm text-green-800">
                                <strong>What happens when you withdraw:</strong>
                                <ul className="mt-2 list-disc list-inside space-y-1">
                                  <li>Your wALEO tokens are burned</li>
                                  <li>You receive ALEO back (1:1 ratio)</li>
                                  <li>You can use the ALEO for other purposes</li>
                                  <li>You can always deposit ALEO again to get more wALEO</li>
                                </ul>
                              </div>
                            </div>

                            <button
                              onClick={handleWithdrawWaleo}
                              disabled={!withdrawWaleoAmount || isWithdrawing || !publicKey}
                              className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {!publicKey ? 'Connect Wallet' : isWithdrawing ? 'Withdrawing...' : 'Withdraw wALEO'}
                            </button>
                            
                            {withdrawTxStatus && (
                              <div className={`p-3 rounded-lg ${withdrawTxStatus.startsWith('Error') ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
                                {withdrawTxStatus}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {activeTab === 'settings' && <SettingsTab />}

                  </div>
                </div>
                <div className="hidden md:flex md:col-span-2 relative items-center justify-center" style={{ backgroundColor: 'transparent' }}>
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
            
            {/* Static Waffles - Restored */}
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute top-20 left-10 text-2xl opacity-15">🧇</div>
              <div className="absolute top-40 right-20 text-xl opacity-15">🧇</div>
              <div className="absolute top-1/2 left-20 text-2xl opacity-15">🧇</div>
              <div className="absolute top-3/4 right-10 text-xl opacity-15">🧇</div>
            </div>
            
            {/* Character Images - Restored */}
            <div className="absolute inset-0 pointer-events-none z-5">
              <div className="absolute top-10 left-5 opacity-20">
                <img src={randomImages.background1.src} alt={randomImages.background1.alt} className="w-16 h-16 object-contain" />
              </div>
              <div className="absolute top-1/3 right-5 opacity-20">
                <img src={randomImages.background2.src} alt={randomImages.background2.alt} className="w-16 h-16 object-contain" />
              </div>
              <div className="absolute top-2/3 left-5 opacity-20">
                <img src={randomImages.background3.src} alt={randomImages.background3.alt} className="w-16 h-16 object-contain" />
              </div>
            </div>
            
            {/* Static Syrup Drops - Restored */}
            <div className="absolute inset-0 pointer-events-none z-5">
              <div className="absolute top-0 left-1/4 text-lg opacity-30">🍁</div>
              <div className="absolute top-1/3 right-10 text-lg opacity-25">🍁</div>
              <div className="absolute top-2/3 left-10 text-lg opacity-25">🍁</div>
            </div>
          </div>
        </div>
      </div>
  );
};

SwapPage.getLayout = page => <Layout>{page}</Layout>;
export default SwapPage;
