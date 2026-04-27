import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Image as ImageIcon, 
  X, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertCircle,
  Target,
  ShieldAlert,
  Zap,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { analyzeChartImage, ChartImageAnalysis } from '../services/geminiService';

interface ChartAnalyzerProps {
  isPro: boolean;
  onNavigateToSubscription: () => void;
  onTradeAnalyzed: (trade: any) => Promise<void>;
  userId: string;
}

const TIMEFRAMES = ['5m', '10m', 'M15', 'M30', 'H1', 'H4', 'D1'];

export default function ChartAnalyzer({ isPro, onNavigateToSubscription, onTradeAnalyzed, userId }: ChartAnalyzerProps) {
  const [currencyPair, setCurrencyPair] = useState('EUR/USD');
  const [timeframe, setTimeframe] = useState('H1');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [analysis, setAnalysis] = useState<ChartImageAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file (PNG/JPG).');
        return;
      }
      
      setMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setAnalysis(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Remove data:image/xxx;base64, prefix
      const base64Data = selectedImage.split(',')[1];
      const result = await analyzeChartImage(base64Data, mimeType, currencyPair, timeframe);
      
      // Map ChartImageAnalysis to a TradeRecord-like object for the journal
      // We must strictly follow the fields required by firestore.rules isValidTrade
      const record = {
        currency_pair: currencyPair,
        current_price: result.entry_price, // Use entry price as current price estimate for charts
        trend: result.trend.includes('Bullish') ? 'Bullish' : result.trend.includes('Bearish') ? 'Bearish' : 'Ranging',
        volatility: 'Medium',
        market_condition: result.market_structure || 'N/A',
        score: result.score,
        score_details: result.score_details,
        recommendation: result.recommendation,
        execution_signal: result.execution_signal || 'WAIT',
        entry_price: result.entry_price,
        stop_loss: result.stop_loss,
        take_profit: result.take_profit,
        risk_reward: result.risk_reward,
        execution_timing: result.execution_timing,
        time_window: 'N/A',
        expected_duration: 'N/A',
        session: 'Unknown',
        confidence: result.confidence,
        confidence_percentage: result.confidence_percentage,
        reasoning: result.reasoning,
        current_price_estimate: 'N/A',
        analysis_notes: [result.reasoning, result.support_resistance, result.market_structure].filter(Boolean),
        timestamp: new Date().toISOString(),
        userId: userId,
        timeframe: timeframe
      };

      setAnalysis(result);
      onTradeAnalyzed(record);
    } catch (err) {
      setError('Failed to analyze chart. Please try again with a clearer screenshot.');
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

  if (!isPro) {
    return (
      <div className="card-base p-12 flex flex-col items-center justify-center text-center shadow-2xl shadow-slate-200">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2 italic uppercase">Pro Feature: Chart Analysis</h3>
        <p className="text-slate-500 max-w-sm mb-8 font-medium">
          Upload your chart screenshots and let our AI identify trends, patterns, and key levels for you.
        </p>
        <button
          onClick={onNavigateToSubscription}
          className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200"
        >
          Upgrade to Pro to Unlock
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="card-base p-6 shadow-xl shadow-slate-100">
        <h2 className="text-lg font-black mb-6 flex items-center gap-2 text-slate-900 italic uppercase">
          <ImageIcon className="w-5 h-5 text-slate-400" />
          Chart Screenshot Analysis
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Currency Pair</label>
            <input
              type="text"
              value={currencyPair}
              onChange={e => setCurrencyPair(e.target.value.toUpperCase())}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-bold text-slate-900"
              placeholder="e.g. EUR/USD"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Timeframe</label>
            <select
              value={timeframe}
              onChange={e => setTimeframe(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-bold text-slate-900 appearance-none"
            >
              {TIMEFRAMES.map(tf => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
          </div>
        </div>

        {!selectedImage ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-100 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/10 transition-all group"
          >
            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-600 font-black uppercase tracking-tight">Click to upload chart screenshot</p>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Supports PNG, JPG (Max 5MB)</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden border border-slate-100 shadow-lg">
              <img src={selectedImage} alt="Chart Preview" className="w-full h-auto max-h-[400px] object-contain bg-white" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 p-2 bg-slate-900/50 text-white rounded-full hover:bg-slate-900 transition-all backdrop-blur-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="w-full bg-slate-900 text-white rounded-xl py-5 font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50 shadow-xl shadow-slate-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing Image...
                </>
              ) : (
                <>
                  Analyze Screenshot
                  <Zap className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}
      </div>

      <AnimatePresence>
        {analysis && (
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
                    <h3 className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Visual Score</h3>
                    <p className={`text-lg sm:text-xl font-bold ${getScoreColor(Number(analysis.score) || 0)}`}>
                      {(Number(analysis.score) || 0) >= 70 ? 'High Quality' : (Number(analysis.score) || 0) >= 50 ? 'Moderate' : 'Low Quality'}
                    </p>
                  </div>
                </div>

                {/* Execution Signal */}
                <div className="flex flex-col items-center text-center gap-4">
                  <div className={`p-6 sm:p-8 rounded-3xl ${
                    analysis.execution_signal?.includes('BUY') ? 'bg-emerald-50' : 
                    analysis.execution_signal?.includes('SELL') ? 'bg-rose-50' : 
                    'bg-amber-50'
                  }`}>
                    {React.cloneElement(getRecommendationIcon(analysis.recommendation, analysis.execution_signal) as React.ReactElement, { className: "w-10 h-10 sm:w-14 sm:h-14" })}
                  </div>
                  <div>
                    <h3 className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Execution Signal</h3>
                    <p className="text-lg sm:text-2xl font-black text-slate-900">{analysis.execution_signal || analysis.recommendation}</p>
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
                  <p className="text-[10px] text-slate-500 font-medium line-clamp-1 truncate">{analysis.support_resistance}</p>
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
                  <p className="text-[10px] text-slate-500 font-medium line-clamp-1 truncate">Market Velocity</p>
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

                {/* Confidence Info */}
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Analysis Confidence</span>
                    <Zap className="w-3 h-3 text-emerald-400" />
                  </div>
                  <p className="text-sm font-black text-white">{analysis.confidence_percentage}% {analysis.confidence}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Visual Guard Active</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="card-base p-4 border-slate-100 bg-white shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Asset</p>
                <p className="text-sm font-black text-slate-900">{currencyPair}</p>
              </div>
              <div className="card-base p-4 border-slate-100 bg-white shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Entry Estimate</p>
                <p className="text-sm font-black text-slate-900 font-mono italic">{analysis.entry_price}</p>
              </div>
              <div className="card-base p-4 border-rose-100 bg-rose-50/20 shadow-sm">
                <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1.5">Stop Loss</p>
                <p className="text-sm font-black text-rose-600 font-mono italic">{analysis.stop_loss}</p>
              </div>
              <div className="card-base p-4 border-emerald-100 bg-emerald-50/20 shadow-sm">
                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1.5">Take Profit</p>
                <p className="text-sm font-black text-emerald-600 font-mono italic">{analysis.take_profit}</p>
              </div>
            </div>

            <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-slate-200">
              <h4 className="text-lg font-black mb-4 flex items-center gap-2 italic uppercase">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Strategic Reasoning
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed mb-4 font-medium">
                {analysis.reasoning}
              </p>
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                <span className="px-3 py-1 bg-white/10 rounded-full text-emerald-400">Signal: {analysis.execution_signal}</span>
                <span className="px-3 py-1 bg-white/10 rounded-full text-slate-400">Structure: {analysis.market_structure}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
