import React, { useMemo, useState } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { testContractConnection } from '@/utils/testConnection';
import { useSettings, SLIPPAGE_LIMIT_BPS, MIN_SLIPPAGE_BPS } from '@/context/SettingsContext';

const presetOptions = [10, 50, 100, 300, 500, 1000, 2000, 3500, 5000, 7500, 10000]; // basis points

const SettingsTab: React.FC = () => {
  const { slippageBps, setSlippageBps } = useSettings();
  const [customInput, setCustomInput] = useState<string>(() => (slippageBps / 100).toString());
  const [deadlineMins, setDeadlineMins] = useState(20);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const { wallet, publicKey } = useWallet();

  const slippagePercent = useMemo(() => slippageBps / 100, [slippageBps]);

  const handlePresetClick = (bps: number) => {
    setSlippageBps(bps);
    setCustomInput((bps / 100).toString());
  };

  const handleCustomBlur = () => {
    const parsed = parseFloat(customInput);
    if (Number.isNaN(parsed)) {
      setCustomInput((slippageBps / 100).toString());
      return;
    }
    const clamped = Math.min(Math.max(parsed, MIN_SLIPPAGE_BPS / 100), SLIPPAGE_LIMIT_BPS / 100);
    setSlippageBps(Math.round(clamped * 100));
    setCustomInput(clamped.toString());
  };

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
        <div className="flex flex-wrap gap-2 mb-3">
          {presetOptions.map((bps) => (
            <button
              key={bps}
              onClick={() => handlePresetClick(bps)}
              className={`px-3 py-1 rounded-lg border transition-colors text-sm ${
                slippageBps === bps
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-3">
          <label htmlFor="custom-slippage" className="text-sm text-gray-700">Custom:</label>
          <input
            id="custom-slippage"
            type="number"
            min={MIN_SLIPPAGE_BPS / 100}
            max={SLIPPAGE_LIMIT_BPS / 100}
            step={0.1}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onBlur={handleCustomBlur}
            className="border rounded-lg px-2 py-1 w-24 text-sm"
          />
          <span className="text-sm text-gray-700">%</span>
          <span className="text-xs text-gray-500">(max {SLIPPAGE_LIMIT_BPS / 100}%)</span>
        </div>
        <p className="text-xs text-gray-600 mb-4">
          Maximum price change you&apos;ll accept for swaps. Current tolerance: {slippagePercent.toFixed(2)}%.
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
