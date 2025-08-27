import { useState, useEffect } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { fetchAllBalances } from '../utils/balanceFetcher';

interface UserBalances {
  ALEO: string;
  WALEO: string;
  WUSDC: string;
}

export const useUserBalances = () => {
  const { wallet, publicKey } = useWallet();
  const [balances, setBalances] = useState<UserBalances>({
    ALEO: '0',
    WALEO: '0',
    WUSDC: '0',
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
      
      // Don't use fallback data - show real errors to users
      setBalances({
        ALEO: '0.000000',
        WALEO: '0.000000',
        WUSDC: '0.00',
      });
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
