import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import Layout from '@/layouts/_layout';
import Button from '@/components/ui/button';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletNotConnectedError } from '@demox-labs/aleo-wallet-adapter-base';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useRandomImages } from '@/utils/useRandomImages';
// Temporarily disabled Spline due to build issues
// import dynamic from 'next/dynamic';
// const Spline = dynamic(() => import('@splinetool/react-spline'), {
//   ssr: false,
//   loading: () => <div className="w-full h-full bg-gradient-to-br from-primary via-primary-focus to-primary-content" />
// });

const MainPage: NextPageWithLayout = () => {
  const { publicKey } = useWallet();
  const router = useRouter();
  const { randomImages, isClient, isRandomizing, refreshImages } = useRandomImages();

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
    router.push('/user-dashboard');
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

      <div className="min-h-screen bg-gradient-to-br from-primary via-primary-focus to-primary-content relative">
        {/* Background Image */}
        <div className="absolute inset-0 z-0 flex items-center justify-center -mt-16">
          <img 
            src="/swap_in_silence.png" 
            alt="Swap in Silence Background" 
            className="w-64 h-64 object-contain"
          />
        </div>
        
        {/* Hero Section */}
        <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-4 py-16 text-center">
          {/* Main Title */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-4 -mt-8">
              <img src="/logo.png" alt="WhisperWaffle Logo" className="h-64 md:h-80 lg:h-96 object-contain" />
            </div>
            <div className="text-center mb-8 mt-64">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-content mb-4 leading-tight">
                The Sweetest DEX on Aleo
              </h2>
              <p className="text-lg md:text-xl lg:text-2xl text-primary-content/80 max-w-2xl mx-auto leading-relaxed font-medium">
                Swap in Sweet Silence
              </p>
            </div>
          </div>

                      {/* Single Character Showcase - Removed random images for cleaner look */}
            {/* <div className="mb-16 max-w-2xl w-full">
              <div className="text-center">
                <div className={`bg-white/10 backdrop-blur rounded-2xl p-8 mb-4 border border-white/20 transition-all duration-300 ${isRandomizing ? 'animate-pulse scale-105' : ''}`}>
                  <img 
                    src={randomImages.background2.src} 
                    alt={randomImages.background2.alt} 
                    className="w-40 h-40 mx-auto mb-6 object-contain"
                  />
                  <h3 className="text-2xl font-semibold text-white mb-3">{randomImages.background2.name}</h3>
                  <p className="text-white/80 text-lg">Your trusty DeFi companion</p>
                </div> */}
                
                {/* Refresh Button */}
                {/* <button
                  onClick={refreshImages}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur rounded-full text-white/90 text-sm hover:bg-white/30 transition-all duration-200 hover:scale-105 active:scale-95"
                  disabled={isRandomizing}
                >
                  <span className="text-lg">🔄</span>
                  <span>New Character</span>
                </button>
              </div>
            </div> */}

                      {/* Randomizing Indicator - Removed since random images are disabled */}
            {/* {isRandomizing && (
              <div className="mb-6 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur rounded-full text-white/90 text-sm">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span>🎲 Randomizing character...</span>
                </div>
              </div>
            )} */}



          {/* Action Buttons */}
          <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-x-6 sm:space-y-0 mb-8">
            {publicKey ? (
              <>
                <Button
                  onClick={handleSwapClick}
                  className="btn btn-primary btn-lg px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  🧇 Start Swapping
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

   

          {/* Quick Links */}
          {/* <div className="mt-12 text-center">
            <p className="text-primary-content/80 mb-4 font-medium">Ready to explore?</p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <a 
                href="/user-dashboard" 
                className="text-primary-content hover:text-primary-focus transition-colors duration-200 underline font-medium"
              >
                Pool Management (Dashboard)
              </a>
              <span className="text-primary-content/60">•</span>
              <a 
                href="/user-dashboard" 
                className="text-primary-content hover:text-primary-focus transition-colors duration-200 underline font-medium"
              >
                User Dashboard
              </a>
              <span className="text-primary-content/60">•</span>
              <a 
                href="/docs/SWAP_UTILITIES.md" 
                className="text-primary-content hover:text-primary-focus transition-colors duration-200 underline font-medium"
              >
                Documentation
              </a>
            </div>
          </div> */}
        </div>

        {/* Minimal Static Waffles - commented out for now */}
        {/* <div className="fixed inset-0 pointer-events-none z-30">
          <div className="absolute top-1/4 left-1/4 text-3xl opacity-20">🧇</div>
          <div className="absolute top-1/4 right-1/4 text-3xl opacity-20">🧇</div>
          <div className="absolute bottom-1/4 left-1/4 text-3xl opacity-20">🧇</div>
          <div className="absolute bottom-1/4 right-1/4 text-3xl opacity-20">🧇</div>
        </div> */}
        
        {/* Minimal Static Syrup Drops - removed for cleaner look */}
        {/* <div className="fixed inset-0 pointer-events-none z-25">
          <div className="absolute top-5 left-1/4 text-lg opacity-30">🍁</div>
          <div className="absolute bottom-5 right-1/4 text-lg opacity-30">🍁</div>
        </div> */}
      </div>
    </>
  );
};

MainPage.getLayout = (page) => <Layout>{page}</Layout>;
export default MainPage;
