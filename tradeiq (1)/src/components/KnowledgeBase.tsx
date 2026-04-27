import React, { useState } from 'react';
import { 
  Book, 
  Search, 
  ChevronRight, 
  ArrowLeft, 
  BrainCircuit, 
  FileText, 
  Shield, 
  Zap,
  TrendingUp,
  BarChart3,
  History,
  Settings,
  MessageSquare,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Loader2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
}

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

export const KnowledgeBase: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<{[key: string]: 'idle' | 'submitting' | 'submitted'}>({});
  const [showCommentModal, setShowCommentModal] = useState<boolean | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');

  const handleFeedback = async (helpful: boolean, comment: string = '') => {
    if (!selectedArticle) return;
    const articleId = selectedArticle.id;
    
    setFeedbackStatus(prev => ({ ...prev, [articleId]: 'submitting' }));
    
    try {
      await addDoc(collection(db, 'article_feedback'), {
        articleId,
        articleTitle: selectedArticle.title,
        helpful,
        comment,
        userId: auth.currentUser?.uid || 'anonymous',
        userEmail: auth.currentUser?.email || 'anonymous',
        timestamp: serverTimestamp()
      });
      
      setFeedbackStatus(prev => ({ ...prev, [articleId]: 'submitted' }));
      setShowCommentModal(null);
      setFeedbackComment('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `article_feedback/${articleId}`);
      setFeedbackStatus(prev => ({ ...prev, [articleId]: 'idle' }));
    }
  };

  const categories: Category[] = [
    { 
      id: 'getting-started', 
      name: 'Getting Started', 
      icon: <Zap className="w-6 h-6 text-amber-500" />,
      description: 'Learn the basics of TradeIQ and set up your first analysis.'
    },
    { 
      id: 'ai-analysis', 
      name: 'AI Analysis', 
      icon: <BrainCircuit className="w-6 h-6 text-emerald-500" />,
      description: 'Master the technical analysis engine and interpreting scores.'
    },
    { 
      id: 'journaling', 
      name: 'Trade Journaling', 
      icon: <FileText className="w-6 h-6 text-blue-500" />,
      description: 'How to track results and use the Pro journaling features.'
    },
    { 
      id: 'market-data', 
      name: 'Market Data', 
      icon: <BarChart3 className="w-6 h-6 text-purple-500" />,
      description: 'Using live tickers, historical data, and backtesting tools.'
    },
    { 
      id: 'account', 
      name: 'Account & Security', 
      icon: <Shield className="w-6 h-6 text-rose-500" />,
      description: 'Managing your subscription, profile, and data privacy.'
    }
  ];

  const articles: Article[] = [
    {
      id: 'intro',
      category: 'getting-started',
      title: 'Introduction to TradeIQ',
      excerpt: 'Welcome to the future of trading validation. Here is what you need to know.',
      content: `
        # Introduction to TradeIQ
        
        TradeIQ is an advanced AI-powered trading companion designed to help traders validate their setups before risking capital. 
        Instead of relying purely on intuition, you can leverage our sophisticated analysis engine to get a data-driven perspective.

        ## Core Features
        
        * AI Trade Validator: Input your entry, stop-loss, and take-profit to get an instant analysis.
        * Chart Screenshot Analysis: Upload a screenshot of your trading view for visual pattern recognition.
        * Professional Journaling: Track your wins, losses, and emotional state.
        * Market Intelligence: Real-time forex data and session timing insights.

        ## Getting Started
        
        To begin, navigate to the Analyzer tab. You can either manually input your trade parameters or click the "Analyze Chart Image" button to upload a screenshot.
      `
    },
    {
      id: 'ai-score',
      category: 'ai-analysis',
      title: 'Understanding the AI Score',
      excerpt: 'What the 0-100 score actually means and how it is calculated.',
      content: `
        # Understanding the AI Score
        
        Every analysis results in a confidence score from 0 to 100. This score represents how well your trade setup aligns with professional technical analysis protocols.

        ## Scoring Methodology
        
        1. Trend Alignment (30%): Is the trade moving with the 50 and 200 EMA?
        2. Risk/Reward Ratio (25%): A minimum R:R of 1.5 is required for a high score.
        3. Support/Resistance (20%): Is the entry price near a key historical level?
        4. Momentum (15%): Analysis of RSI and MACD crossovers.
        5. Execution Timing (10%): Is the trade occurring during high-liquidity sessions (London/NY)?

        ## Interpretation
        
        * 80-100: High Probability Setup. Professional alignment across all metrics.
        * 60-79: Moderate Setup. Good, but may have minor flaws like poor timing or weak momentum.
        * Below 60: Low Probability. Avoid or wait for better confirmation.
      `
    },
    {
      id: 'chart-analysis',
      category: 'ai-analysis',
      title: 'Chart Screenshot Tips',
      excerpt: 'How to get the most accurate results when uploading screenshots.',
      content: `
        # Chart Screenshot Tips
        
        Our Vision AI can read your charts, but for the best results, follow these guidelines:

        ## Best Practices
        
        * Include Indicators: Make sure your EMAs (50/200), RSI, or MACD are clearly visible if you use them.
        * Clean View: Remove unnecessary drawings from the chart.
        * Show Price Action: High-quality screenshots of candles help identify engulfing patterns.
        * Timeframe Visibility: Ensure the timeframe (e.g., 1H, 4H, Daily) is visible on the screen.

        ## Common Issues
        
        Low-resolution images or extremely zoomed-out views can lead to "Low Confidence" ratings as the AI might miss subtle price action clues.
      `
    },
    {
      id: 'pro-journaling',
      category: 'journaling',
      title: 'Pro Journaling Features',
      excerpt: 'Unlock the full power of your trade history with Pro.',
      content: `
        # Pro Journaling Features
        
        While the Basic journal tracks entries and exits, Pro users unlock advanced psychological and performance tracking.

        ## Key Pro Benefits
        
        * Performance Analytics: Visual breakdowns of your win rate by currency pair and session.
        * Psychological Tracking: Tag your emotions (FOMO, Revenge, Patient) to identify behavioral patterns.
        * AI Performance Feedback: The AI scans your history to tell you *why* you are losing or winning specific types of trades.
        * Unlimited Storage: Keep a lifetime record of every screenshot and analysis note.
      `
    },
    {
      id: 'risk-management',
      category: 'market-data',
      title: 'Risk Management Tools',
      excerpt: 'How to use our calculators and position sizing tools.',
      content: `
        # Risk Management Tools
        
        Successful trading is 90% risk management. TradeIQ provides tools to ensure you never over-leverage your account.

        ## Position Size Calculator
        
        Located in the Risk Tools section, this calculator helps you determine exactly how many lots to trade based on:
        
        1. Account Balance: Your total equity.
        2. Risk Percentage: How much of your account you are willing to lose (e.g., 1% or 2%).
        3. Stop Loss (Pips): The distance between your entry and SL.

        ## The 1% Rule
        
        We strongly recommend never risking more than 1-2% of your account on a single trade. Our AI analysis will penalize setups that have an unclear or dangerously large stop loss relative to the potential reward.
      `
    }
  ];

  const filteredArticles = articles.filter(art => 
    (selectedCategory ? art.category === selectedCategory : true) &&
    (searchQuery ? (art.title.toLowerCase().includes(searchQuery.toLowerCase()) || art.excerpt.toLowerCase().includes(searchQuery.toLowerCase())) : true)
  );

  return (
    <div className="max-w-5xl mx-auto">
      <AnimatePresence mode="wait">
        {!selectedArticle ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                {selectedCategory ? (
                  <button 
                    onClick={() => setSelectedCategory(null)}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-zinc-400 hover:text-white"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                ) : (
                  <button 
                    onClick={onBack}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-zinc-400 hover:text-white"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <h1 className="text-3xl font-black text-white">
                  {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'Knowledge Base'}
                </h1>
              </div>
              
              <div className="relative w-64 hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="text"
                  placeholder="Search articles..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Categories Grid (only visible if no category selected) */}
            {!selectedCategory && !searchQuery && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className="p-6 rounded-3xl bg-zinc-900 border border-white/5 hover:border-emerald-500/30 transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      {cat.icon}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{cat.name}</h3>
                    <p className="text-zinc-500 text-xs leading-relaxed">{cat.description}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Articles List */}
            <div className="space-y-4">
              {filteredArticles.map(art => (
                <button
                  key={art.id}
                  onClick={() => setSelectedArticle(art)}
                  className="w-full p-6 rounded-2xl bg-zinc-900/50 border border-white/5 hover:bg-zinc-900 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-bold text-zinc-400 capitalize">
                          {art.category.replace('-', ' ')}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white group-hover:text-emerald-500 transition-colors">{art.title}</h3>
                      <p className="text-zinc-500 text-sm mt-1">{art.excerpt}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              ))}
              {filteredArticles.length === 0 && (
                <div className="text-center py-20">
                  <HelpCircle className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                  <p className="text-zinc-500">No articles found matching your search.</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="article"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="prose prose-invert max-w-none"
          >
            <button 
              onClick={() => setSelectedArticle(null)}
              className="mb-8 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to articles
            </button>

            <article className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8 md:p-12">
              <div className="flex items-center gap-2 mb-6">
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                  {selectedArticle.category.replace('-', ' ')}
                </div>
                <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">
                  Last Updated: April 2026
                </div>
              </div>

              <div className="whitespace-pre-line text-zinc-300 leading-relaxed">
                {selectedArticle.content.split('\n').map((line, i) => {
                  if (line.trim().startsWith('# ')) {
                    return <h1 key={i} className="text-3xl font-black text-white mb-6 mt-2">{line.replace('# ', '')}</h1>;
                  }
                  if (line.trim().startsWith('## ')) {
                    return <h2 key={i} className="text-xl font-bold text-white mb-4 mt-8">{line.replace('## ', '')}</h2>;
                  }
                  if (line.trim().startsWith('* ')) {
                    return (
                      <div key={i} className="flex gap-3 mb-2 ml-4">
                        <div className="size-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                        <span className="text-zinc-400 text-sm">{line.replace('* ', '')}</span>
                      </div>
                    );
                  }
                  if (line.trim().match(/^\d\./)) {
                    return (
                      <div key={i} className="flex gap-3 mb-4 ml-4">
                        <span className="text-emerald-500 font-black text-sm">{line.split('.')[0]}.</span>
                        <span className="text-zinc-400 text-sm">{line.split('.').slice(1).join('.').trim()}</span>
                      </div>
                    );
                  }
                  return <p key={i} className="mb-4 text-sm md:text-base">{line}</p>;
                })}
              </div>

              <div className="mt-12 pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className={`size-10 rounded-full flex items-center justify-center transition-colors ${
                    feedbackStatus[selectedArticle.id] === 'submitted' ? 'bg-emerald-500/20' : 'bg-zinc-800'
                  }`}>
                    {feedbackStatus[selectedArticle.id] === 'submitted' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <MessageSquare className="w-5 h-5 text-zinc-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {feedbackStatus[selectedArticle.id] === 'submitted' ? 'Thank you for your feedback!' : 'Was this helpful?'}
                    </h4>
                    <p className="text-xs text-zinc-500">
                      {feedbackStatus[selectedArticle.id] === 'submitted' ? 'We use your input to improve our guides.' : 'Your feedback helps us improve.'}
                    </p>
                  </div>
                </div>
                
                <AnimatePresence mode="wait">
                  {feedbackStatus[selectedArticle.id] !== 'submitted' ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <button 
                        onClick={() => setShowCommentModal(true)}
                        disabled={feedbackStatus[selectedArticle.id] === 'submitting'}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all font-bold text-xs disabled:opacity-50"
                      >
                        <ThumbsUp className="w-4 h-4 text-emerald-500" />
                        Yes
                      </button>
                      <button 
                        onClick={() => setShowCommentModal(false)}
                        disabled={feedbackStatus[selectedArticle.id] === 'submitting'}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all font-bold text-xs disabled:opacity-50"
                      >
                        <ThumbsDown className="w-4 h-4 text-rose-500" />
                        No
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="px-6 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold text-xs"
                    >
                      Feedback Received
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </article>

            {/* Comment Modal */}
            <AnimatePresence>
              {showCommentModal !== null && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowCommentModal(null)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 overflow-hidden shadow-2xl"
                  >
                    <div className="absolute top-0 right-0 p-6">
                      <button 
                        onClick={() => setShowCommentModal(null)}
                        className="p-2 rounded-xl hover:bg-white/5 transition-colors text-zinc-500"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4 mb-8">
                      <div className={`size-12 rounded-2xl flex items-center justify-center ${showCommentModal ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                        {showCommentModal ? (
                          <ThumbsUp className="w-6 h-6 text-emerald-500" />
                        ) : (
                          <ThumbsDown className="w-6 h-6 text-rose-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Provide more detail</h3>
                        <p className="text-sm text-zinc-500">How can we make this article better for you?</p>
                      </div>
                    </div>

                    <textarea
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Write your suggestions here..."
                      className="w-full bg-zinc-950 border border-white/5 rounded-2xl p-6 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[160px] resize-none mb-6"
                    />

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowCommentModal(null)}
                        className="flex-1 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold text-white hover:bg-white/10 transition-all"
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => handleFeedback(showCommentModal!, feedbackComment)}
                        disabled={feedbackStatus[selectedArticle?.id || ''] === 'submitting'}
                        className="flex-[2] px-6 py-4 rounded-2xl bg-emerald-500 text-sm font-black text-black hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {feedbackStatus[selectedArticle?.id || ''] === 'submitting' && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        Submit Feedback
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
