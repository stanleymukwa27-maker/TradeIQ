import { TradeAnalysis } from './services/geminiService';

export interface TradeRecord extends TradeAnalysis {
  id: string;
  timestamp: string;
  currency_pair: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  timeframe: string;
  userId: string;
  trade_result?: 'Win' | 'Loss' | 'Break-even' | 'Pending';
}

export interface UserSettings {
  preferredSession: 'London' | 'New York' | 'All';
  riskRewardThreshold: number;
  theme: 'Light' | 'Dark';
  plan: 'Starter' | 'Pro' | 'Elite';
  enableAiAlerts: boolean;
  enableMarketAlerts: boolean;
}

export interface UserProfile extends UserSettings {
  id?: string;
  displayName?: string;
  email: string;
  isNewUser?: boolean;
  status?: 'active' | 'banned';
  createdAt: string;
  role?: 'admin' | 'user';
}

export interface FeatureFlag {
  id: string;
  feature_name: string;
  enabled: boolean;
  description?: string;
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetId?: string;
  details?: string;
  timestamp: string;
}

export interface SystemConfig {
  maintenanceMode: boolean;
  broadcastMessage: string;
  geminiModel?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  target: 'All' | 'Starter' | 'Pro' | 'Elite';
  type: 'info' | 'warning' | 'success' | 'alert';
  category: 'ai_trade' | 'market_event' | 'system';
  createdAt: string;
  adminId: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  subject: string;
  status: 'Open' | 'Pending' | 'Resolved';
  lastMessageAt: string;
  createdAt: string;
}

export interface SupportMessage {
  id: string;
  senderId: string;
  senderRole: 'user' | 'admin';
  text: string;
  timestamp: string;
}

export interface CommunityPost {
  id: string;
  userId: string;
  userName: string;
  currency_pair: string;
  entry: number;
  stop_loss: number;
  take_profit: number;
  description: string;
  result: 'Win' | 'Loss' | 'Pending';
  likes: number;
  dislikes: number;
  commentCount: number;
  createdAt: string;
}

export interface CommunityComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface UserInteraction {
  type: 'like' | 'dislike' | null;
}

export interface PaymentRequest {
  id: string;
  userId: string;
  userEmail: string;
  plan: 'Pro' | 'Elite';
  amount: number;
  provider: string;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export type Page = 'Analyzer' | 'Dashboard' | 'Journal' | 'Settings' | 'Profile' | 'Subscription' | 'MarketData' | 'RiskTools' | 'Backtest' | 'Admin' | 'Support' | 'Notifications' | 'Community';
