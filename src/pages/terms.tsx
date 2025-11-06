import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import Layout from '@/layouts/_layout';
import { GlassCard } from '@/components/ui/GlassCard';

const TermsPage: NextPageWithLayout = () => {
  return (
    <>
      <NextSeo
        title="Terms & Conditions - WhisperWaffle"
        description="Terms and Conditions for using WhisperWaffle DEX. Read our terms of service, user responsibilities, and risk disclosures."
      />

      <div className="min-h-screen bg-base-200 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <GlassCard className="p-8 md:p-12">
            <h1 className="text-4xl md:text-5xl font-bold text-base-content mb-4">
              Terms & Conditions
            </h1>
            <p className="text-base-content/70 mb-8">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <div className="prose prose-lg max-w-none text-base-content space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">1. Acceptance of Terms</h2>
                <p className="text-base-content/80 leading-relaxed">
                  Welcome to WhisperWaffle ("we," "our," "us," or "the Platform"). These Terms and Conditions ("Terms") govern your access to and use of the WhisperWaffle decentralized exchange (DEX) platform, including all features, services, and content available through our website and smart contracts.
                </p>
                <p className="text-base-content/80 leading-relaxed mt-4">
                  By accessing or using WhisperWaffle, you agree to be bound by these Terms. If you disagree with any part of these Terms, you may not access or use our platform. These Terms constitute a legally binding agreement between you and WhisperWaffle.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">2. Description of Service</h2>
                <p className="text-base-content/80 leading-relaxed">
                  WhisperWaffle is a decentralized exchange platform built on the Aleo blockchain that enables users to:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Swap tokens using automated market maker (AMM) protocols</li>
                  <li>Provide liquidity to trading pools and earn fees</li>
                  <li>Manage token balances and transactions</li>
                  <li>Interact with smart contracts on the Aleo network</li>
                </ul>
                <p className="text-base-content/80 leading-relaxed mt-4">
                  The platform operates entirely on-chain through smart contracts, and we do not custody or control your funds at any time.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">3. Eligibility and Account Requirements</h2>
                
                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">3.1 Age Requirement</h3>
                <p className="text-base-content/80 leading-relaxed">
                  You must be at least 18 years old to use WhisperWaffle. By using our platform, you represent and warrant that you are of legal age to form a binding contract in your jurisdiction.
                </p>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">3.2 Legal Compliance</h3>
                <p className="text-base-content/80 leading-relaxed">
                  You must comply with all applicable laws and regulations in your jurisdiction when using WhisperWaffle. You are solely responsible for determining whether your use of our platform is legal in your jurisdiction.
                </p>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">3.3 Wallet Requirements</h3>
                <p className="text-base-content/80 leading-relaxed">
                  To use WhisperWaffle, you must:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Have a compatible Aleo wallet (e.g., Leo Wallet)</li>
                  <li>Maintain control of your wallet's private keys</li>
                  <li>Ensure your wallet has sufficient funds to cover transaction fees</li>
                  <li>Keep your wallet secure and protected from unauthorized access</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">4. Wallet Connection and Security</h2>
                <p className="text-base-content/80 leading-relaxed">
                  You are solely responsible for:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Maintaining the security and confidentiality of your wallet and private keys</li>
                  <li>All activities that occur under your wallet address</li>
                  <li>Protecting your wallet from unauthorized access, loss, or theft</li>
                  <li>Verifying the authenticity of transactions before confirming them</li>
                </ul>
                <p className="text-base-content/80 leading-relaxed mt-4">
                  We do not have access to your private keys, seed phrases, or wallet passwords. We cannot recover lost wallets or reverse transactions. If you lose access to your wallet, you may permanently lose access to your funds.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">5. Trading and Swap Terms</h2>
                
                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">5.1 Swap Transactions</h3>
                <p className="text-base-content/80 leading-relaxed">
                  When executing swaps on WhisperWaffle:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>All swaps are executed on-chain through smart contracts</li>
                  <li>Swap rates are determined by the AMM algorithm and current pool liquidity</li>
                  <li>You are responsible for verifying swap rates before confirming transactions</li>
                  <li>Once confirmed, transactions cannot be reversed or cancelled</li>
                  <li>You may experience slippage, especially for large trades or low-liquidity pools</li>
                </ul>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">5.2 Transaction Fees</h3>
                <p className="text-base-content/80 leading-relaxed">
                  All swaps are subject to:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Swap fees (typically 0.3% of the swap amount, paid to liquidity providers)</li>
                  <li>Network fees (paid to the Aleo network for transaction processing)</li>
                  <li>Gas fees (required to execute smart contract functions)</li>
                </ul>
                <p className="text-base-content/80 leading-relaxed mt-4">
                  Fees are displayed before you confirm a transaction. You are responsible for all fees associated with your transactions.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">6. Liquidity Provision Terms</h2>
                
                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">6.1 Providing Liquidity</h3>
                <p className="text-base-content/80 leading-relaxed">
                  When you provide liquidity to a pool:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>You will receive LP (Liquidity Provider) tokens representing your share of the pool</li>
                  <li>You earn a portion of swap fees proportional to your share of the pool</li>
                  <li>You are exposed to impermanent loss risk (see Risk Disclosures below)</li>
                  <li>You can withdraw your liquidity at any time by burning your LP tokens</li>
                </ul>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">6.2 Liquidity Pool Risks</h3>
                <p className="text-base-content/80 leading-relaxed">
                  Providing liquidity involves significant risks, including but not limited to:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Impermanent loss when token prices change</li>
                  <li>Smart contract vulnerabilities or exploits</li>
                  <li>Loss of funds due to pool manipulation or attacks</li>
                  <li>Changes in pool parameters or fees</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">7. Risk Disclosures</h2>
                <p className="text-base-content/80 leading-relaxed">
                  <strong>IMPORTANT: Using WhisperWaffle involves substantial risk of loss. Please read this section carefully.</strong>
                </p>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">7.1 Smart Contract Risks</h3>
                <p className="text-base-content/80 leading-relaxed">
                  Smart contracts are subject to:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Bugs, vulnerabilities, or coding errors</li>
                  <li>Exploits, hacks, or security breaches</li>
                  <li>Loss of funds due to contract failures</li>
                  <li>No guarantee of security or functionality</li>
                </ul>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">7.2 Market Risks</h3>
                <p className="text-base-content/80 leading-relaxed">
                  Cryptocurrency markets are highly volatile:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Token prices can fluctuate dramatically</li>
                  <li>You may experience significant losses</li>
                  <li>Past performance does not guarantee future results</li>
                  <li>Market conditions can change rapidly</li>
                </ul>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">7.3 Impermanent Loss</h3>
                <p className="text-base-content/80 leading-relaxed">
                  When providing liquidity, you may experience impermanent loss if the price ratio of tokens in the pool changes. This can result in receiving fewer tokens when withdrawing than if you had simply held the tokens.
                </p>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">7.4 Regulatory Risks</h3>
                <p className="text-base-content/80 leading-relaxed">
                  Cryptocurrency regulations are evolving and vary by jurisdiction. Changes in regulations may affect your ability to use WhisperWaffle or the value of your assets.
                </p>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">7.5 Technical Risks</h3>
                <p className="text-base-content/80 leading-relaxed">
                  Technical issues may include:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Network congestion or delays</li>
                  <li>Blockchain forks or chain reorganizations</li>
                  <li>Wallet or software failures</li>
                  <li>Loss of access to your wallet or private keys</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">8. Prohibited Activities</h2>
                <p className="text-base-content/80 leading-relaxed">
                  You agree not to:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Use WhisperWaffle for any illegal purpose or in violation of any laws</li>
                  <li>Attempt to hack, exploit, or manipulate the platform or smart contracts</li>
                  <li>Use automated systems or bots to interact with the platform without authorization</li>
                  <li>Engage in market manipulation, front-running, or other unfair trading practices</li>
                  <li>Interfere with or disrupt the platform's operation or security</li>
                  <li>Impersonate any person or entity or misrepresent your affiliation</li>
                  <li>Use the platform to launder money or finance illegal activities</li>
                  <li>Violate any intellectual property rights</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">9. Limitation of Liability</h2>
                <p className="text-base-content/80 leading-relaxed">
                  <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW, WHISPERWAFFLE AND ITS AFFILIATES SHALL NOT BE LIABLE FOR:</strong>
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Any indirect, incidental, special, consequential, or punitive damages</li>
                  <li>Loss of profits, revenue, data, or use</li>
                  <li>Losses resulting from smart contract bugs, exploits, or failures</li>
                  <li>Losses resulting from market volatility or impermanent loss</li>
                  <li>Losses resulting from user error, wallet loss, or unauthorized access</li>
                  <li>Losses resulting from network issues or blockchain failures</li>
                  <li>Any damages exceeding the amount of fees you paid to us in the 12 months preceding the claim</li>
                </ul>
                <p className="text-base-content/80 leading-relaxed mt-4">
                  The platform is provided "as is" and "as available" without warranties of any kind, either express or implied.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">10. Intellectual Property</h2>
                <p className="text-base-content/80 leading-relaxed">
                  All content, features, and functionality of WhisperWaffle, including but not limited to text, graphics, logos, and software, are owned by WhisperWaffle or its licensors and are protected by copyright, trademark, and other intellectual property laws.
                </p>
                <p className="text-base-content/80 leading-relaxed mt-4">
                  You may not copy, modify, distribute, sell, or lease any part of our platform without our prior written consent.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">11. Indemnification</h2>
                <p className="text-base-content/80 leading-relaxed">
                  You agree to indemnify, defend, and hold harmless WhisperWaffle, its affiliates, and their respective officers, directors, employees, and agents from and against any claims, damages, obligations, losses, liabilities, costs, or expenses (including attorney's fees) arising from:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Your use of the platform</li>
                  <li>Your violation of these Terms</li>
                  <li>Your violation of any rights of another party</li>
                  <li>Your violation of any applicable laws or regulations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">12. Termination</h2>
                <p className="text-base-content/80 leading-relaxed">
                  We reserve the right to:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Suspend or terminate your access to WhisperWaffle at any time, with or without cause</li>
                  <li>Modify or discontinue the platform or any part thereof</li>
                  <li>Refuse service to anyone for any reason</li>
                </ul>
                <p className="text-base-content/80 leading-relaxed mt-4">
                  You may stop using WhisperWaffle at any time by disconnecting your wallet. However, on-chain transactions cannot be reversed.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">13. Dispute Resolution</h2>
                <p className="text-base-content/80 leading-relaxed">
                  Any disputes arising out of or relating to these Terms or your use of WhisperWaffle shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association, except where prohibited by law.
                </p>
                <p className="text-base-content/80 leading-relaxed mt-4">
                  You waive any right to a jury trial and agree to resolve disputes on an individual basis, not as part of a class action.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">14. Changes to Terms</h2>
                <p className="text-base-content/80 leading-relaxed">
                  We reserve the right to modify these Terms at any time. We will notify users of material changes by:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Posting the updated Terms on this page</li>
                  <li>Updating the "Last updated" date</li>
                  <li>Providing notice through the platform when possible</li>
                </ul>
                <p className="text-base-content/80 leading-relaxed mt-4">
                  Your continued use of WhisperWaffle after changes become effective constitutes acceptance of the modified Terms. If you do not agree to the changes, you must stop using the platform.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">15. Governing Law</h2>
                <p className="text-base-content/80 leading-relaxed">
                  These Terms shall be governed by and construed in accordance with the laws of The United States of America, without regard to its conflict of law provisions.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">16. Severability</h2>
                <p className="text-base-content/80 leading-relaxed">
                  If any provision of these Terms is found to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">17. Contact Information</h2>
                <p className="text-base-content/80 leading-relaxed">
                  If you have any questions about these Terms, please contact us:
                </p>
                <div className="bg-base-200 rounded-lg p-4 mt-4">
                  <p className="text-base-content/80">
                    <strong>Email:</strong> contact@venomlabs.xyz
                  </p>
                  <p className="text-base-content/80 mt-2">
                    <strong>Website:</strong> whisperwaffle.com
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">18. Acknowledgment</h2>
                <p className="text-base-content/80 leading-relaxed">
                  By using WhisperWaffle, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. You understand the risks associated with using a decentralized exchange and accept full responsibility for your use of the platform.
                </p>
              </section>
            </div>
          </GlassCard>
        </div>
      </div>
    </>
  );
};

TermsPage.getLayout = (page) => <Layout>{page}</Layout>;
export default TermsPage;

