import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  MessageCircle, 
  ArrowLeft, 
  TrendingUp, 
  HelpCircle, 
  MessageSquare, 
  ChevronRight, 
  Clock, 
  ShieldCheck,
  Search,
  ExternalLink,
  BookOpen,
  PlayCircle
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';
import { KnowledgeBase } from './KnowledgeBase';

interface SupportPageProps {
  onBack?: () => void;
  userId?: string;
}

export const SupportPage: React.FC<SupportPageProps> = ({ onBack, userId }) => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'main' | 'knowledge-base'>('main');

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'support_tickets'),
      where('userId', '==', userId),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubscribe();
  }, [userId]);

  const faqs = [
    { q: "How do I upgrade to Pro?", a: "You can upgrade via the Subscription page in your sidebar. Pro unlocks advanced journaling and market data." },
    { q: "Is my data secure?", a: "Yes, we use industry-standard encryption and Firebase security rules to ensure your trade data is private." },
    { q: "How does the AI score work?", a: "Our AI analyzes trend, risk/reward, and market structure to give you a score from 0-100." },
    { q: "Can I export my trades?", a: "Currently, Pro users can view their full history. CSV export is coming in the next update." }
  ];

  if (view === 'knowledge-base') {
    return (
      <div className={`min-h-screen ${onBack ? 'bg-slate-50 text-slate-900 pt-32 pb-24 px-6' : 'py-6 px-2'}`}>
        <KnowledgeBase onBack={() => setView('main')} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${onBack ? 'bg-slate-50 text-slate-900' : ''}`}>
      {onBack && (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors group text-[10px] font-black uppercase tracking-widest"
            >
              <ArrowLeft className="size-5 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </button>
            <div className="flex items-center gap-2">
              <div className="size-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-white size-5" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-black tracking-tighter uppercase italic">TradeIQ</span>
            </div>
            <div className="w-24" />
          </div>
        </nav>
      )}

      <main className={`${onBack ? 'pt-32 pb-24 px-6' : 'space-y-8'}`}>
        <div className={onBack ? 'max-w-5xl mx-auto' : ''}>
          {/* Hero Section */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                Support Center
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <Clock className="w-3 h-3" />
                Avg. Response: 5m
              </div>
            </div>
            <h1 className={`text-4xl md:text-6xl font-black mb-6 tracking-tight uppercase italic ${onBack ? 'text-slate-900' : 'text-slate-900'}`}>
              How can we <span className="text-emerald-600 block sm:inline">help</span> you?
            </h1>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input 
                type="text"
                placeholder="Search for help, guides, or tickets..."
                className={`w-full pl-16 pr-6 py-5 rounded-3xl border text-sm font-bold transition-all shadow-sm ${
                  onBack 
                    ? 'bg-white border-slate-100 text-slate-900 focus:ring-slate-900/10' 
                    : 'bg-white border-slate-100 text-slate-900 focus:ring-slate-900/10'
                } focus:ring-4 outline-none placeholder:text-slate-200`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Quick Actions & FAQs */}
            <div className="lg:col-span-2 space-y-8">
              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  onClick={() => setView('knowledge-base')}
                  className={`p-8 rounded-[2.5rem] border transition-all group cursor-pointer shadow-sm ${
                    onBack ? 'bg-white border-slate-100 hover:border-slate-900' : 'bg-white border-slate-100 hover:border-slate-900'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner">
                    <BookOpen className="text-slate-900 w-6 h-6" />
                  </div>
                  <h3 className={`text-xl font-black mb-2 uppercase italic tracking-tight ${onBack ? 'text-slate-900' : 'text-slate-900'}`}>Knowledge Base</h3>
                  <p className="text-slate-500 text-sm mb-6 font-medium italic">Detailed guides on how to use every feature of TradeIQ.</p>
                  <div className="flex items-center gap-2 text-slate-900 text-[10px] font-black uppercase tracking-widest">
                    Browse Articles <ChevronRight className="w-4 h-4" />
                  </div>
                </div>

                <div className={`p-8 rounded-[2.5rem] border transition-all group cursor-pointer shadow-sm ${
                  onBack ? 'bg-white border-slate-100 hover:border-slate-900' : 'bg-white border-slate-100 hover:border-slate-900'
                }`}>
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner">
                    <PlayCircle className="text-slate-900 w-6 h-6" />
                  </div>
                  <h3 className={`text-xl font-black mb-2 uppercase italic tracking-tight ${onBack ? 'text-slate-900' : 'text-slate-900'}`}>Video Tutorials</h3>
                  <p className="text-slate-500 text-sm mb-6 font-medium italic">Watch and learn how to master the markets with our AI.</p>
                  <div className="flex items-center gap-2 text-slate-900 text-[10px] font-black uppercase tracking-widest">
                    Watch Now <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* FAQs */}
              <div className={`p-10 rounded-[3rem] border shadow-sm ${onBack ? 'bg-white border-slate-100' : 'bg-white border-slate-100'}`}>
                <h3 className={`text-2xl font-black mb-10 uppercase italic tracking-tight ${onBack ? 'text-slate-900' : 'text-slate-900'}`}>Common Questions</h3>
                <div className="space-y-8">
                  {faqs.map((faq, i) => (
                    <div key={i} className="group cursor-pointer">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className={`font-black uppercase tracking-tight italic group-hover:text-emerald-600 transition-colors ${onBack ? 'text-slate-700' : 'text-slate-700'}`}>
                          {faq.q}
                        </h4>
                        <ChevronRight className="w-4 h-4 text-slate-200 group-hover:translate-x-2 transition-transform" />
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed font-medium italic">{faq.a}</p>
                      {i < faqs.length - 1 && <div className={`mt-8 h-px w-full ${onBack ? 'bg-slate-50' : 'bg-slate-50'}`} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Active Tickets & Contact */}
            <div className="space-y-8">
              {/* Active Tickets (Only if logged in) */}
              {userId && (
                <div className={`p-8 rounded-[2.5rem] border shadow-sm ${onBack ? 'bg-white border-slate-100' : 'bg-white border-slate-100'}`}>
                  <div className="flex items-center justify-between mb-8">
                    <h3 className={`font-black uppercase tracking-widest text-[10px] italic ${onBack ? 'text-slate-400' : 'text-slate-400'}`}>Your Tickets</h3>
                    <span className="px-3 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-black shadow-lg shadow-slate-200">{tickets.length}</span>
                  </div>
                  
                  <div className="space-y-4">
                    {tickets.slice(0, 3).map(ticket => (
                      <div key={ticket.id} className={`p-5 rounded-2xl border transition-all hover:scale-[1.02] shadow-sm ${
                        onBack ? 'bg-slate-50 border-slate-100 hover:border-slate-900' : 'bg-slate-50 border-slate-100 hover:border-slate-900'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                            ticket.status === 'Open' ? 'bg-emerald-600 text-white shadow-sm' :
                            ticket.status === 'Pending' ? 'bg-amber-500 text-white shadow-sm' :
                            'bg-slate-400 text-white shadow-sm'
                          }`}>
                            {ticket.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold italic">
                            {new Date(ticket.lastMessageAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className={`text-sm font-black uppercase tracking-tight italic truncate ${onBack ? 'text-slate-900' : 'text-slate-900'}`}>{ticket.subject}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-1 italic font-medium">{ticket.lastMessage}</p>
                      </div>
                    ))}
                    {tickets.length === 0 && (
                      <div className="text-center py-10">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                          <MessageSquare className="w-8 h-8 text-slate-200" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 italic">No active tickets.</p>
                      </div>
                    )}
                    {tickets.length > 3 && (
                      <button className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors italic border-t border-slate-50 mt-4">
                        View All Tickets
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Contact Options */}
              <div className={`p-8 rounded-[2.5rem] border shadow-sm ${onBack ? 'bg-white border-slate-100' : 'bg-white border-slate-100'}`}>
                <h3 className={`font-black uppercase tracking-widest text-[10px] mb-8 italic ${onBack ? 'text-slate-400' : 'text-slate-400'}`}>Direct Contact</h3>
                
                <div className="space-y-4">
                  <div 
                    onClick={() => window.dispatchEvent(new CustomEvent('open-support-chat'))}
                    className="flex items-center gap-5 p-5 rounded-2xl bg-slate-50 hover:bg-emerald-50 transition-all group cursor-pointer border border-transparent hover:border-emerald-100"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <MessageSquare className="w-5 h-5 text-slate-900" />
                    </div>
                    <div>
                      <p className={`text-sm font-black uppercase tracking-tight italic ${onBack ? 'text-slate-900' : 'text-slate-900'}`}>Live Support</p>
                      <p className="text-[10px] text-slate-400 font-bold italic">Chat with a human expert</p>
                    </div>
                  </div>

                  <a href="mailto:support@tradeiq.ai" className="flex items-center gap-5 p-5 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all group border border-transparent hover:border-slate-200">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <Mail className="w-5 h-5 text-slate-900" />
                    </div>
                    <div>
                      <p className={`text-sm font-black uppercase tracking-tight italic ${onBack ? 'text-slate-900' : 'text-slate-900'}`}>Email Us</p>
                      <p className="text-[10px] text-slate-400 font-bold italic">support@tradeiq.ai</p>
                    </div>
                  </a>

                  <div className="flex items-center gap-5 p-5 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-all group cursor-pointer border border-transparent hover:border-blue-100">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <MessageCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className={`text-sm font-black uppercase tracking-tight italic ${onBack ? 'text-slate-900' : 'text-slate-900'}`}>Discord Hub</p>
                      <p className="text-[10px] text-slate-400 font-bold italic">Join 5,000+ Traders</p>
                    </div>
                  </div>
                </div>

                <div className={`mt-10 pt-10 border-t ${onBack ? 'border-slate-50' : 'border-slate-50'}`}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-2xl bg-slate-950 flex items-center justify-center shadow-xl shadow-slate-200">
                      <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${onBack ? 'text-slate-900' : 'text-slate-900'}`}>Priority Support</p>
                      <p className="text-[10px] text-slate-400 font-bold italic">Available for Pro Users</p>
                    </div>
                  </div>
                  <button className="w-full py-5 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-2xl shadow-slate-200 active:scale-95">
                    Upgrade to Elite
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
