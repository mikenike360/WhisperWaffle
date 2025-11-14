import React from 'react';
import { useTheme } from '@/hooks/use-theme';

export const SettingsTab: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Theme</h2>
        <p className="text-sm text-gray-500 mb-4">Customize the appearance of the app.</p>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setTheme('light')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors ${
              theme === 'light'
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            Light Mode
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors ${
              theme === 'dark'
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            Dark Mode
          </button>
        </div>
      </section>
    </div>
  );
};
