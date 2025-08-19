import { useState, useEffect } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { CURRENT_RPC_URL } from '@/types';

interface PoolData {
  ra: number; // ALEO reserve
  rb: number; // USDC reserve
  lastUpdated: number;
}

export const usePoolData = () => {
  const { publicKey } = useWallet();
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPoolData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Make real Aleo RPC call to read pool state
      const poolData = await fetchRealPoolData();
      setPoolData(poolData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pool data');
      console.error('Error fetching pool data:', err);
      
      // Fallback to mock data if RPC fails
      const fallbackData: PoolData = {
        ra: 1000000000, // 1M ALEO in microcredits
        rb: 750000000,  // 750K USDC in microcredits
        lastUpdated: Date.now(),
      };
      setPoolData(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  const refreshPoolData = () => {
    fetchPoolData();
  };

  useEffect(() => {
    fetchPoolData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchPoolData, 30000);
    return () => clearInterval(interval);
  }, [publicKey]);

  return {
    poolData,
    loading,
    error,
    refreshPoolData,
  };
};

// Real Aleo RPC implementation using working endpoints
export const fetchRealPoolData = async (): Promise<PoolData> => {
  try {
    // Use the working endpoint for v3 program: /testnet/program/ww_swap_v3.aleo/mapping/pool_state/0u8
    const response = await fetch(`https://api.explorer.aleo.org/v1/testnet/program/ww_swap_v3.aleo/mapping/pool_state/0u8`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Raw pool data from Aleo:', data);
    
    // Parse the response to extract ra and rb values
    let ra = 0;
    let rb = 0;
    
    if (data && typeof data === 'string') {
      // The response is a string representation of the pool state
      // Format: "{\n  reserve_aleo: 1100u128,\n  reserve_usdc: 4547u128\n}"
      
      // Extract reserve values using regex
      const raMatch = data.match(/reserve_aleo:\s*(\d+)u128/);
      const rbMatch = data.match(/reserve_usdc:\s*(\d+)u128/);
      
      if (raMatch) {
        ra = parseInt(raMatch[1]);
      }
      if (rbMatch) {
        rb = parseInt(rbMatch[1]);
      }
      
      console.log(`Parsed pool data: ra=${ra}, rb=${rb}`);
    }
    
    // Handle uninitialized pool (both reserves are 0)
    if (ra === 0 && rb === 0) {
      console.log('Pool is not initialized yet');
      return {
        ra: 0,
        rb: 0,
        lastUpdated: Date.now(),
      };
    }
    
    // Validate that we have valid pool data (at least one reserve > 0)
    if (ra === 0 || rb === 0) {
      throw new Error('Invalid pool data received from blockchain - only one reserve is zero');
    }
    
    return {
      ra,
      rb,
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.error('Error fetching real pool data:', error);
    throw new Error(`Failed to fetch pool data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
