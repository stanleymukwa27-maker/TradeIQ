import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Target, 
  ShieldAlert,
  Loader2,
  ChevronRight,
  ArrowRightLeft,
  Info,
  BarChart3,
  Globe,
  Zap,
  Layout,
  ImageIcon,
  Settings2,
  MousePointer2,
  ShieldCheck,
  HelpCircle,
  Activity,
  ArrowRight
} from 'lucide-react';
import { analyzeTrade } from '../services/geminiService';
import { fetchForexData, fetchHistoricalData } from '../services/forexService';
import { TradeRecord } from '../types';
import ChartAnalyzer from './ChartAnalyzer';

interface AnalyzerPageProps {
  onTradeAnalyzed: (trade: TradeRecord) => Promise<void>;
  isPro: boolean;
  userId: string;
  onNavigateToSubscription: () => void;
  trades: TradeRecord[];
}

const TIMEFRAMES = ['5m', '10m', 'M15', 'M30', 'H1', 'H4', 'D1'];

export default function AnalyzerPage({ onTradeAnalyzed, isPro, userId, onNavigateToSubscription, trades }: AnalyzerPageProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'chart'>('manual');
  const [analysisMode, setAnalysisMode] = useState<'manual' | 'ai'>('manual');
  
  const [form, setForm] = useState({
    currency_pair: 'EUR/USD',
    direction: 'BUY' as 'BUY' | 'SELL',
    entry_price: '',
    stop_loss: '',
    take_profit: '',
    timeframe: 'H1',
  });
  const [analysis, setAnalysis] = useState<TradeRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [priceError, setPriceError] = useState<boolean>(false);

  const performanceSummary = React.useMemo(() => {
    const completed = trades.filter(t => t.trade_result && t.trade_result !== 'Pending');
    if (completed.length === 0) return undefined;

    const buyTrades = completed.filter(t => t.recommendation === 'BUY');
    const buyWinRate = buyTrades.length > 0 ? (buyTrades.filter(t => t.trade_result === 'Win').length / buyTrades.length) * 100 : 0;

    const sellTrades = completed.filter(t => t.recommendation === 'SELL');
    const sellWinRate = sellTrades.length > 0 ? (sellTrades.filter(t => t.trade_result === 'Win').length / sellTrades.length) * 100 : 0;

    return `User's historical performance: BUY win rate ${buyWinRate.toFixed(0)}%, SELL win rate ${sellWinRate.toFixed(0)}%.`;
  }, [trades]);

  const isJPY = form.currency_pair.toUpperCase().includes('JPY');
  const pipValue = isJPY ? 0.01 : 0.0001;

  const calculatePips = (price1: number, price2: number) => {
    if (!price1 || !price2) return 0;
    const diff = Math.abs(price1 - price2);
    return Math.round(diff / pipValue);
  };

  // Update form when AI mode is selected
  React.useEffect(() => {
    if (analysisMode === 'ai') {
      setForm(prev => ({
        ...prev,
        entry_price: '',
        stop_loss: '',
        take_profit: ''
      }));
    }
  }, [analysisMode]);

  const validateForm = () => {
    if (analysisMode === 'ai') return {}; // No validation needed for AI mode as it generates the setup

    const errors: Record<string, string> = {};
    const entry = parseFloat(form.entry_price);
    const sl = parseFloat(form.stop_loss);
    const tp = parseFloat(form.take_profit);

    if (isNaN(entry)) errors.entry_price = 'Invalid entry price';
    if (isNaN(sl)) errors.stop_loss = 'Invalid stop loss';
    if (isNaN(tp)) errors.take_profit = 'Invalid take profit';

    if (Object.keys(errors).length > 0) return errors;

    // 1. Directional consistency
    if (form.direction === 'BUY') {
      if (tp <= entry) errors.take_profit = 'Take Profit must be above entry for BUY';
      if (sl >= entry) errors.stop_loss = 'Stop Loss must be below entry for BUY';
    } else {
      if (tp >= entry) errors.take_profit = 'Take Profit must be below entry for SELL';
      if (sl <= entry) errors.stop_loss = 'Stop Loss must be above entry for SELL';
    }

    if (Object.keys(errors).length > 0) return errors;

    // 2. Entry vs Live Price
    if (livePrice && livePrice !== 1.0) {
      const diffPips = calculatePips(entry, livePrice);
      if (diffPips > 500) {
        errors.entry_price = `Entry price is too far from market (${diffPips} pips). Max 500 pips allowed.`;
      }
    }

    // 3. Unrealistic setups
    const slPips = calculatePips(entry, sl);
    const tpPips = calculatePips(entry, tp);

    if (slPips > 300) errors.stop_loss = 'Stop loss is too wide (>300 pips)';
    if (tpPips > 1000) errors.take_profit = 'Take profit is unrealistic (>1000 pips)';
    if (slPips < 10) errors.stop_loss = 'Stop loss is too tight (<10 pips).';

    // 4. Risk/Reward
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(entry - tp);
    
    if (risk === 0) {
      errors.stop_loss = 'Stop loss cannot be equal to entry price';
    } else {
      const rr = reward / risk;
      if (rr < 1.5) {
        errors.take_profit = `Risk/Reward is ${rr.toFixed(2)}. Minimum 1.5 required.`;
      }
    }

    return errors;
  };

  // Live price tracking
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const updatePrice = async () => {
      try {
        const data = await fetchForexData(form.currency_pair);
        setLivePrice(data.current_price);
        setPriceError(!!data.is_stale || !!data.error);
      } catch (err) {
        console.error('Error fetching live price:', err);
        setPriceError(true);
      }
    };

    updatePrice();
    interval = setInterval(updatePrice, 10000); // 10 second refresh for real-time analysis data

    return () => clearInterval(interval);
  }, [form.currency_pair]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setError('Please fix the highlighted errors before analyzing.');
      return;
    }

    setValidationErrors({});
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Fetch real-time market data first
      const marketData = await fetchForexData(form.currency_pair);

      // 2. Run AI analysis with market data and performance summary
      const result = await analyzeTrade({
        currency_pair: form.currency_pair,
        direction: form.direction,
        entry_price: analysisMode === 'manual' ? parseFloat(form.entry_price) : undefined,
        stop_loss: analysisMode === 'manual' ? parseFloat(form.stop_loss) : undefined,
        take_profit: analysisMode === 'manual' ? parseFloat(form.take_profit) : undefined,
        timeframe: form.timeframe,
        marketData,
        performanceSummary,
        isAiSignalMode: analysisMode === 'ai'
      });
      
      const record: TradeRecord = {
        ...result,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        currency_pair: form.currency_pair,
        entry_price: result.entry_price || parseFloat(form.entry_price),
        stop_loss: result.stop_loss || parseFloat(form.stop_loss),
        take_profit: result.take_profit || parseFloat(form.take_profit),
        timeframe: form.timeframe,
        userId: userId,
      };
      
      setAnalysis(record);
      await onTradeAnalyzed(record);
      setSuccess(analysisMode === 'ai' ? 'AI Signal generated and saved!' : 'Trade analyzed and saved to journal!');
    } catch (err) {
      setError('Failed to analyze trade. Please check your inputs and try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getRecommendationIcon = (rec: string, signal?: string) => {
    if (signal?.includes('BUY') || rec.includes('BUY')) return <TrendingUp className="w-5 h-5 text-emerald-500" />;
    if (signal?.includes('SELL') || rec.includes('SELL')) return <TrendingDown className="w-5 h-5 text-rose-500" />;
    if (signal?.includes('WAIT') || rec.includes('WAIT')) return <Clock className="w-5 h-5 text-amber-500" />;
    if (rec === 'AVOID') return <AlertCircle className="w-5 h-5 text-slate-400" />;
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Tab Switcher */}
      <div className="grid grid-cols-2 sm:flex sm:items-center p-1 bg-slate-100 rounded-2xl sm:w-fit animate-in fade-in slide-in-from-top-4 duration-500">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-6 py-2.5 rounded-xl text-[11px] sm:text-sm font-bold transition-all ${
            activeTab === 'manual' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layout className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Manual
        </button>
        <button
          onClick={() => setActiveTab('chart')}
          className={`flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-6 py-2.5 rounded-xl text-[11px] sm:text-sm font-bold transition-all ${
            activeTab === 'chart' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Chart
          {!isPro && <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'manual' ? (
          <motion.div
            key="manual"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            <section className="lg:col-span-4 lg:sticky lg:top-24 h-fit">
              <div className="bg-white border border-slate-100 rounded-3xl p-7 shadow-2xl shadow-slate-200/50">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <Settings2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Trade Setup</h2>
                  </div>
                  
                  <div className="bg-slate-50 p-1 rounded-xl flex items-center gap-1 border border-slate-100">
                    <button
                      onClick={() => setAnalysisMode('manual')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                        analysisMode === 'manual' 
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-100' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Manual
                    </button>
                    <button
                      onClick={() => setAnalysisMode('ai')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                        analysisMode === 'ai' 
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-100' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      AI Signal
                    </button>
                  </div>
                </div>
                
                <form onSubmit={handleAnalyze} className="space-y-6">
                  {/* Market Price Indicator */}
                  <div className="flex items-center justify-between px-1 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Market Price</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-black text-emerald-600 tabular-nums">
                        {livePrice ? livePrice.toFixed(4) : "1.1720"}
                      </span>
                      {livePrice && (
                        <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">
                          Live
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Asset for Analysis</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={form.currency_pair}
                          readOnly
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-5 py-4 text-slate-900 font-bold tracking-wide focus:outline-none"
                        />
                      </div>
                    </div>

                    {analysisMode === 'manual' ? (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Timeframe</label>
                            <div className="relative">
                              <select
                                value={form.timeframe}
                                onChange={e => setForm({ ...form, timeframe: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-slate-900 font-bold appearance-none focus:outline-none"
                              >
                                {TIMEFRAMES.map(tf => <option key={tf}>{tf}</option>)}
                              </select>
                              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90" size={14} />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Entry Price</label>
                            <input
                              type="number"
                              step="0.0001"
                              placeholder="1.0820"
                              value={form.entry_price}
                              onChange={e => setForm({ ...form, entry_price: e.target.value })}
                              className={`w-full bg-slate-50 border rounded-xl px-4 py-3.5 text-slate-900 font-bold placeholder:text-slate-300 focus:outline-none transition-all shadow-sm ${validationErrors.entry_price ? 'border-rose-500' : 'border-slate-100'}`}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Stop Loss</label>
                            <input
                              type="number"
                              step="0.0001"
                              placeholder="1.0790"
                              value={form.stop_loss}
                              onChange={e => setForm({ ...form, stop_loss: e.target.value })}
                              className={`w-full bg-slate-50 border rounded-xl px-4 py-3.5 text-slate-900 font-bold placeholder:text-slate-300 focus:outline-none transition-all shadow-sm ${validationErrors.stop_loss ? 'border-rose-500' : 'border-slate-100'}`}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Take Profit</label>
                            <input
                              type="number"
                              step="0.0001"
                              placeholder="1.0880"
                              value={form.take_profit}
                              onChange={e => setForm({ ...form, take_profit: e.target.value })}
                              className={`w-full bg-slate-50 border rounded-xl px-4 py-3.5 text-slate-900 font-bold placeholder:text-slate-300 focus:outline-none transition-all shadow-sm ${validationErrors.take_profit ? 'border-emerald-500' : 'border-slate-100'}`}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="p-6 bg-emerald-50/30 border border-emerald-100 rounded-2xl text-center space-y-3">
                        <Zap className="w-8 h-8 text-emerald-500 mx-auto animate-pulse" />
                        <div className="space-y-1">
                          <p className="text-xs font-black text-emerald-800 uppercase tracking-widest">Neural Mode Active</p>
                          <p className="text-[10px] text-emerald-600 font-bold leading-relaxed">AI will automatically detect direction, trend strength, and generate the optimal trade setup.</p>
                        </div>
                        <div className="pt-2">
                          <select
                            value={form.timeframe}
                            onChange={e => setForm({ ...form, timeframe: e.target.value })}
                            className="w-full bg-white border border-emerald-200 rounded-xl px-4 py-3 text-emerald-600 font-bold appearance-none focus:outline-none text-xs text-center"
                          >
                            {TIMEFRAMES.map(tf => <option key={tf}>{tf}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full font-black py-5 rounded-2xl transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-3 text-lg mt-4 group ${
                      analysisMode === 'ai' 
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' 
                        : 'bg-slate-900 hover:bg-black shadow-slate-200'
                    } text-white`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-white" />
                    ) : (
                      <>
                        {analysisMode === 'ai' ? 'Generate AI Signal' : 'Analyze Setup'}
                        <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

              </div>
            </section>

            <section className="lg:col-span-8">
              <AnimatePresence mode="wait">
                {!analysis ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 rounded-3xl"
                  >
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <BarChart3 className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900">Ready for Analysis</h3>
                    <p className="text-slate-500 max-w-xs mt-2">
                      Enter your trade parameters and click "Run Analysis" to get AI-powered insights.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="card-base p-6 sm:p-8 space-y-8">
                      {/* TOP SECTION: Primary Info */}
                      <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-around gap-8 sm:gap-12">
                        {/* Trade Score */}
                        <div className="flex flex-col items-center text-center gap-4">
                          <div className="relative">
                            <svg className="w-24 h-24 sm:w-32 sm:h-32 transform -rotate-90" viewBox="0 0 128 128">
                              <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                              <circle 
                                cx="64" 
                                cy="64" 
                                r="60" 
                                stroke="currentColor" 
                                strokeWidth="10" 
                                fill="transparent" 
                                strokeDasharray={377} 
                                strokeDashoffset={isNaN(Number(analysis.score)) ? 377 : 377 - (377 * Number(analysis.score)) / 100} 
                                className={`${getScoreColor(Number(analysis.score) || 0)} transition-all duration-1000 ease-out`} 
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className={`text-2xl sm:text-4xl font-black ${getScoreColor(Number(analysis.score) || 0)}`}>{Number(analysis.score) || 0}</span>
                            </div>
                          </div>
                          <div>
                            <h3 className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Trade Score</h3>
                            <p className={`text-lg sm:text-xl font-bold ${getScoreColor(Number(analysis.score) || 0)}`}>
                              {(Number(analysis.score) || 0) >= 70 ? 'High Quality' : (Number(analysis.score) || 0) >= 50 ? 'Moderate' : 'Low Quality'}
                            </p>
                          </div>
                        </div>

                        {/* Execution Signal */}
                        <div className="flex flex-col items-center text-center gap-4">
                          <div className={`p-6 sm:p-8 rounded-3xl ${
                            analysis.execution_signal.includes('BUY') ? 'bg-emerald-50' : 
                            analysis.execution_signal.includes('SELL') ? 'bg-rose-50' : 
                            'bg-amber-50'
                          }`}>
                            {React.cloneElement(getRecommendationIcon(analysis.recommendation, analysis.execution_signal) as React.ReactElement, { className: "w-10 h-10 sm:w-14 sm:h-14" })}
                          </div>
                          <div>
                            <h3 className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Execution Signal</h3>
                            <p className="text-lg sm:text-2xl font-black text-slate-900">{analysis.execution_signal}</p>
                          </div>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-px w-full bg-slate-100" />

                      {/* BOTTOM SECTION: Secondary Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Trend Score */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trend (25)</span>
                            <span className="text-xs font-black text-slate-900">{analysis.score_details?.trend_score || 0}/25</span>
                          </div>
                          <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${((analysis.score_details?.trend_score || 0) / 25) * 100}%` }}
                              className="h-full bg-indigo-500"
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium line-clamp-1">{analysis.trend}</p>
                        </div>

                        {/* S/R Score */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Levels (20)</span>
                            <span className="text-xs font-black text-slate-900">{analysis.score_details?.levels_score || 0}/20</span>
                          </div>
                          <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${((analysis.score_details?.levels_score || 0) / 20) * 100}%` }}
                              className="h-full bg-blue-500"
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium line-clamp-1 truncate">{analysis.market_condition}</p>
                        </div>

                        {/* Momentum Score */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Momentum (20)</span>
                            <span className="text-xs font-black text-slate-900">{analysis.score_details?.momentum_score || 0}/20</span>
                          </div>
                          <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${((analysis.score_details?.momentum_score || 0) / 20) * 100}%` }}
                              className="h-full bg-emerald-500"
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium line-clamp-1 truncate">{analysis.volatility} Volatility</p>
                        </div>

                        {/* Entry Score */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Confirmation (20)</span>
                            <span className="text-xs font-black text-slate-900">{analysis.score_details?.entry_score || 0}/20</span>
                          </div>
                          <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${((analysis.score_details?.entry_score || 0) / 20) * 100}%` }}
                              className="h-full bg-amber-500"
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium line-clamp-1 truncate">{analysis.execution_timing}</p>
                        </div>

                        {/* RR Score */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Risk/Reward (15)</span>
                            <span className="text-xs font-black text-slate-900">{analysis.score_details?.rr_score || 0}/15</span>
                          </div>
                          <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${((analysis.score_details?.rr_score || 0) / 15) * 100}%` }}
                              className="h-full bg-rose-500"
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium line-clamp-1 truncate">{analysis.risk_reward}</p>
                        </div>

                        {/* Session Info */}
                        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Market Session</span>
                            <Globe className="w-3 h-3 text-emerald-400" />
                          </div>
                          <p className="text-sm font-black text-white">{analysis.session}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Optimization Active</p>
                        </div>
                      </div>

                      {/* Trade Setup Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="card-base p-4 border-slate-100 bg-white shadow-sm">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Asset</p>
                          <p className="text-sm font-black text-slate-900">{analysis.currency_pair}</p>
                        </div>
                        <div className="card-base p-4 border-slate-100 bg-white shadow-sm">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Entry</p>
                          <p className="text-sm font-black text-slate-900 font-mono italic">{analysis.entry_price.toFixed(5)}</p>
                        </div>
                        <div className="card-base p-4 border-rose-100 bg-rose-50/20 shadow-sm">
                          <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1.5">Stop Loss</p>
                          <p className="text-sm font-black text-rose-600 font-mono italic">{analysis.stop_loss.toFixed(5)}</p>
                        </div>
                        <div className="card-base p-4 border-emerald-100 bg-emerald-50/20 shadow-sm">
                          <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1.5">Take Profit</p>
                          <p className="text-sm font-black text-emerald-600 font-mono italic">{analysis.take_profit.toFixed(5)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="card-base p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-indigo-50 rounded-lg"><ArrowRightLeft className="w-4 h-4 text-indigo-500" /></div>
                          <h4 className="font-bold text-slate-900 text-sm italic uppercase">Neural Reasoning</h4>
                        </div>
                        <p className="text-slate-600 text-[13px] leading-relaxed font-medium">{analysis.reasoning}</p>
                      </div>

                      <div className="card-base p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-emerald-50 rounded-lg"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>
                          <h4 className="font-bold text-slate-900 text-sm italic uppercase">Market Context</h4>
                        </div>
                        <ul className="space-y-3">
                          {analysis.analysis_notes.slice(0, 4).map((note, i) => (
                            <li key={i} className="flex items-start gap-2 text-[12px] text-slate-600 font-medium">
                              <div className="w-1 h-1 rounded-full bg-emerald-400 mt-2 shrink-0" />
                              {note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>


                    <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-slate-200">
                      <h4 className="text-lg font-black mb-4 flex items-center gap-2 italic">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        STRATEGIC ANALYSIS
                      </h4>
                      
                      <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-sm text-slate-300 leading-relaxed">
                          <span className="text-emerald-400 font-bold uppercase text-[10px] block mb-1 tracking-widest">Execution Reasoning:</span>
                          {analysis.reasoning}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">
                          Current Price Estimate: <span className="text-white font-mono">{analysis.current_price_estimate}</span>
                        </p>
                      </div>

                      <ul className="space-y-4">
                        {analysis.analysis_notes.map((note, i) => (
                          <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex items-start gap-3 text-slate-300 text-sm leading-relaxed font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                            {note}
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </motion.div>
        ) : (
          <motion.div
            key="chart"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ChartAnalyzer 
              isPro={isPro} 
              onNavigateToSubscription={onNavigateToSubscription} 
              onTradeAnalyzed={async (trade) => {
                await onTradeAnalyzed(trade);
                setSuccess('Chart analysis saved to journal!');
              }}
              userId={userId}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
