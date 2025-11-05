import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import Layout from '@/layouts/_layout';
import Button from '@/components/ui/button';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletNotConnectedError } from '@demox-labs/aleo-wallet-adapter-base';
import { useRouter } from 'next/router';
import { GlassCard } from '@/components/ui/GlassCard';

const MainPage: NextPageWithLayout = () => {
  const { publicKey } = useWallet();
  const router = useRouter();

  const handleButtonClick = async () => {
    try {
      if (!publicKey) {
        throw new WalletNotConnectedError();
      }
      router.push('/user-dashboard');
    } catch (error) {
      router.push('/user-dashboard'); // Still go to dashboard even if wallet not connected
    }
  };

  return (
    <>
      <NextSeo
        title="WhisperWaffle - The Sweetest DEX on Aleo"
        description="A sophisticated, privacy-first decentralized exchange built on Aleo with advanced swap mechanics, liquidity provision, and enhanced safety features."
      />

      {/* Hero Section */}
      <section className="min-h-screen relative overflow-hidden bg-gradient-to-br from-primary via-primary-focus to-primary-content flex items-center justify-center">
        {/* Background Image */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
          <img 
            src="/swap_in_silence.png" 
            alt="Swap in Silence" 
            className="w-full max-w-2xl h-auto object-contain" 
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-16">
          <GlassCard className="max-w-4xl mx-auto p-8 md:p-12 text-center">
            {/* Logo */}
            <div className="flex items-center justify-center mb-6">
              <img 
                src="/logo.png" 
                alt="WhisperWaffle Logo" 
                className="h-32 md:h-48 lg:h-64 object-contain animate-waffle-bounce-gentle" 
              />
            </div>

            {/* Main Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-base-content mb-4 leading-tight">
              The Sweetest DEX on Aleo 🧇
            </h1>
            
            <p className="text-lg md:text-xl lg:text-2xl text-base-content/80 mb-8 max-w-2xl mx-auto leading-relaxed">
              Swap, pool, and earn with privacy-first DeFi on Aleo
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
              <button
                onClick={handleButtonClick}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600
                           text-white font-bold text-lg shadow-lg shadow-amber-500/50
                           hover:shadow-xl hover:shadow-amber-500/70 transition-all
                           hover:scale-105 active:scale-95"
              >
                Launch App
              </button>
              <button
                onClick={() => router.push('/user-dashboard')}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-base-100/80 backdrop-blur-xl
                           text-primary font-bold text-lg border-2 border-primary
                           hover:bg-base-100 hover:shadow-lg transition-all
                           hover:scale-105 active:scale-95"
              >
                Explore Dashboard
              </button>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-base-200">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-base-content mb-12">
            Why WhisperWaffle?
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1: Swap */}
            <GlassCard hover className="p-6 text-center">
              <div className="mb-4">
                <img 
                  src="/swap_in_silence.png" 
                  alt="Swap" 
                  className="w-28 h-28 md:w-32 md:h-32 mx-auto object-contain animate-waffle-float" 
                />
              </div>
              <h3 className="text-xl font-bold text-base-content mb-2">Easy Swaps</h3>
              <p className="text-base-content/70">
                Swap tokens instantly with low slippage and competitive rates
              </p>
            </GlassCard>

            {/* Feature 2: Liquidity */}
            <GlassCard hover className="p-6 text-center">
              <div className="mb-4">
                <img 
                  src="/waffle_pool.png" 
                  alt="Liquidity" 
                  className="w-28 h-28 md:w-32 md:h-32 mx-auto object-contain animate-waffle-bounce-gentle" 
                />
              </div>
              <h3 className="text-xl font-bold text-base-content mb-2">Liquidity Pools</h3>
              <p className="text-base-content/70">
                Provide liquidity and earn fees from every swap in the pool
              </p>
            </GlassCard>

            {/* Feature 3: Privacy */}
            <GlassCard hover className="p-6 text-center">
              <div className="mb-4">
                <img 
                  src="/syrup_swap.png" 
                  alt="Privacy" 
                  className="w-28 h-28 md:w-32 md:h-32 mx-auto object-contain animate-waffle-float" 
                  style={{ animationDelay: '1s' }}
                />
              </div>
              <h3 className="text-xl font-bold text-base-content mb-2">Privacy First</h3>
              <p className="text-base-content/70">
                Built on Aleo for true privacy and zero-knowledge transactions
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary via-primary-focus to-primary-content">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <GlassCard className="p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-base-content mb-4">
              Ready to Swap?
            </h2>
            <p className="text-lg text-base-content/70 mb-8">
              Start trading on the sweetest DEX on Aleo today
            </p>
            <button
              onClick={handleButtonClick}
              className="px-8 py-4 rounded-2xl bg-primary text-primary-content font-bold text-lg shadow-lg
                         hover:shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              Get Started Now
            </button>
          </GlassCard>
        </div>
      </section>
    </>
  );
};

MainPage.getLayout = (page) => <Layout>{page}</Layout>;
export default MainPage;
