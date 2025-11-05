import React, { useState } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { Transaction } from '@demox-labs/aleo-wallet-adapter-base';
import { CURRENT_NETWORK } from '../types';
import Layout from '../layouts/_layout';

// Constants matching the pattern from addLiquidity.ts
const TOKEN_REGISTRY_PROGRAM = 'token_registry.aleo';
const CUSTOM_TOKEN_ID = '42069187360666field'; // Updated to correct wUSDC token ID
const DEX_PROGRAM_ADDRESS = 'aleo1xyu6ndzryyelv4n4fg8vdpt87a6ud7zar5rsegjl6z'; // Your DEX program address

const TokenUnlockPage: React.FC = () => {
  const { wallet, publicKey } = useWallet();
  const [activeSubTab, setActiveSubTab] = useState<'unlock' | 'roles'>('unlock');
  
  // Unlock tokens state
  const [ownerAddress, setOwnerAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [authorizedUntil, setAuthorizedUntil] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Roles management state
  const [roleTokenId, setRoleTokenId] = useState(CUSTOM_TOKEN_ID); // Default to wUSDC
  const [roleProgramAddress, setRoleProgramAddress] = useState(DEX_PROGRAM_ADDRESS);
  const [roleType, setRoleType] = useState('1u8'); // MINTER_ROLE
  const [roleTransactionId, setRoleTransactionId] = useState('');
  const [roleStatus, setRoleStatus] = useState('');
  const [isSettingRole, setIsSettingRole] = useState(false);

  const handleUnlock = async () => {
    if (!wallet || !publicKey) {
      setStatus('Please connect your wallet first');
      return;
    }

    if (!ownerAddress || !amount || !authorizedUntil) {
      setStatus('Please fill in all fields');
      return;
    }

    // Validate address format
    if (!ownerAddress.startsWith('aleo1')) {
      setStatus('Invalid Aleo address format. Address must start with "aleo1"');
      return;
    }

    setIsLoading(true);
    setStatus('Submitting unlock transaction...');

    try {
      // Helper to submit tx and wait for finalization (matching addLiquidity.ts pattern)
      const sendAndWait = async (tx: any) => {
        const id = await wallet.adapter.requestTransaction(tx);
        if (!id) throw new Error('No transaction ID returned from wallet');
        let status = await wallet.adapter.transactionStatus(id);
        let attempts = 0;
        while (status === 'Pending' && attempts < 60) {
          await new Promise((r) => setTimeout(r, 1000));
          status = await wallet.adapter.transactionStatus(id);
          attempts++;
        }
        if (status !== 'Completed' && status !== 'Finalized') {
          throw new Error(`Tx not completed: ${status}`);
        }
        return id;
      };

      // According to the docs, prehook_public expects: prehook_public(owner, amount, authorized_until)
      // But the first parameter should be a TokenOwner struct: {account: address, token_id: field}
      const tokenOwnerStruct = `{account: ${ownerAddress}, token_id: ${CUSTOM_TOKEN_ID}}`;
      
      const prehookInputs = [
        tokenOwnerStruct, // TokenOwner struct: {account: address, token_id: field}
        `${parseInt(amount) * 1000000}u128`, // amount in smallest units
        `${parseInt(authorizedUntil)}u32` // authorized until block height
      ];
      
      console.log('Submitting prehook_public with inputs:', prehookInputs);
      console.log('TokenOwner struct:', tokenOwnerStruct);
      
      const transaction = Transaction.createTransaction(
        publicKey,
        CURRENT_NETWORK,
        TOKEN_REGISTRY_PROGRAM,
        'prehook_public',
        prehookInputs,
        500000, // fee in microcredits (0.5 ALEO)
        false
      );

      // Submit and wait using the same pattern as addLiquidity.ts
      const txId = await sendAndWait(transaction);
      setTransactionId(txId);
      setStatus('✅ Tokens unlocked successfully!');
      setIsLoading(false);

    } catch (error) {
      console.error('Error unlocking tokens:', error);
      setStatus(`❌ Error: ${error.message || 'Unknown error occurred'}`);
      setIsLoading(false);
    }
  };

  const getCurrentBlockHeight = () => {
    // For 1 month duration, we'll use a large number
    // Since we can't easily get current block height, we'll use a fixed offset
    // This will give approximately 1 month of authorization
    return Math.floor(Date.now() / 1000) + 2592000; // 30 days in seconds
  };

  const handleSetRole = async () => {
    if (!wallet || !publicKey) {
      setRoleStatus('Please connect your wallet first');
      return;
    }

    if (!roleTokenId || !roleProgramAddress || !roleType) {
      setRoleStatus('Please fill in all fields');
      return;
    }

    setIsSettingRole(true);
    setRoleStatus('Setting role...');

    try {
      // Helper to submit tx and wait for finalization (matching addLiquidity.ts pattern)
      const sendAndWait = async (tx: any) => {
        const id = await wallet.adapter.requestTransaction(tx);
        if (!id) throw new Error('No transaction ID returned from wallet');
        let status = await wallet.adapter.transactionStatus(id);
        let attempts = 0;
        while (status === 'Pending' && attempts < 60) {
          await new Promise((r) => setTimeout(r, 1000));
          status = await wallet.adapter.transactionStatus(id);
          attempts++;
        }
        if (status !== 'Completed' && status !== 'Finalized') {
          throw new Error(`Tx not completed: ${status}`);
        }
        return id;
      };

      const transaction = Transaction.createTransaction(
        publicKey,
        CURRENT_NETWORK,
        TOKEN_REGISTRY_PROGRAM,
        'set_role',
        [roleTokenId, roleProgramAddress, roleType],
        500000, // fee in microcredits (0.5 ALEO)
        false
      );

      // Submit and wait using the same pattern as addLiquidity.ts
      const txId = await sendAndWait(transaction);
      setRoleTransactionId(txId);
      setRoleStatus('✅ Role set successfully!');
      setIsSettingRole(false);

    } catch (error) {
      console.error('Error setting role:', error);
      setRoleStatus(`❌ Error: ${error.message || 'Unknown error occurred'}`);
      setIsSettingRole(false);
    }
  };

  return (
    <Layout>
      <div className="w-full flex items-start justify-center p-6 pt-32">
        <div className="max-w-2xl w-full">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8">
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
              🔓 Token Management
            </h1>
            
            {/* Sub-tabs: Unlock / Roles */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                onClick={() => setActiveSubTab('unlock')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeSubTab === 'unlock'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🔓 Unlock Tokens
              </button>
              <button
                onClick={() => setActiveSubTab('roles')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeSubTab === 'roles'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🔐 Manage Roles
              </button>
            </div>
            
            {activeSubTab === 'unlock' && (
              <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Owner Address
                </label>
                <input
                  type="text"
                  value={ownerAddress}
                  onChange={(e) => setOwnerAddress(e.target.value)}
                  placeholder="aleo1..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  The address that owns the tokens to be unlocked
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount to Unlock
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1.0"
                  step="0.1"
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Amount in tokens (will be converted to smallest units)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Authorized Until (Block Height)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={authorizedUntil}
                    onChange={(e) => setAuthorizedUntil(e.target.value)}
                    placeholder="1756469000"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setAuthorizedUntil(getCurrentBlockHeight().toString())}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Set Suggested
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Block height until which tokens are authorized (current + 2,592,000 recommended for ~1 month)
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-medium text-amber-800 mb-2">ℹ️ How Token Unlocking Works</h3>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• This calls <code className="bg-amber-100 px-1 rounded">prehook_public</code> on token_registry.aleo</li>
                  <li>• <strong>Important:</strong> You must be the <code className="bg-amber-100 px-1 rounded">external_authorization_party</code> for the token</li>
                  <li>• If you're the token owner but not the auth party, you'll need to update the token management first</li>
                  <li>• After unlocking, you can transfer tokens using <code className="bg-amber-100 px-1 rounded">transfer_public</code></li>
                  <li>• Authorization expires at the specified block height</li>
                </ul>
              </div>

              <button
                onClick={handleUnlock}
                disabled={isLoading || !wallet || !publicKey}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                {isLoading ? '🔓 Unlocking...' : '🔓 Unlock Tokens'}
              </button>

              {status && (
                <div className={`p-4 rounded-lg ${
                  status.includes('✅') ? 'bg-green-50 border border-green-200 text-green-800' :
                  status.includes('❌') ? 'bg-red-50 border border-red-200 text-red-800' :
                  'bg-blue-50 border border-blue-200 text-blue-800'
                }`}>
                  <p className="font-medium">{status}</p>
                </div>
              )}

              {transactionId && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-2">Transaction Details</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Transaction ID:</strong> {transactionId}
                  </p>
                  <a
                    href={`https://testnet.vxb.ai/transactionDetails/${transactionId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:text-amber-700 underline text-sm"
                  >
                    View on Explorer →
                  </a>
                </div>
              )}
            </div>
            )}
            
            {activeSubTab === 'roles' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-800 mb-2">🔐 Role Management</h3>
                  <p className="text-sm text-blue-700">
                    Grant roles to programs for token operations. Use this to give your DEX program the MINTER_ROLE.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token ID
                  </label>
                  <select
                    value={roleTokenId}
                    onChange={(e) => setRoleTokenId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value={CUSTOM_TOKEN_ID}>wUSDC ({CUSTOM_TOKEN_ID})</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    Select the token to manage roles for
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Program Address
                  </label>
                  <input
                    type="text"
                    value={roleProgramAddress}
                    onChange={(e) => setRoleProgramAddress(e.target.value)}
                    placeholder="aleo1..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                                      <p className="text-sm text-gray-500 mt-1">
                      The program address to grant the role to (default: {DEX_PROGRAM_ADDRESS})
                    </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role Type
                  </label>
                  <select
                    value={roleType}
                    onChange={(e) => setRoleType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="1u8">MINTER_ROLE (1u8) - Can mint tokens</option>
                    <option value="2u8">BURNER_ROLE (2u8) - Can burn tokens</option>
                    <option value="3u8">TRANSFER_ROLE (3u8) - Can transfer tokens</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    The role to grant to the program
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-medium text-amber-800 mb-2">ℹ️ How Role Management Works</h3>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• This calls <code className="bg-amber-100 px-1 rounded">set_role</code> on token_registry.aleo</li>
                    <li>• <strong>MINTER_ROLE (1u8):</strong> Allows the program to mint new tokens</li>
                    <li>• <strong>BURNER_ROLE (2u8):</strong> Allows the program to burn tokens</li>
                    <li>• <strong>TRANSFER_ROLE (3u8):</strong> Allows the program to transfer tokens</li>
                    <li>• You must be the token owner or have the appropriate role to grant roles</li>
                  </ul>
                </div>

                <button
                  onClick={handleSetRole}
                  disabled={isSettingRole || !wallet || !publicKey}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  {isSettingRole ? '🔐 Setting Role...' : '🔐 Set Role'}
                </button>

                {roleStatus && (
                  <div className={`p-4 rounded-lg ${
                    roleStatus.includes('✅') ? 'bg-green-50 border border-green-200 text-green-800' :
                    roleStatus.includes('❌') ? 'bg-red-50 border border-red-200 text-red-800' :
                    'bg-blue-50 border border-blue-200 text-blue-800'
                  }`}>
                    <p className="font-medium">{roleStatus}</p>
                  </div>
                )}

                {roleTransactionId && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-800 mb-2">Transaction Details</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Transaction ID:</strong> {roleTransactionId}
                    </p>
                    <a
                      href={`https://testnet.vxb.ai/transactionDetails/${roleTransactionId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 underline text-sm"
                    >
                      View on Explorer →
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TokenUnlockPage;
