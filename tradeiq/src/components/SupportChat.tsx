import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Send, 
  X, 
  Loader2, 
  User, 
  ShieldCheck,
  HelpCircle,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  Timestamp,
  doc,
  updateDoc,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';

interface SupportChatProps {
  userId: string;
  userEmail: string;
  userPlan?: string;
}

export default function SupportChat({ userId, userEmail, userPlan }: SupportChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketStatus, setTicketStatus] = useState<string>('Open');
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-support-chat', handleOpen);
    return () => window.removeEventListener('open-support-chat', handleOpen);
  }, []);

  useEffect(() => {
    if (!userId || !isOpen) return;

    const findOrCreateTicket = async () => {
      if (ticketId) return; // Don't run if we already have a ticket in this session
      
      setIsLoading(true);
      try {
        const q = query(
          collection(db, 'support_tickets'), 
          where('userId', '==', userId),
          where('status', 'in', ['Open', 'Pending']),
          orderBy('lastMessageAt', 'desc')
        );
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          setTicketId(snap.docs[0].id);
          // Update plan in case it changed
          if (snap.docs[0].data().userPlan !== userPlan) {
            await updateDoc(doc(db, 'support_tickets', snap.docs[0].id), { userPlan });
          }
        } else {
          const newTicket = await addDoc(collection(db, 'support_tickets'), {
            userId,
            userEmail,
            userPlan: userPlan || 'Starter',
            subject: 'General Support',
            status: 'Open',
            createdAt: Timestamp.now(),
            lastMessageAt: Timestamp.now(),
            lastMessage: 'Ticket created'
          });
          setTicketId(newTicket.id);
        }
      } catch (error) {
        console.error('Error finding/creating ticket:', error);
      } finally {
        setIsLoading(false);
      }
    };

    findOrCreateTicket();
  }, [userId, isOpen]); // Removed userPlan from dependencies to prevent re-creation on plan update

  useEffect(() => {
    if (!ticketId || !isOpen) return;

    const unsubscribe = onSnapshot(doc(db, 'support_tickets', ticketId), (snap) => {
      if (snap.exists()) {
        setTicketStatus(snap.data().status);
      }
    });

    return () => unsubscribe();
  }, [ticketId, isOpen]);

  useEffect(() => {
    if (!ticketId || !isOpen) return;

    const q = query(
      collection(db, `support_tickets/${ticketId}/messages`),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [ticketId, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !ticketId) return;

    const text = newMessage;
    setNewMessage('');

    try {
      await addDoc(collection(db, `support_tickets/${ticketId}/messages`), {
        senderId: userId,
        senderRole: 'user',
        text,
        timestamp: Timestamp.now()
      });

      await updateDoc(doc(db, 'support_tickets', ticketId), {
        lastMessageAt: Timestamp.now(),
        lastMessage: text,
        status: 'Open'
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-emerald-500 text-white rounded-full shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[100] group"
      >
        <MessageCircle className="w-8 h-8" />
        <div className="absolute top-0 right-0 w-5 h-5 bg-rose-500 rounded-full border-[3px] border-white flex items-center justify-center shadow-lg">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
        </div>
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-4 sm:right-6 w-[380px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-120px)] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col z-[100] border border-slate-100"
          >
            {/* Header */}
            <header className="p-4 bg-emerald-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold">TradeIQ Support</h3>
                    {ticketStatus === 'Resolved' && (
                      <span className="px-1.5 py-0.5 rounded bg-white/20 text-[8px] font-black uppercase tracking-widest">Resolved</span>
                    )}
                  </div>
                  <p className="text-[10px] font-medium opacity-80 uppercase tracking-widest">Typically replies in 5m</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50"
            >
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                    <HelpCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">How can we help?</h4>
                    <p className="text-xs text-slate-500 mt-1">Ask us anything about the platform or your trades.</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex ${msg.senderRole === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] p-3 rounded-2xl text-xs font-medium shadow-sm ${
                      msg.senderRole === 'user' 
                        ? 'bg-emerald-500 text-white rounded-tr-none' 
                        : 'bg-white text-slate-900 rounded-tl-none border border-slate-100'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              
              {ticketStatus === 'Resolved' && (
                <div className="flex justify-center py-4">
                  <div className="bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ticket Resolved</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Type your message..."
                  className="w-full bg-slate-100 border-none rounded-xl pl-4 pr-12 py-3 text-xs focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
