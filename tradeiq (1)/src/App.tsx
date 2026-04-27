import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Loader2, ShieldAlert, Bell } from 'lucide-react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  setDoc, 
  updateDoc,
  Timestamp,
  addDoc,
  where
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AnalyzerPage from './components/AnalyzerPage';
import DashboardPage from './components/DashboardPage';
import BasicJournal from './components/BasicJournal';
import ProJournal from './components/ProJournal';
import SettingsPage from './components/SettingsPage';
import ProfilePage from './components/ProfilePage';
import SubscriptionPage from './components/SubscriptionPage';
import MarketDataPage from './components/MarketDataPage';
import RiskToolsPage from './components/RiskToolsPage';
import BacktestPage from './components/BacktestPage';
import AuthPage from './components/AuthPage';
import WelcomeModal from './components/WelcomeModal';
import AdminPanel from './components/AdminPanel';
import SupportChat from './components/SupportChat';
import NotificationPage from './components/NotificationPage';
import CommunityPage from './components/CommunityPage';
import { LandingPage } from './components/LandingPage';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsConditions } from './components/TermsConditions';
import { SupportPage } from './components/SupportPage';
import { Page, TradeRecord, UserSettings } from './types';

const INITIAL_SETTINGS: UserSettings = {
  preferredSession: 'All',
  riskRewardThreshold: 2.0,
  theme: 'Light',
  plan: 'Starter',
  enableAiAlerts: true,
  enableMarketAlerts: true,
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [publicPage, setPublicPage] = useState<'Landing' | 'Auth' | 'Privacy' | 'Terms' | 'Support'>('Landing');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [currentPage, setCurrentPage] = useState<Page>('Analyzer');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [settings, setSettings] = useState<UserSettings>(INITIAL_SETTINGS);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [userName, setUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [systemConfig, setSystemConfig] = useState<{ maintenanceMode?: boolean; broadcastMessage?: string } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<{ type: 'success' | 'failed' | 'error'; message?: string; plan?: string } | null>(null);

  // URL Parameter Handling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('payment');
    const plan = params.get('plan');
    const message = params.get('message');

    if (status) {
      setPaymentStatus({
        type: status as any,
        plan: plan || undefined,
        message: message || undefined
      });
      // Clear parameters from URL without refreshing
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Auth listener
  useEffect(() => {
    // Health check to verify backend connectivity
    fetch('/api/health')
      .then(res => res.json())
      .then(data => console.log('[HEALTH] Backend connected:', data))
      .catch(err => console.error('[HEALTH] Backend connection failed:', err));

    return onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
      if (!user) {
        localStorage.removeItem('welcomeShown');
      }
    });
  }, []);

  // Sync System Config
  useEffect(() => {
    const configRef = doc(db, 'system_config', 'global');
    return onSnapshot(configRef, (snapshot) => {
      if (snapshot.exists()) {
        setSystemConfig(snapshot.data());
      }
    }, (error) => {
      console.error('Error syncing system config:', error);
    });
  }, []);

  // Sync settings
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    return onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSettings({
          preferredSession: data.preferredSession || INITIAL_SETTINGS.preferredSession,
          riskRewardThreshold: data.riskRewardThreshold || INITIAL_SETTINGS.riskRewardThreshold,
          theme: data.theme || INITIAL_SETTINGS.theme,
          plan: data.plan || INITIAL_SETTINGS.plan,
          enableAiAlerts: data.enableAiAlerts !== undefined ? data.enableAiAlerts : INITIAL_SETTINGS.enableAiAlerts,
          enableMarketAlerts: data.enableMarketAlerts !== undefined ? data.enableMarketAlerts : INITIAL_SETTINGS.enableMarketAlerts,
        });
        setUserName(data.displayName || '');
        setIsNewUser(data.isNewUser !== false);
        setIsAdmin(data.role === 'admin' || user.email === 'stanleymukwa27@gmail.com');
        setUserProfile(data);

        const welcomeShown = localStorage.getItem('welcomeShown');
        if (!welcomeShown) {
          setShowWelcome(true);
          localStorage.setItem('welcomeShown', 'true');
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });
  }, [user]);

  // Sync trades
  useEffect(() => {
    if (!user) {
      setTrades([]);
      return;
    }

    const tradesRef = collection(db, 'users', user.uid, 'trades');
    const q = query(tradesRef, orderBy('timestamp', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const tradesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : data.timestamp
        } as TradeRecord;
      });
      setTrades(tradesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/trades`);
    });
  }, [user]);

  // Sync Notifications Count
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('target', 'in', ['All', settings.plan]),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snap) => {
      const lastRead = userProfile?.lastReadNotificationsAt;
      const lastReadDate = lastRead 
        ? (lastRead instanceof Timestamp ? lastRead.toDate() : new Date(lastRead)) 
        : new Date(0);

      const unread = snap.docs.filter(d => {
        const data = d.data();
        const createdAt = data.createdAt;
        const category = data.category;

        // Filter based on user settings
        if (category === 'ai_trade' && !settings.enableAiAlerts) return false;
        if (category === 'market_event' && !settings.enableMarketAlerts) return false;

        const createdDate = createdAt instanceof Timestamp ? createdAt.toDate() : new Date(createdAt);
        return createdDate > lastReadDate;
      }).length;

      setUnreadCount(unread);
    });
  }, [user, settings.plan, userProfile?.lastReadNotificationsAt]);

  // Force Light Theme
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const handleTradeAnalyzed = async (newTrade: TradeRecord) => {
    if (!user) return;
    
    try {
      const tradesRef = collection(db, 'users', user.uid, 'trades');
      const { id, ...tradeData } = newTrade;
      await addDoc(tradesRef, {
        ...tradeData,
        timestamp: Timestamp.fromDate(new Date(newTrade.timestamp)),
        userId: user.uid,
        trade_result: 'Pending'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/trades`);
    }
  };

  const handleUpdateTradeResult = async (tradeId: string, result: 'Win' | 'Loss' | 'Break-even') => {
    if (!user) return;
    
    try {
      const tradeDocRef = doc(db, 'users', user.uid, 'trades', tradeId);
      await updateDoc(tradeDocRef, { trade_result: result });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/trades/${tradeId}`);
    }
  };

  const handleSettingsChange = async (newSettings: UserSettings) => {
    if (!user) return;
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { ...newSettings });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleUpgrade = async (plan: 'Pro' | 'Elite') => {
    if (!user) return;
    setIsSubscriptionLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { plan }, { merge: true });
      setCurrentPage('Dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSubscriptionLoading(false);
    }
  };

  const handleCloseWelcome = async () => {
    setShowWelcome(false);
    if (isNewUser && user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { isNewUser: false });
      } catch (error) {
        console.error('Failed to update isNewUser:', error);
      }
    }
  };

  const handleDowngrade = async () => {
    if (!user) return;
    setIsSubscriptionLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { plan: 'Starter' }, { merge: true });
      setCurrentPage('Dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSubscriptionLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentPage('Analyzer');
      setPublicPage('Landing');
    } catch (error) {
      console.error('Sign out error', error);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    switch (publicPage) {
      case 'Auth':
        return (
          <AuthPage 
            initialMode={authMode} 
            onBack={() => setPublicPage('Landing')} 
          />
        );
      case 'Privacy':
        return <PrivacyPolicy onBack={() => setPublicPage('Landing')} />;
      case 'Terms':
        return <TermsConditions onBack={() => setPublicPage('Landing')} />;
      case 'Support':
        return <SupportPage onBack={() => setPublicPage('Landing')} />;
      default:
        return (
          <LandingPage 
            onGetStarted={() => {
              setAuthMode('signup');
              setPublicPage('Auth');
            }}
            onLogin={() => {
              setAuthMode('login');
              setPublicPage('Auth');
            }}
            onNavigateToPrivacy={() => setPublicPage('Privacy')}
            onNavigateToTerms={() => setPublicPage('Terms')}
            onNavigateToSupport={() => setPublicPage('Support')}
          />
        );
    }
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'Analyzer':
        return <AnalyzerPage onTradeAnalyzed={handleTradeAnalyzed} isPro={settings.plan === 'Pro' || settings.plan === 'Elite'} userId={user?.uid || ''} onNavigateToSubscription={() => setCurrentPage('Subscription')} trades={trades} />;
      case 'Dashboard':
        return (
          <DashboardPage 
            trades={trades} 
            onNavigateToAnalyzer={() => setCurrentPage('Analyzer')} 
            onNavigateToJournal={() => setCurrentPage('Journal')}
          />
        );
      case 'Journal':
        return (settings.plan === 'Pro' || settings.plan === 'Elite')
          ? <ProJournal trades={trades} onNavigateToAnalyzer={() => setCurrentPage('Analyzer')} onUpdateTradeResult={handleUpdateTradeResult} />
          : <BasicJournal trades={trades} onNavigateToAnalyzer={() => setCurrentPage('Analyzer')} onUpdateTradeResult={handleUpdateTradeResult} />;
      case 'Settings':
        return <SettingsPage 
          settings={settings} 
          onSettingsChange={handleSettingsChange} 
          onNavigateToAnalyzer={() => setCurrentPage('Analyzer')} 
        />;
      case 'Profile':
        return <ProfilePage trades={trades} onNavigateToSubscription={() => setCurrentPage('Subscription')} plan={settings.plan} />;
      case 'Subscription':
        return (
          <SubscriptionPage 
            onUpgrade={handleUpgrade} 
            onDowngrade={handleDowngrade} 
            currentPlan={settings.plan} 
            isLoading={isSubscriptionLoading}
            userId={user?.uid || ''}
            userEmail={user?.email || ''}
            userName={user?.displayName || ''}
          />
        );
      case 'MarketData':
        return <MarketDataPage 
          isPro={settings.plan === 'Pro' || settings.plan === 'Elite'} 
          onUpgrade={() => setCurrentPage('Subscription')}
          onNavigateToAnalyzer={() => setCurrentPage('Analyzer')}
        />;
      case 'RiskTools':
        return <RiskToolsPage isPro={settings.plan === 'Pro' || settings.plan === 'Elite'} onUpgrade={() => setCurrentPage('Subscription')} />;
      case 'Backtest':
        return <BacktestPage />;
      case 'Support':
        return <SupportPage userId={user?.uid} />;
      case 'Notifications':
        return <NotificationPage userPlan={settings.plan} isAdmin={isAdmin} settings={settings} />;
      case 'Community':
        return <CommunityPage userProfile={userProfile} isAdmin={isAdmin} />;
      case 'Admin':
        return <AdminPanel onClose={() => setCurrentPage('Dashboard')} />;
      default:
        return <AnalyzerPage onTradeAnalyzed={handleTradeAnalyzed} isPro={settings.plan === 'Pro' || settings.plan === 'Elite'} userId={user?.uid || ''} onNavigateToSubscription={() => setCurrentPage('Subscription')} trades={trades} />;
    }
  };

  const isAdminPage = currentPage === 'Admin';

  return (
    <div className="min-h-screen flex relative bg-slate-50 transition-colors duration-300 overflow-hidden">
      {/* Decorative Background Blobs */}
      <div className="fixed -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Payment Status Notification */}
      <AnimatePresence>
        {paymentStatus && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-full max-w-sm px-4"
          >
            <div className={`p-4 rounded-2xl shadow-2xl border flex items-center gap-4 ${
              paymentStatus.type === 'success' 
                ? 'bg-emerald-500 text-white border-emerald-400' 
                : 'bg-red-500 text-white border-red-400'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                {paymentStatus.type === 'success' ? <Bell className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <h4 className="font-black uppercase tracking-widest text-[10px]">
                  {paymentStatus.type === 'success' ? 'Payment Successful' : 'Payment Failed'}
                </h4>
                <p className="text-xs font-bold opacity-90">
                  {paymentStatus.type === 'success' 
                    ? `Your plan has been upgraded to ${paymentStatus.plan}. Enjoy your new features!` 
                    : paymentStatus.message || 'There was an issue processing your payment. Please try again.'}
                </p>
              </div>
              <button 
                onClick={() => setPaymentStatus(null)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Maintenance Overlay */}
      <AnimatePresence>
        {systemConfig?.maintenanceMode && !isAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6 text-center"
          >
            <div className="max-w-md space-y-6">
              <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
                <ShieldAlert className="w-10 h-10 text-amber-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-white tracking-tight uppercase">System Maintenance</h2>
                <p className="text-slate-400 font-medium">We're currently performing scheduled maintenance to improve your trading experience. We'll be back shortly!</p>
              </div>
              <div className="pt-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Estimated Time: 30m
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Broadcast Banner */}
      <AnimatePresence>
        {systemConfig?.broadcastMessage && !isAdminPage && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-0 left-0 right-0 z-[110] bg-emerald-600 text-white py-2 px-4 text-center text-xs font-bold shadow-lg flex items-center justify-center gap-3"
          >
            <Bell className="w-4 h-4 animate-bounce" />
            <span>{systemConfig.broadcastMessage}</span>
            <button 
              onClick={() => setSystemConfig(prev => prev ? { ...prev, broadcastMessage: '' } : null)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && !isAdminPage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-45"
          />
        )}
      </AnimatePresence>

      {!isAdminPage && (
        <Sidebar 
          currentPage={currentPage} 
          setCurrentPage={setCurrentPage} 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
          plan={settings.plan}
          onSignOut={handleSignOut}
          unreadNotifications={unreadCount}
          isAdmin={isAdmin}
        />
      )}

      {!isAdminPage && (
        <Header 
          onMenuClick={() => setIsSidebarOpen(true)} 
          onSignOut={handleSignOut} 
          hasBanner={!!systemConfig?.broadcastMessage}
          unreadNotifications={unreadCount}
          onNavigateToNotifications={() => setCurrentPage('Notifications')}
        />
      )}
      
      {/* Support Chat */}
      {user && !isAdminPage && <SupportChat userId={user.uid} userEmail={user.email || ''} userPlan={settings.plan} />}
      
      <main className={`flex-1 min-w-0 min-h-screen transition-all duration-300 ${isAdminPage ? 'pt-0' : systemConfig?.broadcastMessage ? 'pt-24' : 'pt-16'}`}>
        <div className={isAdminPage ? '' : 'p-4 md:p-8 max-w-6xl mx-auto'}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>

          {!isAdminPage && (
            <footer className="mt-12 pt-8 border-t border-slate-200 text-center text-slate-400 text-xs">
              <p>© 2026 TradeIQ AI. For educational purposes only. Trading involves significant risk.</p>
            </footer>
          )}
        </div>
      </main>

      <WelcomeModal 
        isOpen={showWelcome} 
        onClose={handleCloseWelcome} 
        isNewUser={isNewUser} 
        userName={userName}
        onStartAnalyzing={() => {
          setCurrentPage('Analyzer');
          handleCloseWelcome();
        }}
      />
    </div>
  );
}
