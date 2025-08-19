import { useState, useEffect } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { fetchAllBalances } from '../utils/balanceFetcher';

interface UserBalances {
  ALEO: string;
  USDC: string;
  ETH: string;
}

export const useUserBalances = () => {
  const { wallet, publicKey } = useWallet();
  const [balances, setBalances] = useState<UserBalances>({
    ALEO: '0',
    USDC: '0',
    ETH: '0',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = async () => {
    if (!publicKey || !wallet) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch real balances using the new balance fetcher
      const realBalances = await fetchAllBalances(wallet.adapter as LeoWalletAdapter, publicKey.toString());
      setBalances(realBalances);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
      console.error('Error fetching balances:', err);
      
      // Fallback to mock data if wallet calls fail
      const fallbackBalances: UserBalances = {
        ALEO: '1234.56789',
        USDC: '2500.00',
        ETH: '5.4321',
      };
      setBalances(fallbackBalances);
    } finally {
      setLoading(false);
    }
  };

  const refreshBalances = () => {
    fetchBalances();
  };

  useEffect(() => {
    fetchBalances();
  }, [publicKey, wallet]);

  return {
    balances,
    loading,
    error,
    refreshBalances,
  };
};

// Legacy function - keeping for backward compatibility
export const fetchRealUserBalances = async (
  wallet: LeoWalletAdapter,
  publicKey: string
): Promise<UserBalances> => {
  return fetchAllBalances(wallet, publicKey);
};
