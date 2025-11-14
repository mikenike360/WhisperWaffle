import { Transaction } from '@demox-labs/aleo-wallet-adapter-base';

export type TransactionStatusUpdater = (status: string) => void;
export interface FinalizedTransactionResult {
  txId: string;
}

export interface ExecuteWithFinalizationOptions {
  /** Delay between status polls in milliseconds */
  intervalMs?: number;
  /** Maximum number of status polls before timing out */
  maxAttempts?: number;
  /** Custom messages for specific stages */
  messages?: {
    submitting?: string;
    submitted?: (txId: string) => string;
    waiting?: (attempt: number, max: number) => string;
    finalized?: string;
  };
}

type WalletAdapterLike = {
  requestTransaction: (tx: Transaction) => Promise<string>;
  transactionStatus: (txId: string) => Promise<string>;
};

type WalletLike = {
  adapter: WalletAdapterLike;
};

const DEFAULT_MESSAGES: Required<ExecuteWithFinalizationOptions['messages']> = {
  submitting: 'Submitting transaction…',
  submitted: (txId) => `Transaction submitted: ${txId}`,
  waiting: (attempt, max) => `Waiting for finalization… (${attempt}/${max})`,
  finalized: 'Transaction finalized!',
};

const PENDING_STATUSES = new Set(['Pending', 'Submitted', 'Broadcast']);
const SUCCESS_STATUSES = new Set(['Completed', 'Finalized']);
const FAILURE_STATUSES = new Set(['Rejected', 'Failed']);

export async function executeWithFinalization(
  wallet: WalletLike,
  transaction: Transaction,
  updateStatus?: TransactionStatusUpdater,
  options: ExecuteWithFinalizationOptions = {}
): Promise<string> {
  const intervalMs = options.intervalMs ?? 1_000;
  const maxAttempts = options.maxAttempts ?? 60;
  const messages = { ...DEFAULT_MESSAGES, ...options.messages };

  const adapter = wallet?.adapter;
  if (!adapter?.requestTransaction || !adapter?.transactionStatus) {
    throw new Error('Wallet adapter is unavailable. Ensure wallet is connected.');
  }

  updateStatus?.(messages.submitting);

  const txId = await adapter.requestTransaction(transaction);
  if (!txId) {
    throw new Error('Wallet did not return a transaction id.');
  }

  updateStatus?.(messages.submitted(txId));

  let status = await adapter.transactionStatus(txId);
  updateStatus?.(`Status: ${status}`);

  if (FAILURE_STATUSES.has(status)) {
    throw new Error(`Transaction failed: ${status}`);
  }

  let attempts = 0;
  while (PENDING_STATUSES.has(status) && attempts < maxAttempts) {
    attempts += 1;
    updateStatus?.(messages.waiting(attempts, maxAttempts));
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    status = await adapter.transactionStatus(txId);
    updateStatus?.(`Status: ${status}`);

    if (FAILURE_STATUSES.has(status)) {
      throw new Error(`Transaction failed: ${status}`);
    }
  }

  if (!SUCCESS_STATUSES.has(status)) {
    throw new Error(`Transaction did not finalize (status: ${status}).`);
  }

  updateStatus?.(messages.finalized);

  return txId;
}
