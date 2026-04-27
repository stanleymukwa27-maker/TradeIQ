import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  TrendingUp, 
  ShieldCheck, 
  Zap,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { TradingChartAnimation } from './TradingChartAnimation';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
  onBack?: () => void;
}

export default function AuthPage({ initialMode = 'login', onBack }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          displayName: name,
          email: email,
          plan: 'Starter',
          preferredSession: 'All',
          riskRewardThreshold: 2.0,
          theme: 'Light',
          isNewUser: true,
          createdAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password authentication is not enabled in your Firebase project. Please enable it in the Firebase Console.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          displayName: user.displayName || '',
          email: user.email || '',
          plan: 'Starter',
          preferredSession: 'All',
          riskRewardThreshold: 2.0,
          theme: 'Light',
          isNewUser: true,
          createdAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Google Sign-In is not enabled in your Firebase project. Please enable it in the Firebase Console.');
      } else {
        setError(err.message || 'Google sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* Background Chart decoration */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
        <TradingChartAnimation className="w-full h-full scale-150 rotate-12 translate-y-20" />
      </div>
      
      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8 relative">
          {onBack && (
            <button 
              onClick={onBack}
              className="absolute left-0 top-0 p-2 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <ArrowRight className="rotate-180" size={20} />
            </button>
          )}
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-slate-950 rounded-2xl shadow-lg shadow-slate-200 mb-4"
          >
            <TrendingUp className="text-white" size={32} />
          </motion.div>
          <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">TradeIQ</h1>
          <p className="text-slate-500 mt-2 font-medium italic">Advanced Forex Trading Intelligence</p>
        </div>

        <motion.div 
          layout
          className="card-base p-8 bg-white shadow-xl relative overflow-hidden"
        >
          {/* Loading Overlay with Animated Chart */}
          <AnimatePresence>
            {loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
              >
                <TradingChartAnimation isLoader className="w-full h-32 mb-6" />
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 text-slate-900 animate-spin" />
                    <span className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Analyzing Credentials...</span>
                  </div>
                  <p className="text-slate-500 text-xs font-medium max-w-[200px] italic">Securing your trading workspace and initializing AI engines.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Decorative Chart on top of forms */}
          <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-100 overflow-hidden group shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Market Feed (Live)</span>
              <div className="flex gap-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-900/10 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
            <TradingChartAnimation className="h-16 w-full opacity-60 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="flex bg-slate-50 p-1 rounded-2xl mb-8 border border-slate-100">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLogin ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isLogin ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400'}`}
            >
              Sign Up
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.form 
              key={isLogin ? 'login' : 'signup'}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleAuth}
              className="space-y-4"
            >
              {!isLogin && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest italic">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all text-sm font-bold placeholder:text-slate-300"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest italic">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all text-sm font-bold placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest italic">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all text-sm font-bold placeholder:text-slate-300"
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-[10px] font-black uppercase tracking-widest shadow-sm italic">
                  <AlertCircle size={14} className="shrink-0" />
                  {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4.5 bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all flex items-center justify-center gap-2 shadow-2xl shadow-slate-200"
              >
                {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </motion.form>
          </AnimatePresence>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white px-4 text-slate-300 font-black tracking-widest italic">Or use social access</span>
            </div>
          </div>

          <button 
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-4 bg-white border border-slate-100 hover:bg-slate-50 text-slate-900 font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.98]"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Continue with Google
          </button>
        </motion.div>

        <div className="mt-8 grid grid-cols-3 gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 shadow-sm border border-slate-50">
              <Zap size={22} />
            </div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">AI Engine</span>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 shadow-sm border border-slate-50">
              <ShieldCheck size={22} />
            </div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Vault Lock</span>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 shadow-sm border border-slate-50">
              <TrendingUp size={22} />
            </div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Pro Edge</span>
          </div>
        </div>
      </div>
    </div>
  );
}
