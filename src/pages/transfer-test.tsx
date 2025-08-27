import React, { useState } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { Transaction } from '@demox-labs/aleo-wallet-adapter-base';
import { CURRENT_NETWORK, PROGRAM_ID } from '@/types';
import Layout from '@/layouts/_layout';
import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';

// External programs
const CREDITS_PROGRAM = 'credits.aleo';
const TOKEN_REGISTRY_PROGRAM = 'token_registry.aleo';

// Custom token id
const CUSTOM_TOKEN_ID = '42069187360666field'; // Updated to correct wUSDC token ID

const TransferTestPage: NextPageWithLayout = () => {
  const { wallet, publicKey } = useWallet();
  
  // ALEO Transfer State
  const [aleoRecipient, setAleoRecipient] = useState('aleo1xh0ncflwkfzga983lwujsha729c8nwu7phfn8aw7h3gahhj0ms8qytrxec');
  const [aleoAmount, setAleoAmount] = useState('0.001');
  const [aleoTxStatus, setAleoTxStatus] = useState<string | null>(null);
  const [aleoTxId, setAleoTxId] = useState<string | null>(null);
  
  // Custom Token Transfer State
  const [tokenRecipient, setTokenRecipient] = useState('aleo1xh0ncflwkfzga983lwujsha729c8nwu7phfn8h3gahhj0ms8qytrxec');
  const [tokenAmount, setTokenAmount] = useState('1.0');
  const [tokenTxStatus, setTokenTxStatus] = useState<string | null>(null);
  const [tokenTxId, setTokenTxId] = useState<string | null>(null);
  
  // General State
  const [isProcessing, setIsProcessing] = useState(false);

  // Helper to submit tx and wait for completion
  const sendAndWait = async (tx: any, setStatus: (status: string) => void): Promise<string> => {
    if (!wallet?.adapter) {
      throw new Error('Wallet adapter not available');
    }
    
    const id = await wallet.adapter.requestTransaction(tx);
    if (!id) throw new Error('No transaction ID returned from wallet');
    
    setStatus(`Transaction submitted: ${id}`);
    
    // For token_registry.aleo functions that return Future, we need to wait longer
    // and handle the finalization properly
    let status = await wallet.adapter.transactionStatus(id);
    let attempts = 0;
    const maxAttempts = 120; // Increase max attempts for Future finalization
    
    while (status === 'Pending' && attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 3000)); // Check every 3 seconds
      status = await wallet.adapter.transactionStatus(id);
      attempts++;
      setStatus(`Transaction pending... (${attempts}/${maxAttempts}) - Status: ${status}`);
    }
    
    if (status !== 'Completed' && status !== 'Finalized') {
      throw new Error(`Transaction not completed: ${status}`);
    }
    
    setStatus(`Transaction completed: ${status}`);
    return id;
  };

  // Test ALEO Transfer
  const testAleoTransfer = async () => {
    if (!publicKey || !wallet) {
      setAleoTxStatus('Please connect your wallet first');
      return;
    }

    try {
      setIsProcessing(true);
      setAleoTxStatus('Preparing ALEO transfer...');
      
      const amountInMicrocredits = Math.floor(parseFloat(aleoAmount) * 1000000);
      const fee = 500000;
      
      const tx = Transaction.createTransaction(
        publicKey.toString(),
        CURRENT_NETWORK,
        CREDITS_PROGRAM,
        'transfer_public',
        [aleoRecipient, `${amountInMicrocredits}u64`],
        fee,
        false
      );
      
      console.log('Submitting ALEO transfer:', {
        recipient: aleoRecipient,
        amount: aleoAmount,
        amountMicrocredits: amountInMicrocredits,
        fee
      });
      
      const txId = await sendAndWait(tx, setAleoTxStatus);
      setAleoTxId(txId);
      setAleoTxStatus(`✅ ALEO transfer successful! TX: ${txId}`);
      
    } catch (error: any) {
      console.error('ALEO transfer error:', error);
      setAleoTxStatus(`❌ Error: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Test Custom Token Transfer
  const testTokenTransfer = async () => {
    if (!publicKey || !wallet) {
      setTokenTxStatus('Please connect your wallet first');
      return;
    }

    try {
      setIsProcessing(true);
      setTokenTxStatus('Preparing custom token transfer...');
      
      const amountInSmallestUnits = Math.floor(parseFloat(tokenAmount) * 1000000);
      const fee = 500000; // 0.5 ALEO
      
      // Attempt the custom token transfer
      const tx = Transaction.createTransaction(
        publicKey.toString(),
        CURRENT_NETWORK,
        TOKEN_REGISTRY_PROGRAM,
        'transfer_public',
        [CUSTOM_TOKEN_ID, tokenRecipient, `${amountInSmallestUnits}u128`],
        fee,
        false
      );
      
      console.log('Submitting custom token transfer:', {
        recipient: tokenRecipient,
        amount: tokenAmount,
        amountSmallestUnits: amountInSmallestUnits,
        tokenId: CUSTOM_TOKEN_ID,
        fee,
        inputs: [CUSTOM_TOKEN_ID, tokenRecipient, `${amountInSmallestUnits}u128`],
        network: CURRENT_NETWORK,
        program: TOKEN_REGISTRY_PROGRAM
      });
      
      // Log the exact transaction being created
      console.log('Transaction details:', {
        publicKey: publicKey.toString(),
        network: CURRENT_NETWORK,
        program: TOKEN_REGISTRY_PROGRAM,
        function: 'transfer_public',
        inputs: [CUSTOM_TOKEN_ID, tokenRecipient, `${amountInSmallestUnits}u128`],
        fee,
        isPrivate: false
      });
      
      const txId = await sendAndWait(tx, setTokenTxStatus);
      setTokenTxId(txId);
      setTokenTxStatus(`✅ Custom token transfer successful! TX: ${txId}`);
      
    } catch (error: any) {
      console.error('Custom token transfer error:', error);
      
      // Add helpful error information for common issues
      if (error?.message?.includes('authorization') || error?.message?.includes('authorized')) {
        setTokenTxStatus(`❌ Authorization Error: Custom tokens may need to be authorized first. Try minting some tokens or check if you have the required authorization.`);
      } else if (error?.message?.includes('balance')) {
        setTokenTxStatus(`❌ Balance Error: Check if you have sufficient custom token balance.`);
      } else if (error?.message?.includes('Invalid Aleo program')) {
        setTokenTxStatus(`❌ Program Error: The token_registry.aleo program may not be accessible. Check network connection.`);
      } else {
        setTokenTxStatus(`❌ Error: ${error?.message || 'Unknown error'}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset status
  const resetAleoStatus = () => {
    setAleoTxStatus(null);
    setAleoTxId(null);
  };

  const resetTokenStatus = () => {
    setTokenTxStatus(null);
    setTokenTxId(null);
  };

  return (
    <div>
      <NextSeo title="Transfer Test - WhisperWaffle" />
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary via-primary-focus to-primary-content">
        <div className="w-full max-w-6xl rounded-2xl shadow-lg bg-amber-100/80 backdrop-blur-sm border border-amber-200 overflow-hidden">
          <div className="p-6">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Transfer Test Page</h1>
              <p className="text-gray-600">Test individual ALEO and custom token transfers</p>
            </div>

            {/* Wallet Status */}
            <div className="mb-6 p-4 bg-white rounded-lg border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Wallet Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  publicKey ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {publicKey ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              {publicKey && (
                <div className="mt-2 text-xs text-gray-500 font-mono">
                  {publicKey.toString()}
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* ALEO Transfer Test */}
              <div className="p-6 bg-white rounded-xl border shadow-sm">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">🧈 ALEO Transfer Test</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recipient Address
                    </label>
                    <input
                      type="text"
                      value={aleoRecipient}
                      onChange={(e) => setAleoRecipient(e.target.value)}
                      placeholder="aleo1..."
                      className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ALEO Amount
                    </label>
                    <input
                      type="number"
                      value={aleoAmount}
                      onChange={(e) => setAleoAmount(e.target.value)}
                      placeholder="0.001"
                      step="0.001"
                      min="0.001"
                      className="w-full border rounded-lg px-3 py-2"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Minimum: 0.001 ALEO (plus 0.06 ALEO fee)
                    </div>
                  </div>
                  
                  <button
                    onClick={testAleoTransfer}
                    disabled={!publicKey || isProcessing}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {!publicKey ? 'Connect Wallet' : isProcessing ? 'Processing...' : 'Test ALEO Transfer'}
                  </button>
                  
                  {aleoTxStatus && (
                    <div className="mt-4 p-3 rounded-lg bg-gray-50 border">
                      <div className="flex items-center justify-between">
                        <div className="text-sm">{aleoTxStatus}</div>
                        <button
                          onClick={resetAleoStatus}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Clear
                        </button>
                      </div>
                      {aleoTxId && (
                        <div className="mt-2 text-xs font-mono text-gray-600 break-all">
                          TX ID: {aleoTxId}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Token Transfer Test */}
              <div className="p-6 bg-white rounded-xl border shadow-sm">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">🪙 Custom Token Transfer Test</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recipient Address
                    </label>
                    <input
                      type="text"
                      value={tokenRecipient}
                      onChange={(e) => setTokenRecipient(e.target.value)}
                      placeholder="aleo1..."
                      className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Token Amount
                    </label>
                    <input
                      type="number"
                      value={tokenAmount}
                      onChange={(e) => setTokenAmount(e.target.value)}
                      placeholder="1.0"
                      step="0.000001"
                      min="0.000001"
                      className="w-full border rounded-lg px-3 py-2"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Token ID: {CUSTOM_TOKEN_ID}
                    </div>
                  </div>
                  
                  <button
                    onClick={testTokenTransfer}
                    disabled={!publicKey || isProcessing}
                    className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {!publicKey ? 'Connect Wallet' : isProcessing ? 'Processing...' : 'Test Token Transfer'}
                  </button>
                  
                  {tokenTxStatus && (
                    <div className="mt-4 p-3 rounded-lg bg-gray-50 border">
                      <div className="flex items-center justify-between">
                        <div className="text-sm">{tokenTxStatus}</div>
                        <button
                          onClick={resetTokenStatus}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Clear
                        </button>
                      </div>
                      {tokenTxId && (
                        <div className="mt-2 text-xs font-mono text-gray-600 break-all">
                          TX ID: {tokenTxId}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">📋 How to Use</h3>
              <div className="text-sm text-blue-700 space-y-2">
                <p>1. <strong>Connect your wallet</strong> using the wallet adapter</p>
                <p>2. <strong>Test ALEO Transfer:</strong> Enter recipient address and ALEO amount, then click "Test ALEO Transfer"</p>
                <p>3. <strong>Test Custom Token Transfer:</strong> Enter recipient address and token amount, then click "Test Token Transfer"</p>
                <p>4. <strong>Monitor Status:</strong> Watch the transaction status updates below each form</p>
                <p>5. <strong>Check Explorer:</strong> Use the transaction ID to verify on Aleo explorer</p>
              </div>
            </div>

            {/* Network Info */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <div className="text-center text-sm text-gray-600">
                <strong>Network:</strong> {CURRENT_NETWORK} | <strong>Program:</strong> {PROGRAM_ID}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

TransferTestPage.getLayout = page => <Layout>{page}</Layout>;
export default TransferTestPage;
