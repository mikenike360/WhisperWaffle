import React, { useState, useRef, useEffect } from 'react';

interface DashboardSelectorProps {
  currentView: string;
  onViewChange: (view: string) => void;
  disabled?: boolean;
}

const DASHBOARD_OPTIONS = [
  { value: 'swap', label: 'Swap Tokens', icon: '🔄' },
  { value: 'approvals', label: 'Token Approvals', icon: '🔐' },
  { value: 'pool', label: 'Manage Pools', icon: '🌊' },
  { value: 'balances', label: 'View Balances', icon: '💰' },
  { value: 'settings', label: 'Settings', icon: '⚙️' },
];

export const DashboardSelector: React.FC<DashboardSelectorProps> = ({
  currentView,
  onViewChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const currentOption = DASHBOARD_OPTIONS.find(option => option.value === currentView);

  const handleOptionSelect = (value: string) => {
    onViewChange(value);
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        className={`w-full max-w-md p-4 border rounded-xl transition-all duration-200 text-left flex items-center justify-between ${
          disabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' 
            : 'bg-white hover:bg-gray-50 cursor-pointer border-gray-300 hover:border-blue-300 shadow-sm hover:shadow-md'
        }`}
      >
        <div className="flex items-center gap-3">
          {currentOption && (
            <>
              <span className="text-xl">{currentOption.icon}</span>
              <div>
                <div className="font-semibold text-gray-800">{currentOption.label}</div>
                <div className="text-sm text-gray-500">Dashboard View</div>
              </div>
            </>
          )}
        </div>
        
        <div className="text-gray-400 text-lg">
          {isOpen ? '▲' : '▼'}
        </div>
      </button>
      
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="py-2">
            {DASHBOARD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleOptionSelect(option.value)}
                className={`w-full p-4 hover:bg-gray-50 text-left flex items-center gap-3 transition-colors ${
                  currentView === option.value ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                }`}
              >
                <span className="text-lg">{option.icon}</span>
                <div>
                  <div className="font-medium text-gray-800">{option.label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
