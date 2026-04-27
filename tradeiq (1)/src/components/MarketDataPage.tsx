import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Globe, 
  Zap, 
  Lock, 
  Loader2, 
  RefreshCcw,
  Activity,
  Flame,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react';
import { fetchForexData } from '../services/forexService';

interface MarketDataPageProps {
  isPro: boolean;
  onUpgrade: () => void;
  onNavigateToAnalyzer?: () => void;
}

interface SentimentItem {
  pair: string;
  sentiment: number;
  trend: 'Bullish' | 'Bearish';
  price?: number;
  change24h?: number;
  history: number[];
  error?: boolean;
  category: 'Forex' | 'Indices' | 'Crypto' | 'Commodities';
}

interface OrderFlowItem {
  level: string;
  type: 'Buy Wall' | 'Sell Wall';
  volume: string;
  strength: number;
}

const CATEGORIES = ['All', 'Forex', 'Indices', 'Commodities', 'Crypto'] as const;

// Minimal Sparkline Component
const Sparkline = ({ data, trend }: { data: number[], trend: 'Bullish' | 'Bearish' }) => {
  if (!data || data.length < 2) return <div className="w-16 h-8 bg-slate-50 animate-pulse rounded" />;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 30;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={trend === 'Bullish' ? '#10b981' : '#ef4444'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

export default function MarketDataPage({ isPro, onUpgrade, onNavigateToAnalyzer }: MarketDataPageProps) {
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[number]>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentData, setSentimentData] = useState<SentimentItem[]>([
    { pair: 'EUR/USD', sentiment: 65, trend: 'Bullish', category: 'Forex', history: [1.082, 1.084, 1.083, 1.085, 1.086, 1.085], change24h: 0.25 },
    { pair: 'GBP/USD', sentiment: 42, trend: 'Bearish', category: 'Forex', history: [1.268, 1.265, 1.266, 1.264, 1.262, 1.263], change24h: -0.12 },
    { pair: 'USD/JPY', sentiment: 58, trend: 'Bullish', category: 'Forex', history: [149.5, 149.8, 150.1, 150.3, 150.2, 150.5], change24h: 0.45 },
    { pair: 'NAS100', sentiment: 72, trend: 'Bullish', category: 'Indices', history: [17800, 17900, 17850, 18000, 18100, 18150], change24h: 1.15 },
    { pair: 'XAU/USD', sentiment: 48, trend: 'Bearish', category: 'Commodities', history: [2250, 2240, 2245, 2235, 2230, 2232], change24h: -0.32 },
    { pair: 'BTC/USD', sentiment: 81, trend: 'Bullish', category: 'Crypto', history: [65000, 67000, 66000, 69000, 71000, 70500], change24h: 5.4 },
    { pair: 'ETH/USD', sentiment: 68, trend: 'Bullish', category: 'Crypto', history: [3400, 3500, 3450, 3600, 3750, 3700], change24h: 3.2 },
    { pair: 'USD/CAD', sentiment: 35, trend: 'Bearish', category: 'Forex', history: [1.358, 1.356, 1.357, 1.355, 1.353, 1.354], change24h: -0.08 },
  ]);

  const [orderFlowData, setOrderFlowData] = useState<OrderFlowItem[]>([
    { level: '1.0920', type: 'Buy Wall', volume: '450M', strength: 4 },
    { level: '1.0950', type: 'Sell Wall', volume: '380M', strength: 3 },
    { level: '1.0880', type: 'Buy Wall', volume: '620M', strength: 5 },
    { level: '2280.50', type: 'Sell Wall', volume: '110k oz', strength: 4 },
    { level: '72500.00', type: 'Sell Wall', volume: '840 BTC', strength: 5 },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [volatility, setVolatility] = useState(65);

  const updateMarketData = async () => {
    if (!isPro) return;
    
    setIsLoading(true);
    try {
      const updatedSentiment = await Promise.all(
        sentimentData.map(async (item) => {
          try {
            const data = await fetchForexData(item.pair);
            const sentimentChange = (Math.random() - 0.5) * 4;
            const newSentiment = Math.max(10, Math.min(90, item.sentiment + sentimentChange));
            
            // Update history
            const newPrice = data.current_price;
            const newHistory = [...item.history.slice(1), newPrice];
            
            return {
              ...item,
              price: newPrice,
              sentiment: Math.round(newSentiment),
              trend: newSentiment > 50 ? 'Bullish' : 'Bearish' as 'Bullish' | 'Bearish',
              history: newHistory,
              change24h: item.price ? ((newPrice - item.price) / item.price) * 100 : item.change24h,
              error: !!data.is_stale || !!data.error
            };
          } catch (err) {
            return { ...item };
          }
        })
      );
      
      setSentimentData(updatedSentiment);
      setVolatility(Math.round(50 + Math.random() * 30));
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error updating market data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isPro) {
      updateMarketData();
      const interval = setInterval(updateMarketData, 10000); // 10 second refresh for real-time feel
      return () => clearInterval(interval);
    }
  }, [isPro]);

  const filteredData = sentimentData.filter(item => {
    const matchesSearch = item.pair.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  if (!isPro) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 bg-slate-50 rounded-[3rem] p-12 border border-slate-100 shadow-inner">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-slate-900 shadow-2xl shadow-slate-200 border border-slate-50"
        >
          <Lock size={44} />
        </motion.div>
        <div className="max-w-md space-y-3">
          <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Pro Market Intelligence</h2>
          <p className="text-slate-500 font-medium italic leading-relaxed">
            Access institutional-grade liquidity maps, AI sentiment analysis with sparklines, and unified cross-asset volatility metrics.
          </p>
        </div>
        <button
          onClick={onUpgrade}
          className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-2xl shadow-slate-200 flex items-center gap-3 active:scale-95"
        >
          <Zap size={18} />
          Lock in Elite Access
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Volatility Meter */}
      <div className="flex flex-col xl:flex-row gap-6 justify-between items-start">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-3">
            <Globe className="text-slate-900" />
            Market Intelligence
          </h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Real-time Institutional Data Feed</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
          <div className="flex-1 min-w-[200px] h-20 card-base p-4 flex items-center gap-4 bg-slate-900 text-white border-none">
            <div className={`p-2 rounded-xl flex items-center justify-center ${volatility > 70 ? 'bg-rose-500' : volatility > 40 ? 'bg-amber-500' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'}`}>
              <Activity size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black uppercase tracking-tighter opacity-70 italic font-mono">Volatility Index</span>
                <span className="text-sm font-black italic">{volatility}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${volatility}%` }}
                  className={`h-full ${volatility > 70 ? 'bg-rose-500' : volatility > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                />
              </div>
            </div>
          </div>
          
          <div className="card-base p-4 flex items-center gap-3 h-20">
             <div className="text-right">
                <div className="flex items-center gap-2 justify-end text-emerald-500">
                  {isLoading ? <Loader2 size={12} className="animate-spin" /> : <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                  <span className="text-[10px] font-black uppercase tracking-wider italic font-mono">Live Sync</span>
                </div>
                <div className="text-xs font-bold text-slate-900 font-mono mt-1">{lastUpdate.toLocaleTimeString()}</div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Next scan: 10s</div>
             </div>
             <button 
              onClick={updateMarketData}
              disabled={isLoading}
              className="p-3 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl transition-all border border-slate-100"
             >
                <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
             </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Sentiment Dashboard */}
        <div className="xl:col-span-2 space-y-6">
          <div className="card-base p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      activeCategory === cat 
                        ? 'bg-slate-900 text-white shadow-lg' 
                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search assets..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-xs font-bold font-mono w-full md:w-64"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="hidden md:grid grid-cols-12 px-4 py-3 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] border-b border-slate-50">
                <div className="col-span-12 md:col-span-4">Asset / Category</div>
                <div className="hidden md:block col-span-3 text-center">AI Sentiment</div>
                <div className="hidden md:block col-span-3 text-center">Trend (30m)</div>
                <div className="hidden md:block col-span-2 text-right">Action</div>
              </div>
              <AnimatePresence mode="popLayout">
                {filteredData.map((item) => (
                  <motion.div 
                    layout
                    key={item.pair}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex flex-col md:grid md:grid-cols-12 items-center gap-4 md:gap-0 px-4 py-5 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100 group"
                  >
                    <div className="w-full md:col-span-4 flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${item.trend === 'Bullish' ? 'bg-emerald-50 text-emerald-500 border border-emerald-100' : 'bg-rose-50 text-rose-500 border border-rose-100'} transition-colors`}>
                        {item.trend === 'Bullish' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                      </div>
                      <div className="flex-1">
                        <div className="font-black text-slate-900 tracking-tight italic text-base uppercase">{item.pair}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</span>
                          <span className={`text-[10px] font-mono font-bold ${item.change24h! > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {item.change24h! > 0 ? '+' : ''}{item.change24h?.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                      <div className="md:hidden">
                        <button className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                          Trade
                        </button>
                      </div>
                    </div>

                    <div className="w-full md:col-span-3 px-0 md:px-4">
                      <div className="flex justify-between items-center mb-2">
                         <span className="text-[10px] font-black text-slate-500 italic">{item.sentiment}%</span>
                         <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${item.sentiment > 70 ? 'bg-emerald-500 text-white' : item.sentiment < 30 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                           {item.sentiment > 70 ? 'Ext. Bull' : item.sentiment < 30 ? 'Ext. Bear' : 'Neutral'}
                         </span>
                      </div>
                      <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                        <motion.div 
                          className={`h-full ${item.trend === 'Bullish' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${item.sentiment}%` }}
                        />
                      </div>
                    </div>

                    <div className="hidden md:flex col-span-3 justify-center">
                      <Sparkline data={item.history} trend={item.trend} />
                    </div>

                    <div className="hidden md:flex col-span-2 justify-end">
                       <button className="p-2 text-slate-200 hover:text-slate-900 opacity-0 group-hover:opacity-100 transition-all">
                          <Info size={18} />
                       </button>
                       <button className="px-3 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                          Trade
                       </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Column: Order Flow & Signals */}
        <div className="space-y-8">
           {/* Order Flow Liquidity Map */}
           <div className="card-base p-6 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                 <BarChart3 size={100} />
              </div>
              
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 border border-amber-100">
                    <Flame size={20} className="animate-bounce" />
                  </div>
                  <div>
                     <h3 className="font-black text-slate-900 uppercase tracking-tighter italic">Liquidity Heatmap</h3>
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Flow Level 2</span>
                  </div>
                </div>

                <div className="space-y-4">
                   {orderFlowData.map((order, i) => (
                     <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:shadow-md transition-all shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                           <span className="text-base font-black font-mono tracking-tighter italic text-slate-900">{order.level}</span>
                           <span className={`text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md ${order.type === 'Buy Wall' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                             {order.type}
                           </span>
                        </div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-bold text-slate-400 font-mono">Volume: {order.volume}</span>
                          <div className="flex gap-0.5">
                             {[1, 2, 3, 4, 5].map(s => (
                               <div key={s} className={`w-1 h-3 rounded-full ${s <= order.strength ? (order.type === 'Buy Wall' ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-slate-200'}`} />
                             ))}
                          </div>
                        </div>
                        <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${(order.strength / 5) * 100}%` }}
                             className={`h-full ${order.type === 'Buy Wall' ? 'bg-emerald-500' : 'bg-rose-500'} opacity-30 group-hover:opacity-100 transition-opacity`}
                           />
                        </div>
                     </div>
                   ))}
                </div>

                <div className="mt-8 p-4 bg-slate-900 rounded-2xl flex items-start gap-3 shadow-xl">
                   <Zap size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                   <p className="text-[9px] font-bold text-slate-300 uppercase leading-relaxed tracking-wide italic">
                     Institutional flows detected. Large limit orders (Walls) are concentrating at current key psychology levels.
                   </p>
                </div>
           </div>

           {/* Market Signal AI Card */}
           <div className="card-base bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-white border-none shadow-2xl relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full group-hover:scale-150 transition-transform duration-700" />
              
              <div className="flex items-center gap-3 mb-6 relative">
                 <div className="size-10 bg-emerald-500 rounded-xl flex items-center justify-center text-black">
                   <Activity size={20} />
                 </div>
                 <h3 className="font-black italic uppercase tracking-tighter text-lg">AI Signal Engine</h3>
              </div>

              <div className="space-y-4 relative">
                 <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Main Focus</span>
                    <span className="text-xs font-bold text-emerald-400 italic">XAU/USD (Gold)</span>
                 </div>
                 <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sentiment Shift</span>
                    <span className="text-xs font-bold text-rose-400 italic">+12% Bearish (H4)</span>
                 </div>
                 
                 <div className="pt-4 border-t border-white/10">
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-3 flex items-center gap-2">
                       <ArrowUpRight size={12} />
                       AI Recommendation
                    </div>
                    <p className="text-xs italic leading-relaxed text-slate-300">
                      Market volatility is peaking. Watch for liquidity sweeps above 2250.00. Institutional sell walls are building. 
                    </p>
                 </div>
              </div>

              <button 
                onClick={onNavigateToAnalyzer}
                className="w-full mt-8 py-4 bg-white text-slate-900 font-black uppercase tracking-[0.1em] text-[11px] rounded-2xl hover:bg-emerald-500 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/20"
              >
                 Full Analysis Report
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
