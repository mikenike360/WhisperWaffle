import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import Layout from '@/layouts/_layout';
import Button from '@/components/ui/button';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletNotConnectedError } from '@demox-labs/aleo-wallet-adapter-base';
import { useState, useEffect } from 'react';

// Remember to place your generated image in /public/images/waffle-background.png
const SwapPage: NextPageWithLayout = () => {
  const { publicKey } = useWallet();
  const [fromToken, setFromToken] = useState('ALEO');
  const [toToken, setToToken] = useState('USDC');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');

  // Dummy 1:1 rate
  useEffect(() => {
    if (!fromAmount || isNaN(Number(fromAmount))) {
      setToAmount('');
      return;
    }
    setToAmount(fromAmount);
  }, [fromAmount]);

  const handleSwap = () => {
    if (!publicKey) throw new WalletNotConnectedError();
    console.log(`Swapping ${fromAmount} ${fromToken} for ${toAmount} ${toToken}`);
    // TODO: integrate real DEX swap logic here
  };

  return (
    <>
      <NextSeo title="Swap" />
      <div
        className="flex flex-col items-center justify-center min-h-screen"
        style={{
          backgroundImage: `url('banner.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="w-full max-w-md bg-white bg-opacity-90 p-6 rounded-2xl shadow-lg">
          <h1 className="text-2xl font-bold mb-6 text-center">Simple Swap</h1>

          {/* From */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">From</label>
            <div className="flex">
              <select
                value={fromToken}
                onChange={e => setFromToken(e.target.value)}
                className="flex-1 border rounded-l p-2"
              >
                <option value="ALEO">ALEO</option>
                <option value="USDC">USDC</option>
                <option value="ETH">ETH</option>
              </select>
              <input
                type="text"
                placeholder="0.0"
                value={fromAmount}
                onChange={e => setFromAmount(e.target.value)}
                className="border-t border-b border-r rounded-r p-2 w-24 text-right"
              />
            </div>
          </div>

          {/* To */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">To</label>
            <div className="flex">
              <select
                value={toToken}
                onChange={e => setToToken(e.target.value)}
                className="flex-1 border rounded-l p-2"
              >
                <option value="USDC">USDC</option>
                <option value="ALEO">ALEO</option>
                <option value="ETH">ETH</option>
              </select>
              <input
                type="text"
                placeholder="0.0"
                value={toAmount}
                readOnly
                className="border-t border-b border-r rounded-r p-2 w-24 text-right bg-gray-100"
              />
            </div>
          </div>

          {/* Swap Button */}
          <Button
            className="w-full mt-4"
            onClick={handleSwap}
            disabled={!publicKey || !fromAmount || Number(fromAmount) <= 0}
          >
            {publicKey ? 'Swap Now' : 'Connect Wallet'}
          </Button>
        </div>
      </div>
    </>
  );
};

SwapPage.getLayout = page => <Layout>{page}</Layout>;
export default SwapPage;
