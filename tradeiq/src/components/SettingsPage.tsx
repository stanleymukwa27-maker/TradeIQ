import React from 'react';
import { 
  Globe, 
  ShieldAlert, 
  Palette, 
  Bell, 
  ArrowUpRight,
  ChevronRight,
  User,
  Database,
  Cpu,
  Zap
} from 'lucide-react';
import { UserSettings } from '../types';

interface SettingsPageProps {
  settings: UserSettings;
  onSettingsChange: (settings: UserSettings) => void;
  onNavigateToAnalyzer: () => void;
}

export default function SettingsPage({ settings, onSettingsChange, onNavigateToAnalyzer }: SettingsPageProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">System Settings</h2>
          <p className="text-slate-500 font-medium">Configure your trading preferences and UI</p>
        </div>
        <button 
          onClick={onNavigateToAnalyzer}
          className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95"
        >
          Back to Analyzer
          <ArrowUpRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          {/* Trading Preferences */}
          <div className="card-base overflow-hidden">
            <div className="p-6 border-b border-slate-50">
              <h3 className="font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-2">
                <Globe className="text-slate-400" size={20} />
                Trading Preferences
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="font-black text-slate-900 uppercase tracking-tighter italic">Preferred Session</p>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Focus analysis on specific market hours</p>
                </div>
                <div className="flex bg-slate-50 p-1 rounded-xl overflow-x-auto no-scrollbar border border-slate-100">
                  {['London', 'New York', 'All'].map((s) => (
                    <button
                      key={s}
                      onClick={() => onSettingsChange({ ...settings, preferredSession: s as any })}
                      className={`px-4 md:px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        settings.preferredSession === s ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-slate-50" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="font-black text-slate-900 uppercase tracking-tighter italic">Risk/Reward Threshold</p>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Minimum ratio for "Strong" recommendation</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <input 
                    type="range" 
                    min="1" 
                    max="5" 
                    step="0.5"
                    value={settings.riskRewardThreshold}
                    onChange={(e) => onSettingsChange({ ...settings, riskRewardThreshold: parseFloat(e.target.value) })}
                    className="flex-1 md:w-48 accent-slate-900"
                  />
                  <span className="font-black font-mono text-slate-900 w-12 text-center shrink-0">1:{settings.riskRewardThreshold}</span>
                </div>
              </div>
            </div>
          </div>

          {/* UI Preferences */}
          <div className="card-base overflow-hidden">
            <div className="p-6 border-b border-slate-50">
              <h3 className="font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-2">
                <Palette className="text-slate-400" size={20} />
                Interface
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-slate-900 uppercase tracking-tighter italic leading-none mb-1">AI Trade Alerts</p>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Get notified of high-probability setups</p>
                </div>
                <button 
                  onClick={() => onSettingsChange({ ...settings, enableAiAlerts: !settings.enableAiAlerts })}
                  className={`w-14 h-8 rounded-full transition-all relative ${settings.enableAiAlerts ? 'bg-slate-900 shadow-inner' : 'bg-slate-100'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-md ${settings.enableAiAlerts ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="h-px bg-slate-50" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-slate-900 uppercase tracking-tighter italic leading-none mb-1">Market Event Alerts</p>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Notifications for significant market volatility</p>
                </div>
                <button 
                  onClick={() => onSettingsChange({ ...settings, enableMarketAlerts: !settings.enableMarketAlerts })}
                  className={`w-14 h-8 rounded-full transition-all relative ${settings.enableMarketAlerts ? 'bg-slate-900 shadow-inner' : 'bg-slate-100'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-md ${settings.enableMarketAlerts ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="h-px bg-slate-50" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-slate-900 uppercase tracking-tighter italic leading-none mb-1">System Notifications</p>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Platform updates and account alerts</p>
                </div>
                <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg border border-emerald-100">
                  <Bell size={20} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Zap size={100} />
            </div>
            <div className="flex items-center gap-4 mb-8 relative">
              <div className="size-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner">
                <User className="text-white" size={24} />
              </div>
              <div className="flex-1">
                <p className="font-black uppercase tracking-tighter italic">Active User</p>
                <div className="flex items-center gap-2">
                   <div className="size-2 bg-emerald-500 rounded-full animate-pulse" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pro Access Unified</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 relative">
              <button className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
                <div className="flex items-center gap-3">
                  <ShieldAlert size={18} className="text-slate-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Security Protocol</span>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:text-white transition-colors" />
              </button>
              <button className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
                <div className="flex items-center gap-3">
                  <Database size={18} className="text-slate-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Audit Dump</span>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:text-white transition-colors" />
              </button>
            </div>

            <div className="mt-12 p-5 bg-white shadow-2xl rounded-[2rem] text-slate-900 border border-slate-100">
              <p className="text-[9px] font-black uppercase leading-relaxed tracking-widest italic opacity-50">
                Your data is stored locally in this session. Connect Firebase in settings to enable cloud sync.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
