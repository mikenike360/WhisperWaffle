import React, { useState } from 'react';
import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import Layout from '@/layouts/_layout';
import { useRandomImages } from '@/utils/useRandomImages';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useUserBalances } from '../hooks/use-user-balances';
import { registerToken } from '../utils/tokenRegistration';
import { mintTokens } from '../utils/mintTokens';
import { addLiquidity } from '../utils/addLiquidity';

const TokenPage: NextPageWithLayout = () => {
  const { wallet, publicKey } = useWallet();
  const { balances, loading: balancesLoading } = useUserBalances();
  const [activeTab, setActiveTab] = useState('pool');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { randomImages } = useRandomImages();

  // Pool creation state
  const [poolData, setPoolData] = useState({
    aleoAmount: '',
    customTokenAmount: '',
    minLpTokens: ''
  });

  // Token registration state
  const [registrationData, setRegistrationData] = useState({
    tokenId: '',
    name: '',
    symbol: '',
    decimals: '6',
    maxSupply: '1000000000',
    noExternalAuth: true, // Default to true (no external auth required)
    externalAuthParty: '' // External authorization party address
  });

  // Token minting state
  const [mintingData, setMintingData] = useState({
    tokenId: '',
    amount: '',
    recipient: '',
    nonce: ''
  });


  const handleCreatePool = async () => {
    if (!wallet || !publicKey) {
      setMessage('Please connect your wallet first');
      return;
    }

    try {
      setLoading(true);
      setMessage('Creating pool...');

      const aleoAmount = parseFloat(poolData.aleoAmount);
      const customTokenAmount = parseFloat(poolData.customTokenAmount);
      const minLpTokens = parseFloat(poolData.minLpTokens);

      if (isNaN(aleoAmount) || isNaN(customTokenAmount) || isNaN(minLpTokens)) {
        throw new Error('Please enter valid numbers');
      }

      // Convert to microcredits and smallest units
      const aleoMicrocredits = Math.floor(aleoAmount * 1000000);
      const customTokenUnits = Math.floor(customTokenAmount * 1000000); // Assuming 6 decimals
      const minLpTokensUnits = Math.floor(minLpTokens * 1000000);

      // For now, we'll use addLiquidity which will create the pool if it doesn't exist
      // In the future, we should implement create_pool function
      const success = await addLiquidity(
        wallet,
        aleoMicrocredits,
        customTokenUnits,
        minLpTokensUnits
      );

      if (success) {
        setMessage('Pool created successfully!');
        setPoolData({ aleoAmount: '', customTokenAmount: '', minLpTokens: '' });
      } else {
        setMessage('Failed to create pool');
      }
    } catch (error) {
      console.error('Error creating pool:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterToken = async () => {
    if (!wallet || !publicKey) {
      setMessage('Please connect your wallet first');
      return;
    }

    try {
      setLoading(true);
      setMessage('Registering token...');

      // Create token data object for registration
      const tokenData = {
        tokenId: registrationData.tokenId,
        name: registrationData.name,
        symbol: registrationData.symbol,
        decimals: registrationData.decimals,
        maxSupply: registrationData.maxSupply,
        externalAuthorizationRequired: !registrationData.noExternalAuth, // Invert the checkbox value
        externalAuthorizationParty: registrationData.noExternalAuth ? publicKey.toString() : (registrationData.externalAuthParty || publicKey.toString()) // Use user's address if no external auth, otherwise use provided address or default to user's address
      };
      
      console.log('Token registration data:', tokenData);
      console.log('External auth required:', tokenData.externalAuthorizationRequired);
      console.log('External auth party:', tokenData.externalAuthorizationParty);

      const txId = await registerToken(
        wallet,
        publicKey.toString(),
        tokenData,
        (status) => setMessage(status || '')
      );

      if (txId) {
        setMessage('Token registered successfully!');
        setRegistrationData({
          tokenId: '',
          name: '',
          symbol: '',
          decimals: '6',
          maxSupply: '1000000000',
          noExternalAuth: true,
          externalAuthParty: ''
        });
      } else {
        setMessage('Failed to register token');
      }
    } catch (error) {
      console.error('Error registering token:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMintTokens = async () => {
    if (!wallet || !publicKey) {
      setMessage('Please connect your wallet first');
      return;
    }

    try {
      setLoading(true);
      setMessage('Minting tokens...');

      // Create token data object for minting
      const tokenData = {
        tokenId: mintingData.tokenId,
        amount: mintingData.amount,
        recipient: mintingData.recipient,
        nonce: mintingData.nonce
      };

      const txId = await mintTokens(
        wallet,
        publicKey.toString(),
        tokenData,
        (status) => setMessage(status || '')
      );

      if (txId) {
        setMessage('Tokens minted successfully!');
        setMintingData({
          tokenId: '',
          amount: '',
          recipient: '',
          nonce: ''
        });
      } else {
        setMessage('Failed to mint tokens');
      }
    } catch (error) {
      console.error('Error minting tokens:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <NextSeo title="WhisperWaffle Token Studio" />
      <div className="flex flex-col items-center justify-start min-h-screen bg-gradient-to-br from-primary via-primary-focus to-primary-content pt-20 md:pt-24 pb-12">
        <div className="w-full max-w-4xl bg-white/90 backdrop-blur p-6 rounded-2xl shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img src={randomImages.header.src} alt={randomImages.header.alt} className="w-12 h-12 object-contain" />
              <h1 className="text-3xl font-bold text-gray-800">Token Management</h1>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/user-dashboard"
                className="text-sm px-4 py-2 rounded-lg border hover:bg-gray-50 text-blue-600 font-medium"
                title="Go to Dashboard"
              >
                🧇 Dashboard
              </a>
            </div>
          </div>

          {!publicKey && (
            <div className="text-center">
              <p className="text-gray-600">Please connect your wallet to access the admin panel.</p>
            </div>
          )}




          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-lg mb-8">
          {[
            { id: 'pool', label: 'Pairing', icon: '🧇' },
            { id: 'register', label: 'Create Token', icon: '🏷️' },
            { id: 'mint', label: 'Mint Tokens', icon: '🪙' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Pool Management Tab */}
          {activeTab === 'pool' && (
            <div>
              <h2 className="text-2xl font-bold mb-6"> Create Token Pair (BETA)</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ALEO Amount
                  </label>
                  <input
                    type="number"
                    value={poolData.aleoAmount}
                    onChange={(e) => setPoolData({ ...poolData, aleoAmount: e.target.value })}
                    placeholder="e.g., 20"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">Amount in ALEO (will be converted to microcredits)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Token Amount
                  </label>
                  <input
                    type="number"
                    value={poolData.customTokenAmount}
                    onChange={(e) => setPoolData({ ...poolData, customTokenAmount: e.target.value })}
                    placeholder="e.g., 80"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">Amount in custom tokens (will be converted to smallest units)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum LP Tokens
                  </label>
                  <input
                    type="number"
                    value={poolData.minLpTokens}
                    onChange={(e) => setPoolData({ ...poolData, minLpTokens: e.target.value })}
                    placeholder="e.g., 100"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">Minimum LP tokens to receive (slippage protection)</p>
                </div>
                
                <button
                  onClick={handleCreatePool}
                  disabled={loading}
                  className="w-full bg-amber-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Creating Pool...' : 'Create Pool'}
                </button>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    <strong>Note:</strong> This will create a new liquidity pool with the specified amounts. 
                    The pool will be initialized with pool ID 1field.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Token Registration Tab */}
          {activeTab === 'register' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">🏷️ Token Registration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token ID
                  </label>
                  <input
                    type="text"
                    value={registrationData.tokenId}
                    onChange={(e) => setRegistrationData({ ...registrationData, tokenId: e.target.value })}
                    placeholder="e.g., 42069187360field"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token Name
                  </label>
                  <input
                    type="text"
                    value={registrationData.name}
                    onChange={(e) => setRegistrationData({ ...registrationData, name: e.target.value })}
                    placeholder="e.g., WhisperWaffle Token"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token Symbol
                  </label>
                  <input
                    type="text"
                    value={registrationData.symbol}
                    onChange={(e) => setRegistrationData({ ...registrationData, symbol: e.target.value })}
                    placeholder="e.g., WWT"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Decimals
                  </label>
                  <input
                    type="number"
                    value={registrationData.decimals}
                    onChange={(e) => setRegistrationData({ ...registrationData, decimals: e.target.value })}
                    placeholder="6"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Supply
                  </label>
                  <input
                    type="text"
                    value={registrationData.maxSupply}
                    onChange={(e) => setRegistrationData({ ...registrationData, maxSupply: e.target.value })}
                    placeholder="1000000000"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="noExternalAuth"
                    checked={registrationData.noExternalAuth}
                    onChange={(e) => setRegistrationData({ ...registrationData, noExternalAuth: e.target.checked })}
                    className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                  />
                  <label htmlFor="noExternalAuth" className="text-sm font-medium text-gray-700">
                    No External Authorization Required
                  </label>
                </div>
                
                {!registrationData.noExternalAuth && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      External Authorization Party
                    </label>
                    <input
                      type="text"
                      value={registrationData.externalAuthParty}
                      onChange={(e) => setRegistrationData({ ...registrationData, externalAuthParty: e.target.value })}
                      placeholder={publicKey || "aleo1..."}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Address that can authorize token spending (leave empty to use your address)
                    </p>
                  </div>
                )}
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    <strong>ℹ️ External Authorization:</strong> When checked, tokens can be transferred directly without requiring external approval. 
                    Leave unchecked if you want to require external authorization for spending.
                  </p>
                </div>
                
                <button
                  onClick={handleRegisterToken}
                  disabled={loading}
                  className="w-full bg-amber-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Registering Token...' : 'Register Token'}
                </button>
              </div>
            </div>
          )}

          {/* Token Minting Tab */}
          {activeTab === 'mint' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">🪙 Token Minting</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token ID
                  </label>
                  <input
                    type="text"
                    value={mintingData.tokenId}
                    onChange={(e) => setMintingData({ ...mintingData, tokenId: e.target.value })}
                    placeholder="e.g., 42069187360field"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount to Mint
                  </label>
                  <input
                    type="text"
                    value={mintingData.amount}
                    onChange={(e) => setMintingData({ ...mintingData, amount: e.target.value })}
                    placeholder="e.g., 1000000000"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Raw amount (in smallest units, e.g., 1000000000 = 1000 tokens with 6 decimals)
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    value={mintingData.recipient}
                    onChange={(e) => setMintingData({ ...mintingData, recipient: e.target.value })}
                    placeholder="aleo1..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nonce
                  </label>
                  <input
                    type="text"
                    value={mintingData.nonce}
                    onChange={(e) => setMintingData({ ...mintingData, nonce: e.target.value })}
                    placeholder="e.g., 0u64"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                
                <button
                  onClick={handleMintTokens}
                  disabled={loading}
                  className="w-full bg-amber-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Minting Tokens...' : 'Mint Tokens'}
                </button>
              </div>
            </div>
          )}
          </div>

          {/* Message Display */}
          {message && (
            <div className={`mt-6 p-4 rounded-lg ${
              message.includes('Error') 
                ? 'bg-red-50 border border-red-200 text-red-800' 
                : 'bg-green-50 border border-green-200 text-green-800'
            }`}>
              {message}
            </div>
          )}
        </div>

        {/* Static Waffles */}
        <div className="fixed inset-0 pointer-events-none z-10">
          <div className="absolute top-20 left-10 text-2xl opacity-15">🧇</div>
          <div className="absolute top-40 right-20 text-xl opacity-15">🧇</div>
          <div className="absolute bottom-40 left-20 text-2xl opacity-15">🧇</div>
          <div className="absolute bottom-20 right-10 text-xl opacity-15">🧇</div>
        </div>

        {/* Character Images */}
        <div className="fixed inset-0 pointer-events-none z-5">
          <div className="absolute top-10 left-5 opacity-20">
            <img src={randomImages.background1.src} alt={randomImages.background1.alt} className="w-16 h-16 object-contain" />
          </div>
          <div className="absolute top-1/3 right-5 opacity-20">
            <img src={randomImages.background2.src} alt={randomImages.background2.alt} className="w-16 h-16 object-contain" />
          </div>
          <div className="absolute bottom-1/3 left-5 opacity-20">
            <img src={randomImages.background3.src} alt={randomImages.background3.alt} className="w-16 h-16 object-contain" />
          </div>
        </div>

        {/* Static Syrup Drops */}

        
      </div>
    </div>
  );
};

TokenPage.getLayout = page => <Layout>{page}</Layout>;
export default TokenPage;
