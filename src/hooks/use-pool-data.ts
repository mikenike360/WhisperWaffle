import { useState, useEffect } from 'react';
import { PROGRAM_ID } from '../types';

// Interface for pool data from the v6 program
interface PoolData {
  ra: number;        // ALEO reserve
  rb: number;        // Custom token reserve
  lastUpdated?: number;
}

/**
 * Custom hook to fetch pool data from the WhisperWaffle v6 program
 */
export function usePoolData() {
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPoolData = async () => {
      try {
        setLoading(true);
        setError(null);

        // For v6, we'll use a fixed pool ID (1field) for now
        const poolId = '1field';
        
        // Query our API to resolve mapping from explorers
        const resp = await fetch('/api/pool');
        const data = await resp.json();

        if (data.ok && typeof data.ra === 'number' && typeof data.rb === 'number') {
          setPoolData({ ra: data.ra, rb: data.rb, lastUpdated: Date.now() });
        } else {
          // fall back with zeroed reserves but keep raw for debug
          setPoolData({ ra: 0, rb: 0, lastUpdated: Date.now() });
          console.log('Pool data fetch raw:', data?.raw || data);
        }

      } catch (err) {
        console.error('Error fetching pool data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch pool data');
        
        // Set default empty pool data on error
        setPoolData({
          ra: 0,
          rb: 0,
          lastUpdated: Date.now()
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPoolData();

    // Refresh pool data every 30 seconds
    const interval = setInterval(fetchPoolData, 30000);

    return () => clearInterval(interval);
  }, []);

  return { poolData, loading, error };
}
