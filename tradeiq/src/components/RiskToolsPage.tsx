import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Target, Calculator, Lock, Info, Zap } from 'lucide-react';

interface RiskToolsPageProps {
  isPro: boolean;
  onUpgrade: () => void;
}

export default function RiskToolsPage({ isPro, onUpgrade }: RiskToolsPageProps) {
  const [balance, setBalance] = useState('10000');
  const [riskPercent, setRiskPercent] = useState('1');
  const [stopLossPips, setStopLossPips] = useState('20');
  const [pipValue, setPipValue] = useState('10');

  const calculatePositionSize = () => {
    const bal = parseFloat(balance);
    const risk = parseFloat(riskPercent) / 100;
    const sl = parseFloat(stopLossPips);
    const pv = parseFloat(pipValue);

    if (isNaN(bal) || isNaN(risk) || isNaN(sl) || isNaN(pv) || sl === 0) return 0;

    const riskAmount = bal * risk;
    const lotSize = riskAmount / (sl * pv);
    return lotSize.toFixed(2);
  };

  if (!isPro) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 bg-white rounded-[3rem] p-12 border border-slate-100 shadow-2xl shadow-slate-200">
        <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-slate-400">
          <Shield size={44} />
        </div>
        <div className="max-w-md space-y-3">
          <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Custom Risk Management</h2>
          <p className="text-slate-500 font-medium italic leading-relaxed">
            Upgrade to Pro to access advanced position sizing calculators and risk exposure management tools.
          </p>
        </div>
        <button
          onClick={onUpgrade}
          className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95 flex items-center gap-2"
        >
          <Zap size={18} />
          Elevate Your Edge
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Risk Management</h2>
          <p className="text-slate-500 font-medium tracking-tight">Professional-grade position sizing and risk control</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-sm">
          <Shield size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">Risk Shield Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Position Size Calculator */}
        <div className="lg:col-span-4 card-base p-8 shadow-xl shadow-slate-100 border-none">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 border border-slate-100 shadow-inner">
              <Calculator size={24} />
            </div>
            <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-xl">Position Sizer</h3>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-300 uppercase mb-2 tracking-[0.2em]">Account Balance ($)</label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-black focus:ring-4 focus:ring-slate-900/5 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-300 uppercase mb-2 tracking-[0.2em]">Risk Percentage (%)</label>
              <input
                type="number"
                value={riskPercent}
                onChange={(e) => setRiskPercent(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-black focus:ring-4 focus:ring-slate-900/5 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-300 uppercase mb-2 tracking-[0.2em]">Stop Loss (Pips)</label>
              <input
                type="number"
                value={stopLossPips}
                onChange={(e) => setStopLossPips(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-black focus:ring-4 focus:ring-slate-900/5 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-300 uppercase mb-2 tracking-[0.2em]">Pip Value ($)</label>
              <input
                type="number"
                value={pipValue}
                onChange={(e) => setPipValue(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-black focus:ring-4 focus:ring-slate-900/5 outline-none transition-all"
              />
            </div>

            <div className="mt-10 p-8 bg-slate-900 rounded-3xl text-white shadow-[0_20px_50px_rgba(15,23,42,0.3)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-150 transition-transform duration-700">
                <Calculator size={120} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 relative">Recommended Lot Size</p>
              <p className="text-5xl font-black italic tracking-tighter relative">{calculatePositionSize()} <span className="text-xl opacity-30 tracking-widest font-sans">Lots</span></p>
              <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center relative">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Risk Amount:</span>
                <span className="text-lg font-black italic text-emerald-400">${(parseFloat(balance) * (parseFloat(riskPercent) / 100)).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Exposure & Strategy */}
        <div className="lg:col-span-8 space-y-8">
          <div className="card-base p-8 shadow-sm">
            <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-xl mb-8 flex items-center gap-3">
              <Target size={24} className="text-slate-900" />
              Risk Exposure Matrix
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: 'Max Daily Drawdown', value: '5%', status: 'Safe' },
                { label: 'Open Exposure', value: '$1,200', status: 'Moderate' },
                { label: 'Correlation Risk', value: 'Low', status: 'Safe' },
              ].map((item) => (
                <div key={item.label} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col justify-between shadow-inner">
                  <div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.15em] mb-4">{item.label}</p>
                    <p className="text-2xl font-black text-slate-900 italic tracking-tighter">{item.value}</p>
                  </div>
                  <div className="mt-6">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full inline-block shadow-sm ${
                      item.status === 'Safe' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-base p-8 shadow-sm">
            <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-xl mb-8 flex items-center gap-3">
              <Info size={24} className="text-slate-900" />
              Pro Risk Management Tips
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                'Never risk more than 2% of your account on a single trade.',
                'Ensure your Risk/Reward ratio is at least 1:2 for long-term profitability.',
                'Be aware of high-impact news events that can cause slippage.',
                'Use trailing stops to lock in profits on trending markets.'
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-xl transition-all duration-300">
                  <div className="mt-1 w-6 h-6 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                    <Check size={14} className="text-white" />
                  </div>
                  <p className="text-xs font-bold text-slate-600 leading-relaxed italic">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Check({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
