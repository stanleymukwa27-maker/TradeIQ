import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  ArrowUpRight
} from 'lucide-react';
import { TradeRecord } from '../types';

interface BasicJournalProps {
  trades: TradeRecord[];
  onNavigateToAnalyzer: () => void;
  onUpdateTradeResult: (tradeId: string, result: 'Win' | 'Loss' | 'Break-even') => void;
}

export default function BasicJournal({ trades, onNavigateToAnalyzer, onUpdateTradeResult }: BasicJournalProps) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filteredTrades = trades.filter(t => {
    const matchesFilter = filter === 'All' || t.recommendation === filter;
    const matchesSearch = t.currency_pair.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getResultBadge = (result?: string) => {
    switch (result) {
      case 'Win': return 'bg-emerald-100 text-emerald-700';
      case 'Loss': return 'bg-rose-100 text-rose-700';
      case 'Break-even': return 'bg-slate-100 text-slate-700';
      default: return 'bg-amber-50 text-amber-700';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Basic Trade Journal</h2>
          <p className="text-slate-500 font-medium">Simple history of your analyzed setups</p>
        </div>
        <button 
          onClick={onNavigateToAnalyzer}
          className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-slate-200"
        >
          New Analysis
          <ArrowUpRight size={18} />
        </button>
      </div>

      <div className="card-base overflow-hidden shadow-xl shadow-slate-100">
        <div className="p-6 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search currency pair..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none text-slate-900 font-bold"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 no-scrollbar">
            {['All', 'BUY', 'SELL'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  filter === f ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:text-slate-600'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Pair</th>
                <th className="px-6 py-4">Score</th>
                <th className="px-6 py-4">Signal</th>
                <th className="px-6 py-4">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold italic">
                    No trades found.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-400">{new Date(trade.timestamp).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-black text-slate-900">{trade.currency_pair}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-700">{trade.score}%</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-black italic uppercase tracking-tighter ${
                        trade.execution_signal?.includes('BUY') ? 'text-emerald-600' :
                        trade.execution_signal?.includes('SELL') ? 'text-rose-600' : 'text-slate-500'
                      }`}>
                        {trade.execution_signal}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {trade.trade_result && trade.trade_result !== 'Pending' ? (
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getResultBadge(trade.trade_result)}`}>
                          {trade.trade_result}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => onUpdateTradeResult(trade.id, 'Win')}
                            className="px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            Win
                          </button>
                          <button 
                            onClick={() => onUpdateTradeResult(trade.id, 'Loss')}
                            className="px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            Loss
                          </button>
                          <button 
                            onClick={() => onUpdateTradeResult(trade.id, 'Break-even')}
                            className="px-2 py-1 bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white rounded text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            B/E
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-50">
          {filteredTrades.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-medium italic">
              No trades found.
            </div>
          ) : (
            filteredTrades.map((trade) => (
              <div key={trade.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 uppercase tracking-tighter italic">{trade.currency_pair}</span>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{new Date(trade.timestamp).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${
                      trade.execution_signal?.includes('BUY') ? 'bg-emerald-50 text-emerald-500 border border-emerald-100' :
                      trade.execution_signal?.includes('SELL') ? 'bg-rose-50 text-rose-500 border border-rose-100' : 'bg-slate-50 text-slate-500 border border-slate-100'
                    }`}>
                      {trade.execution_signal?.includes('BUY') ? <TrendingUp size={14} /> : 
                       trade.execution_signal?.includes('SELL') ? <TrendingDown size={14} /> : <Clock size={14} />}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-tighter ${
                      trade.execution_signal?.includes('BUY') ? 'text-emerald-500' :
                      trade.execution_signal?.includes('SELL') ? 'text-rose-500' : 'text-slate-400'
                    }`}>
                      {trade.execution_signal}
                    </span>
                  </div>
                  <span className="text-sm font-black text-slate-900 italic">{trade.score}%</span>
                </div>
                <div className="pt-3 border-t border-slate-50">
                  {trade.trade_result && trade.trade_result !== 'Pending' ? (
                    <div className="flex justify-end">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getResultBadge(trade.trade_result)} shadow-sm`}>
                        {trade.trade_result}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => onUpdateTradeResult(trade.id, 'Win')}
                        className="flex-1 py-3 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 active:scale-95 transition-all"
                      >
                        Win
                      </button>
                      <button 
                        onClick={() => onUpdateTradeResult(trade.id, 'Loss')}
                        className="flex-1 py-3 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-100 active:scale-95 transition-all"
                      >
                        Loss
                      </button>
                      <button 
                        onClick={() => onUpdateTradeResult(trade.id, 'Break-even')}
                        className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 active:scale-95 transition-all"
                      >
                        B/E
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
