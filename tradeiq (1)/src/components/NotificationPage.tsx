import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Trash2,
  ChevronRight,
  ShieldCheck,
  Cpu,
  Zap,
  BellRing
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp,
  deleteDoc,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserSettings } from '../types';

interface Notification {
  id: string;
  title: string;
  message: string;
  target: 'All' | 'Basic' | 'Pro';
  type: 'info' | 'warning' | 'success' | 'alert';
  category: 'ai_trade' | 'market_event' | 'system';
  createdAt: any;
  adminId: string;
}

interface NotificationPageProps {
  userPlan: string;
  isAdmin?: boolean;
  settings: UserSettings;
}

export default function NotificationPage({ userPlan, isAdmin, settings }: NotificationPageProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Update last read timestamp when viewing notifications
    if (auth.currentUser) {
      updateDoc(doc(db, 'users', auth.currentUser.uid), {
        lastReadNotificationsAt: Timestamp.now()
      }).catch(err => console.error("Error updating lastReadNotificationsAt:", err));
    }

    // Query for notifications targeted at 'All' OR the user's specific plan
    const q = query(
      collection(db, 'notifications'),
      where('target', 'in', ['All', userPlan]),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const allNotifications = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
      
      // Filter based on user settings
      const filtered = allNotifications.filter(n => {
        if (n.category === 'ai_trade' && !settings.enableAiAlerts) return false;
        if (n.category === 'market_event' && !settings.enableMarketAlerts) return false;
        return true;
      });

      setNotifications(filtered);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userPlan, settings.enableAiAlerts, settings.enableMarketAlerts]);

  const getIcon = (type: string, category?: string) => {
    if (category === 'ai_trade') return <Cpu className="w-5 h-5 text-emerald-500" />;
    if (category === 'market_event') return <Zap className="w-5 h-5 text-amber-500" />;
    
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'alert': return <AlertCircle className="w-5 h-5 text-rose-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = (type: string, category?: string) => {
    if (category === 'ai_trade') return 'bg-emerald-50 border-emerald-100';
    if (category === 'market_event') return 'bg-amber-50 border-amber-100';

    switch (type) {
      case 'warning': return 'bg-amber-50 border-amber-100';
      case 'success': return 'bg-emerald-50 border-emerald-100';
      case 'alert': return 'bg-rose-50 border-rose-100';
      default: return 'bg-blue-50 border-blue-100';
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3 uppercase italic">
            <Bell className="w-8 h-8 text-slate-900" />
            Intelligence Stream
          </h2>
          <p className="text-slate-500 mt-1 font-medium italic">Latest platform signals and market alerts.</p>
        </div>
        
        {userPlan === 'Pro' && (
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-2xl shadow-lg shadow-slate-200">
            <ShieldCheck className="w-4 h-4 text-white" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Priority Pass Active</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic font-mono">Syncing updates...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-100 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <Bell className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Silence is Golden</h3>
            <p className="text-slate-400 max-w-xs mx-auto mt-2 text-sm font-medium">Your intelligence feed is clear at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {notifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-6 rounded-[2rem] border transition-all hover:shadow-xl group hover:scale-[1.01] shadow-sm ${getBgColor(notification.type, notification.category)}`}
                >
                  <div className="flex items-start gap-5">
                    <div className="mt-1 p-3 bg-white rounded-2xl shadow-sm">
                      {getIcon(notification.type, notification.category)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">
                          {notification.title}
                        </h4>
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 whitespace-nowrap uppercase tracking-widest bg-white/50 px-3 py-1 rounded-full shadow-inner">
                          <Calendar className="w-3 h-3" />
                          {notification.createdAt instanceof Timestamp 
                            ? notification.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) 
                            : new Date(notification.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      
                      <p className="text-slate-600 text-sm font-bold leading-relaxed mb-4">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           {notification.category && (
                             <span className="px-2 py-0.5 bg-white text-[8px] font-black text-slate-400 border border-slate-50 rounded uppercase tracking-widest shadow-sm">
                               {notification.category.replace('_', ' ')}
                             </span>
                           )}
                        </div>
                        
                        {isAdmin && (
                          <button
                            onClick={async () => {
                              if (window.confirm('Are you sure you want to delete this notification?')) {
                                await deleteDoc(doc(db, 'notifications', notification.id));
                              }
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                            title="Delete Notification"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Pro Upsell for Basic Users */}
      {userPlan === 'Basic' && (
        <div className="p-10 rounded-[3rem] bg-slate-900 text-white shadow-2xl shadow-slate-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[100px] group-hover:bg-emerald-500/30 transition-all" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-20 h-20 rounded-[2.5rem] bg-white flex items-center justify-center shrink-0 shadow-2xl shadow-white/10 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-10 h-10 text-slate-900" />
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-3xl font-black italic tracking-tighter uppercase">Elite Alerts</h3>
                <p className="text-slate-400 font-bold text-sm mt-1">Unlock exclusive high-frequency market signals and priority system feed.</p>
              </div>
            </div>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('open-pricing'))}
              className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all shadow-xl active:scale-95 whitespace-nowrap"
            >
              Get Elite Feed
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
