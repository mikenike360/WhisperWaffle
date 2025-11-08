import { useEffect, useRef, useState } from 'react';

type AleoPriceState = {
  price: number | null;
  loading: boolean;
  error: string | null;
};

const COINGECKO_ENDPOINT =
  'https://api.coingecko.com/api/v3/simple/price?ids=aleo&vs_currencies=usd';

const REFRESH_INTERVAL_MS = 60_000;
const RETRY_BACKOFF_MS = 5_000;
const MAX_RETRY_ATTEMPTS = 3;

async function fetchAleoPrice(): Promise<number> {
  const response = await fetch(COINGECKO_ENDPOINT, {
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Price fetch failed with status ${response.status}`);
  }

  const data = await response.json();
  const price = data?.aleo?.usd;

  if (typeof price !== 'number' || Number.isNaN(price)) {
    throw new Error('Invalid ALEO price response');
  }

  return price;
}

export function useAleoPrice(): AleoPriceState {
  const [state, setState] = useState<AleoPriceState>({
    price: null,
    loading: true,
    error: null,
  });
  const retryCountRef = useRef(0);

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const scheduleRefresh = () => {
      if (cancelled) return;
      refreshTimer = setTimeout(loadPrice, REFRESH_INTERVAL_MS);
    };

    const handleError = (error: unknown) => {
      if (cancelled) return;

      setState(prev => ({
        price: prev.price,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error fetching ALEO price',
      }));

      if (retryCountRef.current < MAX_RETRY_ATTEMPTS) {
        retryCountRef.current += 1;
        retryTimer = setTimeout(loadPrice, RETRY_BACKOFF_MS * retryCountRef.current);
      } else {
        scheduleRefresh();
      }
    };

    const loadPrice = async () => {
      if (cancelled) return;
      setState(prev => ({ ...prev, loading: true }));

      try {
        const price = await fetchAleoPrice();
        if (cancelled) return;

        retryCountRef.current = 0;
        setState({ price, loading: false, error: null });
        scheduleRefresh();
      } catch (error) {
        handleError(error);
      }
    };

    loadPrice();

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  return state;
}

