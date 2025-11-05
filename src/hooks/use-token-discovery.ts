import { useState, useEffect } from 'react';
import { CURATED_TOKENS } from '@/config/tokens';

export interface TokenInfo {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  icon?: string;
  verified: boolean;
}

// Local storage key for custom tokens
const CUSTOM_TOKENS_KEY = 'whisperwaffle_custom_tokens';

/**
 * Hook for discovering and managing tokens
 */
export const useTokenDiscovery = () => {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load custom tokens from localStorage
   */
  const loadCustomTokens = (): TokenInfo[] => {
    try {
      const stored = localStorage.getItem(CUSTOM_TOKENS_KEY);
      if (stored) {
        const customTokens = JSON.parse(stored);
        return Array.isArray(customTokens) ? customTokens : [];
      }
    } catch (error) {
      console.warn('Failed to load custom tokens from localStorage:', error);
    }
    return [];
  };

  /**
   * Save custom tokens to localStorage
   */
  const saveCustomTokens = (customTokens: TokenInfo[]): void => {
    try {
      localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(customTokens));
    } catch (error) {
      console.warn('Failed to save custom tokens to localStorage:', error);
    }
  };

  /**
   * Get token icon path
   */
  const getTokenIcon = (symbol: string, customIcon?: string): string => {
    if (customIcon) {
      return customIcon;
    }
    
    // Check curated tokens first
    const curatedToken = CURATED_TOKENS.find(
      token => token.symbol.toLowerCase() === symbol.toLowerCase()
    );
    
    if (curatedToken) {
      return curatedToken.icon;
    }
    
    // Fallback to default icon for custom tokens
    return '/token-icons/default.svg';
  };

  /**
   * Fetch tokens from curated list and custom tokens
   */
  const fetchTokens = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading curated tokens...');
      
      // Use curated tokens as base
      const curatedTokenInfos: TokenInfo[] = CURATED_TOKENS.map(token => ({
        id: token.id,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        icon: token.icon,
        verified: true,
      }));
      
      // Load custom tokens from localStorage
      const customTokens = loadCustomTokens();
      
      // Merge: curated tokens + custom tokens
      const allTokens = [...curatedTokenInfos, ...customTokens];
      
      // Remove duplicates based on token ID
      const uniqueTokens = allTokens.filter((token, index, self) => 
        index === self.findIndex(t => t.id === token.id)
      );
      
      console.log(`Loaded ${curatedTokenInfos.length} curated + ${customTokens.length} custom tokens`);
      setTokens(uniqueTokens);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Token discovery error:', err);
      
      // Fallback to custom tokens only
      const customTokens = loadCustomTokens();
      if (customTokens.length > 0) {
        console.log('Using custom tokens as fallback');
        setTokens([
          {
            id: '0field',
            symbol: 'ALEO',
            name: 'ALEO',
            decimals: 6,
            icon: '/token-icons/aleo.svg',
            verified: true,
          },
          ...customTokens,
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add a custom token
   */
  const addCustomToken = (tokenInfo: Omit<TokenInfo, 'verified'>): void => {
    const customToken: TokenInfo = {
      ...tokenInfo,
      verified: false,
    };
    
    // Check if token already exists
    const existingIndex = tokens.findIndex(token => token.id === customToken.id);
    if (existingIndex !== -1) {
      console.warn('Token already exists:', customToken.id);
      return;
    }
    
    // Add to current tokens
    const newTokens = [...tokens, customToken];
    setTokens(newTokens);
    
    // Save to localStorage
    const customTokens = loadCustomTokens();
    const updatedCustomTokens = [...customTokens, customToken];
    saveCustomTokens(updatedCustomTokens);
    
    console.log('Added custom token:', customToken);
  };

  /**
   * Remove a custom token
   */
  const removeCustomToken = (tokenId: string): void => {
    // Remove from current tokens
    const newTokens = tokens.filter(token => token.id !== tokenId);
    setTokens(newTokens);
    
    // Remove from localStorage
    const customTokens = loadCustomTokens();
    const updatedCustomTokens = customTokens.filter(token => token.id !== tokenId);
    saveCustomTokens(updatedCustomTokens);
    
    console.log('Removed custom token:', tokenId);
  };

  /**
   * Clear all custom tokens
   */
  const clearCustomTokens = (): void => {
    // Keep only verified tokens (API tokens + native ALEO)
    const verifiedTokens = tokens.filter(token => token.verified);
    setTokens(verifiedTokens);
    
    // Clear localStorage
    localStorage.removeItem(CUSTOM_TOKENS_KEY);
    
    console.log('Cleared all custom tokens');
  };

  /**
   * Refresh tokens from API
   */
  const refreshTokens = (): void => {
    fetchTokens();
  };

  /**
   * Get token by ID
   */
  const getTokenById = (tokenId: string): TokenInfo | undefined => {
    return tokens.find(token => token.id === tokenId);
  };

  /**
   * Search tokens by symbol or name
   */
  const searchTokens = (query: string): TokenInfo[] => {
    if (!query.trim()) {
      return tokens;
    }
    
    const lowerQuery = query.toLowerCase();
    return tokens.filter(token => 
      token.symbol.toLowerCase().includes(lowerQuery) ||
      token.name.toLowerCase().includes(lowerQuery)
    );
  };

  // Load tokens on mount
  useEffect(() => {
    fetchTokens();
  }, []);

  return {
    tokens,
    loading,
    error,
    refreshTokens,
    addCustomToken,
    removeCustomToken,
    clearCustomTokens,
    getTokenById,
    searchTokens,
  };
};
