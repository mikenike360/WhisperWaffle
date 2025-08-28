import { useWindowScroll } from '@/hooks/use-window-scroll';
import { useIsMounted } from '@/hooks/use-is-mounted';
import React, { useState, useEffect } from 'react';
import { WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui';
import { HomeIcon } from '@/components/icons/home';
import { Twitter } from '@/components/icons/twitter';
import { Discord } from '@/components/icons/discord';
import { useTheme } from 'next-themes';
import Footer from '@/components/ui/Footer';

require('@demox-labs/aleo-wallet-adapter-reactui/dist/styles.css');

// Define the list of DaisyUI themes you want to offer
const themes = [
  "light",
  "dark",
  "cyberpunk",
];

// ThemeSelector component using Next Themes
function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  // Use a mount flag to avoid SSR mismatch
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value)}
      className="select select-bordered max-w-xs"
    >
      {themes.map((t) => (
        <option key={t} value={t}>
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </option>
      ))}
    </select>
  );
}

function HeaderRightArea({ devMode, setDevMode }: { devMode: boolean; setDevMode: (value: boolean) => void }) {
  return (
    <div className="relative order-last flex shrink-0 items-center gap-3 sm:gap-6 lg:gap-8 btn-primary-content text-primary">
      {/* Dev Mode Toggle */}
      <div className="flex items-center gap-2">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={devMode}
            onChange={(e) => setDevMode(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
          <span className={`ml-3 text-sm font-medium ${devMode ? 'text-amber-600 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
            {devMode ? '🔧 Dev Mode' : 'Dev Mode'}
          </span>
        </label>
      </div>
      
      {/* Use the updated ThemeSelector */}
      <ThemeSelector />
      <WalletMultiButton />
    </div>
  );
}

export function Header() {
  const windowScroll = useWindowScroll();
  const isMounted = useIsMounted();
  const [devMode, setDevMode] = useState(false);

  // Load dev mode setting from localStorage on mount
  useEffect(() => {
    const savedDevMode = localStorage.getItem('devMode') === 'true';
    setDevMode(savedDevMode);
  }, []);

  // Save dev mode setting to localStorage when it changes
  const handleDevModeChange = (value: boolean) => {
    setDevMode(value);
    localStorage.setItem('devMode', value.toString());
  };

  return (
    <nav
      className={`fixed top-0 z-30 w-full bg-base-200 transition-all duration-300 ${
        isMounted && windowScroll.y > 10 ? 'shadow-card backdrop-blur' : ''
      }`}
    >
      <div className="flex flex-wrap items-center justify-between px-8 py-8 sm:px-6 lg:px-8 xl:px-10 3xl:px-12">
        <div className="flex items-center space-x-2">
          {/* Home Button */}
          <a
            href="/"
            className="bg-base-300 bg-opacity-20 rounded-full px-4 py-2 text-sm font-medium hover:bg-opacity-30 transition-all flex items-center gap-2"
          >
            🏠 Home
          </a>
          {/* Add Dashboard Navigation Link */}
          <a
            href="/user-dashboard"
            className="bg-base-300 bg-opacity-20 rounded-full px-4 py-2 text-sm font-medium hover:bg-opacity-30 transition-all"
          >
            🧇 Swap
          </a>

          {/* Token Studio Navigation Link */}
          <a
            href="/token"
            className="bg-base-300 bg-opacity-20 rounded-full px-4 py-2 text-sm font-medium hover:bg-opacity-30 transition-all"
          >
            🪙 Token
          </a>

          {/* Dev Mode Navigation Links - Only shown when devMode is true */}
          {devMode && (
            <>
              <div className="w-px h-6 bg-amber-400 mx-2"></div>
              {/* Transfer Test Navigation Link */}
              <a
                href="/transfer-test"
                className="bg-amber-100 bg-opacity-80 border border-amber-300 rounded-full px-4 py-2 text-sm font-medium hover:bg-amber-200 transition-all text-amber-800"
              >
                🧪 Transfer Test
              </a>

              {/* API Test Navigation Link */}
              <a
                href="/api-test"
                className="bg-amber-100 bg-opacity-80 border border-amber-300 rounded-full px-4 py-2 text-sm font-medium hover:bg-amber-200 transition-all text-amber-800"
              >
                🔌 API Test
              </a>

              {/* Token Unlock Navigation Link */}
              <a
                href="/token-unlock"
                className="bg-amber-100 bg-opacity-80 border border-amber-300 rounded-full px-4 py-2 text-sm font-medium hover:bg-amber-200 transition-all text-amber-800"
              >
                🔓 Token Management
              </a>
            </>
          )}
          {process.env.URL && (
            <a
              className="bg-base-300 bg-opacity-20 rounded-full p-2"
              href={`${process.env.URL}`}
            >
              <HomeIcon />
            </a>
          )}
          {process.env.TWITTER && (
            <a
              className="bg-base-300 bg-opacity-20 rounded-full p-2"
              href={`${process.env.TWITTER}`}
            >
              <Twitter width="18" height="18" />
            </a>
          )}
          {process.env.DISCORD && (
            <a
              className="bg-base-300 bg-opacity-20 rounded-full p-2"
              href={`${process.env.DISCORD}`}
            >
              <Discord width="18" height="18" />
            </a>
          )}
        </div>
        {/* Added a wrapper div with margin-left to create more space */}
        <div className="ml-2 mt-2">
          <HeaderRightArea devMode={devMode} setDevMode={handleDevModeChange} />
        </div>
      </div>
      
    </nav>
  );
  
  
  
}

interface LayoutProps {}

export default function Layout({
  children,
}: React.PropsWithChildren<LayoutProps>) {
  return (
    // Use DaisyUI tokens for the background and text color
    <div className="bg-base-100 text-base-content flex min-h-screen flex-col">
      <Header />
      <main className="mb-12 flex flex-grow flex-col pt-4 sm:pt-12 bg-primary">
        {children}
      </main>
      <Footer />
    </div>
  );
}
