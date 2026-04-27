import React from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Eye, Database, ArrowLeft, TrendingUp } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-emerald-500/30">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="size-5 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </button>
          <div className="flex items-center gap-2">
            <div className="size-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-black size-5" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight">TradeIQ</span>
          </div>
          <div className="w-24" /> {/* Spacer */}
        </div>
      </nav>

      <main className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="size-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-8">
              <Shield className="text-emerald-500 size-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Privacy Policy</h1>
            <p className="text-zinc-400 text-lg mb-12 leading-relaxed">
              Your privacy is our priority. This policy explains how we handle your data at TradeIQ.
            </p>

            <div className="space-y-12">
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Database className="text-emerald-500 size-6" />
                  <h2 className="text-2xl font-bold">Data Collection</h2>
                </div>
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-4">
                  <p className="text-zinc-400 leading-relaxed">
                    We collect minimal data necessary to provide our services:
                  </p>
                  <ul className="list-disc list-inside text-zinc-400 space-y-2 ml-4">
                    <li><span className="text-white font-medium">Account Information:</span> Your email address and display name for authentication.</li>
                    <li><span className="text-white font-medium">Trade Data:</span> Parameters of trades you analyze (pairs, prices, timeframes).</li>
                    <li><span className="text-white font-medium">Usage Data:</span> Anonymous technical data to improve app performance.</li>
                  </ul>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Eye className="text-emerald-500 size-6" />
                  <h2 className="text-2xl font-bold">How We Use Your Data</h2>
                </div>
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-4">
                  <p className="text-zinc-400 leading-relaxed">
                    Your data is used exclusively for:
                  </p>
                  <ul className="list-disc list-inside text-zinc-400 space-y-2 ml-4">
                    <li>Providing AI-powered trade analysis.</li>
                    <li>Maintaining your personal trade journal.</li>
                    <li>Improving our analysis algorithms and user experience.</li>
                    <li>Sending essential service updates.</li>
                  </ul>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Lock className="text-emerald-500 size-6" />
                  <h2 className="text-2xl font-bold">Data Protection</h2>
                </div>
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-4">
                  <p className="text-zinc-400 leading-relaxed">
                    We take security seriously:
                  </p>
                  <ul className="list-disc list-inside text-zinc-400 space-y-2 ml-4">
                    <li><span className="text-white font-medium">No Selling:</span> We never sell your personal or trade data to third parties.</li>
                    <li><span className="text-white font-medium">Encryption:</span> All data is transmitted and stored using industry-standard encryption.</li>
                    <li><span className="text-white font-medium">Control:</span> You can delete your account and all associated data at any time from the settings.</li>
                  </ul>
                </div>
              </section>

              <div className="pt-12 border-t border-white/5">
                <p className="text-zinc-500 text-sm">
                  Last updated: March 19, 2026. If you have questions about this policy, please contact our support team.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};
