import React, { useState } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { testContractConnection } from '@/utils/testConnection';

const SettingsTab: React.FC = () => {
  const [slippage, setSlippage] = useState(0.5);
  const [deadlineMins, setDeadlineMins] = useState(20);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const { wallet, publicKey } = useWallet();

  const handleTestConnection = async () => {
    if (!wallet || !publicKey) {
      setTestResult('Please connect your wallet first');
      return;
    }

    setTesting(true);
    setTestResult(null);
    
    try {
      const result = await testContractConnection(wallet, publicKey.toString());
      setTestResult(result ? '✅ Connection successful!' : '❌ Connection failed');
    } catch (error) {
      setTestResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Settings</h2>
        <p className="text-xs text-gray-600">Configure swap preferences</p>
      </div>

      <div className="p-4 border rounded-lg bg-gray-50 mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Test Connection</h3>
        <button
          onClick={handleTestConnection}
          disabled={testing || !wallet || !publicKey}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
        >
          {testing ? 'Testing...' : 'Test Wallet Connection'}
        </button>
        {testResult && (
          <p className="mt-2 text-sm text-gray-700">{testResult}</p>
        )}
      </div>
      
      <div className="p-4 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Slippage Tolerance</h3>
        <div className="flex gap-2 mb-3">
          {[0.1, 0.5, 1.0].map(p => (
            <button
              key={p}
              onClick={() => setSlippage(p)}
              className={`px-3 py-1 rounded-lg border transition-colors text-sm ${
                slippage === p 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {p}%
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600 mb-4">
          Maximum price change you'll accept for swaps.
        </p>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">Transaction Deadline</h3>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            value={deadlineMins}
            onChange={e => setDeadlineMins(Number(e.target.value))}
            className="border rounded-lg px-2 py-1 w-20 text-center text-sm"
            min="1"
            max="60"
          />
          <span className="text-gray-700 text-sm">minutes</span>
        </div>
        <p className="text-xs text-gray-600">
          Transaction will revert if it takes longer than this time.
        </p>
      </div>
    </div>
  );
};

export default SettingsTab;
