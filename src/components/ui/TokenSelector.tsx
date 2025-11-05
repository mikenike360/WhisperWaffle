import React, { useState, useRef, useEffect } from 'react';
import { TokenInfo } from '@/hooks/use-token-discovery';

interface TokenSelectorProps {
  tokens: TokenInfo[];
  selectedToken: TokenInfo | null;
  onTokenSelect: (token: TokenInfo) => void;
  label: string;
  disabled?: boolean;
  placeholder?: string;
  showSearch?: boolean;
}

export const TokenSelector: React.FC<TokenSelectorProps> = ({
  tokens,
  selectedToken,
  onTokenSelect,
  label,
  disabled = false,
  placeholder = 'Select Token',
  showSearch = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTokens, setFilteredTokens] = useState<TokenInfo[]>(tokens);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter tokens based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTokens(tokens);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = tokens.filter(token => 
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query)
      );
      setFilteredTokens(filtered);
    }
  }, [searchQuery, tokens]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Calculate dropdown position when it opens
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4, // 4px gap (mt-1)
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    } else {
      setDropdownPosition(null);
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, showSearch]);

  const handleTokenSelect = (token: TokenInfo) => {
    onTokenSelect(token);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <div className="relative z-10" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      <button
        ref={buttonRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        className={`w-full p-3 border rounded-lg transition-colors text-left flex items-center justify-between ${
          disabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-white hover:bg-gray-50 cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedToken?.icon && (
            <img 
              src={selectedToken.icon} 
              alt={selectedToken.name} 
              className="w-6 h-6 flex-shrink-0"
              onError={(e) => {
                // Fallback to default icon if image fails to load
                (e.target as HTMLImageElement).src = '/token-icons/default.svg';
              }}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">
              {selectedToken?.symbol || placeholder}
            </div>
            {selectedToken && (
              <div className="text-xs text-gray-500 truncate">
                {selectedToken.name}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedToken && !selectedToken.verified && (
            <div className="text-xs text-orange-500 bg-orange-100 px-1 py-0.5 rounded">
              Custom
            </div>
          )}
          <div className="text-gray-400 text-sm">
            {isOpen ? '▲' : '▼'}
          </div>
        </div>
      </button>
      
      {isOpen && !disabled && dropdownPosition && (
        <>
          {/* Backdrop to capture clicks outside */}
          <div 
            className="fixed inset-0 z-[99] bg-transparent" 
            onClick={() => {
              setIsOpen(false);
              setSearchQuery('');
            }}
          />
          {/* Dropdown menu with fixed positioning */}
          <div 
            className="fixed bg-white border rounded-lg shadow-xl z-[100] max-h-80 overflow-hidden"
            style={{ 
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
          >
          {showSearch && (
            <div className="p-3 border-b">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          
          <div className="max-h-60 overflow-y-auto">
            {filteredTokens.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchQuery ? 'No tokens found' : 'No tokens available'}
              </div>
            ) : (
              filteredTokens.map((token) => (
                <button
                  key={token.id}
                  onClick={() => handleTokenSelect(token)}
                  className={`w-full p-3 hover:bg-gray-50 text-left flex items-center gap-2 transition-colors ${
                    selectedToken?.id === token.id ? 'bg-blue-50' : ''
                  }`}
                >
                  {token.icon && (
                    <img 
                      src={token.icon} 
                      alt={token.name} 
                      className="w-6 h-6 flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/token-icons/default.svg';
                      }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">{token.symbol}</div>
                    <div className="text-xs text-gray-500 truncate">{token.name}</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {token.verified ? (
                      <div className="text-xs text-green-500 bg-green-100 px-1 py-0.5 rounded">
                        ✓
                      </div>
                    ) : (
                      <div className="text-xs text-orange-500 bg-orange-100 px-1 py-0.5 rounded">
                        Custom
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
};
