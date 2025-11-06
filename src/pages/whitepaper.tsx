import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import Layout from '@/layouts/_layout';
import { GlassCard } from '@/components/ui/GlassCard';

const WhitepaperPage: NextPageWithLayout = () => {

  return (
    <>
      <NextSeo
        title="Whitepaper - WhisperWaffle"
        description="WhisperWaffle Whitepaper: A comprehensive guide to the privacy-first decentralized exchange on Aleo, including technical architecture, AMM mechanics, and project overview."
      />

      <div className="min-h-screen bg-base-200 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <GlassCard className="p-8 md:p-12">
            <h1 className="text-4xl md:text-5xl font-bold text-base-content mb-4">
              WhisperWaffle Whitepaper
            </h1>
            <p className="text-base-content/70 mb-2">
              Version 1.0
            </p>
            <p className="text-base-content/70 mb-8">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            {/* Table of Contents */}
            <div className="bg-base-200 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-base-content mb-4">Table of Contents</h2>
              <ul className="space-y-2 text-base-content/80">
                <li><a href="#executive-summary" className="hover:text-primary hover:underline">1. Executive Summary</a></li>
                <li><a href="#introduction" className="hover:text-primary hover:underline">2. Introduction</a></li>
                <li><a href="#problem-statement" className="hover:text-primary hover:underline">3. Problem Statement</a></li>
                <li><a href="#solution-overview" className="hover:text-primary hover:underline">4. Solution Overview</a></li>
                <li><a href="#technical-architecture" className="hover:text-primary hover:underline">5. Technical Architecture</a></li>
                <li><a href="#amm-mechanics" className="hover:text-primary hover:underline">6. AMM Mechanics</a></li>
                <li><a href="#features" className="hover:text-primary hover:underline">7. Features</a></li>
                <li><a href="#security" className="hover:text-primary hover:underline">8. Security & Privacy</a></li>
                <li><a href="#roadmap" className="hover:text-primary hover:underline">9. Roadmap</a></li>
                <li><a href="#conclusion" className="hover:text-primary hover:underline">10. Conclusion</a></li>
              </ul>
            </div>

            <div className="prose prose-lg max-w-none text-base-content space-y-8">
              {/* Executive Summary */}
              <section id="executive-summary">
                <h2 className="text-3xl font-bold text-base-content mt-8 mb-4">1. Executive Summary</h2>
                <p className="text-base-content/80 leading-relaxed">
                  WhisperWaffle is a privacy-first decentralized exchange (DEX) built on the Aleo blockchain, leveraging zero-knowledge proofs to enable secure, private token swaps and liquidity provision. Unlike traditional DEXs that expose transaction details on public blockchains, WhisperWaffle utilizes Aleo's privacy-preserving smart contracts to protect user transaction data while maintaining full verifiability.
                </p>
                <p className="text-base-content/80 leading-relaxed mt-4">
                  Our platform combines the benefits of automated market maker (AMM) protocols with Aleo's advanced privacy features, creating a truly private DeFi experience. WhisperWaffle enables users to swap tokens, provide liquidity, and earn fees—all while maintaining transaction privacy through zero-knowledge cryptography.
                </p>
              </section>

              {/* Introduction */}
              <section id="introduction">
                <h2 className="text-3xl font-bold text-base-content mt-8 mb-4">2. Introduction</h2>
                <p className="text-base-content/80 leading-relaxed">
                  Decentralized finance (DeFi) has revolutionized the financial landscape by enabling peer-to-peer financial services without intermediaries. However, most DeFi platforms operate on transparent blockchains where all transactions are publicly visible, exposing users to privacy risks, front-running, and transaction analysis.
                </p>
                <p className="text-base-content/80 leading-relaxed mt-4">
                  WhisperWaffle addresses these privacy concerns by building on the Aleo blockchain, which uses zero-knowledge proofs to enable private, verifiable transactions. Our platform provides a complete DEX experience with swap functionality, liquidity pools, and token management—all while protecting user privacy.
                </p>
                <p className="text-base-content/80 leading-relaxed mt-4">
                  The name "WhisperWaffle" reflects our commitment to privacy ("whisper") while maintaining a friendly, approachable brand identity. We believe that DeFi should be both powerful and private, enabling users to trade and interact with confidence.
                </p>
              </section>

              {/* Problem Statement */}
              <section id="problem-statement">
                <h2 className="text-3xl font-bold text-base-content mt-8 mb-4">3. Problem Statement</h2>
                
                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">3.1 Privacy Concerns in DeFi</h3>
                <p className="text-base-content/80 leading-relaxed">
                  Traditional DEXs on transparent blockchains face several privacy challenges:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li><strong>Transaction Visibility:</strong> All swaps, amounts, and wallet addresses are publicly visible on-chain</li>
                  <li><strong>Front-Running:</strong> Malicious actors can observe pending transactions and execute trades ahead of users</li>
                  <li><strong>Transaction Analysis:</strong> Sophisticated analysis can link wallet addresses and reveal trading strategies</li>
                  <li><strong>Financial Privacy:</strong> Users' financial activities and holdings are exposed to the public</li>
                </ul>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">3.2 Aleo Ecosystem Needs</h3>
                <p className="text-base-content/80 leading-relaxed">
                  The Aleo blockchain ecosystem requires native DeFi infrastructure:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Lack of established DEX platforms on Aleo</li>
                  <li>Need for privacy-preserving token swaps</li>
                  <li>Requirement for liquidity provision mechanisms</li>
                  <li>Demand for user-friendly DeFi interfaces</li>
                </ul>
              </section>

              {/* Solution Overview */}
              <section id="solution-overview">
                <h2 className="text-3xl font-bold text-base-content mt-8 mb-4">4. Solution Overview</h2>
                <p className="text-base-content/80 leading-relaxed">
                  WhisperWaffle provides a comprehensive solution to privacy and DeFi infrastructure challenges:
                </p>
                
                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">4.1 Privacy-First Architecture</h3>
                <p className="text-base-content/80 leading-relaxed">
                  By leveraging Aleo's zero-knowledge proofs, WhisperWaffle enables:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Private token swaps without exposing amounts or addresses</li>
                  <li>Verifiable transactions that maintain privacy</li>
                  <li>Protection against front-running and transaction analysis</li>
                  <li>Financial privacy for all users</li>
                </ul>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">4.2 Complete DEX Functionality</h3>
                <p className="text-base-content/80 leading-relaxed">
                  WhisperWaffle offers a full suite of DeFi features:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Token-to-token swaps with competitive rates</li>
                  <li>Liquidity pools for any token pair</li>
                  <li>Automated market maker (AMM) pricing</li>
                  <li>Liquidity provider fee distribution</li>
                  <li>Token management and balance tracking</li>
                </ul>
              </section>

              {/* Technical Architecture */}
              <section id="technical-architecture">
                <h2 className="text-3xl font-bold text-base-content mt-8 mb-4">5. Technical Architecture</h2>
                
                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">5.1 Blockchain Layer</h3>
                <p className="text-base-content/80 leading-relaxed">
                  WhisperWaffle is built on the Aleo blockchain, which provides:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li><strong>Zero-Knowledge Proofs:</strong> Enables private, verifiable transactions</li>
                  <li><strong>Smart Contracts:</strong> Aleo zk-programs for on-chain logic</li>
                  <li><strong>Privacy by Default:</strong> Transaction details are hidden by default</li>
                  <li><strong>Scalability:</strong> Efficient proof generation and verification</li>
                </ul>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">5.2 Smart Contract Design</h3>
                <p className="text-base-content/80 leading-relaxed">
                  Our smart contracts (zk-programs) handle:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li><strong>Pool Management:</strong> Creation, updates, and state management of liquidity pools</li>
                  <li><strong>Swap Execution:</strong> Token swaps with AMM pricing and fee calculation</li>
                  <li><strong>Liquidity Operations:</strong> Adding and removing liquidity from pools</li>
                  <li><strong>LP Token Management:</strong> Minting and burning liquidity provider tokens</li>
                  <li><strong>Fee Distribution:</strong> Calculating and distributing swap fees to liquidity providers</li>
                </ul>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">5.3 Frontend Architecture</h3>
                <p className="text-base-content/80 leading-relaxed">
                  The WhisperWaffle frontend is built with:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li><strong>Next.js:</strong> React framework for server-side rendering and routing</li>
                  <li><strong>TypeScript:</strong> Type-safe development</li>
                  <li><strong>Tailwind CSS:</strong> Utility-first styling</li>
                  <li><strong>DaisyUI:</strong> Component library with theme support</li>
                  <li><strong>Aleo Wallet Adapter:</strong> Integration with Aleo wallets (Leo Wallet)</li>
                </ul>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">5.4 Data Flow</h3>
                <p className="text-base-content/80 leading-relaxed">
                  When a user performs a swap:
                </p>
                <ol className="list-decimal list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>User connects wallet and selects tokens to swap</li>
                  <li>Frontend calculates expected output using AMM formula</li>
                  <li>User confirms transaction in wallet</li>
                  <li>Transaction is submitted to Aleo network</li>
                  <li>Smart contract executes swap with privacy-preserving proofs</li>
                  <li>Transaction is finalized on-chain</li>
                  <li>Frontend updates to reflect new balances</li>
                </ol>
              </section>

              {/* AMM Mechanics */}
              <section id="amm-mechanics">
                <h2 className="text-3xl font-bold text-base-content mt-8 mb-4">6. AMM Mechanics</h2>
                
                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">6.1 Constant Product Formula</h3>
                <p className="text-base-content/80 leading-relaxed">
                  WhisperWaffle uses the constant product market maker (CPMM) model, similar to Uniswap. The core formula is:
                </p>
                <div className="bg-base-200 rounded-lg p-4 my-4 font-mono text-sm">
                  <code className="text-base-content">x * y = k</code>
                </div>
                <p className="text-base-content/80 leading-relaxed">
                  Where:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li><code className="bg-base-200 px-1 rounded">x</code> = Reserve of token X in the pool</li>
                  <li><code className="bg-base-200 px-1 rounded">y</code> = Reserve of token Y in the pool</li>
                  <li><code className="bg-base-200 px-1 rounded">k</code> = Constant product (must remain constant)</li>
                </ul>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">6.2 Swap Calculation</h3>
                <p className="text-base-content/80 leading-relaxed">
                  When swapping token X for token Y, the output amount is calculated as:
                </p>
                <div className="bg-base-200 rounded-lg p-4 my-4 font-mono text-sm">
                  <code className="text-base-content">
                    amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee)
                  </code>
                </div>
                <p className="text-base-content/80 leading-relaxed mt-4">
                  Where:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li><code className="bg-base-200 px-1 rounded">amountInWithFee</code> = Input amount after applying swap fee (typically 0.3%)</li>
                  <li><code className="bg-base-200 px-1 rounded">reserveIn</code> = Current reserve of input token</li>
                  <li><code className="bg-base-200 px-1 rounded">reserveOut</code> = Current reserve of output token</li>
                </ul>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">6.3 Swap Fee</h3>
                <p className="text-base-content/80 leading-relaxed">
                  Each swap incurs a fee (typically 0.3% or 30 basis points) that is:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Deducted from the input amount before calculating output</li>
                  <li>Added back to the liquidity pool</li>
                  <li>Distributed to liquidity providers proportionally to their share</li>
                </ul>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">6.4 Price Impact</h3>
                <p className="text-base-content/80 leading-relaxed">
                  Large swaps relative to pool size can cause price impact (slippage). The price impact is calculated as:
                </p>
                <div className="bg-base-200 rounded-lg p-4 my-4 font-mono text-sm">
                  <code className="text-base-content">
                    priceImpact = (amountIn / reserveIn) * 100
                  </code>
                </div>
                <p className="text-base-content/80 leading-relaxed mt-4">
                  Higher price impact means the swap will move the price more significantly, resulting in less favorable rates.
                </p>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">6.5 Liquidity Provision</h3>
                <p className="text-base-content/80 leading-relaxed">
                  When providing liquidity:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Users deposit equal value of both tokens in a pair</li>
                  <li>LP tokens are minted representing their share of the pool</li>
                  <li>LP tokens can be burned to withdraw liquidity</li>
                  <li>Fees accrue to the pool and increase the value of LP tokens</li>
                </ul>
              </section>

              {/* Features */}
              <section id="features">
                <h2 className="text-3xl font-bold text-base-content mt-8 mb-4">7. Features</h2>
                
                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">7.1 Token Swaps</h3>
                <p className="text-base-content/80 leading-relaxed">
                  WhisperWaffle enables seamless token swaps:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Swap any token for any other token (if a pool exists)</li>
                  <li>Real-time price quotes and slippage protection</li>
                  <li>Minimum output guarantees to protect against unfavorable price movements</li>
                  <li>Private transaction execution on Aleo</li>
                  <li>Low fees and competitive rates</li>
                </ul>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">7.2 Liquidity Pools</h3>
                <p className="text-base-content/80 leading-relaxed">
                  Users can create and manage liquidity pools:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Create new pools for any token pair</li>
                  <li>Add liquidity to existing pools</li>
                  <li>Remove liquidity at any time</li>
                  <li>Earn fees from all swaps in your pools</li>
                  <li>Track LP token balances and pool statistics</li>
                </ul>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">7.3 Token Management</h3>
                <p className="text-base-content/80 leading-relaxed">
                  Comprehensive token management features:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>View token balances across all supported tokens</li>
                  <li>Add custom tokens by token ID</li>
                  <li>Token discovery and verification</li>
                  <li>Transaction history tracking</li>
                </ul>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">7.4 User Interface</h3>
                <p className="text-base-content/80 leading-relaxed">
                  WhisperWaffle features an intuitive, user-friendly interface:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Clean, modern design with waffle-themed branding</li>
                  <li>Responsive layout for desktop and mobile</li>
                  <li>Theme support (light/dark modes)</li>
                  <li>Real-time price updates and pool statistics</li>
                  <li>Transaction status tracking</li>
                </ul>
              </section>

              {/* Security & Privacy */}
              <section id="security">
                <h2 className="text-3xl font-bold text-base-content mt-8 mb-4">8. Security & Privacy</h2>
                
                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">8.1 Privacy Features</h3>
                <p className="text-base-content/80 leading-relaxed">
                  WhisperWaffle leverages Aleo's privacy capabilities:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li><strong>Zero-Knowledge Proofs:</strong> Transactions are verified without revealing details</li>
                  <li><strong>Private Transactions:</strong> Swap amounts and addresses are hidden</li>
                  <li><strong>No Front-Running:</strong> Private transactions prevent MEV attacks</li>
                  <li><strong>Financial Privacy:</strong> Users' trading activities remain confidential</li>
                </ul>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">8.2 Security Measures</h3>
                <p className="text-base-content/80 leading-relaxed">
                  We implement multiple security layers:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li><strong>Smart Contract Audits:</strong> Regular security reviews of zk-programs</li>
                  <li><strong>Non-Custodial:</strong> Users maintain full control of their funds</li>
                  <li><strong>Wallet Integration:</strong> Secure wallet connections via Aleo Wallet Adapter</li>
                  <li><strong>Input Validation:</strong> Comprehensive validation of all user inputs</li>
                  <li><strong>Slippage Protection:</strong> Minimum output guarantees prevent unfavorable swaps</li>
                </ul>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">8.3 Risk Considerations</h3>
                <p className="text-base-content/80 leading-relaxed">
                  Users should be aware of potential risks:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li><strong>Smart Contract Risk:</strong> Bugs or vulnerabilities in smart contracts</li>
                  <li><strong>Impermanent Loss:</strong> Losses when providing liquidity due to price changes</li>
                  <li><strong>Market Risk:</strong> Cryptocurrency price volatility</li>
                  <li><strong>Liquidity Risk:</strong> Low liquidity pools may have high slippage</li>
                  <li><strong>Technology Risk:</strong> Network issues or blockchain failures</li>
                </ul>
              </section>

              {/* Roadmap */}
              <section id="roadmap">
                <h2 className="text-3xl font-bold text-base-content mt-8 mb-4">9. Roadmap</h2>
                
                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">9.1 Current Status (v1.0)</h3>
                <p className="text-base-content/80 leading-relaxed">
                  WhisperWaffle is currently live on Aleo Mainnet with:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>✓ Token swap functionality</li>
                  <li>✓ Liquidity pool creation and management</li>
                  <li>✓ LP token minting and burning</li>
                  <li>✓ Fee distribution to liquidity providers</li>
                  <li>✓ User-friendly web interface</li>
                  <li>✓ Wallet integration (Leo Wallet)</li>
                </ul>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">9.2 Future Enhancements</h3>
                <p className="text-base-content/80 leading-relaxed">
                  Planned features and improvements:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Advanced analytics and pool statistics</li>
                  <li>Multi-hop routing for better swap rates</li>
                  <li>Limit orders and advanced order types</li>
                  <li>Governance token and DAO structure</li>
                  <li>Mobile application</li>
                  <li>Additional wallet integrations</li>
                  <li>Cross-chain bridge integration</li>
                  <li>Yield farming and staking mechanisms</li>
                </ul>
              </section>

              {/* Conclusion */}
              <section id="conclusion">
                <h2 className="text-3xl font-bold text-base-content mt-8 mb-4">10. Conclusion</h2>
                <p className="text-base-content/80 leading-relaxed">
                  WhisperWaffle represents a significant step forward in privacy-preserving DeFi. By combining the proven AMM model with Aleo's zero-knowledge technology, we've created a DEX that offers both functionality and privacy.
                </p>
                <p className="text-base-content/80 leading-relaxed mt-4">
                  As the Aleo ecosystem continues to grow, WhisperWaffle will serve as a foundational DeFi infrastructure, enabling private, secure, and efficient token trading for all users. We believe that financial privacy is a fundamental right, and WhisperWaffle makes it accessible to everyone.
                </p>
                <p className="text-base-content/80 leading-relaxed mt-4">
                  We invite the community to join us in building the future of private DeFi. Whether you're a trader, liquidity provider, or developer, there's a place for you in the WhisperWaffle ecosystem.
                </p>
              </section>

              {/* Contact & Resources */}
              <section>
                <h2 className="text-3xl font-bold text-base-content mt-8 mb-4">11. Contact & Resources</h2>
                <div className="bg-base-200 rounded-lg p-6 mt-4">
                  <h3 className="text-xl font-semibold text-base-content mb-4">Get in Touch</h3>
                  <ul className="space-y-2 text-base-content/80">
                    <li><strong>Website:</strong> whisperwaffle.com</li>
                    <li><strong>Email:</strong> contact@venomlabs.xyz</li>
                    <li><strong>GitHub:</strong> github.com/mikenike360</li>
                    <li><strong>Smart Contract:</strong> whisper_waffle_swap_v1.aleo (Aleo Mainnet)</li>
                  </ul>
                </div>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">Additional Resources</h3>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li><a href="/terms" className="text-primary hover:underline">Terms & Conditions</a></li>
                  <li><a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a></li>
                  <li>Aleo Documentation: <a href="https://developer.aleo.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">developer.aleo.org</a></li>
                </ul>
              </section>
            </div>
          </GlassCard>
        </div>
      </div>
    </>
  );
};

WhitepaperPage.getLayout = (page) => <Layout>{page}</Layout>;
export default WhitepaperPage;

