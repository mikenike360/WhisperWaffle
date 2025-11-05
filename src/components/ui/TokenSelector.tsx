import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number; openUpward?: boolean } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownPortalRef = useRef<HTMLDivElement>(null);
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
      const target = event.target as Node;
      const isOutsideDropdown = !dropdownRef.current || !dropdownRef.current.contains(target);
      const isOutsidePortal = !dropdownPortalRef.current || !dropdownPortalRef.current.contains(target);
      
      if (isOutsideDropdown && isOutsidePortal) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Calculate dropdown position when it opens or window resizes/scrolls
  const updateDropdownPosition = () => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const dropdownHeight = 320; // max-h-80 = 320px
      
      // Check if dropdown should open upward (if not enough space below)
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      
      // Calculate position
      let top: number;
      if (openUpward) {
        top = rect.top - dropdownHeight - 4; // 4px gap above button
      } else {
        top = rect.bottom + 4; // 4px gap below button
      }
      
      // Ensure dropdown doesn't go off screen horizontally
      let left = rect.left;
      const dropdownWidth = rect.width;
      if (left + dropdownWidth > viewportWidth) {
        left = viewportWidth - dropdownWidth - 8; // 8px margin from edge
      }
      if (left < 8) {
        left = 8; // 8px margin from edge
      }
      
      setDropdownPosition({
        top,
        left,
        width: dropdownWidth,
        openUpward,
      });
    } else {
      setDropdownPosition(null);
    }
  };

  useEffect(() => {
    updateDropdownPosition();
    
    // Update position on window resize or scroll
    if (isOpen) {
      window.addEventListener('resize', updateDropdownPosition);
      window.addEventListener('scroll', updateDropdownPosition, true);
      
      return () => {
        window.removeEventListener('resize', updateDropdownPosition);
        window.removeEventListener('scroll', updateDropdownPosition, true);
      };
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, showSearch]);

  const handleTokenSelect = (token: TokenInfo) => {
    console.log('[TokenSelector] Token selected:', token);
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
    <div className="relative" ref={dropdownRef}>
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
      
      {isOpen && !disabled && dropdownPosition && typeof window !== 'undefined' && createPortal(
        <>
          {/* Backdrop to capture clicks outside */}
          <div 
            className="fixed inset-0 z-[9999] bg-transparent" 
            onMouseDown={(e) => {
              // Only close if clicking directly on backdrop, not on dropdown
              if (e.target === e.currentTarget) {
                setIsOpen(false);
                setSearchQuery('');
              }
            }}
          />
          {/* Dropdown menu with fixed positioning */}
          <div 
            ref={dropdownPortalRef}
            className="fixed bg-white border rounded-lg shadow-xl z-[10000] max-h-80 overflow-hidden"
            style={{ 
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
            onMouseDown={(e) => e.stopPropagation()}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTokenSelect(token);
                  }}
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
        </>,
        document.body
      )}
    </div>
  );
};
