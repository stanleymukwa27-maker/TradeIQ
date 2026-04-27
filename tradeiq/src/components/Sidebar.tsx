import React from 'react';
import { 
  BarChart3, 
  LayoutDashboard, 
  BookOpen, 
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  User,
  Crown,
  Globe,
  ShieldCheck,
  ShieldAlert,
  History,
  LogOut,
  Bell,
  Users
} from 'lucide-react';
import { Page } from '../types';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  plan: 'Starter' | 'Pro' | 'Elite';
  onSignOut: () => void;
  unreadNotifications?: number;
  isAdmin?: boolean;
}

export default function Sidebar({ currentPage, setCurrentPage, isOpen, setIsOpen, plan, onSignOut, unreadNotifications = 0, isAdmin = false }: SidebarProps) {
  const menuItems = [
    { id: 'Analyzer' as Page, icon: BarChart3, label: 'Analyzer' },
    { id: 'Dashboard' as Page, icon: LayoutDashboard, label: 'Dashboard' },
    { 
      id: 'Journal' as Page, 
      icon: (plan === 'Pro' || plan === 'Elite') ? Crown : BookOpen, 
      label: (plan === 'Pro' || plan === 'Elite') ? 'Pro Journal' : 'Starter Journal' 
    },
    { id: 'Community' as Page, icon: Users, label: 'Community' },
    { id: 'MarketData' as Page, icon: Globe, label: 'Market Data' },
    { id: 'RiskTools' as Page, icon: ShieldCheck, label: 'Risk Tools' },
    { id: 'Backtest' as Page, icon: History, label: 'Backtest' },
    { id: 'Notifications' as Page, icon: Bell, label: 'Notifications' },
    { id: 'Profile' as Page, icon: User, label: 'Profile' },
    { id: 'Subscription' as Page, icon: Crown, label: 'Subscription' },
    ...(isAdmin ? [{ id: 'Admin' as Page, icon: ShieldAlert, label: 'Admin Panel' }] : []),
    { id: 'Support' as Page, icon: BookOpen, label: 'Support' },
    { id: 'Settings' as Page, icon: SettingsIcon, label: 'Settings' },
  ];

  return (
    <aside 
      className={`fixed left-0 top-0 h-[100dvh] bg-white/90 backdrop-blur-2xl border-r border-slate-200 transition-all duration-300 flex flex-col z-50 shadow-xl w-[280px] sm:w-64 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="p-6 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-emerald-600" />
          TradeIQ
        </h1>
        <button 
          onClick={() => setIsOpen(false)}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      <nav className="flex-1 px-3 mt-4 space-y-2 overflow-y-auto no-scrollbar">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setCurrentPage(item.id);
              setIsOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              currentPage === item.id 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/10' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <item.icon size={20} />
            <span className="font-semibold text-sm flex-1">{item.label}</span>
            {item.id === 'Notifications' && unreadNotifications > 0 && (
              <span className="w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                {unreadNotifications}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-100 space-y-4">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-all font-semibold text-sm"
        >
          <LogOut size={20} />
          Sign Out
        </button>

        <div className="bg-slate-50 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Market Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-slate-600">Live & Open</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
