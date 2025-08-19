import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import Layout from '@/layouts/_layout';
import Button from '@/components/ui/button';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletNotConnectedError } from '@demox-labs/aleo-wallet-adapter-base';
import { useRouter } from 'next/router';
import Link from 'next/link';

const MainPage: NextPageWithLayout = () => {
  const { publicKey } = useWallet();
  const router = useRouter();

  const handleButtonClick = async () => {
    try {
      if (!publicKey) {
        throw new WalletNotConnectedError();
      }
      router.push('/dashboard');
    } catch (error) {
      alert('Please connect your wallet to continue.');
    }
  };

  const handlePoolClick = () => {
    router.push('/pool');
  };

  const handleSwapClick = () => {
    router.push('/user-dashboard');
  };

  return (
    <>
      <NextSeo
        title="WhisperWaffle - Advanced Aleo DEX"
        description="A sophisticated, privacy-first decentralized exchange built on Aleo with advanced swap mechanics, liquidity provision, and enhanced safety features."
      />

      <div className="min-h-screen bg-gradient-to-br from-primary via-primary-focus to-primary-content">
        {/* Hero Section */}
        <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-4 py-16 text-center">
          {/* Main Title */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <img src="/waffle_bro.png" alt="Waffle Bro" className="w-20 h-20 object-contain" />
              <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-primary-content">
                🧇 WhisperWaffle
              </h1>
              <img src="/syrup_bro.png" alt="Syrup Bro" className="w-20 h-20 object-contain" />
            </div>
            <p className="text-xl md:text-2xl text-primary-content/90 max-w-3xl mx-auto leading-relaxed">
              Where privacy meets DeFi. Advanced Aleo DEX with enterprise-grade safety features.
            </p>
          </div>

          {/* Character Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 max-w-6xl w-full">
            <div className="text-center">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-4 border border-white/20">
                <img 
                  src="/waffle_bro.png" 
                  alt="Waffle Bro" 
                  className="w-32 h-32 mx-auto mb-4 object-contain"
                />
                <h3 className="text-xl font-semibold text-white mb-2">Waffle Bro</h3>
                <p className="text-white/80">Your trusty trading companion</p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-4 border border-white/20">
                <img 
                  src="/syrup_bro.png" 
                  alt="Syrup Bro" 
                  className="w-32 h-32 mx-auto mb-4 object-contain"
                />
                <h3 className="text-xl font-semibold text-white mb-2">Syrup Bro</h3>
                <p className="text-white/80">Sweet liquidity management</p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-4 border border-white/20">
                <img 
                  src="/butter_baby.png" 
                  alt="Butter Baby" 
                  className="w-32 h-32 mx-auto mb-4 object-contain"
                />
                <h3 className="text-xl font-semibold text-white mb-2">Butter Baby</h3>
                <p className="text-white/80">Smooth trading experience</p>
              </div>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-5xl w-full">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="text-3xl mb-3">🔄</div>
              <h3 className="text-lg font-semibold text-primary-content mb-2">Advanced AMM</h3>
              <p className="text-primary-content/80 text-sm">
                Constant product formula with slippage protection and optimal routing
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="text-3xl mb-3">🛡️</div>
              <h3 className="text-lg font-semibold text-primary-content mb-2">Enhanced Safety</h3>
              <p className="text-primary-content/80 text-sm">
                Input validation, overflow protection, and state verification
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="text-3xl mb-3">🔐</div>
              <h3 className="text-lg font-semibold text-primary-content mb-2">Privacy First</h3>
              <p className="text-primary-content/80 text-sm">
                Built on Aleo for maximum privacy and zero-knowledge proofs
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-x-6 sm:space-y-0 mb-8">
            {publicKey ? (
              <>
                <Button
                  onClick={handleSwapClick}
                  className="btn btn-primary btn-lg px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  🚀 Start Swapping
                </Button>
                <Button
                  onClick={handlePoolClick}
                  className="btn btn-secondary btn-lg px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  💧 Manage Liquidity
                </Button>
              </>
            ) : (
              <Button
                onClick={handleButtonClick}
                className="btn btn-primary btn-lg px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                🔗 Connect Wallet
              </Button>
            )}
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl w-full">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary-content">v3.0.0</div>
              <div className="text-primary-content/70 text-sm">Program Version</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary-content">✅</div>
              <div className="text-primary-content/70 text-sm">Compiled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary-content">🔄</div>
              <div className="text-primary-content/70 text-sm">Async Transitions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary-content">🛡️</div>
              <div className="text-primary-content/70 text-sm">Safety Features</div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-12 text-center">
            <p className="text-primary-content/80 mb-4">Ready to explore?</p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <a 
                href="/pool" 
                className="text-primary-content/70 hover:text-primary-content transition-colors duration-200 underline"
              >
                Pool Management
              </a>
              <span className="text-primary-content/50">•</span>
              <a 
                href="/user-dashboard" 
                className="text-primary-content/70 hover:text-primary-content transition-colors duration-200 underline"
              >
                User Dashboard
              </a>
              <span className="text-primary-content/50">•</span>
              <a 
                href="/docs/SWAP_UTILITIES.md" 
                className="text-primary-content/70 hover:text-primary-content transition-colors duration-200 underline"
              >
                Documentation
              </a>
            </div>
          </div>
        </div>

        {/* Static Waffles */}
        <div className="fixed inset-0 pointer-events-none z-10">
          {/* Corner waffles */}
          <div className="absolute top-10 left-10 text-3xl opacity-20">🧇</div>
          <div className="absolute top-10 right-10 text-3xl opacity-20">🧇</div>
          <div className="absolute bottom-10 left-10 text-3xl opacity-20">🧇</div>
          <div className="absolute bottom-10 right-10 text-3xl opacity-20">🧇</div>
          
          {/* Side waffles */}
          <div className="absolute top-1/4 left-5 text-2xl opacity-15">🧇</div>
          <div className="absolute top-1/3 right-5 text-2xl opacity-15">🧇</div>
          <div className="absolute bottom-1/4 left-5 text-2xl opacity-15">🧇</div>
          <div className="absolute bottom-1/3 right-5 text-2xl opacity-15">🧇</div>
          
          {/* Center area waffles */}
          <div className="absolute top-1/2 left-1/4 text-xl opacity-10">🧇</div>
          <div className="absolute top-2/3 right-1/4 text-xl opacity-10">🧇</div>
          <div className="absolute bottom-1/2 right-1/3 text-xl opacity-10">🧇</div>
        </div>
        
        {/* Static Syrup Drops */}
        <div className="fixed inset-0 pointer-events-none z-5">
          {/* Top syrup */}
          <div className="absolute top-5 left-1/4 text-lg opacity-30">🍁</div>
          <div className="absolute top-5 right-1/3 text-lg opacity-30">🍁</div>
          
          {/* Side syrup */}
          <div className="absolute top-1/3 left-3 text-lg opacity-25">🍁</div>
          <div className="absolute bottom-1/3 right-3 text-lg opacity-25">🍁</div>
          
          {/* Bottom syrup */}
          <div className="absolute bottom-5 left-1/3 text-lg opacity-30">🍁</div>
          <div className="absolute bottom-5 right-1/4 text-lg opacity-30">🍁</div>
        </div>
      </div>
    </>
  );
};

MainPage.getLayout = (page) => <Layout>{page}</Layout>;
export default MainPage;
