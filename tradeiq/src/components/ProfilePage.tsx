import React from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Mail, 
  Calendar, 
  Award, 
  TrendingUp, 
  Target,
  Shield,
  ExternalLink,
  Edit3
} from 'lucide-react';
import { TradeRecord } from '../types';

interface ProfilePageProps {
  trades: TradeRecord[];
  onNavigateToSubscription: () => void;
  plan: 'Starter' | 'Pro' | 'Elite';
}

export default function ProfilePage({ trades, onNavigateToSubscription, plan }: ProfilePageProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const totalTrades = trades.length;
  const highQualityTrades = trades.filter(t => t.score >= 80).length;
  const winRate = totalTrades > 0 ? Math.round((highQualityTrades / totalTrades) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Section */}
      <div className="card-base p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="relative group">
              <div className="w-28 h-28 bg-slate-900 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-slate-200 transition-transform group-hover:scale-105 duration-300">
                <User className="text-white" size={56} />
              </div>
              <button className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-lg border border-slate-100 text-slate-400 hover:text-slate-900 transition-colors">
                <Edit3 size={16} />
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex flex-col md:flex-row items-center gap-3">
                <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Stanley Mukwa</h2>
                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border shadow-sm ${
                  (plan === 'Pro' || plan === 'Elite')
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-50 text-slate-400 border-slate-100'
                }`}>
                  {plan} Trader
                </span>
              </div>
              <p className="text-slate-500 flex items-center justify-center md:justify-start gap-2 text-sm font-bold">
                <Mail size={14} className="text-slate-400" />
                stanleymukwa27@gmail.com
              </p>
              <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-300" />
                  Joined March 2026
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-sm flex items-center gap-2 ${
              isEditing 
                ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                : 'bg-slate-900 text-white hover:bg-black'
            }`}
          >
            {isEditing ? 'Save Changes' : 'Edit Profile'}
          </button>
        </div>
      </div>

      {isEditing && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-emerald-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-sm italic"
        >
          <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          Profile editing mode active.
        </motion.div>
      )}

      {/* Performance Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-base p-6 flex flex-col justify-between min-h-[160px] shadow-sm">
          <div>
            <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="text-slate-900" size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Trading Level</p>
            <p className="text-2xl font-black text-slate-900 uppercase tracking-tight italic mt-1 font-mono">Advanced</p>
          </div>
          <div className="mt-4 h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
            <div className="h-full bg-slate-900 w-3/4 shadow-[0_0_8px_rgba(15,23,42,0.3)]" />
          </div>
        </div>
        <div className="card-base p-6 flex flex-col justify-between min-h-[160px] shadow-sm">
          <div>
            <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mb-4">
              <Award className="text-slate-900" size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Quality Rate</p>
            <p className="text-2xl font-black text-slate-900 uppercase tracking-tight italic mt-1 font-mono">{winRate}%</p>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Setups scored 80%+</p>
        </div>
        <div className="card-base p-6 flex flex-col justify-between min-h-[160px] shadow-sm">
          <div>
            <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mb-4">
              <Target className="text-slate-900" size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Total Analyses</p>
            <p className="text-2xl font-black text-slate-900 uppercase tracking-tight italic mt-1 font-mono">{totalTrades}</p>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Across all pairs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Account & Security Card */}
          <div className="card-base p-6 md:p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight mb-6 flex items-center gap-2">
              <Shield size={20} className="text-slate-900" />
              Account & Security
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                  <p className="font-black text-slate-900 uppercase text-xs tracking-tight">Two-Factor Authentication</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Add an extra layer of security</p>
                </div>
                <button className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all shadow-sm">
                  Enable
                </button>
              </div>
              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                  <p className="font-black text-slate-900 uppercase text-xs tracking-tight">Session Management</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Manage active trading sessions</p>
                </div>
                <button className="text-[10px] font-black text-slate-900 hover:text-black uppercase tracking-widest transition-colors italic underline underline-offset-4">
                  View Sessions
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Pro Benefits Card */}
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl shadow-slate-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors" />
            <h3 className="text-xl font-black uppercase italic tracking-tight mb-6 relative z-10">Pro Benefits</h3>
            <ul className="space-y-4 relative z-10">
              {['Unlimited Analyses', 'Advanced Journaling', 'Market Sentiment AI', 'Priority Support'].map(item => (
                <li key={item} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/80">
                  <div className="size-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  {item}
                </li>
              ))}
            </ul>
            <button 
              onClick={onNavigateToSubscription}
              className="w-full mt-8 py-5 bg-white text-slate-900 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-50 active:scale-[0.98] transition-all shadow-xl"
            >
              Manage Subscription
            </button>
          </div>

          {/* Connected Accounts Card */}
          <div className="card-base p-6 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 italic">Connected Services</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100">
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">Google Account</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Linked</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100">
                    <ExternalLink size={14} className="text-slate-300" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">MetaTrader 5</span>
                </div>
                <button className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors underline underline-offset-4 decoration-dotted">Connect</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
