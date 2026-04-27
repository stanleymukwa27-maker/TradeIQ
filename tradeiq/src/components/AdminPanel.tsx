import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BarChart3, 
  Settings, 
  MessageSquare, 
  ShieldAlert, 
  ShieldCheck,
  Activity, 
  Search, 
  Filter, 
  MoreVertical,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  Bell,
  Database,
  Cpu,
  Zap,
  X,
  RefreshCw,
  Send,
  Loader2,
  LayoutDashboard,
  Ban,
  Flag,
  CreditCard,
  Globe,
  FileText,
  Trash2,
  Shield,
  Save,
  Info,
  Plus,
  Smartphone,
  Check,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  getDocs, 
  updateDoc, 
  setDoc,
  doc, 
  orderBy, 
  limit, 
  onSnapshot,
  addDoc,
  Timestamp,
  where,
  deleteDoc,
  getCountFromServer
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, TradeRecord, FeatureFlag, AdminLog, Notification, SupportTicket, PaymentRequest } from '../types';
import { analyzeTrade } from '../services/geminiService';
import { fetchForexData } from '../services/forexService';

interface AdminPanelProps {
  onClose: () => void;
}

type AdminTab = 'dashboard' | 'users' | 'trades' | 'notifications' | 'support' | 'system' | 'moderation' | 'subscriptions' | 'api' | 'api-keys' | 'audit' | 'payments' | 'ai-alerts' | 'feedback';

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [articleFeedback, setArticleFeedback] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers24h: 0,
    totalTrades: 0,
    totalNotifications: 0,
    starterUsers: 0,
    proUsers: 0,
    eliteUsers: 0
  });
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [broadcastInput, setBroadcastInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<{ 
    FOREX_API_KEY: string, 
    TWELVE_DATA_API_KEY: string, 
    ALPHA_VANTAGE_API_KEY: string,
    EXCHANGE_RATE_API_KEY: string,
    keyPool: any[] 
  }>({
    FOREX_API_KEY: '',
    TWELVE_DATA_API_KEY: '',
    ALPHA_VANTAGE_API_KEY: '',
    EXCHANGE_RATE_API_KEY: '',
    keyPool: []
  });
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyService, setNewKeyService] = useState<string>('forex');
  const [isSavingKeys, setIsSavingKeys] = useState(false);

  // Notification Form State
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTarget, setNotifTarget] = useState<'All' | 'Starter' | 'Pro' | 'Elite'>('All');
  const [notifType, setNotifType] = useState<'info' | 'warning' | 'success' | 'alert'>('info');
  const [notifCategory, setNotifCategory] = useState<'ai_trade' | 'market_event' | 'system'>('system');
  const [isSendingNotif, setIsSendingNotif] = useState(false);
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiScanResult, setAiScanResult] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setIsRefreshing(true);
    try {
      // Fetch API Status
      try {
        const apiRes = await fetch('/api/admin/api-status');
        if (apiRes.ok) {
          const data = await apiRes.json();
          setApiStatus(data);
        }
      } catch (e) {
        console.error('Error fetching API status:', e);
      }

      // Fetch Stats
      const usersColl = collection(db, 'users');
      const totalUsersSnap = await getCountFromServer(usersColl);
      const starterUsersSnap = await getCountFromServer(query(usersColl, where('plan', '==', 'Starter')));
      const proUsersSnap = await getCountFromServer(query(usersColl, where('plan', '==', 'Pro')));
      const eliteUsersSnap = await getCountFromServer(query(usersColl, where('plan', '==', 'Elite')));
      // Also count 'Basic' for legacy support during transition
      const basicUsersSnap = await getCountFromServer(query(usersColl, where('plan', '==', 'Basic')));
      
      // Fetch Users
      const usersSnap = await getDocs(usersColl);
      const usersData = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
      setUsers(usersData);

      // Fetch Feature Flags
      const flagsSnap = await getDocs(collection(db, 'feature_flags'));
      setFeatureFlags(flagsSnap.docs.map(d => ({ id: d.id, ...d.data() } as FeatureFlag)));

      // Fetch Community Posts for Moderation
      const postsSnap = await getDocs(query(collection(db, 'community_posts'), orderBy('createdAt', 'desc'), limit(50)));
      setCommunityPosts(postsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch Article Feedback
      const feedbackSnap = await getDocs(query(collection(db, 'article_feedback'), orderBy('timestamp', 'desc'), limit(100)));
      setArticleFeedback(feedbackSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch Recent Trades (Global)
      const allTrades: TradeRecord[] = [];
      // In a real app, you'd have a global trades collection or a more efficient way
      // For now, we'll fetch from the first few users to show something
      for (const user of usersData.slice(0, 10)) {
        const tradesSnap = await getDocs(collection(db, `users/${user.id}/trades`));
        allTrades.push(...tradesSnap.docs.map(d => ({ 
          id: d.id, 
          ...d.data(),
          userId: user.id,
          userEmail: user.email
        } as unknown as TradeRecord)));
      }
      setTrades(allTrades.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

      // Fetch System Config
      const configSnap = await getDocs(collection(db, 'system_config'));
      if (!configSnap.empty) {
        const configData: any = {};
        configSnap.docs.forEach(d => {
          configData[d.id] = d.data();
        });
        setSystemConfig(configData.main || null);
        if (configData.api_keys) {
          setApiKeys({
            FOREX_API_KEY: configData.api_keys.FOREX_API_KEY || '',
            TWELVE_DATA_API_KEY: configData.api_keys.TWELVE_DATA_API_KEY || '',
            ALPHA_VANTAGE_API_KEY: configData.api_keys.ALPHA_VANTAGE_API_KEY || '',
            EXCHANGE_RATE_API_KEY: configData.api_keys.EXCHANGE_RATE_API_KEY || '',
            keyPool: configData.api_keys.keyPool || []
          });
        }
      }

      // Fetch Audit Logs
      const auditSnap = await getDocs(query(collection(db, 'admin_logs'), orderBy('timestamp', 'desc'), limit(50)));
      setAdminLogs(auditSnap.docs.map(d => ({ id: d.id, ...d.data() } as AdminLog)));

      // Fetch Notifications
      const notifSnap = await getDocs(query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50)));
      setNotifications(notifSnap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));

      setStats({
        totalUsers: totalUsersSnap.data().count,
        starterUsers: starterUsersSnap.data().count + basicUsersSnap.data().count,
        proUsers: proUsersSnap.data().count,
        eliteUsers: eliteUsersSnap.data().count,
        activeUsers24h: Math.floor(totalUsersSnap.data().count * 0.4), // Mock active users
        totalTrades: allTrades.length,
        totalNotifications: notifSnap.size
      });

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'support_tickets'), orderBy('lastMessageAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const allTickets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort: Pro users first, then by status (Open/Pending first), then by lastMessageAt
      const sorted = allTickets.sort((a: any, b: any) => {
        // Status priority: Open/Pending (0) > Resolved (1)
        const aStatusPri = a.status === 'Resolved' ? 1 : 0;
        const bStatusPri = b.status === 'Resolved' ? 1 : 0;
        
        if (aStatusPri !== bStatusPri) return aStatusPri - bStatusPri;

        // Plan priority: Elite (0) > Pro (1) > Starter/Basic (2)
        const aPlanPri = a.userPlan === 'Elite' ? 0 : (a.userPlan === 'Pro' ? 1 : 2);
        const bPlanPri = b.userPlan === 'Elite' ? 0 : (b.userPlan === 'Pro' ? 1 : 2);
        
        if (aPlanPri !== bPlanPri) return aPlanPri - bPlanPri;
        
        return 0; // Maintain Firestore order (lastMessageAt desc)
      });
      setTickets(sorted);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedTicketId) {
      setTicketMessages([]);
      return;
    }

    const q = query(
      collection(db, `support_tickets/${selectedTicketId}/messages`),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setTicketMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubscribe();
  }, [selectedTicketId]);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;

    const setupSync = () => {
      const apiKeysRef = doc(db, 'system_config', 'api_keys');
      unsubscribe = onSnapshot(apiKeysRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setApiKeys({
            FOREX_API_KEY: data.FOREX_API_KEY || '',
            TWELVE_DATA_API_KEY: data.TWELVE_DATA_API_KEY || '',
            ALPHA_VANTAGE_API_KEY: data.ALPHA_VANTAGE_API_KEY || '',
            EXCHANGE_RATE_API_KEY: data.EXCHANGE_RATE_API_KEY || '',
            keyPool: data.keyPool || []
          });
        }
      }, (error) => {
        console.error('Error syncing API keys:', error);
        // Retry after 10 seconds if it fails
        retryTimeout = setTimeout(setupSync, 10000);
      });
    };

    setupSync();

    return () => {
      if (unsubscribe) unsubscribe();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicketId || !auth.currentUser) return;

    setIsSendingReply(true);
    const text = replyMessage;
    setReplyMessage('');

    try {
      await addDoc(collection(db, `support_tickets/${selectedTicketId}/messages`), {
        senderId: auth.currentUser.uid,
        senderRole: 'admin',
        text,
        timestamp: new Date().toISOString()
      });

      await updateDoc(doc(db, 'support_tickets', selectedTicketId), {
        lastMessageAt: new Date().toISOString(),
        lastMessage: text,
        status: 'Pending' // Admin replied, waiting for user
      });
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: 'active' | 'banned') => {
    try {
      await updateDoc(doc(db, 'users', userId), { status: newStatus });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      
      // Log action
      await addDoc(collection(db, 'admin_logs'), {
        adminId: auth.currentUser?.uid,
        adminEmail: auth.currentUser?.email,
        action: newStatus === 'banned' ? 'BAN_USER' : 'UNBAN_USER',
        targetId: userId,
        details: `Changed status to ${newStatus}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleToggleFeature = async (flagId: string, currentEnabled: boolean) => {
    try {
      await updateDoc(doc(db, 'feature_flags', flagId), { enabled: !currentEnabled });
      setFeatureFlags(prev => prev.map(f => f.id === flagId ? { ...f, enabled: !currentEnabled } : f));
      
      // Log action
      await addDoc(collection(db, 'admin_logs'), {
        adminId: auth.currentUser?.uid,
        adminEmail: auth.currentUser?.email,
        action: 'TOGGLE_FEATURE',
        targetId: flagId,
        details: `Feature ${flagId} set to ${!currentEnabled}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error toggling feature:', error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await deleteDoc(doc(db, 'community_posts', postId));
      setCommunityPosts(prev => prev.filter(p => p.id !== postId));
      
      // Log action
      await addDoc(collection(db, 'admin_logs'), {
        adminId: auth.currentUser?.uid,
        adminEmail: auth.currentUser?.email,
        action: 'DELETE_POST',
        targetId: postId,
        details: 'Deleted community post',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleUpdateUserPlan = async (userId: string, newPlan: 'Starter' | 'Pro' | 'Elite') => {
    try {
      await updateDoc(doc(db, 'users', userId), { plan: newPlan });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan } : u));
      
      // Log action
      await addDoc(collection(db, 'admin_logs'), {
        adminId: auth.currentUser?.uid,
        adminEmail: auth.currentUser?.email,
        action: 'UPDATE_USER_PLAN',
        targetId: userId,
        details: `Plan updated to ${newPlan}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating user plan:', error);
    }
  };

  const handleToggleMaintenance = async () => {
    if (!systemConfig) return;
    const newStatus = !systemConfig.maintenanceMode;
    try {
      const configRef = doc(db, 'system_config', 'main'); // Assuming 'main' is the doc ID
      await setDoc(configRef, { ...systemConfig, maintenanceMode: newStatus }, { merge: true });
      setSystemConfig({ ...systemConfig, maintenanceMode: newStatus });
      
      // Log action
      await addDoc(collection(db, 'admin_logs'), {
        adminId: auth.currentUser?.uid,
        adminEmail: auth.currentUser?.email,
        action: 'TOGGLE_MAINTENANCE',
        targetId: 'system_config',
        details: `Maintenance mode set to ${newStatus}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error toggling maintenance:', error);
    }
  };

  const handleUpdateBroadcast = async (message: string) => {
    try {
      const configRef = doc(db, 'system_config', 'main');
      await setDoc(configRef, { broadcastMessage: message }, { merge: true });
      setSystemConfig(prev => ({ ...prev, broadcastMessage: message }));
      setBroadcastInput('');
      
      // Log action
      await addDoc(collection(db, 'admin_logs'), {
        adminId: auth.currentUser?.uid,
        adminEmail: auth.currentUser?.email,
        action: 'UPDATE_BROADCAST',
        targetId: 'system_config',
        details: `Broadcast updated: ${message.substring(0, 30)}...`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating broadcast:', error);
    }
  };

  const handleSaveApiKeys = async () => {
    if (!auth.currentUser) return;
    setIsSavingKeys(true);
    try {
      await setDoc(doc(db, 'system_config', 'api_keys'), apiKeys, { merge: true });
      
      // Log action
      await addDoc(collection(db, 'admin_logs'), {
        adminId: auth.currentUser.uid,
        adminEmail: auth.currentUser.email,
        action: 'UPDATE_API_KEYS',
        targetId: 'system_config/api_keys',
        details: 'Updated global API keys and pool',
        timestamp: new Date().toISOString()
      });
      
      // Refresh API status to see if keys work
      fetchData();
      alert('API keys updated successfully! Changes will take effect in real-time.');
    } catch (error) {
      console.error('Error saving API keys:', error);
      alert('Failed to save API keys. Check console for details.');
    } finally {
      setIsSavingKeys(false);
    }
  };

  const handleAddKeyToPool = async () => {
    if (!newKeyName || !newKeyValue || !newKeyService) return;
    setIsSavingKeys(true);
    try {
      const newKey = {
        id: Date.now().toString(),
        name: newKeyName,
        value: newKeyValue,
        service: newKeyService.toLowerCase().trim(),
        active: true, // Default to active for new keys
        createdAt: new Date().toISOString()
      };
      
      const updatedPool = [...(apiKeys.keyPool || []), newKey];
      const updatedKeys = { ...apiKeys, keyPool: updatedPool };
      
      await setDoc(doc(db, 'system_config', 'api_keys'), updatedKeys, { merge: true });
      
      setNewKeyName('');
      setNewKeyValue('');
      setNewKeyService('forex');
      
      // Log action
      await addDoc(collection(db, 'admin_logs'), {
        adminId: auth.currentUser?.uid,
        adminEmail: auth.currentUser?.email,
        action: 'ADD_API_KEY_POOL',
        targetId: newKey.id,
        details: `Added key "${newKeyName}" for service "${newKeyService}"`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error adding key to pool:', error);
      alert('Failed to add key to pool.');
    } finally {
      setIsSavingKeys(false);
    }
  };

  const handleDeleteKeyFromPool = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this API key? This action is immediate.')) return;
    setIsSavingKeys(true);
    try {
      const updatedPool = apiKeys.keyPool.filter(k => k.id !== id);
      const updatedKeys = { ...apiKeys, keyPool: updatedPool };
      
      await setDoc(doc(db, 'system_config', 'api_keys'), updatedKeys, { merge: true });
      
      // Log action
      await addDoc(collection(db, 'admin_logs'), {
        adminId: auth.currentUser?.uid,
        adminEmail: auth.currentUser?.email,
        action: 'DELETE_API_KEY_POOL',
        targetId: id,
        details: 'Deleted API key from pool',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error deleting key from pool:', error);
      alert('Failed to delete key.');
    } finally {
      setIsSavingKeys(false);
    }
  };

  const handleToggleKeyStatus = async (id: string) => {
    setIsSavingKeys(true);
    try {
      const updatedPool = apiKeys.keyPool.map(k => {
        if (k.id === id) return { ...k, active: !k.active };
        return k;
      });
      const updatedKeys = { ...apiKeys, keyPool: updatedPool };
      
      await setDoc(doc(db, 'system_config', 'api_keys'), updatedKeys, { merge: true });
      
      // Log action
      await addDoc(collection(db, 'admin_logs'), {
        adminId: auth.currentUser?.uid,
        adminEmail: auth.currentUser?.email,
        action: 'TOGGLE_API_KEY_STATUS',
        targetId: id,
        details: `Toggled status for key ${id}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error toggling key status:', error);
      alert('Failed to toggle status.');
    } finally {
      setIsSavingKeys(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) return;

    setIsSendingNotif(true);
    try {
      const newNotif = {
        title: notifTitle,
        message: notifMessage,
        target: notifTarget,
        type: notifType,
        category: notifCategory,
        createdAt: new Date().toISOString(),
        readBy: [],
        adminId: auth.currentUser.uid
      };

      const docRef = await addDoc(collection(db, 'notifications'), newNotif);
      setNotifications(prev => [{ id: docRef.id, ...newNotif } as Notification, ...prev]);
      
      // Reset form
      setNotifTitle('');
      setNotifMessage('');
      
      // Log action
      await addDoc(collection(db, 'admin_logs'), {
        adminId: auth.currentUser?.uid,
        adminEmail: auth.currentUser?.email,
        action: 'SEND_NOTIFICATION',
        targetId: docRef.id,
        details: `Sent to ${notifTarget}: ${notifTitle}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    } finally {
      setIsSendingNotif(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleTriggerAiScan = async () => {
    setIsAiScanning(true);
    setAiScanResult(null);
    try {
      const pairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'EUR/JPY', 'GBP/JPY'];
      const pair = pairs[Math.floor(Math.random() * pairs.length)];
      
      // Get market data
      const marketData = await fetchForexData(pair);
      
      // Analyze with AI
      const analysis = await analyzeTrade({
        currency_pair: pair,
        timeframe: 'H1',
        marketData,
        isAiSignalMode: true
      });

      if (analysis.score >= 70) {
        // Create AI Notification
        const newNotif = {
          title: `🔥 High Probability Setup: ${pair}`,
          message: `${analysis.recommendation} signal identified by AI. Score: ${analysis.score}. Reasoning: ${analysis.reasoning}`,
          target: 'Pro', // Target Pro/Elite for high-prob setups
          type: 'success',
          category: 'ai_trade',
          createdAt: new Date().toISOString(),
          readBy: [],
          adminId: auth.currentUser?.uid || 'system'
        };

        const docRef = await addDoc(collection(db, 'notifications'), newNotif);
        setNotifications(prev => [{ id: docRef.id, ...newNotif } as Notification, ...prev]);
        setAiScanResult(`Success! Found a ${analysis.score} score setup for ${pair}. Notification sent.`);
      } else {
        setAiScanResult(`Scan complete. No high-probability setups found for ${pair} (Score: ${analysis.score}).`);
      }

      // Randomly trigger a market event too
      if (Math.random() > 0.7) {
        const events = [
          { title: '⚠️ High Volatility Alert', message: 'Significant price action detected in JPY pairs following central bank comments.', type: 'warning' },
          { title: '📉 Market Breakout', message: 'EUR/USD has broken through major resistance at 1.0850.', type: 'info' },
          { title: '⚡ Flash Crash Warning', message: 'Unusual liquidity conditions detected in Gold markets.', type: 'alert' }
        ];
        const event = events[Math.floor(Math.random() * events.length)];
        
        const eventNotif = {
          title: event.title,
          message: event.message,
          target: 'All',
          type: event.type as any,
          category: 'market_event',
          createdAt: new Date().toISOString(),
          readBy: [],
          adminId: auth.currentUser?.uid || 'system'
        };

        await addDoc(collection(db, 'notifications'), eventNotif);
      }

    } catch (error) {
      console.error('AI Scan error:', error);
      setAiScanResult('Error during AI scan. Check console.');
    } finally {
      setIsAiScanning(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'users', label: 'Users', icon: <Users className="w-5 h-5" /> },
    { id: 'trades', label: 'Trades', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'ai-alerts', label: 'AI Alerts', icon: <Cpu className="w-5 h-5" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
    { id: 'support', label: 'Support', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'feedback', label: 'Article Feedback', icon: <ThumbsUp className="w-5 h-5" /> },
    { id: 'moderation', label: 'Moderation', icon: <ShieldCheck className="w-5 h-5" /> },
    { id: 'subscriptions', label: 'Subscriptions', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'api', label: 'API Monitor', icon: <Globe className="w-5 h-5" /> },
    { id: 'api-keys', label: 'API Keys', icon: <Database className="w-5 h-5" /> },
    { id: 'system', label: 'System', icon: <Settings className="w-5 h-5" /> },
    { id: 'audit', label: 'Audit Logs', icon: <FileText className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Mobile Sidebar Backdrop */}
      <AnimatePresence>
        {isMobileNavOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileNavOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Header */}
      <div className="lg:hidden p-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
            <ShieldAlert className="text-white w-4 h-4" />
          </div>
          <span className="font-black text-slate-900 uppercase tracking-tighter">Admin IQ</span>
        </div>
        <button 
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          className="p-2 text-slate-500"
        >
          {isMobileNavOpen ? <X /> : <Filter />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-66 bg-white border-r border-slate-100 transform transition-transform duration-300 lg:relative lg:translate-x-0 shadow-2xl lg:shadow-none
        ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 hidden lg:block">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-2xl shadow-slate-200">
              <ShieldAlert className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight italic uppercase">Admin IQ</h1>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Master Protocol</p>
            </div>
          </div>
        </div>

        <nav className="px-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as AdminTab);
                setIsMobileNavOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === item.id 
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 scale-[1.02]' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button 
            onClick={onClose}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
            Exit Admin
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden">
        <div className="p-4 lg:p-10 max-w-7xl mx-auto">
          {/* Top Actions Bar */}
          <div className="flex items-center justify-end mb-6 gap-4">
            <button 
              onClick={fetchData}
              disabled={isRefreshing}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isRefreshing 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>

          {apiStatus?.forex?.quota_reached && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8 p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-amber-500/10 transition-all duration-500" />
              <div className="p-4 rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/20">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h4 className="text-lg font-black text-amber-600 mb-1 uppercase tracking-tight">Forex API Quota Reached</h4>
                <p className="text-sm text-amber-600/80 font-medium">The system has exceeded the monthly request allowance. Using persistent global cache and mock fallbacks to maintain service.</p>
              </div>
              <button 
                onClick={() => setActiveTab('api')}
                className="px-6 py-3 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95"
              >
                Monitor API
              </button>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center min-h-[400px] space-y-4"
              >
                <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
                <p className="text-slate-500 font-bold animate-pulse">Syncing Control Center...</p>
              </motion.div>
            ) : activeTab === 'dashboard' ? (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-black text-slate-900 italic uppercase tracking-tighter">System Overview</h2>
                    <p className="text-slate-500 text-sm font-medium">Real-time performance metrics and user activity.</p>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 shadow-sm">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">System Healthy</span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <div className="card-base p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                        <Users className="w-6 h-6" />
                      </div>
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Users</p>
                    <p className="text-3xl font-black text-slate-900 italic tracking-tighter">{stats.totalUsers}</p>
                  </div>

                  <div className="card-base p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <Activity className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-200">Live</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Users (24h)</p>
                    <p className="text-3xl font-black text-slate-900 italic tracking-tighter">{stats.activeUsers24h}</p>
                  </div>

                  <div className="card-base p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                        <BarChart3 className="w-6 h-6" />
                      </div>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Trades Analyzed</p>
                    <p className="text-3xl font-black text-slate-900 italic tracking-tighter">{stats.totalTrades}</p>
                  </div>

                  <div className="card-base p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Plan Distribution</p>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-lg font-black text-slate-900">{stats.starterUsers}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Starter</p>
                      </div>
                      <div className="w-px h-8 bg-slate-50" />
                      <div className="text-center">
                        <p className="text-lg font-black text-emerald-500">{stats.proUsers}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Pro</p>
                      </div>
                      <div className="w-px h-8 bg-slate-50" />
                      <div className="text-center">
                        <p className="text-lg font-black text-indigo-500">{stats.eliteUsers}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Elite</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity & Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="card-base overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                      <h3 className="font-black text-slate-900 italic uppercase tracking-tighter">Recent Audit</h3>
                      <button onClick={() => setActiveTab('audit')} className="text-[10px] text-slate-400 font-black uppercase tracking-widest hover:text-slate-900 transition-colors">View Logs</button>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {adminLogs.slice(0, 5).map(log => (
                        <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 shadow-inner">
                            <Activity className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{log.action}</p>
                            <p className="text-[10px] text-slate-400 font-medium truncate">{log.details}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card-base p-6">
                    <h3 className="font-black text-slate-900 italic uppercase tracking-tighter mb-6 underline decoration-slate-100 underline-offset-8">Quick System Actions</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={handleToggleMaintenance}
                        className={`p-6 rounded-3xl border transition-all text-left group overflow-hidden relative ${
                          systemConfig?.maintenanceMode 
                            ? 'bg-rose-50 border-rose-100 text-rose-600' 
                            : 'bg-slate-50 border-slate-100 text-slate-700 hover:border-emerald-500 hover:bg-white hover:shadow-2xl hover:shadow-slate-200'
                        }`}
                      >
                         <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:scale-150 transition-transform">
                             <Lock size={40} />
                         </div>
                        <Lock className="w-6 h-6 mb-3 relative" />
                        <p className="text-[10px] font-black uppercase tracking-widest relative">Maintenance</p>
                        <p className="text-[9px] font-bold opacity-40 uppercase tracking-tighter relative">{systemConfig?.maintenanceMode ? 'Enabled' : 'Disabled'}</p>
                      </button>
                      
                      <button 
                        onClick={() => setActiveTab('notifications')}
                        className="p-6 rounded-3xl border border-slate-100 bg-slate-50 text-slate-700 hover:border-emerald-500 hover:bg-white hover:shadow-2xl hover:shadow-slate-200 transition-all text-left group overflow-hidden relative"
                      >
                         <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:scale-150 transition-transform">
                             <Bell size={40} />
                         </div>
                        <Bell className="w-6 h-6 mb-3 relative" />
                        <p className="text-[10px] font-black uppercase tracking-widest relative">Broadcast</p>
                        <p className="text-[9px] font-bold opacity-40 uppercase tracking-tighter relative">Send Alert</p>
                      </button>

                      <button 
                        onClick={() => setActiveTab('support')}
                        className="p-6 rounded-3xl border border-slate-100 bg-slate-50 text-slate-700 hover:border-emerald-500 hover:bg-white hover:shadow-2xl hover:shadow-slate-200 transition-all text-left group overflow-hidden relative"
                      >
                         <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:scale-150 transition-transform">
                             <MessageSquare size={40} />
                         </div>
                        <MessageSquare className="w-6 h-6 mb-3 relative" />
                        <p className="text-[10px] font-black uppercase tracking-widest relative">Support</p>
                        <p className="text-[9px] font-bold opacity-40 uppercase tracking-tighter relative">{tickets.filter(t => t.status === 'Open').length} Open Tickets</p>
                      </button>

                      <button 
                        onClick={() => setActiveTab('moderation')}
                        className="p-6 rounded-3xl border border-slate-100 bg-slate-50 text-slate-700 hover:border-emerald-500 hover:bg-white hover:shadow-2xl hover:shadow-slate-200 transition-all text-left group overflow-hidden relative"
                      >
                         <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:scale-150 transition-transform">
                             <ShieldAlert size={40} />
                         </div>
                        <ShieldAlert className="w-6 h-6 mb-3 relative" />
                        <p className="text-[10px] font-black uppercase tracking-widest relative">Moderation</p>
                        <p className="text-[9px] font-bold opacity-40 uppercase tracking-tighter relative">Review Posts</p>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'users' ? (
              <motion.div 
                key="users"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <h2 className="text-2xl lg:text-3xl font-black text-slate-900 italic uppercase tracking-tighter">User Directory</h2>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Search users..."
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-slate-900/5 outline-none transition-all shadow-inner"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] border border-slate-50 overflow-x-auto shadow-2xl shadow-slate-100">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-50">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">User</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Plan</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Joined</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {users.filter(u => u.email.toLowerCase().includes(searchTerm.toLowerCase())).map(user => (
                        <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black italic text-xl shadow-xl shadow-slate-200 shrink-0 border border-white/10">
                                {user.displayName?.[0] || user.email[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight italic truncate">{user.displayName || 'Anonymous'}</p>
                                <p className="text-[10px] text-slate-300 font-mono font-bold tracking-widest truncate">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${
                              user.plan === 'Elite' ? 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-sm' :
                              user.plan === 'Pro' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm' : 
                              'bg-slate-50 text-slate-400 border-slate-200'
                            }`}>
                              {user.plan}
                            </span>
                          </td>
                          <td className="px-6 py-6">
                             <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'banned' ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
                                <span className={`text-[9px] font-black uppercase tracking-widest ${user.status === 'banned' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                  {user.status || 'active'}
                                </span>
                             </div>
                          </td>
                          <td className="px-6 py-6 text-[10px] text-slate-400 font-mono font-black tracking-widest uppercase">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-4">
                              <select 
                                className="text-[9px] font-black uppercase tracking-[0.1em] bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 focus:ring-4 focus:ring-slate-900/5 outline-none transition-all shadow-sm"
                                value={user.plan}
                                onChange={(e) => handleUpdateUserPlan(user.id!, e.target.value as any)}
                              >
                                <option value="Starter">Starter</option>
                                <option value="Pro">Pro</option>
                                <option value="Elite">Elite</option>
                                {user.plan === 'Basic' && <option value="Basic">Basic (Legacy)</option>}
                              </select>
                              <button 
                                onClick={() => handleUpdateUserStatus(user.id!, user.status === 'banned' ? 'active' : 'banned')}
                                className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl transition-all ${user.status === 'banned' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:scale-105' : 'bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-500 hover:text-white'}`}
                              >
                                {user.status === 'banned' ? 'Unban' : 'Ban'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : activeTab === 'trades' ? (
              <motion.div 
                key="trades"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <h2 className="text-2xl lg:text-3xl font-black text-slate-900 italic uppercase tracking-tighter">Global Trade Feed</h2>
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">Live Monitoring Enabled</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="card-base p-6 shadow-sm border-none bg-white">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Analyzed</p>
                    <p className="text-3xl font-black text-slate-900 italic tracking-tighter">{trades.length}</p>
                  </div>
                  <div className="card-base p-6 shadow-sm border-none bg-white">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Win Rate (Global)</p>
                    <p className="text-3xl font-black text-emerald-500 italic tracking-tighter">
                      {trades.length > 0 
                        ? Math.round((trades.filter(t => t.trade_result === 'Win').length / trades.filter(t => t.trade_result && t.trade_result !== 'Pending').length || 0) * 100)
                        : 0}%
                    </p>
                  </div>
                  <div className="card-base p-6 shadow-sm border-none bg-white">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Avg Score</p>
                    <p className="text-3xl font-black text-amber-500 italic tracking-tighter">
                      {trades.length > 0 
                        ? Math.round(trades.reduce((acc, t) => acc + (t.trade_score || 0), 0) / trades.length)
                        : 0}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] border border-slate-50 overflow-x-auto shadow-2xl shadow-slate-100">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-50">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Asset</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">User ID</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Score</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Rec.</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Result</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {trades.map(trade => (
                        <tr key={trade.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-slate-900 italic uppercase tracking-tighter">{trade.currency_pair}</span>
                              <span className="text-[10px] font-mono font-black text-slate-300 tracking-widest">{trade.timeframe}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <p className="text-[10px] text-slate-400 font-mono font-bold truncate max-w-[100px] uppercase tracking-widest">{trade.userId}</p>
                          </td>
                          <td className="px-6 py-6 font-black italic text-slate-900 tracking-tighter">
                            {trade.trade_score}
                          </td>
                          <td className="px-6 py-6">
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] border ${
                              trade.recommendation === 'BUY' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              trade.recommendation === 'SELL' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                              'bg-slate-50 text-slate-400 border-slate-200'
                            }`}>
                              {trade.recommendation}
                            </span>
                          </td>
                          <td className="px-6 py-6">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${
                              trade.trade_result === 'Win' ? 'text-emerald-500' :
                              trade.trade_result === 'Loss' ? 'text-rose-500' :
                              'text-slate-300'
                            }`}>
                              {trade.trade_result || 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-6 text-[10px] text-slate-400 font-mono font-black tracking-widest uppercase">
                            {new Date(trade.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {trades.length === 0 && (
                    <div className="p-12 text-center">
                      <p className="text-slate-400 text-sm">No trades found in the global feed.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : activeTab === 'support' ? (
              <motion.div 
                key="support"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <h2 className="text-2xl lg:text-3xl font-black text-slate-900 italic uppercase tracking-tighter mb-8">Support Tickets</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Ticket List */}
                  <div className="lg:col-span-4 space-y-4">
                    {tickets.map(ticket => (
                      <button
                        key={ticket.id}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className={`w-full text-left p-6 rounded-[2rem] border transition-all group relative overflow-hidden ${
                          selectedTicketId === ticket.id 
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xl shadow-slate-300' 
                            : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-100'
                        }`}
                      >
                         {selectedTicketId === ticket.id && (
                           <div className="absolute top-0 right-0 p-4 opacity-10">
                              <MessageSquare size={80} />
                           </div>
                         )}
                        <div className="flex items-center justify-between mb-4 relative">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${
                              ticket.status === 'Open' ? 'bg-rose-500 text-white' :
                              ticket.status === 'Pending' ? 'bg-amber-500 text-white' :
                              'bg-slate-100 text-slate-400'
                            }`}>
                              {ticket.status}
                            </span>
                            {(ticket.userPlan === 'Pro' || ticket.userPlan === 'Elite') && (
                              <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${
                                ticket.userPlan === 'Elite' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-100' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-100'
                              }`}>
                                <ShieldCheck className="w-2.5 h-2.5" />
                                {ticket.userPlan}
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] font-mono font-black uppercase tracking-widest ${selectedTicketId === ticket.id ? 'text-slate-400' : 'text-slate-300'}`}>
                            {ticket.lastMessageAt instanceof Timestamp ? ticket.lastMessageAt.toDate().toLocaleDateString() : new Date(ticket.lastMessageAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className={`text-sm font-black uppercase tracking-tighter italic mb-1 relative ${selectedTicketId === ticket.id ? 'text-white' : 'text-slate-900'}`}>{ticket.subject || 'No Subject'}</p>
                        <p className={`text-[10px] font-medium truncate relative ${selectedTicketId === ticket.id ? 'text-slate-400' : 'text-slate-400'}`}>{ticket.lastMessage}</p>
                      </button>
                    ))}
                    {tickets.length === 0 && (
                      <div className="p-12 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest">No active tickets.</p>
                      </div>
                    )}
                  </div>

                  {/* Ticket Detail */}
                  <div className="lg:col-span-8 flex flex-col bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-100 overflow-hidden min-h-[600px]">
                    {selectedTicketId ? (
                      <>
                        {/* Chat Header */}
                        <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black italic text-2xl shadow-xl shadow-slate-200">
                                {tickets.find(t => t.id === selectedTicketId)?.userEmail?.[0].toUpperCase() || 'U'}
                              </div>
                              {(tickets.find(t => t.id === selectedTicketId)?.userPlan === 'Pro' || tickets.find(t => t.id === selectedTicketId)?.userPlan === 'Elite') && (
                                <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center shadow-lg ${
                                  tickets.find(t => t.id === selectedTicketId)?.userPlan === 'Elite' ? 'bg-indigo-500' : 'bg-emerald-500'
                                }`}>
                                  <ShieldCheck className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-lg font-black text-slate-900 italic uppercase tracking-tighter leading-none">
                                  {tickets.find(t => t.id === selectedTicketId)?.userEmail}
                                </p>
                                {(tickets.find(t => t.id === selectedTicketId)?.userPlan === 'Pro' || tickets.find(t => t.id === selectedTicketId)?.userPlan === 'Elite') && (
                                  <span className={`px-2 py-0.5 rounded text-white text-[8px] font-black uppercase tracking-widest shadow-sm ${
                                    tickets.find(t => t.id === selectedTicketId)?.userPlan === 'Elite' ? 'bg-indigo-500' : 'bg-emerald-500'
                                  }`}>
                                    {tickets.find(t => t.id === selectedTicketId)?.userPlan} Priority
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-300 font-mono font-black uppercase tracking-widest mt-1">Ref ID: {selectedTicketId}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <select 
                              className="text-[10px] font-black uppercase tracking-widest bg-white border border-slate-100 rounded-xl px-4 py-2 focus:ring-4 focus:ring-slate-900/5 outline-none transition-all shadow-sm"
                              value={tickets.find(t => t.id === selectedTicketId)?.status || 'Open'}
                              onChange={async (e) => {
                                try {
                                  await updateDoc(doc(db, 'support_tickets', selectedTicketId), { 
                                    status: e.target.value,
                                    updatedAt: Timestamp.now()
                                  });
                                } catch (error) {
                                  handleFirestoreError(error, OperationType.UPDATE, `support_tickets/${selectedTicketId}`);
                                }
                              }}
                            >
                              <option value="Open">Open Status</option>
                              <option value="Pending">Pending</option>
                              <option value="Resolved">Resolved</option>
                            </select>
                            
                            {tickets.find(t => t.id === selectedTicketId)?.status !== 'Resolved' && (
                              <button
                                onClick={async () => {
                                  try {
                                    await updateDoc(doc(db, 'support_tickets', selectedTicketId), { 
                                      status: 'Resolved',
                                      updatedAt: Timestamp.now()
                                    });
                                  } catch (error) {
                                    handleFirestoreError(error, OperationType.UPDATE, `support_tickets/${selectedTicketId}`);
                                  }
                                }}
                                className="px-5 py-2.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 active:scale-95"
                              >
                                Resolve Final
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 max-h-[500px] scrollbar-hide">
                          {ticketMessages.map((msg) => (
                            <div 
                              key={msg.id}
                              className={`flex ${msg.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[85%] p-5 rounded-3xl shadow-xl ${
                                msg.senderRole === 'admin' 
                                  ? 'bg-slate-900 text-white rounded-tr-none shadow-slate-200' 
                                  : 'bg-slate-50 text-slate-900 rounded-tl-none border border-slate-100'
                              }`}>
                                <p className="font-bold leading-relaxed">{msg.text}</p>
                                <p className={`text-[9px] mt-3 font-black uppercase tracking-widest italic opacity-40 ${msg.senderRole === 'admin' ? 'text-slate-400' : 'text-slate-400'}`}>
                                  {msg.timestamp instanceof Timestamp ? msg.timestamp.toDate().toLocaleTimeString() : new Date(msg.timestamp).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          ))}
                          {ticketMessages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300 font-black uppercase tracking-widest italic text-xs gap-4">
                              <MessageSquare className="opacity-10" size={60} />
                              No communication protocol established.
                            </div>
                          )}
                        </div>

                        {/* Reply Input */}
                        <form onSubmit={handleSendReply} className="p-6 border-t border-slate-50 bg-slate-50/30">
                          <div className="relative">
                            <input 
                              type="text"
                              placeholder="Inject response into protocol..."
                              className="w-full bg-white border border-slate-100 rounded-2xl pl-6 pr-14 py-4 text-sm font-bold focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner outline-none"
                              value={replyMessage}
                              onChange={(e) => setReplyMessage(e.target.value)}
                            />
                            <button 
                              type="submit"
                              disabled={!replyMessage.trim() || isSendingReply}
                              className="absolute right-2 top-1/2 -translate-y-1/2 size-11 flex items-center justify-center bg-slate-900 text-white rounded-xl hover:bg-black transition-all disabled:opacity-30 shadow-xl shadow-slate-200"
                            >
                              {isSendingReply ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                          </div>
                        </form>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-12 space-y-6 h-full">
                        <div className="w-24 h-24 rounded-[2rem] bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner">
                          <MessageSquare className="w-10 h-10 text-slate-200" />
                        </div>
                        <div className="max-w-xs">
                          <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Protocol Standby</h3>
                          <p className="text-slate-400 font-medium italic">Select a trader ticket from the left column to begin the communication sequence.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'system' ? (
              <motion.div 
                key="system"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-3xl space-y-8"
              >
                <h2 className="text-2xl lg:text-3xl font-black text-slate-900 italic uppercase tracking-tighter mb-8">System Configuration</h2>
                
                <div className="card-base p-8 space-y-8 shadow-2xl shadow-slate-100 border-slate-50">
                  <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter leading-none mb-1">Maintenance Access</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Disable all trade analysis globally.</p>
                    </div>
                    <button 
                      onClick={handleToggleMaintenance}
                      className={`w-14 h-8 rounded-full transition-all relative shadow-inner ${systemConfig?.maintenanceMode ? 'bg-rose-500 shadow-rose-200' : 'bg-slate-200 shadow-slate-100'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all ${systemConfig?.maintenanceMode ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="space-y-4 px-2">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] px-1">Global Broadcast Signal</label>
                    <textarea 
                      className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] p-6 text-sm font-bold focus:ring-4 focus:ring-slate-900/5 outline-none transition-all shadow-inner resize-none"
                      placeholder="Inject message into all user terminals..."
                      rows={3}
                      value={broadcastInput || systemConfig?.broadcastMessage || ''}
                      onChange={(e) => setBroadcastInput(e.target.value)}
                    />
                    <button 
                      onClick={() => handleUpdateBroadcast(broadcastInput || systemConfig?.broadcastMessage || '')}
                      className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] italic hover:bg-black transition-all shadow-2xl shadow-slate-200 active:scale-95"
                    >
                      Sync Broadcast Signal
                    </button>
                  </div>
                </div>

                <div className="card-base p-8 space-y-8 shadow-2xl shadow-slate-100 border-slate-50">
                  <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter underline decoration-slate-100 underline-offset-8">Feature Protocol Controls</h3>
                  <div className="divide-y divide-slate-50">
                    {featureFlags.map(flag => (
                      <div key={flag.id} className="py-6 flex items-center justify-between group">
                        <div className="min-w-0 pr-4">
                          <p className="text-md font-black text-slate-900 italic uppercase tracking-tight group-hover:translate-x-1 transition-transform">{flag.feature_name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{flag.description}</p>
                        </div>
                        <button 
                          onClick={() => handleToggleFeature(flag.id, flag.enabled)}
                          className={`w-12 h-6 rounded-full transition-all relative shrink-0 shadow-inner ${flag.enabled ? 'bg-emerald-500 shadow-emerald-200' : 'bg-slate-200'}`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${flag.enabled ? 'left-6.5' : 'left-0.5'}`} />
                        </button>
                      </div>
                    ))}
                    {featureFlags.length === 0 && (
                      <div className="py-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 mt-4">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No protocol flags detected.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="card-base p-8 flex flex-col items-center justify-center gap-4 bg-white border-none shadow-2xl shadow-slate-100 group">
                    <div className="size-16 rounded-[2rem] bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-xl shadow-emerald-50 group-hover:scale-110 transition-transform">
                      <Database className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Database Integrity</p>
                      <p className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">Operational</p>
                    </div>
                  </div>
                  <div className="card-base p-8 flex flex-col items-center justify-center gap-4 bg-white border-none shadow-2xl shadow-slate-100 group">
                    <div className="size-16 rounded-[2rem] bg-amber-50 border border-amber-100 flex items-center justify-center shadow-xl shadow-amber-50 group-hover:scale-110 transition-transform">
                      <Cpu className="w-8 h-8 text-amber-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Intelligence Core</p>
                      <p className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">Gemini 1.5 Flash</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'notifications' ? (
              <motion.div 
                key="notifications"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <h2 className="text-2xl lg:text-3xl font-black text-slate-900 italic uppercase tracking-tighter">Notification Pulse</h2>
                  <div className="flex items-center gap-3 bg-emerald-50 px-5 py-2.5 rounded-[2rem] border border-emerald-100 shadow-sm">
                    <Bell className="w-4 h-4 text-emerald-500 animate-bounce" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] italic">{notifications.length} DISPATCHED</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                  {/* Send Notification Form */}
                  <div className="xl:col-span-12 2xl:col-span-5">
                    <div className="card-base p-10 space-y-8 sticky top-8 shadow-2xl shadow-slate-100 border-none bg-white">
                      <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter leading-none mb-4 underline decoration-slate-100 underline-offset-8">Draft New Signal</h3>
                      <form onSubmit={handleSendNotification} className="space-y-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] px-1">Signal Title</label>
                          <input 
                            type="text"
                            required
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-slate-900/5 outline-none transition-all shadow-inner"
                            placeholder="e.g. Market Liquidity Alert"
                            value={notifTitle}
                            onChange={(e) => setNotifTitle(e.target.value)}
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] px-1">Payload Content</label>
                          <textarea 
                            required
                            rows={4}
                            className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] p-6 text-sm font-bold focus:ring-4 focus:ring-slate-900/5 outline-none transition-all shadow-inner resize-none"
                            placeholder="Type high-priority message for the trade fleet..."
                            value={notifMessage}
                            onChange={(e) => setNotifMessage(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] px-1">Target Cluster</label>
                            <select 
                              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-[10px] font-black uppercase tracking-widest italic outline-none focus:ring-4 focus:ring-slate-900/5 shadow-inner"
                              value={notifTarget}
                              onChange={(e) => setNotifTarget(e.target.value as any)}
                            >
                              <option value="All">All Units</option>
                              <option value="Starter">Starter Only</option>
                              <option value="Pro">Pro Only</option>
                              <option value="Elite">Elite Only</option>
                            </select>
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] px-1">Signal Intensity</label>
                            <select 
                              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-[10px] font-black uppercase tracking-widest italic outline-none focus:ring-4 focus:ring-slate-900/5 shadow-inner"
                              value={notifType}
                              onChange={(e) => setNotifType(e.target.value as any)}
                            >
                              <option value="info">Info (Standard)</option>
                              <option value="warning">Warning (Medium)</option>
                              <option value="success">Success (Positive)</option>
                              <option value="alert">Alert (Critical)</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] px-1">Source Core</label>
                          <select 
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-[10px] font-black uppercase tracking-widest italic outline-none focus:ring-4 focus:ring-slate-900/5 shadow-inner"
                            value={notifCategory}
                            onChange={(e) => setNotifCategory(e.target.value as any)}
                          >
                            <option value="system">System Core</option>
                            <option value="ai_trade">AI Setup Relay</option>
                            <option value="market_event">Market Pulse</option>
                          </select>
                        </div>
                        <button 
                          type="submit"
                          disabled={isSendingNotif}
                          className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.4em] italic hover:bg-black transition-all shadow-2xl shadow-slate-200 active:scale-[0.98] flex items-center justify-center gap-4"
                        >
                          {isSendingNotif ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                          ) : (
                            <Send className="w-6 h-6" />
                          )}
                          Transmit Signal
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Notification History */}
                  <div className="xl:col-span-12 2xl:col-span-7">
                    <div className="bg-white rounded-[3rem] border border-slate-50 shadow-2xl shadow-slate-100 overflow-hidden">
                      <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-900 italic uppercase tracking-[0.3em]">Transmission Archive</p>
                        <button className="text-[8px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-900 transition-colors">Wipe History</button>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {notifications.map(notif => (
                          <div key={notif.id} className="p-8 flex items-start gap-6 hover:bg-slate-50/50 transition-all group relative overflow-hidden">
                            <div className={`size-14 rounded-[1.5rem] flex items-center justify-center shrink-0 border shadow-2xl transition-transform group-hover:scale-110 ${
                              notif.type === 'warning' ? 'bg-amber-50 text-amber-500 border-amber-100 shadow-amber-50' :
                              notif.type === 'alert' ? 'bg-rose-50 text-rose-500 border-rose-100 shadow-rose-50' :
                              notif.type === 'success' ? 'bg-emerald-50 text-emerald-500 border-emerald-100 shadow-emerald-50' :
                              'bg-indigo-50 text-indigo-500 border-indigo-100 shadow-indigo-50'
                            }`}>
                              <Bell className="w-7 h-7" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-md font-black text-slate-900 italic uppercase tracking-tight">{notif.title}</p>
                                <span className="text-[10px] text-slate-300 font-mono font-black tracking-widest uppercase">
                                  {notif.createdAt instanceof Timestamp ? notif.createdAt.toDate().toLocaleTimeString() : new Date(notif.createdAt).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 font-medium leading-relaxed mb-4">{notif.message}</p>
                              <div className="flex items-center gap-3">
                                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-400 text-[8px] font-black uppercase tracking-widest border border-slate-200/50">
                                  Cluster: {notif.target}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                   notif.type === 'alert' ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-slate-50 text-slate-300 border-slate-100'
                                }`}>
                                  Signal: {notif.type}
                                </span>
                                <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest italic shadow-lg shadow-slate-200">
                                  {notif.category}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {notifications.length === 0 && (
                          <div className="p-20 text-center flex flex-col items-center justify-center">
                            <div className="size-20 rounded-[2rem] bg-slate-50 flex items-center justify-center mb-6 opacity-20 border border-slate-100">
                                <Bell className="text-slate-400" size={40} />
                            </div>
                            <p className="text-slate-300 font-black uppercase tracking-widest italic text-xs">No signals found in the archive pulse.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'feedback' ? (
              <motion.div 
                key="feedback"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Professional Stats Header */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="card-base p-8 shadow-2xl shadow-slate-100 border-none bg-white transition-all hover:shadow-slate-200">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Total Responses</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-slate-900 leading-none tracking-tighter">{articleFeedback.length}</span>
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-widest italic">units</span>
                    </div>
                  </div>

                  <div className="card-base p-8 shadow-2xl shadow-slate-100 border-none bg-white transition-all hover:shadow-slate-200">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-4">Helpful Rate</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-emerald-600 leading-none tracking-tighter">
                        {articleFeedback.length > 0 
                          ? Math.round((articleFeedback.filter(f => f.helpful).length / articleFeedback.length) * 100) 
                          : 0}%
                      </span>
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-widest italic">avg pulse</span>
                    </div>
                  </div>

                  <div className="md:col-span-2 bg-slate-900 p-8 rounded-[3rem] border border-slate-800 shadow-2xl shadow-slate-200 relative overflow-hidden group">
                    <div className="relative z-10">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 italic">Dominant Knowledge Piece</p>
                      {(() => {
                        const counts: Record<string, number> = {};
                        articleFeedback.filter(f => f.helpful).forEach(f => {
                          counts[f.articleTitle] = (counts[f.articleTitle] || 0) + 1;
                        });
                        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
                        return top ? (
                          <>
                            <h3 className="text-2xl font-black text-white mb-2 group-hover:text-emerald-400 transition-colors uppercase italic tracking-tighter leading-tight">{top[0]}</h3>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest italic">{top[1]} positive engagements</p>
                          </>
                        ) : (
                          <p className="text-slate-700 font-black uppercase italic tracking-widest text-xs">No engagements logged.</p>
                        );
                      })()}
                    </div>
                    <ThumbsUp className="absolute -bottom-6 -right-6 w-40 h-40 text-white/5 group-hover:text-emerald-500/10 transition-all rotate-12 group-hover:rotate-0" />
                  </div>
                </div>

                {/* Structured Data Grid */}
                <div className="bg-white rounded-[3rem] border border-slate-50 overflow-hidden shadow-2xl shadow-slate-100">
                  <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <h3 className="text-[10px] font-black text-slate-900 italic uppercase tracking-[0.3em]">Transmission Feedback Pipeline</h3>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200"></div>
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">{articleFeedback.filter(f => f.helpful).length} Positive</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-lg shadow-rose-200"></div>
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">{articleFeedback.filter(f => !f.helpful).length} Critical</span>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-50">
                          <th className="p-6 text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Core Title</th>
                          <th className="p-6 text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Entity Identity</th>
                          <th className="p-6 text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Signal Quality</th>
                          <th className="p-6 text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Payload Detail</th>
                          <th className="p-6 text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Pulse Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {articleFeedback.map(fb => (
                          <tr key={fb.id} className="group hover:bg-slate-900 transition-all duration-300 cursor-pointer">
                            <td className="p-6">
                              <p className="text-sm font-black text-slate-900 italic uppercase tracking-tight group-hover:text-white transition-colors">{fb.articleTitle}</p>
                              <p className="text-[10px] text-slate-300 font-mono font-black uppercase tracking-widest mt-1 opacity-60">REF: {fb.articleId}</p>
                            </td>
                            <td className="p-6 text-xs">
                              <p className="font-black text-slate-900 group-hover:text-white transition-colors uppercase italic tracking-tighter">{fb.userEmail}</p>
                              <p className="text-[10px] text-slate-400 group-hover:text-slate-500 font-mono mt-1">UID: {fb.userId.substring(0, 12)}...</p>
                            </td>
                            <td className="p-6">
                              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                                fb.helpful 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-400' 
                                  : 'bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-500 group-hover:text-white group-hover:border-rose-400'
                              }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${fb.helpful ? 'bg-emerald-500 group-hover:bg-white' : 'bg-rose-500 group-hover:bg-white'}`}></div>
                                {fb.helpful ? 'Optimal' : 'Sub-Par'}
                              </span>
                            </td>
                            <td className="p-6">
                              {fb.comment ? (
                                <p className="text-[11px] font-bold text-slate-500 group-hover:text-slate-300 leading-relaxed max-w-[300px] italic">
                                  "{fb.comment}"
                                </p>
                              ) : (
                                <span className="text-[10px] text-slate-200 font-black uppercase tracking-widest italic">No Commentary</span>
                              )}
                            </td>
                            <td className="p-6 text-[10px] font-black text-slate-400 group-hover:text-slate-500 uppercase tracking-widest italic">
                              {fb.timestamp instanceof Timestamp ? fb.timestamp.toDate().toLocaleTimeString() : new Date(fb.timestamp).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {articleFeedback.length === 0 && (
                    <div className="p-32 text-center flex flex-col items-center justify-center">
                      <HelpCircle className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                      <p className="text-slate-300 font-black uppercase tracking-widest italic text-xs">The feedback pipeline is currently silent.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : activeTab === 'ai-alerts' ? (
              <motion.div 
                key="ai-alerts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-black text-slate-900 italic uppercase tracking-tighter">Bio-Metric AI Scanners</h2>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Initiating manual neural sweeps across the global currency matrices.</p>
                  </div>
                  <div className="flex items-center gap-3 bg-emerald-50 px-6 py-3 rounded-[2rem] border border-emerald-100 shadow-xl shadow-emerald-50">
                    <Cpu className="w-5 h-5 text-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] italic underline decoration-emerald-200 underline-offset-4">AI ENGINE ONLINE</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                  <div className="card-base p-10 space-y-8 bg-white border-none shadow-2xl shadow-slate-100 relative overflow-hidden group">
                    <div className="size-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center border border-emerald-100 shadow-xl shadow-emerald-50 group-hover:scale-110 transition-transform">
                      <Cpu className="w-10 h-10 text-emerald-500" />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">Global Pulse Scan</h3>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">
                        Initiate a hyper-deep scan across all major currency clusters. Synaptic protocols will engage if trade score alignment hits <span className="font-black text-emerald-500 italic uppercase tracking-widest underline decoration-emerald-100 underline-offset-4">70% Threshold</span>.
                      </p>
                    </div>
                    <button 
                      onClick={handleTriggerAiScan}
                      disabled={isAiScanning}
                      className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.4em] italic hover:bg-black transition-all shadow-2xl shadow-slate-200 active:scale-[0.98] flex items-center justify-center gap-4 group/btn"
                    >
                      {isAiScanning ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          Mapping Reality...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-6 h-6 group-hover/btn:rotate-180 transition-transform duration-700" />
                          Engage Scanner
                        </>
                      )}
                    </button>
                    {aiScanResult && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`p-6 rounded-[2rem] text-[10px] font-black uppercase tracking-widest italic border shadow-2xl ${aiScanResult.includes('Success') ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-50' : 'bg-slate-50 text-slate-400 border-slate-100 shadow-slate-50'}`}
                      >
                        [LOG]: {aiScanResult}
                      </motion.div>
                    )}
                  </div>

                  <div className="card-base p-10 space-y-8 bg-white border-none shadow-2xl shadow-slate-100 relative overflow-hidden group">
                    <div className="size-20 bg-amber-50 rounded-[2rem] flex items-center justify-center border border-amber-100 shadow-xl shadow-amber-50 group-hover:scale-110 transition-transform">
                      <Zap className="w-10 h-10 text-amber-500" />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">Inject Synaptic Event</h3>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">
                        Manually force high-intensity signal injections into the user terminals. These bypass normal scan thresholds for immediate impact simulation.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <button 
                        onClick={async () => {
                          const eventNotif = {
                            title: '⚠️ VOLATILITY SURGE',
                            message: 'Critical price action detected in JPY clusters following Central Bank synaptic shift.',
                            target: 'All',
                            type: 'warning',
                            category: 'market_event',
                            createdAt: new Date().toISOString(),
                            readBy: [],
                            adminId: auth.currentUser?.uid || 'system'
                          };
                          await addDoc(collection(db, 'notifications'), eventNotif);
                          alert('Synaptic warning deployed.');
                        }}
                        className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-left hover:border-amber-400 transition-all group/opt shadow-inner"
                      >
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1 italic">Level: Warning</p>
                        <p className="text-sm font-black text-slate-900 italic uppercase tracking-tighter group-hover/opt:translate-x-1 transition-transform">JPY Central Bank Pulse</p>
                      </button>
                      <button 
                        onClick={async () => {
                          const eventNotif = {
                            title: '📉 PROTOCOL BREAKOUT',
                            message: 'EUR/USD has breached final resistance layer at 1.0850. Momentum critical.',
                            target: 'All',
                            type: 'info',
                            category: 'market_event',
                            createdAt: new Date().toISOString(),
                            readBy: [],
                            adminId: auth.currentUser?.uid || 'system'
                          };
                          await addDoc(collection(db, 'notifications'), eventNotif);
                          alert('Synaptic breakout deployed.');
                        }}
                        className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-left hover:border-emerald-400 transition-all group/opt shadow-inner"
                      >
                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1 italic">Level: Info</p>
                        <p className="text-sm font-black text-slate-900 italic uppercase tracking-tighter group-hover/opt:translate-x-1 transition-transform">EUR/USD Structural Leak</p>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'audit' ? (
              <motion.div 
                key="audit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <h2 className="text-2xl lg:text-3xl font-black text-slate-900 italic uppercase tracking-tighter">Audit Transmission Logs</h2>
                  <div className="flex items-center gap-3 bg-slate-900 px-6 py-3 rounded-[2rem] shadow-2xl shadow-slate-200">
                    <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] italic">{adminLogs.length} EVENTS LOGGED</span>
                  </div>
                </div>
                
                <div className="bg-white rounded-[3rem] border border-slate-50 shadow-2xl shadow-slate-100 overflow-hidden">
                  <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-900 italic uppercase tracking-[0.3em]">System Neural Archive</p>
                    <button className="size-10 bg-white rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm">
                      <Filter className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {adminLogs.map(log => (
                      <div key={log.id} className="p-8 flex items-start gap-6 hover:bg-slate-50/50 transition-all group relative overflow-hidden">
                        <div className={`size-12 rounded-[1.5rem] flex items-center justify-center shrink-0 border shadow-2xl transition-transform group-hover:scale-110 ${
                          log.action.includes('UPDATE') ? 'bg-amber-50 text-amber-500 border-amber-100 shadow-amber-50' :
                          log.action.includes('DELETE') ? 'bg-rose-50 text-rose-500 border-rose-100 shadow-rose-50' :
                          'bg-emerald-50 text-emerald-500 border-emerald-100 shadow-emerald-50'
                        }`}>
                          <Activity className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-md font-black text-slate-900 italic uppercase tracking-tight group-hover:translate-x-1 transition-transform">{log.action}</p>
                            <span className="text-[10px] text-slate-300 font-mono font-black uppercase tracking-widest italic">
                              {log.timestamp instanceof Timestamp ? log.timestamp.toDate().toLocaleTimeString() : new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-medium leading-relaxed mb-3">{log.details}</p>
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest italic shadow-lg shadow-slate-200">
                                ADMIN: {log.adminId}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {adminLogs.length === 0 && (
                      <div className="p-20 text-center flex flex-col items-center justify-center">
                        <div className="size-20 rounded-[2rem] bg-slate-50 flex items-center justify-center mb-6 opacity-20 border border-slate-100">
                            <Activity className="text-slate-400" size={40} />
                        </div>
                        <p className="text-slate-300 font-black uppercase tracking-widest italic text-xs">The audit archive is currently empty.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'moderation' ? (
              <motion.div 
                key="moderation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <h2 className="text-2xl lg:text-3xl font-black text-slate-900 italic uppercase tracking-tighter">Community Protocol Guard</h2>
                  <div className="flex items-center gap-3 bg-rose-50 px-6 py-3 rounded-[2rem] border border-rose-100 shadow-xl shadow-rose-50">
                    <Flag className="w-5 h-5 text-rose-500 animate-bounce" />
                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] italic">{communityPosts.length} UNITS UNDER REVIEW</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  {communityPosts.map(post => (
                    <div key={post.id} className="card-base p-8 flex flex-col md:flex-row gap-8 bg-white border-none shadow-2xl shadow-slate-100 transition-all hover:shadow-slate-200">
                      <div className="flex-1 flex flex-col sm:flex-row gap-8">
                        <div className="size-16 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center font-black text-xl italic shadow-2xl shadow-slate-200 shrink-0">
                          {post.userName?.[0] || 'U'}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <h4 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter">{post.userName}</h4>
                            <span className="text-[10px] text-slate-300 font-mono font-black uppercase tracking-widest italic">{new Date(post.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mb-6">
                            <span className="px-4 py-1.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest italic shadow-lg shadow-slate-200">{post.currency_pair}</span>
                            <span className="px-4 py-1.5 rounded-full bg-slate-50 text-slate-500 border border-slate-100 text-[10px] font-black uppercase tracking-widest italic">Entry: {post.entry}</span>
                          </div>
                          <p className="text-xs text-slate-400 font-medium leading-relaxed italic border-l-2 border-slate-100 pl-4">"{post.description}"</p>
                        </div>
                      </div>
                      <div className="flex md:flex-col items-center justify-center gap-4 shrink-0 border-t md:border-t-0 md:border-l border-slate-50 pt-6 md:pt-0 md:pl-8">
                        <button 
                          onClick={() => handleDeletePost(post.id)}
                          className="size-14 rounded-[1.5rem] bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-xl shadow-rose-50 active:scale-95"
                          title="Purge Setup"
                        >
                          <Trash2 className="w-6 h-6" />
                        </button>
                        <button 
                          onClick={() => handleUpdateUserStatus(post.userId, 'banned')}
                          className="size-14 rounded-[1.5rem] bg-slate-900 text-white flex items-center justify-center hover:bg-black transition-all shadow-2xl shadow-slate-200 active:scale-95"
                          title="Exterminate Persona"
                        >
                          <Ban className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {communityPosts.length === 0 && (
                    <div className="p-32 text-center flex flex-col items-center justify-center">
                        <div className="size-20 rounded-[2rem] bg-slate-50 flex items-center justify-center mb-6 opacity-20 border border-slate-100">
                            <ShieldAlert className="text-slate-400" size={40} />
                        </div>
                        <p className="text-slate-300 font-black uppercase tracking-widest italic text-xs">Community streams are currently compliant.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : activeTab === 'subscriptions' ? (
              <motion.div 
                key="subscriptions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <h2 className="text-2xl lg:text-3xl font-black text-slate-900 italic uppercase tracking-tighter mb-10">Subscription Matrices</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                  <div className="card-base p-10 bg-white border-none shadow-2xl shadow-slate-100 flex flex-col justify-between group">
                    <div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2 italic">Pro Cluster</p>
                      <p className="text-[4rem] font-black text-emerald-500 leading-none tracking-tighter group-hover:scale-110 transition-transform origin-left">{stats.proUsers}</p>
                    </div>
                    <div className="h-1 w-12 bg-emerald-100 mt-6" />
                  </div>
                  <div className="card-base p-10 bg-white border-none shadow-2xl shadow-slate-100 flex flex-col justify-between group">
                    <div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2 italic">Elite Cluster</p>
                      <p className="text-[4rem] font-black text-slate-900 leading-none tracking-tighter group-hover:scale-110 transition-transform origin-left">{stats.eliteUsers}</p>
                    </div>
                    <div className="h-1 w-12 bg-slate-900 mt-6" />
                  </div>
                  <div className="card-base p-10 bg-slate-900 text-white border-none shadow-2xl shadow-slate-200 flex flex-col justify-between group">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 italic">Yield Conversion</p>
                      <p className="text-[4rem] font-black text-white leading-none tracking-tighter group-hover:scale-110 transition-transform origin-left">{Math.round(((stats.proUsers + stats.eliteUsers) / stats.totalUsers) * 100) || 0}%</p>
                    </div>
                    <div className="h-1 w-12 bg-emerald-500 mt-6" />
                  </div>
                </div>

                <div className="bg-white rounded-[3rem] border border-slate-50 shadow-2xl shadow-slate-100 overflow-hidden">
                  <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-900 italic uppercase tracking-[0.3em]">Premium Entity Registry</p>
                    <span className="px-5 py-2 rounded-full bg-slate-900 text-white text-[8px] font-black uppercase tracking-[0.2em] italic">SECURE LIST</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {users.filter(u => u.plan === 'Pro' || u.plan === 'Elite').map(user => (
                      <div key={user.id} className="p-8 flex items-center justify-between hover:bg-slate-50/50 transition-all group">
                        <div className="flex items-center gap-6">
                          <div className={`size-14 rounded-[1.5rem] flex items-center justify-center font-black text-xl italic shadow-2xl transition-transform group-hover:scale-110 ${
                            user.plan === 'Elite' ? 'bg-slate-900 text-white shadow-slate-200' : 'bg-emerald-50 text-emerald-500 border border-emerald-100 shadow-emerald-50'
                          }`}>
                            {user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-md font-black text-slate-900 italic uppercase tracking-tighter group-hover:translate-x-1 transition-transform">{user.email}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-[10px] text-slate-300 font-mono font-black uppercase tracking-widest italic opacity-60">ID: {user.id?.substring(0, 8)}</p>
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full italic tracking-widest ${
                                user.plan === 'Elite' ? 'bg-slate-900 text-white' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-100'
                              }`}>{user.plan} MODULE</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleUpdateUserPlan(user.id!, 'Starter')}
                          className="px-6 py-3 rounded-[1.5rem] bg-rose-50 text-rose-500 border border-rose-100 text-[9px] font-black uppercase tracking-[0.2em] italic hover:bg-rose-500 hover:text-white transition-all shadow-xl shadow-rose-50 active:scale-95"
                        >
                          Revoke Access
                        </button>
                      </div>
                    ))}
                    {users.filter(u => u.plan === 'Pro' || u.plan === 'Elite').length === 0 && (
                      <div className="p-32 text-center flex flex-col items-center justify-center">
                        <div className="size-20 rounded-[2rem] bg-slate-50 flex items-center justify-center mb-6 opacity-20 border border-slate-100">
                            <CreditCard className="text-slate-400" size={40} />
                        </div>
                        <p className="text-slate-300 font-black uppercase tracking-widest italic text-xs">No premium entities detected in system.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'api' ? (
              <motion.div 
                key="api"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <h2 className="text-2xl lg:text-3xl font-black text-slate-900 italic uppercase tracking-tighter mb-10">Neural API Monitor</h2>
                
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                  <div className="card-base p-10 space-y-8 shadow-2xl shadow-slate-100 border-none bg-white transition-all hover:shadow-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className={`size-16 rounded-[1.5rem] flex items-center justify-center shadow-2xl ${apiStatus?.forex?.connected ? 'bg-emerald-50 text-emerald-500 border border-emerald-100 shadow-emerald-50' : 'bg-rose-50 text-rose-500 border border-rose-100 shadow-rose-50'}`}>
                          <Globe className="w-8 h-8" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none mb-1">ForexRate-PULSE</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Global Matrix Link</p>
                        </div>
                      </div>
                      <span className={`px-5 py-2 rounded-full text-[8px] font-black uppercase tracking-[0.3em] italic shadow-lg ${
                        apiStatus?.forex?.quota_reached ? 'bg-amber-500 text-white shadow-amber-200' : 
                        apiStatus?.forex?.connected ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-rose-500 text-white shadow-rose-200'
                      }`}>
                        {apiStatus?.forex?.quota_reached ? 'QUOTA LOCK' : 
                         apiStatus?.forex?.connected ? 'SYNCED' : 'OFFLINE'}
                      </span>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">CACHE VOLUME</span>
                        <span className="text-sm font-black text-emerald-600 italic uppercase tracking-tighter">{apiStatus?.forex?.cache_size || 0} ACTIVE PAIRS</span>
                      </div>
                      <div className="w-full h-2 bg-slate-50 border border-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div className="w-full h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                      </div>
                    </div>
                    {apiStatus?.forex?.last_error && (
                      <div className="p-4 rounded-3xl bg-rose-50 border border-rose-100 shadow-xl shadow-rose-50">
                        <p className="text-[9px] text-rose-600 font-mono font-bold italic line-clamp-2">
                          [CRITICAL_FAULT]: {apiStatus.forex.last_error}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="card-base p-10 space-y-8 shadow-2xl shadow-slate-100 border-none bg-white transition-all hover:shadow-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className={`size-16 rounded-[1.5rem] flex items-center justify-center shadow-2xl ${apiStatus?.twelve_data?.is_working ? 'bg-emerald-50 text-emerald-500 border border-emerald-100 shadow-emerald-50' : 'bg-rose-50 text-rose-500 border border-rose-100 shadow-rose-50'}`}>
                          <Database className="w-8 h-8" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none mb-1">Twelve-DATA CORE</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Historical Signal Archive</p>
                        </div>
                      </div>
                      <span className={`px-5 py-2 rounded-full text-[8px] font-black uppercase tracking-[0.3em] italic shadow-lg ${
                        apiStatus?.twelve_data?.is_working ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-rose-500 text-white shadow-rose-200'
                      }`}>
                        {apiStatus?.twelve_data?.is_working ? 'OPTIMAL' : 'FAULT'}
                      </span>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">INTEGRITY SCALE</span>
                        <span className={`text-sm font-black italic uppercase tracking-tighter ${apiStatus?.twelve_data?.is_working ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {apiStatus?.twelve_data?.is_working ? '99.9% SYNC' : 'SYNC LEAK'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-50 border border-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div className={`h-full transition-all duration-1000 ${apiStatus?.twelve_data?.is_working ? 'w-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'w-2 bg-rose-500 animate-pulse shadow-none'}`} />
                      </div>
                    </div>
                    {apiStatus?.twelve_data?.last_error && (
                      <div className="p-4 rounded-3xl bg-rose-50 border border-rose-100 shadow-xl shadow-rose-50">
                        <p className="text-[9px] text-rose-600 font-mono font-bold italic line-clamp-2">
                          [CORE_LEAK]: {apiStatus.twelve_data.last_error}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="card-base p-10 space-y-8 shadow-2xl shadow-slate-100 border-none bg-white transition-all hover:shadow-slate-200 xl:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="size-16 rounded-[1.5rem] bg-indigo-50 text-indigo-500 border border-indigo-100 shadow-2xl shadow-indigo-50 flex items-center justify-center">
                          <Cpu className="w-8 h-8" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none mb-1">AI-FLASH ENGINE</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Neural Analysis Matrix</p>
                        </div>
                      </div>
                      <span className="px-5 py-2 rounded-full bg-indigo-500 text-white text-[8px] font-black uppercase tracking-[0.3em] italic shadow-lg shadow-indigo-200">QUANTUM ACTIVE</span>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">NEURAL LOAD</span>
                        <span className="text-sm font-black text-indigo-600 italic uppercase tracking-tighter">18% CAPACITY</span>
                      </div>
                      <div className="w-full h-2 bg-slate-50 border border-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div className="w-[18%] h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all duration-1000" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-300 font-mono font-black uppercase tracking-[0.2em] italic">MODEL_VER: GEMINI_1.5_PRO_V3</p>
                  </div>
                </div>

                <div className="bg-white rounded-[3rem] border border-slate-50 shadow-2xl shadow-slate-100 p-10">
                  <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter mb-8 underline decoration-slate-100 underline-offset-8">API Neural Pulse (Last 24h)</h3>
                  <div className="h-64 flex items-end gap-3 px-4">
                    {[40, 65, 45, 90, 55, 70, 85, 60, 75, 50, 40, 30].map((val, i) => (
                      <div 
                        key={i} 
                        className="flex-1 bg-slate-900 rounded-2xl relative group transition-all hover:bg-emerald-500 hover:scale-x-110"
                        style={{ height: `${val}%` }}
                      >
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-2xl italic tracking-widest scale-75 group-hover:scale-100">
                          {val}K_TPS
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-8 px-4 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] italic">
                    <span>GEN_00</span>
                    <span>GEN_06</span>
                    <span>GEN_12</span>
                    <span>GEN_18</span>
                    <span>LIVE_SYNC</span>
                  </div>
                  <div className="mt-10 pt-10 border-t border-slate-50 flex items-center justify-between">
                    <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest italic">Last Pulse: {apiStatus?.timestamp ? new Date(apiStatus.timestamp).toLocaleTimeString() : 'Awaiting Data...'}</p>
                    <button 
                      onClick={() => setActiveTab('api-keys')}
                      className="px-8 py-4 rounded-[2rem] bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.4em] italic hover:bg-black transition-all shadow-2xl shadow-slate-200 flex items-center gap-4 group"
                    >
                      <Database className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      Manage Key Pool
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'api-keys' ? (
              <motion.div 
                key="api-keys"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <h2 className="text-2xl lg:text-3xl font-black text-slate-900 italic uppercase tracking-tighter">API Neural Key Pool</h2>
                  <div className="flex items-center gap-3 bg-amber-50 px-6 py-3 rounded-[2rem] border border-amber-100 shadow-xl shadow-amber-50">
                    <Shield className="w-5 h-5 text-amber-500 animate-pulse" />
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] italic">SECURE LIVE SYNC</span>
                  </div>
                </div>

                <div className="bg-white rounded-[3rem] border border-slate-50 shadow-2xl shadow-slate-100 p-10 flex flex-col gap-10">
                  <div className="border-b border-slate-50 pb-8">
                    <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter leading-none mb-3 underline decoration-slate-100 underline-offset-8">Global Signal Injection</h3>
                    <p className="text-xs text-slate-400 font-bold italic">Primary keys used for real-time neural market analysis.</p>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                          <Globe className="w-5 h-5 text-emerald-500" />
                          <h4 className="text-sm font-black text-slate-900 italic uppercase tracking-widest leading-none">Forex-CORE Key</h4>
                        </div>
                        <a href="https://forexrateapi.com" target="_blank" rel="noreferrer" className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:underline italic">EXTRACT_SOURCE_LINK</a>
                      </div>
                      <div className="relative group">
                        <input 
                          type="password"
                          value={apiKeys.FOREX_API_KEY}
                          onChange={(e) => setApiKeys(prev => ({ ...prev, FOREX_API_KEY: e.target.value }))}
                          className="w-full p-6 rounded-[2rem] bg-slate-50 border border-slate-100 font-mono text-xs focus:ring-8 focus:ring-slate-900/5 outline-none transition-all shadow-inner group-hover:border-slate-200"
                          placeholder="PASTE_ENCRYPTED_STRING_739..."
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2">
                          {apiKeys.FOREX_API_KEY ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-500 drop-shadow-sm" />
                          ) : (
                            <AlertCircle className="w-6 h-6 text-rose-500 drop-shadow-sm" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                          <Database className="w-5 h-5 text-blue-500" />
                          <h4 className="text-sm font-black text-slate-900 italic uppercase tracking-widest leading-none">Twelve-DATA Key</h4>
                        </div>
                        <a href="https://twelvedata.com" target="_blank" rel="noreferrer" className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:underline italic">EXTRACT_SOURCE_LINK</a>
                      </div>
                      <div className="relative group">
                        <input 
                          type="password"
                          value={apiKeys.TWELVE_DATA_API_KEY}
                          onChange={(e) => setApiKeys(prev => ({ ...prev, TWELVE_DATA_API_KEY: e.target.value }))}
                          className="w-full p-6 rounded-[2rem] bg-slate-50 border border-slate-100 font-mono text-xs focus:ring-8 focus:ring-slate-900/5 outline-none transition-all shadow-inner group-hover:border-slate-200"
                          placeholder="PASTE_ENCRYPTED_STRING_822..."
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2">
                          {apiKeys.TWELVE_DATA_API_KEY ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-500 drop-shadow-sm" />
                          ) : (
                            <AlertCircle className="w-6 h-6 text-rose-500 drop-shadow-sm" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                          <Activity className="w-5 h-5 text-amber-500" />
                          <h4 className="text-sm font-black text-slate-900 italic uppercase tracking-widest leading-none">Alpha-VANTAGE Key</h4>
                        </div>
                        <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noreferrer" className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:underline italic">EXTRACT_SOURCE_LINK</a>
                      </div>
                      <div className="relative group">
                        <input 
                          type="password"
                          value={apiKeys.ALPHA_VANTAGE_API_KEY}
                          onChange={(e) => setApiKeys(prev => ({ ...prev, ALPHA_VANTAGE_API_KEY: e.target.value }))}
                          className="w-full p-6 rounded-[2rem] bg-slate-50 border border-slate-100 font-mono text-xs focus:ring-8 focus:ring-slate-900/5 outline-none transition-all shadow-inner group-hover:border-slate-200"
                          placeholder="PASTE_ENCRYPTED_STRING_104..."
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2">
                          {apiKeys.ALPHA_VANTAGE_API_KEY ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-500 drop-shadow-sm" />
                          ) : (
                            <AlertCircle className="w-6 h-6 text-rose-500 drop-shadow-sm" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                          <RefreshCw className="w-5 h-5 text-indigo-500" />
                          <h4 className="text-sm font-black text-slate-900 italic uppercase tracking-widest leading-none">Exchange-RATE Key</h4>
                        </div>
                        <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer" className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:underline italic">EXTRACT_SOURCE_LINK</a>
                      </div>
                      <div className="relative group">
                        <input 
                          type="password"
                          value={apiKeys.EXCHANGE_RATE_API_KEY}
                          onChange={(e) => setApiKeys(prev => ({ ...prev, EXCHANGE_RATE_API_KEY: e.target.value }))}
                          className="w-full p-6 rounded-[2rem] bg-slate-50 border border-slate-100 font-mono text-xs focus:ring-8 focus:ring-slate-900/5 outline-none transition-all shadow-inner group-hover:border-slate-200"
                          placeholder="PASTE_ENCRYPTED_STRING_411..."
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2">
                          {apiKeys.EXCHANGE_RATE_API_KEY ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-500 drop-shadow-sm" />
                          ) : (
                            <AlertCircle className="w-6 h-6 text-rose-500 drop-shadow-sm" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-10 border-t border-slate-50">
                    <div className="mb-10">
                      <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter leading-none mb-3 underline decoration-slate-100 underline-offset-8">Neural Key Reservoirs</h3>
                      <p className="text-xs text-slate-400 font-bold italic">Backup clusters and redundant signal routes.</p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                      <div>
                        <label className="block text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3 px-1 italic">ARCHIVE IDENTIFIER</label>
                        <input 
                          type="text"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          className="w-full p-5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold focus:ring-8 focus:ring-slate-900/5 outline-none transition-all shadow-inner italic"
                          placeholder="RESERVOIR_BETA_SYNC..."
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3 px-1 italic">CORE PROTOCOL</label>
                        <input 
                          type="text"
                          list="service-options"
                          value={newKeyService}
                          onChange={(e) => setNewKeyService(e.target.value)}
                          className="w-full p-5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-black focus:ring-8 focus:ring-slate-900/5 outline-none transition-all shadow-inner italic uppercase tracking-widest"
                          placeholder="SELECT MATRIX LAYER..."
                        />
                        <datalist id="service-options">
                          <option value="forex">FOREX_CORE</option>
                          <option value="twelve_data">DATA_ARCHIVE</option>
                          <option value="alpha_vantage">ALPHA_PULSE</option>
                          <option value="exchange_rate">MATRIX_SYNC</option>
                        </datalist>
                      </div>
                    </div>
                    <div className="space-y-6 mb-10">
                      <div>
                        <label className="block text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3 px-1 italic">NEURAL VALUE STRING</label>
                        <input 
                          type="password"
                          value={newKeyValue}
                          onChange={(e) => setNewKeyValue(e.target.value)}
                          className="w-full p-5 rounded-2xl bg-slate-50 border border-slate-100 font-mono text-xs focus:ring-8 focus:ring-slate-900/5 outline-none transition-all shadow-inner"
                          placeholder="************************************************"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <button 
                          onClick={handleAddKeyToPool}
                          disabled={!newKeyName || !newKeyValue || !newKeyService || isSavingKeys}
                          className="flex-1 py-6 bg-emerald-500 text-white rounded-[2rem] font-black uppercase tracking-[0.4em] italic hover:bg-emerald-600 transition-all disabled:opacity-30 shadow-2xl shadow-emerald-100 active:scale-[0.98] flex items-center justify-center gap-4 group/add"
                        >
                          {isSavingKeys ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6 group-hover/add:rotate-90 transition-transform" />}
                          Inject Reservoir
                        </button>
                        <button 
                          onClick={() => {
                            setNewKeyName('');
                            setNewKeyValue('');
                            setNewKeyService('forex');
                          }}
                          className="py-6 px-10 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] italic hover:bg-black transition-all shadow-2xl shadow-slate-200 active:scale-[0.98]"
                        >
                          Flush Input
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {apiKeys.keyPool?.map((key) => (
                        <div key={key.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 group transition-all hover:bg-white hover:shadow-2xl hover:shadow-slate-100 hover:border-slate-50">
                          <div className="flex items-center gap-6 mb-4 sm:mb-0">
                            <div className={`size-14 rounded-[1.5rem] flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110 ${
                              key.service === 'forex' ? 'bg-emerald-50 text-emerald-500 border border-emerald-100 shadow-emerald-50' : 
                              key.service === 'twelve_data' ? 'bg-blue-50 text-blue-500 border border-blue-100 shadow-blue-50' :
                              key.service === 'alpha_vantage' ? 'bg-amber-50 text-amber-500 border border-amber-100 shadow-amber-50' :
                              'bg-indigo-50 text-indigo-500 border border-indigo-100 shadow-indigo-50'
                            }`}>
                              {key.service === 'forex' ? <Globe className="w-6 h-6" /> : 
                               key.service === 'twelve_data' ? <Database className="w-6 h-6" /> :
                               key.service === 'alpha_vantage' ? <Activity className="w-6 h-6" /> :
                               <RefreshCw className="w-6 h-6" />}
                            </div>
                            <div>
                              <p className="text-md font-black text-slate-900 italic uppercase tracking-tighter leading-none mb-1 group-hover:translate-x-1 transition-transform">{key.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono font-black uppercase tracking-widest italic opacity-60">LAYER: {key.service.toUpperCase()} • {key.value.substring(0, 12)}...</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => handleToggleKeyStatus(key.id)}
                              className={`px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all italic shadow-lg ${
                                key.active 
                                  ? 'bg-emerald-500 text-white shadow-emerald-200' 
                                  : 'bg-slate-900 text-white shadow-slate-200 opacity-20 hover:opacity-100'
                              }`}
                            >
                              {key.active ? 'CORED' : 'DORMANT'}
                            </button>
                            <button 
                              onClick={() => handleDeleteKeyFromPool(key.id)}
                              className="size-10 rounded-full bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-xl shadow-rose-50 active:scale-90"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {(!apiKeys.keyPool || apiKeys.keyPool.length === 0) && (
                        <div className="p-32 text-center flex flex-col items-center justify-center">
                            <div className="size-20 rounded-[2rem] bg-slate-50 flex items-center justify-center mb-6 opacity-20 border border-slate-100">
                                <Shield className="text-slate-400" size={40} />
                            </div>
                            <p className="text-slate-300 font-black uppercase tracking-widest italic text-xs">The neural key reservoirs are empty.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-10 border-t border-slate-50">
                    <button 
                      onClick={handleSaveApiKeys}
                      disabled={isSavingKeys}
                      className="w-full py-10 bg-slate-900 text-white rounded-[3rem] font-black uppercase tracking-[0.5em] italic hover:bg-black transition-all shadow-2xl shadow-slate-300 active:scale-[0.99] flex items-center justify-center gap-6 group"
                    >
                      {isSavingKeys ? (
                        <>
                          <Loader2 className="w-8 h-8 animate-spin" />
                          SYNCING NEURAL LAYERS...
                        </>
                      ) : (
                        <>
                          <Save className="w-8 h-8 group-hover:scale-125 transition-transform" />
                          FINAL_COMMIT_MATRIX_SYNC
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100">
                  <div className="flex gap-4">
                    <div className="p-3 rounded-xl bg-blue-100 text-blue-600 shrink-0">
                      <Info className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-blue-900 mb-1">Real-time Updates</h4>
                      <p className="text-sm text-blue-700 leading-relaxed">
                        TradeIQ uses a Firestore-backed configuration system. When you update these keys, the backend server detects the change instantly via a real-time listener. No server restart or code redeploy is required.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'audit' ? (
              <motion.div 
                key="audit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <h2 className="text-2xl lg:text-3xl font-black text-slate-900 mb-8">Audit Logs</h2>
                
                <div className="card-base overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Activity</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Monitoring</span>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {adminLogs.map(log => (
                      <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-3">
                            <div className="p-2 rounded-lg bg-slate-100 text-slate-500 shrink-0">
                              <Shield className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{log.action}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">{log.target}</span>
                              </div>
                              <p className="text-xs text-slate-600 font-medium">{log.details}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] font-bold text-emerald-600">{log.adminEmail}</span>
                                <span className="text-[10px] text-slate-400 font-mono">• {new Date(log.timestamp).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {adminLogs.length === 0 && (
                      <div className="p-12 text-center">
                        <p className="text-slate-400 text-sm">No audit logs found.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="fallback"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4"
              >
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
                  <Clock className="w-10 h-10 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Under Construction</h3>
                  <p className="text-slate-500">The {activeTab} module is currently being optimized.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
        active 
          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
