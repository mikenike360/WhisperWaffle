import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { Modal } from './Modal';
import { CuratedToken, CURATED_TOKENS } from '@/config/tokens';
import {
  createPoolNativeAleo,
  createPoolTokens,
  addLiquidityNativeAleo,
  addLiquidityTokens,
  removeLiquidityNativeAleo,
  removeLiquidityTokens,
  calculateOptimalLiquidityAmounts,
} from '@/utils/addLiquidity';
import { getUserLiquidityPosition, LiquidityPosition } from '@/utils/poolDataFetcher';
import { NATIVE_ALEO_ID, IS_MAINNET } from '@/types';
import { useSettings } from '@/context/SettingsContext';
import { sqrtApprox } from '@/utils/ammCalculations';
import { useTransactionStatus } from '@/hooks/useTransactionStatus';
import type { FinalizedTransactionResult } from '@/utils/transaction';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface PoolInfo {
  exists: boolean;
  isEmpty: boolean;
  reserve1: bigint;
  reserve2: bigint;
  lpTotalSupply?: bigint;
  swapFee?: number;
  poolType?: number;
  poolId?: string;
  token1Id?: string;
  token2Id?: string;
}

interface PoolManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  token1?: CuratedToken | null;
  token2?: CuratedToken | null;
  poolId: string;
  poolInfo?: PoolInfo;
  onPoolUpdate: () => void;
}

export const PoolManagementModal: React.FC<PoolManagementModalProps> = ({
  isOpen,
  onClose,
  token1,
  token2,
  poolId,
  poolInfo,
  onPoolUpdate,
}) => {
  const { publicKey, wallet } = useWallet();
  const { slippageBps } = useSettings();
  const slippagePercent = slippageBps / 100;
  const slippageFactorBigInt = BigInt(10000 - slippageBps);
  const computeMinLpTokens = (amount1Atomic: number, amount2Atomic: number): bigint => {
    try {
      if (!Number.isFinite(amount1Atomic) || !Number.isFinite(amount2Atomic)) {
        console.warn('[PoolManagementModal] Non-finite amount detected when computing min LP tokens.', {
          amount1Atomic,
          amount2Atomic,
        });
        return 0n;
    }

      const token1Big = BigInt(Math.max(Math.floor(amount1Atomic), 0));
      const token2Big = BigInt(Math.max(Math.floor(amount2Atomic), 0));

      if (token1Big <= 0n || token2Big <= 0n) {
        return 0n;
      }

      const product = token1Big * token2Big;
      const geometricMean = sqrtApprox(product);

      if (geometricMean <= 0n) {
        return 0n;
      }

      return (geometricMean * slippageFactorBigInt) / 10000n;
    } catch (error) {
      console.warn('[PoolManagementModal] Failed to compute min LP tokens, defaulting to 0.', error);
      return 0n;
    }
  };
  
  // State for pool management
  const [activeTab, setActiveTab] = useState<'add' | 'remove' | 'create'>('add');
  const [token1Amount, setToken1Amount] = useState('');
  const [token2Amount, setToken2Amount] = useState('');
  const [swapFee, setSwapFee] = useState(30); // 0.3%
  const [activeAction, setActiveAction] = useState<'create' | 'add' | 'remove' | null>(null);
  const {
    isPending: txPending,
    statusMessage,
    txId: txResultId,
    error: txError,
    start: startTransaction,
    update: updateTransaction,
    succeed: succeedTransaction,
    fail: failTransaction,
  } = useTransactionStatus();

  const formatTxId = (id: string) => (id.length > 14 ? `${id.slice(0, 6)}…${id.slice(-6)}` : id);
  const explorerTxUrl = (id: string) =>
    `${IS_MAINNET ? 'https://explorer.aleo.org/transaction/' : 'https://explorer.aleo.org/testnet/transaction/'}${id}`;
  
  // User position state
  type ExpandedUserPosition = LiquidityPosition & {
    sharePercentage?: number;
    token1Amount?: bigint;
    token2Amount?: bigint;
  };
  const [userPosition, setUserPosition] = useState<ExpandedUserPosition | null>(null);
  
  // Token selection for create mode
  const [selectedToken1, setSelectedToken1] = useState<CuratedToken | null>(token1 || null);
  const [selectedToken2, setSelectedToken2] = useState<CuratedToken | null>(token2 || null);
  
  // Dropdown state for token selectors
  const [isToken1DropdownOpen, setIsToken1DropdownOpen] = useState(false);
  const [isToken2DropdownOpen, setIsToken2DropdownOpen] = useState(false);
  const [token1DropdownPosition, setToken1DropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [token2DropdownPosition, setToken2DropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const token1ButtonRef = useRef<HTMLButtonElement>(null);
  const token1DropdownRef = useRef<HTMLDivElement>(null);
  const token2ButtonRef = useRef<HTMLButtonElement>(null);
  const token2DropdownRef = useRef<HTMLDivElement>(null);
  
  // Calculate dropdown positions when they open
  useEffect(() => {
    if (isToken1DropdownOpen && token1ButtonRef.current) {
      const rect = token1ButtonRef.current.getBoundingClientRect();
      setToken1DropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    } else {
      setToken1DropdownPosition(null);
    }
  }, [isToken1DropdownOpen]);
  
  useEffect(() => {
    if (isToken2DropdownOpen && token2ButtonRef.current) {
      const rect = token2ButtonRef.current.getBoundingClientRect();
      setToken2DropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    } else {
      setToken2DropdownPosition(null);
    }
  }, [isToken2DropdownOpen]);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (token1DropdownRef.current && !token1DropdownRef.current.contains(event.target as Node) && 
          token1ButtonRef.current && !token1ButtonRef.current.contains(event.target as Node)) {
        setIsToken1DropdownOpen(false);
      }
      if (token2DropdownRef.current && !token2DropdownRef.current.contains(event.target as Node) &&
          token2ButtonRef.current && !token2ButtonRef.current.contains(event.target as Node)) {
        setIsToken2DropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Set initial tab based on pool state
  useEffect(() => {
    if (poolInfo?.exists) {
      setActiveTab('add');
    } else {
      setActiveTab('create');
    }
  }, [poolInfo?.exists]);

  // Fetch user position if pool exists
  useEffect(() => {
    const fetchUserPosition = async () => {
      if (poolInfo?.exists && publicKey) {
        const walletAddress =
          typeof publicKey === 'string'
            ? publicKey
            : typeof publicKey === 'object' && 'toString' in publicKey
              ? (publicKey as { toString: () => string }).toString()
              : null;

        if (!walletAddress) {
          setUserPosition(null);
          return;
        }

        try {
          const position = await getUserLiquidityPosition(walletAddress, poolId);
          if (!position) {
            setUserPosition(null);
            return;
          }

          if (poolInfo?.lpTotalSupply && poolInfo.lpTotalSupply > 0n) {
            const sharePercentage =
              (Number(position.lpTokens) / Number(poolInfo.lpTotalSupply)) * 100;
            const token1Amount =
              (position.lpTokens * poolInfo.reserve1) / poolInfo.lpTotalSupply;
            const token2Amount =
              (position.lpTokens * poolInfo.reserve2) / poolInfo.lpTotalSupply;

            setUserPosition({
              ...position,
              sharePercentage,
              token1Amount,
              token2Amount,
            });
          } else {
            setUserPosition(position);
          }
        } catch (error) {
          console.warn('Failed to fetch user position:', error);
          setUserPosition(null);
        }
      }
    };
    
    fetchUserPosition();
  }, [publicKey, poolId, poolInfo?.exists, poolInfo?.lpTotalSupply, poolInfo?.reserve1, poolInfo?.reserve2]);

  // Calculate optimal amounts for adding liquidity
  const calculateOptimalAmounts = () => {
    if (!poolInfo?.exists) return;
    
    const { reserve1, reserve2 } = poolInfo;
    // Mock balances - in real implementation, get from user balances
    const token1Balance = 1000; // Mock balance
    const token2Balance = 1000; // Mock balance
    
    const currentToken1 = selectedToken1 || token1;
    const currentToken2 = selectedToken2 || token2;
    
    if (!currentToken1 || !currentToken2) return;
    
    const optimal = calculateOptimalLiquidityAmounts(
      reserve1,
      reserve2,
      token1Balance,
      token2Balance,
      currentToken1.decimals,
      currentToken2.decimals
    );
    
    setToken1Amount(optimal.token1Amount.toString());
    setToken2Amount(optimal.token2Amount.toString());
  };

  // Create pool
  const handleCreatePool = async () => {
    if (!publicKey || !wallet) return;

    const currentToken1 = selectedToken1 || token1;
    const currentToken2 = selectedToken2 || token2;

    if (!currentToken1 || !currentToken2) {
      failTransaction('Please select both tokens');
      return;
    }

    try {
      setActiveAction('create');
      startTransaction('Creating pool...');

      const amount1 = Number(token1Amount);
      const amount2 = Number(token2Amount);

      if (!Number.isFinite(amount1) || !Number.isFinite(amount2) || amount1 <= 0 || amount2 <= 0) {
        throw new Error('Invalid token amounts.');
      }

      const amount1Atomic = Math.floor(amount1 * Math.pow(10, currentToken1.decimals));
      const amount2Atomic = Math.floor(amount2 * Math.pow(10, currentToken2.decimals));

      if (amount1Atomic <= 0 || amount2Atomic <= 0) {
        throw new Error('Token amounts must be greater than zero.');
      }

      const minLpTokensBigInt = computeMinLpTokens(amount1Atomic, amount2Atomic);

      let result: FinalizedTransactionResult | null = null;
      const walletPublicKey =
        typeof publicKey === 'string'
          ? publicKey
          : typeof publicKey === 'object' && 'toString' in publicKey
            ? publicKey.toString()
            : String(publicKey);

      const statusUpdater = (message: string) => updateTransaction(message);

      if (currentToken1.id === NATIVE_ALEO_ID && currentToken2.id !== NATIVE_ALEO_ID) {
        result = await createPoolNativeAleo(
          wallet,
          walletPublicKey,
          currentToken2.id,
          amount1Atomic,
          amount2Atomic,
          swapFee,
          minLpTokensBigInt,
          statusUpdater
        );
      } else if (currentToken1.id !== NATIVE_ALEO_ID && currentToken2.id === NATIVE_ALEO_ID) {
        result = await createPoolNativeAleo(
          wallet,
          walletPublicKey,
          currentToken1.id,
          amount2Atomic,
          amount1Atomic,
          swapFee,
          minLpTokensBigInt,
          statusUpdater
        );
      } else if (currentToken1.id !== NATIVE_ALEO_ID && currentToken2.id !== NATIVE_ALEO_ID) {
        result = await createPoolTokens(
          wallet,
          walletPublicKey,
          currentToken1.id,
          currentToken2.id,
          amount1Atomic,
          amount2Atomic,
          swapFee,
          minLpTokensBigInt,
          statusUpdater
        );
      } else {
        throw new Error('Cannot create ALEO/ALEO pool.');
      }

      if (!result) {
        throw new Error('Pool creation failed.');
      }

      succeedTransaction(result.txId, `Pool finalized: ${formatTxId(result.txId)}`);
      setToken1Amount('');
      setToken2Amount('');
      onPoolUpdate();
    } catch (error) {
      console.error('Create pool error:', error);
      failTransaction(`Pool creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActiveAction(null);
    }
  };

  // Add liquidity
  const handleAddLiquidity = async () => {
    if (!publicKey || !wallet) return;

    const currentToken1 = selectedToken1 || token1;
    const currentToken2 = selectedToken2 || token2;

    if (!currentToken1 || !currentToken2) {
      failTransaction('Please select both tokens');
      return;
    }

    try {
      setActiveAction('add');
      startTransaction('Adding liquidity...');

      const amount1 = Number(token1Amount);
      const amount2 = Number(token2Amount);

      if (!Number.isFinite(amount1) || !Number.isFinite(amount2) || amount1 <= 0 || amount2 <= 0) {
        throw new Error('Invalid token amounts.');
      }

      const amount1Atomic = Math.floor(amount1 * Math.pow(10, currentToken1.decimals));
      const amount2Atomic = Math.floor(amount2 * Math.pow(10, currentToken2.decimals));

      if (amount1Atomic <= 0 || amount2Atomic <= 0) {
        throw new Error('Token amounts must be greater than zero.');
      }

      const minLpTokensBigInt = computeMinLpTokens(amount1Atomic, amount2Atomic);
      const walletPublicKey =
        typeof publicKey === 'string'
          ? publicKey
          : typeof publicKey === 'object' && 'toString' in publicKey
            ? publicKey.toString()
            : String(publicKey);

      let result: FinalizedTransactionResult | null = null;
      const statusUpdater = (message: string) => updateTransaction(message);

      if (currentToken1.id === NATIVE_ALEO_ID && currentToken2.id !== NATIVE_ALEO_ID) {
        result = await addLiquidityNativeAleo(
          wallet,
          walletPublicKey,
          currentToken2.id,
          amount1Atomic,
          amount2Atomic,
          minLpTokensBigInt,
          statusUpdater
        );
      } else if (currentToken1.id !== NATIVE_ALEO_ID && currentToken2.id === NATIVE_ALEO_ID) {
        result = await addLiquidityNativeAleo(
          wallet,
          walletPublicKey,
          currentToken1.id,
          amount2Atomic,
          amount1Atomic,
          minLpTokensBigInt,
          statusUpdater
        );
      } else if (currentToken1.id !== NATIVE_ALEO_ID && currentToken2.id !== NATIVE_ALEO_ID) {
        result = await addLiquidityTokens(
          wallet,
          walletPublicKey,
          currentToken1.id,
          currentToken2.id,
          amount1Atomic,
          amount2Atomic,
          minLpTokensBigInt,
          statusUpdater
        );
      } else {
        throw new Error('Cannot add ALEO/ALEO liquidity.');
      }

      if (!result) {
        throw new Error('Add liquidity failed.');
      }

      succeedTransaction(result.txId, `Liquidity finalized: ${formatTxId(result.txId)}`);
      setToken1Amount('');
      setToken2Amount('');
      onPoolUpdate();
    } catch (error) {
      console.error('Add liquidity error:', error);
      failTransaction(`Add liquidity failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActiveAction(null);
    }
  };

  // Remove liquidity
  const handleRemoveLiquidity = async () => {
    if (!publicKey || !wallet || !userPosition || !poolInfo) return;

    const currentToken1 = selectedToken1 || token1;
    const currentToken2 = selectedToken2 || token2;

    if (!currentToken1 || !currentToken2) {
      failTransaction('Please select both tokens');
      return;
    }

    const totalSupply = poolInfo.lpTotalSupply ?? 0n;
    if (totalSupply <= 0n) {
      throw new Error('Pool data incomplete. Please refresh and try again.');
    }

    try {
      setActiveAction('remove');
      startTransaction('Removing liquidity...');

      const lpTokensToBurn = userPosition.lpTokens;
      if (lpTokensToBurn <= 0n) {
        throw new Error('No LP tokens to remove.');
      }

      const poolToken1Id = poolInfo.token1Id ?? currentToken1.id;
      const poolToken2Id = poolInfo.token2Id ?? currentToken2.id;
      const expectedToken1OutBase = (poolInfo.reserve1 * lpTokensToBurn) / totalSupply;
      const expectedToken2OutBase = (poolInfo.reserve2 * lpTokensToBurn) / totalSupply;
      const minToken1OutValue = (expectedToken1OutBase * slippageFactorBigInt) / 10000n;
      const minToken2OutValue = (expectedToken2OutBase * slippageFactorBigInt) / 10000n;

      const getExpectedOut = (tokenId: string) =>
        tokenId === poolToken1Id ? expectedToken1OutBase : expectedToken2OutBase;
      const getMinOut = (tokenId: string) =>
        tokenId === poolToken1Id ? minToken1OutValue : minToken2OutValue;

      const walletAddress =
        typeof publicKey === 'string'
          ? publicKey
          : typeof publicKey === 'object' && 'toString' in publicKey
            ? publicKey.toString()
            : String(publicKey);

      let result: FinalizedTransactionResult | null = null;
      const statusUpdater = (message: string) => updateTransaction(message);

      if (currentToken1.id === NATIVE_ALEO_ID && currentToken2.id !== NATIVE_ALEO_ID) {
        const expectedAleoOut = getExpectedOut(NATIVE_ALEO_ID);
        const expectedTokenOut = getExpectedOut(currentToken2.id);
        const minAleoOut = getMinOut(NATIVE_ALEO_ID);
        const minTokenOut = getMinOut(currentToken2.id);

        result = await removeLiquidityNativeAleo(
          wallet,
          walletAddress,
          currentToken2.id,
          lpTokensToBurn,
          minAleoOut,
          minTokenOut,
          expectedAleoOut,
          expectedTokenOut,
          statusUpdater
        );
      } else if (currentToken1.id !== NATIVE_ALEO_ID && currentToken2.id === NATIVE_ALEO_ID) {
        const expectedAleoOut = getExpectedOut(NATIVE_ALEO_ID);
        const expectedTokenOut = getExpectedOut(currentToken1.id);
        const minAleoOut = getMinOut(NATIVE_ALEO_ID);
        const minTokenOut = getMinOut(currentToken1.id);

        result = await removeLiquidityNativeAleo(
          wallet,
          walletAddress,
          currentToken1.id,
          lpTokensToBurn,
          minAleoOut,
          minTokenOut,
          expectedAleoOut,
          expectedTokenOut,
          statusUpdater
        );
      } else {
        const expectedToken1 = getExpectedOut(currentToken1.id);
        const expectedToken2 = getExpectedOut(currentToken2.id);
        const minToken1 = getMinOut(currentToken1.id);
        const minToken2 = getMinOut(currentToken2.id);

        result = await removeLiquidityTokens(
          wallet,
          walletAddress,
          currentToken1.id,
          currentToken2.id,
          lpTokensToBurn,
          minToken1,
          minToken2,
          expectedToken1,
          expectedToken2,
          statusUpdater
        );
      }

      if (!result) {
        throw new Error('Remove liquidity failed.');
      }

      succeedTransaction(result.txId, `Liquidity removal finalized: ${formatTxId(result.txId)}`);
      setUserPosition(null);
      onPoolUpdate();
    } catch (error) {
      console.error('Remove liquidity error:', error);
      failTransaction(`Remove liquidity failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActiveAction(null);
    }
  };

  const canCreatePool = publicKey && 
    (selectedToken1 || token1) && 
    (selectedToken2 || token2) && 
    Number(token1Amount) > 0 && 
    Number(token2Amount) > 0 && 
    !poolInfo?.exists;
  const canAddLiquidity = publicKey && Number(token1Amount) > 0 && Number(token2Amount) > 0 && poolInfo?.exists;
  const canRemoveLiquidity = publicKey && userPosition && userPosition.lpTokens > 0;

  const formatWithCommas = (value: bigint | number): string => {
    const str = typeof value === 'number' ? Math.floor(value).toString() : value.toString();
    return str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const formatLpTokens = (lpTokens: bigint): string => {
    const divisor = 1_000_000_000_000n;
    const trimmed = lpTokens / divisor;
    return formatWithCommas(trimmed);
  };

  const isCreatePending = txPending && activeAction === 'create';
  const isAddPending = txPending && activeAction === 'add';
  const isRemovePending = txPending && activeAction === 'remove';
  const hasStatus = Boolean(statusMessage);
  const isStatusError = Boolean(txError);
  const isStatusSuccess = Boolean(txResultId) && !txError;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Pool">
      <div className="relative space-y-4">
        {txPending && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-sm pointer-events-none rounded-2xl">
            <div className="flex flex-col items-center gap-4 bg-white/90 border border-primary/40 shadow-xl rounded-3xl px-10 py-8">
              <div className="text-5xl">💧</div>
              <LoadingSpinner size="small" />
              <p className="text-sm font-semibold text-gray-700 text-center">
                {statusMessage || 'Waiting for transaction to finalize...'}
              </p>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            {token1 && token2 
              ? `${token1.symbol} / ${token2.symbol} Pool`
              : 'Create New Pool'
            }
          </h3>
          <p className="text-sm text-gray-600">
            {poolInfo?.exists ? 'Manage liquidity' : 'Create new pool'}
          </p>
        </div>

        {/* Pool Status */}
        {poolInfo?.exists && (selectedToken1 || token1) && (selectedToken2 || token2) && (
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">Pool Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Token 1 Reserve:</span>
                <div className="font-medium">
                  {(Number(poolInfo.reserve1) / Math.pow(10, (selectedToken1 || token1)!.decimals)).toFixed(4)} {(selectedToken1 || token1)!.symbol}
                </div>
              </div>
              <div>
                <span className="text-blue-700">Token 2 Reserve:</span>
                <div className="font-medium">
                  {(Number(poolInfo.reserve2) / Math.pow(10, (selectedToken2 || token2)!.decimals)).toFixed(4)} {(selectedToken2 || token2)!.symbol}
                </div>
              </div>
              <div>
                <span className="text-blue-700">Swap Fee:</span>
                <div className="font-medium">{poolInfo.swapFee ? poolInfo.swapFee / 100 : 0.3}%</div>
              </div>
              {(selectedToken1 || token1) && (selectedToken2 || token2) && (
                <div className="col-span-2">
                  <span className="text-blue-700">Pool:</span>
                  <div className="font-medium">
                    {(selectedToken1 || token1)!.symbol} / {(selectedToken2 || token2)!.symbol}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* User Position */}
        {userPosition && (
          <div className="p-4 bg-green-50 rounded-xl border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2">Your Position</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-green-700">LP Tokens:</span>
                <div className="font-medium">{formatLpTokens(userPosition.lpTokens)}</div>
              </div>
              <div>
                <span className="text-green-700">Share:</span>
                <div className="font-medium">
                  {userPosition.sharePercentage
                    ? `${userPosition.sharePercentage.toFixed(2)}%`
                    : '0%'}
                </div>
              </div>
              {userPosition.token1Amount !== undefined && (selectedToken1 || token1) && (
                <div className="col-span-2 text-xs text-gray-600">
                  ≈ {(Number(userPosition.token1Amount) / Math.pow(10, (selectedToken1 || token1)!.decimals)).toFixed(4)} {(selectedToken1 || token1)!.symbol} +{' '}
                  {(Number(userPosition.token2Amount ?? 0n) / Math.pow(10, (selectedToken2 || token2)!.decimals)).toFixed(4)} {(selectedToken2 || token2)!.symbol}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        {poolInfo?.exists && (
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('add')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'add'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Add Liquidity
            </button>
            <button
              onClick={() => setActiveTab('remove')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'remove'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Remove Liquidity
            </button>
          </div>
        )}

        {/* Create Pool Tab */}
        {activeTab === 'create' && (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
              <div className="text-yellow-800 text-sm">
                <strong>⚠️ Creating Pool:</strong> You're about to create a new liquidity pool. 
                This will be the initial liquidity deposit.
              </div>
            </div>

            {/* Token Selection */}
            {!token1 && !token2 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gray-50 border relative" ref={token1DropdownRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select First Token
                  </label>
                  <button
                    ref={token1ButtonRef}
                    onClick={() => setIsToken1DropdownOpen(!isToken1DropdownOpen)}
                    className="w-full p-3 border rounded-lg bg-white text-left flex items-center justify-between hover:border-gray-400 transition-colors"
                  >
                    <span className={selectedToken1 ? 'text-gray-900' : 'text-gray-500'}>
                      {selectedToken1 ? `${selectedToken1.symbol} - ${selectedToken1.name}` : 'Choose token...'}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transform transition-transform ${isToken1DropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isToken1DropdownOpen && token1DropdownPosition && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-[99] bg-transparent"
                        onClick={() => setIsToken1DropdownOpen(false)}
                      />
                      {/* Dropdown menu */}
                      <div
                        className="fixed bg-white border border-gray-300 rounded-lg shadow-xl z-[100] max-h-60 overflow-y-auto"
                        style={{
                          top: `${token1DropdownPosition.top}px`,
                          left: `${token1DropdownPosition.left}px`,
                          width: `${token1DropdownPosition.width}px`,
                        }}
                      >
                        {CURATED_TOKENS.map((token) => (
                          <button
                            key={token.id}
                            onClick={() => {
                              setSelectedToken1(token);
                              setIsToken1DropdownOpen(false);
                            }}
                            className={`w-full p-3 text-left hover:bg-gray-100 transition-colors ${
                              selectedToken1?.id === token.id
                                ? 'bg-blue-50 text-blue-600 font-semibold'
                                : 'text-gray-900'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {token.icon && (
                                <img src={token.icon} alt={token.symbol} className="w-5 h-5" />
                              )}
                              <span>{token.symbol} - {token.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border relative" ref={token2DropdownRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Second Token
                  </label>
                  <button
                    ref={token2ButtonRef}
                    onClick={() => setIsToken2DropdownOpen(!isToken2DropdownOpen)}
                    className="w-full p-3 border rounded-lg bg-white text-left flex items-center justify-between hover:border-gray-400 transition-colors"
                  >
                    <span className={selectedToken2 ? 'text-gray-900' : 'text-gray-500'}>
                      {selectedToken2 ? `${selectedToken2.symbol} - ${selectedToken2.name}` : 'Choose token...'}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transform transition-transform ${isToken2DropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isToken2DropdownOpen && token2DropdownPosition && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-[99] bg-transparent"
                        onClick={() => setIsToken2DropdownOpen(false)}
                      />
                      {/* Dropdown menu */}
                      <div
                        className="fixed bg-white border border-gray-300 rounded-lg shadow-xl z-[100] max-h-60 overflow-y-auto"
                        style={{
                          top: `${token2DropdownPosition.top}px`,
                          left: `${token2DropdownPosition.left}px`,
                          width: `${token2DropdownPosition.width}px`,
                        }}
                      >
                        {CURATED_TOKENS.filter(t => t.id !== selectedToken1?.id).map((token) => (
                          <button
                            key={token.id}
                            onClick={() => {
                              setSelectedToken2(token);
                              setIsToken2DropdownOpen(false);
                            }}
                            className={`w-full p-3 text-left hover:bg-gray-100 transition-colors ${
                              selectedToken2?.id === token.id
                                ? 'bg-blue-50 text-blue-600 font-semibold'
                                : 'text-gray-900'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {token.icon && (
                                <img src={token.icon} alt={token.symbol} className="w-5 h-5" />
                              )}
                              <span>{token.symbol} - {token.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Amount Inputs */}
            {(selectedToken1 || token1) && (selectedToken2 || token2) && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gray-50 border">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">{(selectedToken1 || token1)?.symbol} Amount</label>
                  </div>
                  <input
                    type="number"
                    placeholder="0.0"
                    value={token1Amount}
                    onChange={e => setToken1Amount(e.target.value)}
                    className="w-full p-3 border rounded-lg bg-white"
                  />
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">{(selectedToken2 || token2)?.symbol} Amount</label>
                  </div>
                  <input
                    type="number"
                    placeholder="0.0"
                    value={token2Amount}
                    onChange={e => setToken2Amount(e.target.value)}
                    className="w-full p-3 border rounded-lg bg-white"
                  />
                </div>
              </div>
            )}

            {/* Swap Fee Input */}
            <div className="p-4 rounded-xl bg-gray-50 border">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Swap Fee (basis points)
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={swapFee}
                onChange={e => setSwapFee(Number(e.target.value))}
                className="w-full p-3 border rounded-lg bg-white"
                placeholder="30 (0.3%)"
              />
              <div className="text-xs text-gray-500 mt-1">
                Current: {swapFee / 100}% (recommended: 0.3% = 30 basis points)
              </div>
            </div>

            {/* Create Pool Button */}
            <button
              onClick={handleCreatePool}
              disabled={!canCreatePool || txPending}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isCreatePending ? 'Creating Pool...' : 'Create Pool'}
            </button>
          </div>
        )}

        {/* Add Liquidity Tab */}
        {activeTab === 'add' && (
          <div className="space-y-4">
            {/* Amount Inputs */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gray-50 border">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">{(selectedToken1 || token1)?.symbol} Amount</label>
                </div>
                <input
                  type="number"
                  placeholder="0.0"
                  value={token1Amount}
                  onChange={e => setToken1Amount(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-white"
                />
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">{(selectedToken2 || token2)?.symbol} Amount</label>
                </div>
                <input
                  type="number"
                  placeholder="0.0"
                  value={token2Amount}
                  onChange={e => setToken2Amount(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-white"
                />
              </div>
            </div>

            {/* Optimal Amounts Button */}
            <button
              onClick={calculateOptimalAmounts}
              className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Calculate Optimal Amounts
            </button>

            {/* Add Liquidity Button */}
            <button
              onClick={handleAddLiquidity}
              disabled={!canAddLiquidity || txPending}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isAddPending ? 'Adding Liquidity...' : 'Add Liquidity'}
            </button>
          </div>
        )}

        {/* Remove Liquidity Tab */}
        {activeTab === 'remove' && (
          <div className="space-y-4">
            {userPosition ? (
              <>
                <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                  <div className="text-red-800 text-sm">
                    <strong>⚠️ Remove Liquidity:</strong> This will remove all your LP tokens and return the underlying tokens.
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border">
                  <div className="text-center">
                    <div className="text-lg font-semibold mb-2">Your LP Position</div>
                    <div className="text-2xl font-bold text-blue-600">{userPosition.lpTokens}</div>
                    <div className="text-sm text-gray-500">LP Tokens</div>
                  </div>
                </div>

                <button
                  onClick={handleRemoveLiquidity}
                  disabled={!canRemoveLiquidity || txPending}
                  className="w-full py-3 px-4 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isRemovePending ? 'Removing Liquidity...' : 'Remove All Liquidity'}
                </button>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">💧</div>
                <p className="text-gray-600">You don't have any liquidity in this pool</p>
              </div>
            )}
          </div>
        )}

        {/* Status */}
        {hasStatus && (
          <div
            className={`p-4 rounded-xl border ${
              isStatusError
                ? 'bg-red-50 border-red-200 text-red-800'
                : isStatusSuccess
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="text-center font-medium">{statusMessage}</div>
            {isStatusSuccess && txResultId && (
              <div className="text-center text-xs mt-1 text-current">
                Tx:{' '}
                <a
                  href={explorerTxUrl(txResultId)}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {formatTxId(txResultId)}
                </a>
              </div>
            )}
          </div>
        )}
        {txError && (
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-center text-yellow-800 text-sm">
            Tip: verify balances, slippage, or pool liquidity if this keeps failing.
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
