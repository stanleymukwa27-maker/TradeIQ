import React, { useState, useEffect } from 'react';
import { Menu, BarChart3, LogOut, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  onMenuClick: () => void;
  onSignOut: () => void;
  hasBanner?: boolean;
  unreadNotifications?: number;
  onNavigateToNotifications?: () => void;
}

export default function Header({ onMenuClick, onSignOut, hasBanner, unreadNotifications = 0, onNavigateToNotifications }: HeaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = React.useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY.current && currentScrollY > 64) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.header
          initial={{ y: -100 }}
          animate={{ y: hasBanner ? 32 : 0 }}
          exit={{ y: -100 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed left-0 right-0 h-16 bg-white/80 backdrop-blur-2xl border-b border-slate-100 z-40 flex items-center px-4 md:px-8 justify-between shadow-sm"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-emerald-600" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">TradeIQ</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">
                AI Powered
              </span>
            </div>
            
            <button
              onClick={onNavigateToNotifications}
              className="relative p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"
              title="Notifications"
            >
              <Bell size={20} />
              {unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>

            <button
              onClick={onSignOut}
              className="p-2 hover:bg-rose-900/20 rounded-xl text-slate-400 hover:text-rose-400 transition-colors"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </motion.header>
      )}
    </AnimatePresence>
  );
}
