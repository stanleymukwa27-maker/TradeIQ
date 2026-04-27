import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertCircle, 
  Target, 
  ShieldAlert,
  ArrowUpRight,
  Calendar,
  Zap,
  ChevronRight,
  BarChart3,
  Globe,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react';
import { TradeRecord } from '../types';

interface ProJournalProps {
  trades: TradeRecord[];
  onNavigateToAnalyzer: () => void;
  onUpdateTradeResult: (tradeId: string, result: 'Win' | 'Loss' | 'Break-even') => void;
}

const TIMEFRAMES = ['All', 'M5', 'M10', 'M15', 'M30', 'H1', 'H4', 'D1'];
const RECOMMENDATIONS = ['All', 'BUY', 'SELL', 'WAIT', 'AVOID'];
const TRENDS = ['All', 'Bullish', 'Bearish', 'Ranging'];
const SESSIONS = ['All', 'London', 'New York', 'Asian', 'Unknown'];

export default function ProJournal({ trades, onNavigateToAnalyzer, onUpdateTradeResult }: ProJournalProps) {
  const [search, setSearch] = useState('');
  const [filterRec, setFilterRec] = useState('All');
  const [filterTimeframe, setFilterTimeframe] = useState('All');
  const [filterTrend, setFilterTrend] = useState('All');
  const [filterSession, setFilterSession] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Calculate Stats
  const stats = useMemo(() => {
    if (trades.length === 0) return { total: 0, avgScore: 0, buy: 0, sell: 0, wait: 0, avoid: 0, winRate: 0 };
    
    const total = trades.length;
    const avgScore = Math.round(trades.reduce((acc, t) => acc + t.score, 0) / total);
    const buy = trades.filter(t => t.recommendation === 'BUY').length;
    const sell = trades.filter(t => t.recommendation === 'SELL').length;
    const wait = trades.filter(t => t.recommendation === 'WAIT').length;
    const avoid = trades.filter(t => t.recommendation === 'AVOID').length;

    const completedTrades = trades.filter(t => t.trade_result && t.trade_result !== 'Pending');
    const wins = completedTrades.filter(t => t.trade_result === 'Win').length;
    const winRate = completedTrades.length > 0 ? Math.round((wins / completedTrades.length) * 100) : 0;

    return { total, avgScore, buy, sell, wait, avoid, winRate };
  }, [trades]);

  // Performance Insights
  const insights = useMemo(() => {
    const completed = trades.filter(t => t.trade_result && t.trade_result !== 'Pending');
    if (completed.length === 0) return [];

    const buyTrades = completed.filter(t => t.recommendation === 'BUY');
    const buyWinRate = buyTrades.length > 0 ? Math.round((buyTrades.filter(t => t.trade_result === 'Win').length / buyTrades.length) * 100) : 0;

    const sellTrades = completed.filter(t => t.recommendation === 'SELL');
    const sellWinRate = sellTrades.length > 0 ? Math.round((sellTrades.filter(t => t.trade_result === 'Win').length / sellTrades.length) * 100) : 0;

    const timeframeStats = TIMEFRAMES.filter(tf => tf !== 'All').map(tf => {
      const tfTrades = completed.filter(t => t.timeframe === tf);
      const wr = tfTrades.length > 0 ? Math.round((tfTrades.filter(t => t.trade_result === 'Win').length / tfTrades.length) * 100) : 0;
      return { tf, wr, count: tfTrades.length };
    }).filter(s => s.count > 0).sort((a, b) => b.wr - a.wr);

    const bestTF = timeframeStats[0];

    const results = [];
    if (buyTrades.length > 0) results.push(`Your BUY trades win rate: ${buyWinRate}%`);
    if (sellTrades.length > 0) results.push(`Your SELL trades win rate: ${sellWinRate}%`);
    if (bestTF) results.push(`${bestTF.tf} trades perform best with ${bestTF.wr}% win rate`);

    return results;
  }, [trades]);

  // Filter Trades
  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      const matchesSearch = trade.currency_pair.toLowerCase().includes(search.toLowerCase());
      const matchesRec = filterRec === 'All' || trade.recommendation === filterRec;
      const matchesTimeframe = filterTimeframe === 'All' || trade.timeframe === filterTimeframe;
      const matchesTrend = filterTrend === 'All' || trade.trend === filterTrend;
      const matchesSession = filterSession === 'All' || trade.session === filterSession;
      return matchesSearch && matchesRec && matchesTimeframe && matchesTrend && matchesSession;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [trades, search, filterRec, filterTimeframe, filterTrend, filterSession]);

  const handleExport = () => {
    const headers = ['Date', 'Pair', 'Timeframe', 'Entry', 'SL', 'TP', 'Score', 'Recommendation', 'Confidence', 'Result'];
    const csvContent = [
      headers.join(','),
      ...filteredTrades.map(t => [
        new Date(t.timestamp).toLocaleString(),
        t.currency_pair,
        t.timeframe,
        t.entry_price,
        t.stop_loss,
        t.take_profit,
        t.score,
        t.recommendation,
        t.confidence,
        t.trade_result || 'Pending'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-iq-pro-journal-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 bg-emerald-50';
    if (score >= 60) return 'text-amber-500 bg-amber-50';
    return 'text-rose-500 bg-rose-50';
  };

  const getRecBadge = (rec: string) => {
    switch (rec) {
      case 'BUY': return 'bg-emerald-500 text-white';
      case 'SELL': return 'bg-rose-500 text-white';
      case 'WAIT': return 'bg-amber-500 text-white';
      case 'AVOID': return 'bg-slate-500 text-white';
      default: return 'bg-slate-200 text-slate-700';
    }
  };

  const getResultBadge = (result?: string) => {
    switch (result) {
      case 'Win': return 'bg-emerald-500 text-white';
      case 'Loss': return 'bg-rose-500 text-white';
      case 'Break-even': return 'bg-slate-500 text-white';
      default: return 'bg-amber-500 text-white';
    }
  };

  return (
    <div className="max-w-full mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 italic uppercase tracking-tighter">
            <Zap className="w-8 h-8 text-emerald-500" />
            Pro Journal
          </h1>
          <p className="text-slate-500 font-medium mt-1">Advanced trade tracking and AI insights</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={onNavigateToAnalyzer}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-slate-200"
          >
            <Plus className="w-4 h-4" />
            New Analysis
          </button>
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-base p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slate-50 rounded-lg">
              <BarChart3 className="w-4 h-4 text-slate-400" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Trades</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.total}</div>
        </div>
        <div className="card-base p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Target className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Win Rate</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.winRate}%</div>
        </div>
        <div className="card-base p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Buy / Sell</span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            <span className="text-emerald-500">{stats.buy}</span>
            <span className="text-slate-100 mx-2">/</span>
            <span className="text-rose-500">{stats.sell}</span>
          </div>
        </div>
        <div className="card-base p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wait / Avoid</span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            <span className="text-amber-500">{stats.wait}</span>
            <span className="text-slate-100 mx-2">/</span>
            <span className="text-slate-400">{stats.avoid}</span>
          </div>
        </div>
      </div>

      {/* Insights Section */}
      {insights.length > 0 && (
        <div className="card-base p-6 bg-emerald-50/50 border-emerald-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-slate-900 italic uppercase tracking-tight">Performance Insights</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-600">{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="card-base p-4 flex flex-col md:flex-row items-center gap-4 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search currency pairs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-slate-900 font-bold"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 min-w-[120px] md:w-32">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterRec}
              onChange={e => setFilterRec(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-[10px] font-black uppercase tracking-widest appearance-none text-slate-900"
            >
              {RECOMMENDATIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="relative flex-1 min-w-[120px] md:w-32">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterTimeframe}
              onChange={e => setFilterTimeframe(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-[10px] font-black uppercase tracking-widest appearance-none text-slate-900"
            >
              {TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
            </select>
          </div>
          <div className="relative flex-1 min-w-[120px] md:w-32">
            <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterTrend}
              onChange={e => setFilterTrend(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-[10px] font-black uppercase tracking-widest appearance-none text-slate-900"
            >
              {TRENDS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="relative flex-1 min-w-[120px] md:w-32">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterSession}
              onChange={e => setFilterSession(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-[10px] font-black uppercase tracking-widest appearance-none text-slate-900"
            >
              {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="hidden sm:flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Trade List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
        <AnimatePresence mode="popLayout">
          {filteredTrades.length > 0 ? (
            filteredTrades.map((trade) => (
              <motion.div
                key={trade.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="card-base overflow-hidden group hover:border-slate-300 transition-all shadow-sm hover:shadow-md"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">{trade.currency_pair}</h3>
                        <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[10px] font-black rounded uppercase tracking-widest border border-slate-100">
                          {trade.timeframe}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        <Calendar className="w-3 h-3" />
                        {new Date(trade.timestamp).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-2xl font-black text-lg ${getScoreColor(trade.score)} shadow-inner`}>
                      {trade.score}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Entry</div>
                      <div className="text-sm font-mono font-black text-slate-900">{trade.entry_price}</div>
                    </div>
                    <div className="p-3 bg-rose-50/50 rounded-2xl border border-rose-100">
                      <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Stop Loss</div>
                      <div className="text-sm font-mono font-black text-rose-600">{trade.stop_loss}</div>
                    </div>
                    <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                      <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Take Profit</div>
                      <div className="text-sm font-mono font-black text-emerald-600">{trade.take_profit}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getRecBadge(trade.recommendation)} shadow-sm`}>
                          {trade.recommendation}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-0.5">
                            <div className="relative w-8 h-8 mr-1">
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-50" strokeWidth="4" />
                                <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-900" strokeWidth="4" strokeDasharray="100" strokeDashoffset={100 - (trade.confidence_percentage || 0)} strokeLinecap="round" />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[7px] font-black">{trade.confidence_percentage}%</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{trade.confidence}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {trade.trade_result && trade.trade_result !== 'Pending' ? (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getResultBadge(trade.trade_result)} shadow-sm`}>
                            {trade.trade_result}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest animate-pulse italic">Pending</span>
                        )}
                      </div>
                    </div>

                    {(!trade.trade_result || trade.trade_result === 'Pending') && (
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <button 
                          onClick={() => onUpdateTradeResult(trade.id, 'Win')}
                          className="py-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                        >
                          Win
                        </button>
                        <button 
                          onClick={() => onUpdateTradeResult(trade.id, 'Loss')}
                          className="py-3 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                        >
                          Loss
                        </button>
                        <button 
                          onClick={() => onUpdateTradeResult(trade.id, 'Break-even')}
                          className="py-3 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                        >
                          B/E
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center card-base border-dashed"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Search className="w-8 h-8 text-slate-200" />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">No trades found</h3>
              <p className="text-slate-400 font-medium max-w-xs mx-auto mt-2">
                Try adjusting your filters or run a new analysis to populate your journal.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
