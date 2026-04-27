import React from 'react';
import { motion } from 'motion/react';
import { FileText, AlertTriangle, Scale, ArrowLeft, TrendingUp } from 'lucide-react';

interface TermsConditionsProps {
  onBack: () => void;
}

export const TermsConditions: React.FC<TermsConditionsProps> = ({ onBack }) => {
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
              <FileText className="text-emerald-500 size-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Terms & Conditions</h1>
            <p className="text-zinc-400 text-lg mb-12 leading-relaxed">
              Please read these terms carefully before using TradeIQ.
            </p>

            <div className="space-y-12">
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Scale className="text-emerald-500 size-6" />
                  <h2 className="text-2xl font-bold">App Usage Terms</h2>
                </div>
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-4">
                  <p className="text-zinc-400 leading-relaxed">
                    By using TradeIQ, you agree to:
                  </p>
                  <ul className="list-disc list-inside text-zinc-400 space-y-2 ml-4">
                    <li>Use the application only for lawful purposes.</li>
                    <li>Maintain the security of your account and password.</li>
                    <li>Not attempt to reverse engineer or disrupt our AI services.</li>
                    <li>Accept responsibility for all activities under your account.</li>
                  </ul>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="text-amber-500 size-6" />
                  <h2 className="text-2xl font-bold">Financial Disclaimer</h2>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
                  <p className="text-amber-200 font-bold mb-4 uppercase text-sm tracking-widest">Important Notice</p>
                  <p className="text-zinc-300 leading-relaxed font-medium">
                    TradeIQ is an educational tool and does not provide financial advice. All analysis provided by our AI is for informational purposes only. Trading involves significant risk of loss. You are solely responsible for your trading decisions and should consult with a professional financial advisor before making any investments.
                  </p>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Scale className="text-emerald-500 size-6" />
                  <h2 className="text-2xl font-bold">Limitation of Liability</h2>
                </div>
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-4">
                  <p className="text-zinc-400 leading-relaxed">
                    TradeIQ and its developers shall not be liable for any financial losses, damages, or missed opportunities resulting from the use of our application or its AI analysis. We provide our services "as is" and make no guarantees regarding the accuracy or profitability of the analysis provided.
                  </p>
                </div>
              </section>

              <div className="pt-12 border-t border-white/5">
                <p className="text-zinc-500 text-sm">
                  Last updated: March 19, 2026. Continued use of TradeIQ constitutes acceptance of these terms.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};
