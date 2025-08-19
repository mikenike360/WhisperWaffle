import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import Layout from '@/layouts/_layout';
import Button from '@/components/ui/button';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletNotConnectedError } from '@demox-labs/aleo-wallet-adapter-base';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

// Uncomment this line to enable the animated background ✨
// const GLSLBackground = dynamic(() => import('../utils/GLSLBackground'), { ssr: false });

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

      {/* Optional: Background animation */}
      {/* <GLSLBackground /> */}

      <div className="min-h-screen bg-gradient-to-br from-primary via-primary-focus to-primary-content">
        {/* Hero Section */}
        <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-4 py-16 text-center">
          {/* Main Title */}
          <div className="mb-8">
            <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-primary-content mb-4">
              🧇 WhisperWaffle
            </h1>
            <p className="text-xl md:text-2xl text-primary-content/90 max-w-3xl mx-auto leading-relaxed">
              Where privacy meets DeFi. Advanced Aleo DEX with enterprise-grade safety features.
            </p>
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

        {/* Floating Elements */}
        <div className="fixed inset-0 pointer-events-none z-10">
          <div className="absolute top-20 left-10 text-4xl opacity-20 animate-bounce">🧇</div>
          <div className="absolute top-40 right-20 text-3xl opacity-20 animate-pulse">🔐</div>
          <div className="absolute bottom-40 left-20 text-3xl opacity-20 animate-bounce delay-1000">🔄</div>
          <div className="absolute bottom-20 right-10 text-4xl opacity-20 animate-pulse delay-500">🛡️</div>
        </div>
      </div>
    </>
  );
};

MainPage.getLayout = (page) => <Layout>{page}</Layout>;
export default MainPage;
