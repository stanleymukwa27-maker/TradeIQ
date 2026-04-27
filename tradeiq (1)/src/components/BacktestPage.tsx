import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  History, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Calendar,
  Settings2,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  DollarSign,
  Percent
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { fetchHistoricalData, HistoricalBar } from '../services/forexService';
import { runBacktest, BacktestStrategy, BacktestResult } from '../services/backtestService';

const STRATEGIES: BacktestStrategy[] = [
  { name: 'Trend Following (SMA 10/50)', type: 'Trend Following', indicators: ['SMA 10', 'SMA 50'] },
];

const CURRENCY_PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'USD/CHF', 'NZD/USD'
];

export default function BacktestPage() {
  const [pair, setPair] = useState('EUR/USD');
  const [strategy, setStrategy] = useState<BacktestStrategy>(STRATEGIES[0]);
  const [days, setDays] = useState(60);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunBacktest = async () => {
    setLoading(true);
    setError(null);
    try {
      const history = await fetchHistoricalData(pair, days);
      if (history.length < 50) {
        throw new Error('Not enough historical data for this strategy. SMA 50 requires at least 50 days of data.');
      }

      const backtestResult = runBacktest(strategy, history, pair);
      setResult(backtestResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run backtest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Strategy Backtesting</h1>
            <p className="text-gray-400 mt-1">Real data-driven simulation for Trend Following strategies.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <Info className="w-3.5 h-3.5" />
            REAL-TIME SIMULATION ENGINE
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#151619] border border-white/10 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-400 uppercase tracking-wider">
                <Settings2 className="w-4 h-4" />
                Configuration
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Currency Pair</label>
                  <select 
                    value={pair}
                    onChange={(e) => setPair(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                  >
                    {CURRENCY_PAIRS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Strategy</label>
                  <div className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm text-gray-400">
                    {strategy.name}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Time Period (Days)</label>
                  <input 
                    type="number"
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value) || 60)}
                    min="60"
                    max="365"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                  <p className="text-[10px] text-gray-500 mt-2">Min 60 days required for SMA 50.</p>
                </div>

                <button
                  onClick={handleRunBacktest}
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      Run Backtest
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{error}</p>
              </motion.div>
            )}
          </div>

          {/* Results Area */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {!result && !loading ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[400px] flex flex-col items-center justify-center text-center space-y-4 bg-[#151619]/50 border border-dashed border-white/10 rounded-3xl p-12"
                >
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-2">
                    <History className="w-8 h-8 text-gray-500" />
                  </div>
                  <h3 className="text-xl font-semibold">No Backtest Results</h3>
                  <p className="text-gray-400 max-w-md">
                    Configure your strategy and click "Run Backtest" to see how it would have performed in the past.
                  </p>
                </motion.div>
              ) : loading ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full min-h-[400px] flex flex-col items-center justify-center space-y-6 bg-[#151619]/50 border border-white/10 rounded-3xl p-12"
                >
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    <BarChart3 className="w-6 h-6 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold">Simulating Strategy...</h3>
                    <p className="text-gray-400 mt-1">Processing historical market data for {pair}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard 
                      label="Total Trades" 
                      value={result!.total_trades} 
                      icon={<History className="w-4 h-4" />} 
                    />
                    <StatCard 
                      label="Win Rate" 
                      value={`${result!.win_rate}%`} 
                      icon={<CheckCircle2 className="w-4 h-4" />}
                      color={result!.win_rate >= 50 ? 'text-emerald-500' : 'text-red-500'}
                    />
                    <StatCard 
                      label="Total Profit" 
                      value={`$${result!.total_profit}`} 
                      icon={<TrendingUp className="w-4 h-4" />}
                      color={result!.total_profit >= 0 ? 'text-emerald-500' : 'text-red-500'}
                    />
                    <StatCard 
                      label="Max Drawdown" 
                      value={`${result!.max_drawdown}%`} 
                      icon={<TrendingDown className="w-4 h-4" />}
                      color="text-red-500"
                    />
                  </div>

                  {/* Equity Chart */}
                  <div className="bg-[#151619] border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2 font-semibold">
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                        Equity Growth
                      </div>
                      <div className="text-xs text-gray-500">
                        Initial Balance: $10,000
                      </div>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={result!.equity_growth}>
                          <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            stroke="#ffffff40" 
                            fontSize={10} 
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          />
                          <YAxis 
                            stroke="#ffffff40" 
                            fontSize={10} 
                            tickLine={false}
                            axisLine={false}
                            domain={['auto', 'auto']}
                            tickFormatter={(val) => `$${val}`}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#151619', border: '1px solid #ffffff10', borderRadius: '12px' }}
                            itemStyle={{ color: '#10b981' }}
                            labelStyle={{ color: '#ffffff60', fontSize: '12px', marginBottom: '4px' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="balance" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorBalance)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Trade History Table */}
                  <div className="bg-[#151619] border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold">
                        <BarChart3 className="w-5 h-5 text-emerald-500" />
                        Trade History
                      </div>
                      <div className="text-xs text-gray-500">
                        {result!.trades.length} trades simulated
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-black/20 text-[10px] uppercase tracking-wider text-gray-500">
                            <th className="px-6 py-4 font-medium">Type</th>
                            <th className="px-6 py-4 font-medium">Entry Date</th>
                            <th className="px-6 py-4 font-medium">Exit Date</th>
                            <th className="px-6 py-4 font-medium">Entry Price</th>
                            <th className="px-6 py-4 font-medium">Exit Price</th>
                            <th className="px-6 py-4 font-medium text-right">Profit/Loss</th>
                            <th className="px-6 py-4 font-medium text-right">Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {result!.trades.map((trade, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors group">
                              <td className="px-6 py-4">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                                  trade.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                }`}>
                                  {trade.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-300">{trade.entry_date}</td>
                              <td className="px-6 py-4 text-sm text-gray-300">{trade.exit_date}</td>
                              <td className="px-6 py-4 text-sm font-mono">{trade.entry_price.toFixed(5)}</td>
                              <td className="px-6 py-4 text-sm font-mono">{trade.exit_price.toFixed(5)}</td>
                              <td className={`px-6 py-4 text-sm font-mono text-right ${
                                trade.profit_loss >= 0 ? 'text-emerald-500' : 'text-red-500'
                              }`}>
                                {trade.profit_loss >= 0 ? '+' : ''}{trade.profit_loss}
                                <span className="text-[10px] ml-1 opacity-60">({trade.profit_percent}%)</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {trade.result === 'WIN' ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color = 'text-white' }: { 
  label: string; 
  value: string | number; 
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="bg-[#151619] border border-white/10 rounded-2xl p-5 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-bold ${color}`}>
        {value}
      </div>
    </div>
  );
}
