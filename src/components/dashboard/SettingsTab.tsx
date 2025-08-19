import React, { useState } from 'react';

const SettingsTab: React.FC = () => {
  const [slippage, setSlippage] = useState(0.5);
  const [deadlineMins, setDeadlineMins] = useState(20);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Transaction Settings</h2>
        <p className="text-gray-600">Configure your swap preferences and slippage tolerance</p>
      </div>
      
      <div className="p-6 border rounded-xl bg-gray-50">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Slippage Tolerance</h3>
        <div className="flex gap-2 mb-4">
          {[0.1, 0.5, 1.0].map(p => (
            <button
              key={p}
              onClick={() => setSlippage(p)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                slippage === p 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {p}%
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Slippage tolerance determines the maximum price change you'll accept for your swap.
        </p>

        <h3 className="text-xl font-semibold text-gray-800 mb-4">Transaction Deadline</h3>
        <div className="flex items-center gap-3 mb-4">
          <input
            type="number"
            value={deadlineMins}
            onChange={e => setDeadlineMins(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 w-24 text-center"
            min="1"
            max="60"
          />
          <span className="text-gray-700">minutes</span>
        </div>
        <p className="text-sm text-gray-600">
          If your transaction takes longer than this time, it will revert.
        </p>
      </div>
    </div>
  );
};

export default SettingsTab;
