import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  ShieldCheck, 
  Clock, 
  BrainCircuit, 
  BookOpen, 
  ChevronRight, 
  BarChart3,
  CheckCircle2,
  ArrowRight,
  X
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onNavigateToPrivacy: () => void;
  onNavigateToTerms: () => void;
  onNavigateToSupport: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onGetStarted, 
  onLogin,
  onNavigateToPrivacy,
  onNavigateToTerms,
  onNavigateToSupport
}) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <TrendingUp className="text-white size-6" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">TradeIQ</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={onLogin}
              className="px-5 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              Login
            </button>
            <button 
              onClick={onGetStarted}
              className="px-5 py-2.5 text-sm font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all shadow-lg"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 px-6 overflow-hidden bg-white">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-100/50 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-100/50 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold mb-8 uppercase tracking-widest">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              AI-Powered Trade Validation
            </span>
            <h1 className="text-4xl md:text-7xl font-black tracking-tight mb-8 text-slate-900 leading-[1.1]">
              Stop Guessing Your Trades. <br className="hidden md:block" />
              Let AI Validate Them Before <br className="hidden md:block" />
              You Risk Money.
            </h1>
            <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed">
              TradeIQ analyzes your trade setups using trend, risk management, and execution timing to help you make smarter decisions.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={onGetStarted}
                className="w-full sm:w-auto px-8 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 group shadow-xl shadow-emerald-600/20"
              >
                Start Trading Smarter
                <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={onGetStarted}
                className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 text-slate-900 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm"
              >
                Analyze Your First Trade
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pain Point Section */}
      <section className="py-24 px-6 border-y border-slate-100 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-black mb-8 text-slate-900 leading-tight">Why Most Traders <br /><span className="text-rose-500 underline decoration-rose-200">Lose Money</span></h2>
              <div className="space-y-6">
                {[
                  { title: "Poor Entry Timing", desc: "Entering trades too early or too late, missing the optimal move." },
                  { title: "Weak Risk/Reward", desc: "Risking too much for too little potential profit." },
                  { title: "Fighting the Trend", desc: "Trying to pick tops and bottoms instead of following the flow." },
                  { title: "Emotional Decisions", desc: "Letting fear and greed override a logical trading plan." }
                ].map((point, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                    <div className="size-8 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                      <X className="text-rose-500 size-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1">{point.title}</h4>
                      <p className="text-slate-500 text-sm leading-relaxed">{point.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="relative bg-white border border-slate-100 rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full bg-rose-500" />
                    <span className="text-xs font-black text-rose-500 uppercase tracking-widest">Common Mistakes</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full w-[90%] bg-rose-500" />
                  </div>
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Emotional Bias</span>
                    <span className="text-rose-500">90% of Traders</span>
                  </div>
                </div>
                <div className="mt-8 p-6 bg-rose-50 border border-rose-100 rounded-2xl">
                  <p className="text-sm text-rose-900 font-medium leading-relaxed italic">
                    "I entered because I was afraid of missing out, even though the trend was clearly against me."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="relative bg-white border border-slate-100 rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full bg-emerald-500" />
                    <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">TradeIQ Analysis</span>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                    88% CONFIDENCE
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest">Trade Score</span>
                    <span className="text-2xl font-black text-emerald-600">84%</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest">Signal</span>
                    <span className="text-2xl font-black text-slate-900">BUY NOW</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <CheckCircle2 className="text-emerald-500 size-5" />
                    <span>Trend Alignment Confirmed</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <CheckCircle2 className="text-emerald-500 size-5" />
                    <span>1:2.5 Risk/Reward Ratio</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <CheckCircle2 className="text-emerald-500 size-5" />
                    <span>Optimal Session Timing</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl md:text-5xl font-black mb-8 text-slate-900 leading-tight">How TradeIQ <br /><span className="text-emerald-600 underline decoration-emerald-100">Helps You Win</span></h2>
              <div className="space-y-6">
                {[
                  { title: "Validates Setups", desc: "AI checks your parameters against professional criteria before you enter." },
                  { title: "Calculates Risk", desc: "Ensures every trade has a proper risk-to-reward ratio for long-term growth." },
                  { title: "Suggests Timing", desc: "Identifies the highest probability execution windows based on session data." },
                  { title: "Filters Bad Trades", desc: "Saves your capital by identifying low-probability setups you should avoid." }
                ].map((point, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                    <div className="size-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="text-emerald-600 size-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1">{point.title}</h4>
                      <p className="text-slate-500 text-sm leading-relaxed">{point.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works (Simplified) */}
      <section className="py-24 px-6 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black mb-4 text-slate-900">How It Works</h2>
            <p className="text-slate-500 font-medium">Three simple steps to professional-grade analysis.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                step: "01",
                title: "Enter Parameters",
                desc: "Input your trade details or upload a chart screenshot."
              },
              {
                step: "02",
                title: "AI Analysis",
                desc: "Our engine evaluates the setup against market conditions."
              },
              {
                step: "03",
                title: "Get Recommendation",
                desc: "Receive an instant Buy/Sell/Wait signal with detailed notes."
              }
            ].map((step, i) => (
              <div key={i} className="text-center group">
                <div className="size-20 rounded-3xl bg-white border border-slate-100 flex items-center justify-center mx-auto mb-8 text-2xl font-black text-slate-900 group-hover:border-emerald-500/50 group-hover:text-emerald-600 transition-all shadow-sm">
                  {step.step}
                </div>
                <h3 className="text-xl font-bold mb-4 text-slate-900">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-sm font-black mb-16 text-slate-400 uppercase tracking-[0.3em]">Verified results from active traders</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Alex R.", role: "Day Trader", text: "TradeIQ saved me from at least 3 bad trades this week alone. The risk analysis is a game changer." },
              { name: "Sarah M.", role: "Swing Trader", text: "I love the execution timing feature. It helped me realize I was trading in low-volatility windows." },
              { name: "David K.", role: "Forex Enthusiast", text: "The AI analysis is surprisingly accurate. It's like having a professional mentor looking over my shoulder." }
            ].map((testimonial, i) => (
              <div key={i} className="p-8 rounded-3xl bg-slate-50 border border-slate-100 text-left hover:shadow-md transition-shadow">
                <p className="text-slate-600 font-medium italic mb-6 leading-relaxed">"{testimonial.text}"</p>
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-lg">
                    {testimonial.name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{testimonial.name}</h4>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-12 md:p-20 rounded-[3rem] bg-slate-900 overflow-hidden text-center shadow-2xl">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
                Start Making Smarter <br />Trades Today
              </h2>
              <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto font-medium leading-relaxed">
                Stop guessing and start validating. Join the next generation of data-driven traders.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={onGetStarted}
                  className="w-full sm:w-auto px-10 py-5 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 group shadow-xl shadow-emerald-600/20"
                >
                  Sign Up Now
                  <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={onLogin}
                  className="w-full sm:w-auto px-10 py-5 bg-white text-slate-900 font-bold rounded-2xl hover:bg-slate-50 transition-all"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12 mb-12">
            <div className="flex items-center gap-2">
              <div className="size-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="text-white size-6" strokeWidth={2.5} />
              </div>
              <span className="text-2xl font-black tracking-tight text-slate-900">TradeIQ</span>
            </div>
            <div className="flex items-center gap-8">
              <button 
                onClick={onNavigateToPrivacy}
                className="text-slate-500 hover:text-slate-900 text-sm font-bold transition-colors uppercase tracking-widest"
              >
                Privacy
              </button>
              <button 
                onClick={onNavigateToTerms}
                className="text-slate-500 hover:text-slate-900 text-sm font-bold transition-colors uppercase tracking-widest"
              >
                Terms
              </button>
              <button 
                onClick={onNavigateToSupport}
                className="text-slate-500 hover:text-slate-900 text-sm font-bold transition-colors uppercase tracking-widest"
              >
                Support
              </button>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
              © 2026 TradeIQ AI. All rights reserved. 
            </p>
            <p className="text-slate-400 text-[10px] font-medium max-w-sm text-center md:text-right">
              Disclaimer: Trading involves significant risk. AI recommendations are for educational purposes only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};;
