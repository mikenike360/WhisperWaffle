import { useCallback, useMemo, useState } from 'react';

export interface TransactionStatusState {
  isPending: boolean;
  statusMessage: string;
  txId?: string;
  error?: string;
}

export interface TransactionStatusControls {
  start: (initialMessage?: string) => void;
  update: (message: string) => void;
  succeed: (txId: string, message?: string) => void;
  fail: (errorMessage: string) => void;
  reset: () => void;
}

export type TransactionStatusHook = TransactionStatusState & TransactionStatusControls;

export function useTransactionStatus(initialMessage = ''): TransactionStatusHook {
  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState(initialMessage);
  const [txId, setTxId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  const start = useCallback((message?: string) => {
    setIsPending(true);
    setStatusMessage(message ?? 'Preparing transaction…');
    setTxId(undefined);
    setError(undefined);
  }, []);

  const update = useCallback((message: string) => {
    setStatusMessage(message);
  }, []);

  const succeed = useCallback((id: string, message?: string) => {
    setIsPending(false);
    setTxId(id);
    setStatusMessage(message ?? `Transaction finalized: ${id}`);
    setError(undefined);
  }, []);

  const fail = useCallback((message: string) => {
    setIsPending(false);
    setError(message);
    setStatusMessage(message);
  }, []);

  const reset = useCallback(() => {
    setIsPending(false);
    setStatusMessage(initialMessage);
    setTxId(undefined);
    setError(undefined);
  }, [initialMessage]);

  return useMemo(
    () => ({ isPending, statusMessage, txId, error, start, update, succeed, fail, reset }),
    [error, isPending, reset, start, statusMessage, succeed, txId, update]
  );
}
