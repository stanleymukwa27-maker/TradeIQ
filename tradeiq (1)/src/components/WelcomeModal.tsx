import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, TrendingUp, ArrowRight } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isNewUser: boolean;
  userName?: string;
  onStartAnalyzing?: () => void;
}

export default function WelcomeModal({ isOpen, onClose, isNewUser, userName, onStartAnalyzing }: WelcomeModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            {/* Header/Banner */}
            <div className="h-32 bg-slate-900 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500 rounded-full -translate-x-16 -translate-y-16 blur-3xl" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500 rounded-full translate-x-16 translate-y-16 blur-3xl" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                  {isNewUser ? <Sparkles className="text-white" size={32} /> : <TrendingUp className="text-white" size={32} />}
                </div>
              </div>
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 sm:p-10 text-center">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-4 uppercase italic tracking-tighter">
                {isNewUser ? "Welcome to TradeIQ" : `Welcome back, ${userName || 'Trader'}`}
              </h2>
              
              <p className="text-slate-500 leading-relaxed mb-10 font-medium italic">
                {isNewUser 
                  ? "Your AI-powered trading assistant is ready. Analyze trades, manage risk, and improve your decision-making with smart insights."
                  : "Ready to analyze your next trade? Let's get back to the markets."
                }
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                {isNewUser ? (
                  <>
                    <button
                      onClick={onStartAnalyzing}
                      className="flex-1 py-4 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
                    >
                      Start Analyzing
                      <ArrowRight size={18} />
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all border border-slate-100"
                    >
                      Maybe Later
                    </button>
                  </>
                ) : (
                  <button
                    onClick={onClose}
                    className="w-full py-4 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all shadow-xl shadow-slate-200"
                  >
                    Continue
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
