import React, { useState, useEffect } from 'react';
import { TokenInfo } from '@/hooks/use-token-discovery';

interface AddCustomTokenProps {
  onTokenAdd: (tokenInfo: Omit<TokenInfo, 'verified'>) => void;
  existingTokens: TokenInfo[];
  isOpen?: boolean; // Optional controlled state
  onClose?: () => void; // Optional close handler
  showButton?: boolean; // Whether to show the button (default true)
}

export const AddCustomToken: React.FC<AddCustomTokenProps> = ({ 
  onTokenAdd, 
  existingTokens,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  showButton = true,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  
  const handleOpen = () => {
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(true);
    }
    // If controlled, the parent component manages the state
  };
  
  const handleClose = () => {
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(false);
    } else if (controlledOnClose) {
      controlledOnClose();
    }
  };
  const [formData, setFormData] = useState({
    tokenId: '',
    symbol: '',
    name: '',
    decimals: 6,
    iconUrl: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate token ID
    if (!formData.tokenId.trim()) {
      newErrors.tokenId = 'Token ID is required';
    } else if (!/^[0-9]+field$/.test(formData.tokenId.trim())) {
      newErrors.tokenId = 'Token ID must be a valid field (e.g., "1field")';
    } else if (existingTokens.some(token => token.id === formData.tokenId.trim())) {
      newErrors.tokenId = 'Token ID already exists';
    }

    // Validate symbol
    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Symbol is required';
    } else if (formData.symbol.length > 10) {
      newErrors.symbol = 'Symbol must be 10 characters or less';
    } else if (!/^[A-Z0-9]+$/.test(formData.symbol.trim())) {
      newErrors.symbol = 'Symbol must contain only uppercase letters and numbers';
    }

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name must be 50 characters or less';
    }

    // Validate decimals
    if (formData.decimals < 0 || formData.decimals > 18) {
      newErrors.decimals = 'Decimals must be between 0 and 18';
    }

    // Validate icon URL (optional)
    if (formData.iconUrl && !isValidUrl(formData.iconUrl)) {
      newErrors.iconUrl = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const tokenInfo: Omit<TokenInfo, 'verified'> = {
      id: formData.tokenId.trim(),
      symbol: formData.symbol.trim().toUpperCase(),
      name: formData.name.trim(),
      decimals: formData.decimals,
      icon: formData.iconUrl.trim() || undefined,
    };

    onTokenAdd(tokenInfo);
    
    // Reset form
    setFormData({
      tokenId: '',
      symbol: '',
      name: '',
      decimals: 6,
      iconUrl: '',
    });
    setErrors({});
    handleClose();
  };

  const handleCloseModal = () => {
    handleClose();
    setFormData({
      tokenId: '',
      symbol: '',
      name: '',
      decimals: 6,
      iconUrl: '',
    });
    setErrors({});
  };

  // Reset form when modal opens in controlled mode
  useEffect(() => {
    if (controlledIsOpen !== undefined && controlledIsOpen) {
      setFormData({
        tokenId: '',
        symbol: '',
        name: '',
        decimals: 6,
        iconUrl: '',
      });
      setErrors({});
    }
  }, [controlledIsOpen]);

  return (
    <>
      {showButton && (
        <button
          onClick={handleOpen}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-lg">+</span>
          <span>Add Custom Token</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10050] p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800">
                  Add Custom Token
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Token ID *
                  </label>
                  <input
                    type="text"
                    value={formData.tokenId}
                    onChange={(e) => setFormData({ ...formData, tokenId: e.target.value })}
                    placeholder="e.g., 1field"
                    className={`w-full p-2 border rounded-lg ${
                      errors.tokenId ? 'border-red-500' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {errors.tokenId && (
                    <p className="text-red-500 text-xs mt-1">{errors.tokenId}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Symbol *
                  </label>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                    placeholder="e.g., USDC"
                    className={`w-full p-2 border rounded-lg ${
                      errors.symbol ? 'border-red-500' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {errors.symbol && (
                    <p className="text-red-500 text-xs mt-1">{errors.symbol}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., USD Coin"
                    className={`w-full p-2 border rounded-lg ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Decimals *
                  </label>
                  <input
                    type="number"
                    value={formData.decimals}
                    onChange={(e) => setFormData({ ...formData, decimals: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="18"
                    className={`w-full p-2 border rounded-lg ${
                      errors.decimals ? 'border-red-500' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {errors.decimals && (
                    <p className="text-red-500 text-xs mt-1">{errors.decimals}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icon URL (optional)
                  </label>
                  <input
                    type="url"
                    value={formData.iconUrl}
                    onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                    placeholder="https://example.com/icon.svg"
                    className={`w-full p-2 border rounded-lg ${
                      errors.iconUrl ? 'border-red-500' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {errors.iconUrl && (
                    <p className="text-red-500 text-xs mt-1">{errors.iconUrl}</p>
                  )}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-yellow-800 text-sm">
                    <strong>⚠️ Warning:</strong> Custom tokens are not verified. 
                    Make sure you trust the token ID and metadata before adding.
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-blue-800 text-sm">
                    <strong>ℹ️ Note:</strong> Custom tokens will display with a generic icon. 
                    You can optionally provide a custom icon URL below.
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Token
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
