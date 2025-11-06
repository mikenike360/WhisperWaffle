import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import Layout from '@/layouts/_layout';
import { GlassCard } from '@/components/ui/GlassCard';

const PrivacyPolicyPage: NextPageWithLayout = () => {
  return (
    <>
      <NextSeo
        title="Privacy Policy - WhisperWaffle"
        description="Privacy Policy for WhisperWaffle DEX. Learn how we handle your data, wallet information, and privacy on the Aleo blockchain."
      />

      <div className="min-h-screen bg-base-200 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <GlassCard className="p-8 md:p-12">
            <h1 className="text-4xl md:text-5xl font-bold text-base-content mb-4">
              Privacy Policy
            </h1>
            <p className="text-base-content/70 mb-8">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <div className="prose prose-lg max-w-none text-base-content space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">1. Introduction</h2>
                <p className="text-base-content/80 leading-relaxed">
                  Welcome to WhisperWaffle ("we," "our," or "us"). We are committed to protecting your privacy and ensuring transparency about how we handle your information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our decentralized exchange (DEX) platform built on the Aleo blockchain.
                </p>
                <p className="text-base-content/80 leading-relaxed mt-4">
                  By using WhisperWaffle, you agree to the collection and use of information in accordance with this policy. Please read this Privacy Policy carefully to understand our practices regarding your data.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">2. Information We Collect</h2>
                
                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">2.1 Wallet Information</h3>
                <p className="text-base-content/80 leading-relaxed">
                  When you connect your wallet to WhisperWaffle, we may collect:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Your public wallet address</li>
                  <li>Transaction history related to your wallet address</li>
                  <li>Token balances associated with your wallet</li>
                </ul>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">2.2 Usage Data</h3>
                <p className="text-base-content/80 leading-relaxed">
                  We may collect information about how you interact with our platform:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Pages visited and features used</li>
                  <li>Transaction types and frequencies</li>
                  <li>Browser type and version</li>
                  <li>Device information</li>
                  <li>IP address (for security and analytics purposes)</li>
                </ul>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">2.3 Transaction Data</h3>
                <p className="text-base-content/80 leading-relaxed">
                  All transactions on the Aleo blockchain are recorded on-chain. This includes:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Swap transactions</li>
                  <li>Liquidity provision and removal</li>
                  <li>Token transfers</li>
                  <li>Smart contract interactions</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">3. How We Use Your Information</h2>
                <p className="text-base-content/80 leading-relaxed">
                  We use the information we collect for the following purposes:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>To provide and maintain our DEX services</li>
                  <li>To process and execute your swap and liquidity transactions</li>
                  <li>To display your token balances and transaction history</li>
                  <li>To improve and optimize our platform's functionality</li>
                  <li>To detect, prevent, and address technical issues and security threats</li>
                  <li>To comply with legal obligations and enforce our terms of service</li>
                  <li>To analyze usage patterns and improve user experience</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">4. Blockchain Transparency and Privacy</h2>
                <p className="text-base-content/80 leading-relaxed">
                  WhisperWaffle is built on the Aleo blockchain, which provides enhanced privacy features through zero-knowledge proofs. However, it's important to understand:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Blockchain transactions are publicly verifiable on the Aleo network</li>
                  <li>Your wallet address and transaction history may be visible on-chain</li>
                  <li>Aleo's privacy features help protect transaction details, but complete anonymity cannot be guaranteed</li>
                  <li>We do not control the Aleo blockchain or its privacy mechanisms</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">5. Third-Party Services</h2>
                <p className="text-base-content/80 leading-relaxed">
                  Our platform integrates with various third-party services:
                </p>
                
                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">5.1 Wallet Providers</h3>
                <p className="text-base-content/80 leading-relaxed">
                  When you connect your wallet (e.g., Leo Wallet), you are interacting with third-party wallet providers. We do not have access to your private keys or seed phrases. Please review your wallet provider's privacy policy.
                </p>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">5.2 Aleo Network</h3>
                <p className="text-base-content/80 leading-relaxed">
                  All transactions are processed through the Aleo blockchain network. We are not responsible for the privacy practices of the Aleo network or its validators.
                </p>

                <h3 className="text-xl font-semibold text-base-content mt-6 mb-3">5.3 Analytics and Infrastructure</h3>
                <p className="text-base-content/80 leading-relaxed">
                  We may use third-party analytics services to understand how our platform is used. These services may collect anonymized usage data.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">6. Data Storage and Security</h2>
                <p className="text-base-content/80 leading-relaxed">
                  We implement appropriate technical and organizational measures to protect your information:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>We do not store your private keys or seed phrases</li>
                  <li>Wallet connections are handled locally in your browser</li>
                  <li>We use secure communication protocols (HTTPS) for all data transmission</li>
                  <li>We regularly update our security practices to address emerging threats</li>
                </ul>
                <p className="text-base-content/80 leading-relaxed mt-4">
                  However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">7. Cookies and Tracking Technologies</h2>
                <p className="text-base-content/80 leading-relaxed">
                  We may use cookies and similar tracking technologies to:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li>Remember your preferences and settings</li>
                  <li>Analyze platform usage and performance</li>
                  <li>Provide personalized experiences</li>
                </ul>
                <p className="text-base-content/80 leading-relaxed mt-4">
                  You can control cookies through your browser settings. However, disabling cookies may affect the functionality of our platform.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">8. Your Rights and Choices</h2>
                <p className="text-base-content/80 leading-relaxed">
                  You have certain rights regarding your information:
                </p>
                <ul className="list-disc list-inside text-base-content/80 space-y-2 ml-4 mt-2">
                  <li><strong>Access:</strong> You can view your transaction history and wallet information through the platform</li>
                  <li><strong>Disconnect:</strong> You can disconnect your wallet at any time</li>
                  <li><strong>Opt-out:</strong> You can opt-out of non-essential data collection where possible</li>
                  <li><strong>Delete:</strong> You can request deletion of off-chain data we may have collected</li>
                </ul>
                <p className="text-base-content/80 leading-relaxed mt-4">
                  Note: On-chain transaction data cannot be deleted as it is permanently recorded on the Aleo blockchain.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">9. Children's Privacy</h2>
                <p className="text-base-content/80 leading-relaxed">
                  WhisperWaffle is not intended for users under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">10. International Data Transfers</h2>
                <p className="text-base-content/80 leading-relaxed">
                  Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. By using WhisperWaffle, you consent to the transfer of your information to these countries.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">11. Changes to This Privacy Policy</h2>
                <p className="text-base-content/80 leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
                </p>
                <p className="text-base-content/80 leading-relaxed mt-4">
                  Changes to this Privacy Policy are effective when they are posted on this page.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">12. Contact Us</h2>
                <p className="text-base-content/80 leading-relaxed">
                  If you have any questions about this Privacy Policy or our privacy practices, please contact us:
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
                <h2 className="text-2xl font-bold text-base-content mt-8 mb-4">13. Consent</h2>
                <p className="text-base-content/80 leading-relaxed">
                  By using WhisperWaffle, you consent to our Privacy Policy and agree to its terms. If you do not agree with this policy, please do not use our platform.
                </p>
              </section>
            </div>
          </GlassCard>
        </div>
      </div>
    </>
  );
};

PrivacyPolicyPage.getLayout = (page) => <Layout>{page}</Layout>;
export default PrivacyPolicyPage;

