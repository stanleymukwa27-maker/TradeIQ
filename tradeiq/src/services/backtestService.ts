import { HistoricalBar } from "./forexService";

export interface BacktestStrategy {
  name: string;
  type: 'Trend Following' | 'Mean Reversion' | 'Breakout';
  indicators: string[];
}

export interface BacktestTrade {
  entry_date: string;
  exit_date: string;
  type: 'BUY' | 'SELL';
  entry_price: number;
  exit_price: number;
  profit_loss: number;
  profit_percent: number;
  result: 'WIN' | 'LOSS';
}

export interface BacktestResult {
  strategy_name: string;
  total_trades: number;
  win_rate: number;
  total_profit: number;
  profit_percent: number;
  max_drawdown: number;
  trades: BacktestTrade[];
  equity_growth: { date: string; balance: number }[];
}

export function runBacktest(
  strategy: BacktestStrategy,
  history: HistoricalBar[],
  pair: string,
  initialBalance: number = 10000
): BacktestResult {
  const trades: BacktestTrade[] = [];
  const equityGrowth: { date: string; balance: number }[] = [{ date: history[0].date, balance: initialBalance }];
  let currentBalance = initialBalance;
  let maxBalance = initialBalance;
  let maxDrawdown = 0;

  // Simple Moving Average (SMA) calculation
  const calculateSMA = (data: number[], period: number) => {
    if (data.length < period) return null;
    let sum = 0;
    for (let i = data.length - period; i < data.length; i++) {
      sum += data[i];
    }
    return sum / period;
  };

  // Relative Strength Index (RSI) calculation
  const calculateRSI = (data: number[], period: number = 14) => {
    if (data.length < period + 1) return null;
    let gains = 0;
    let losses = 0;

    for (let i = data.length - period; i < data.length; i++) {
      const diff = data[i] - data[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }

    if (losses === 0) return 100;
    const rs = (gains / period) / (losses / period);
    return 100 - (100 / (1 + rs));
  };

  const prices = history.map(h => h.close);
  const slPips = 30; // 30 pips SL
  const tpPips = 60; // 60 pips TP (1:2 R:R)
  
  // Handle JPY pairs (2 decimals for pips) vs others (4 decimals)
  const isJPY = pair.toUpperCase().includes('JPY');
  const pipValue = isJPY ? 0.01 : 0.0001;

  let activeTrade: { 
    type: 'BUY' | 'SELL'; 
    entryPrice: number; 
    sl: number; 
    tp: number; 
    entryDate: string;
    lotSize: number;
  } | null = null;

  for (let i = 50; i < history.length; i++) {
    const currentBar = history[i];
    const prevBar = history[i - 1];
    const historicalPrices = prices.slice(0, i + 1);
    const prevPrices = prices.slice(0, i);
    
    // 1. Check if we have an active trade to close
    if (activeTrade) {
      let closed = false;
      let exitPrice = 0;
      let result: 'WIN' | 'LOSS' = 'LOSS';

      if (activeTrade.type === 'BUY') {
        if (currentBar.low <= activeTrade.sl) {
          exitPrice = activeTrade.sl;
          closed = true;
          result = 'LOSS';
        } else if (currentBar.high >= activeTrade.tp) {
          exitPrice = activeTrade.tp;
          closed = true;
          result = 'WIN';
        }
      } else {
        if (currentBar.high >= activeTrade.sl) {
          exitPrice = activeTrade.sl;
          closed = true;
          result = 'LOSS';
        } else if (currentBar.low <= activeTrade.tp) {
          exitPrice = activeTrade.tp;
          closed = true;
          result = 'WIN';
        }
      }

      if (closed) {
        const pips = activeTrade.type === 'BUY' 
          ? (exitPrice - activeTrade.entryPrice) / pipValue 
          : (activeTrade.entryPrice - exitPrice) / pipValue;
        
        const profitLoss = pips * 10; // $10 per pip for 1 standard lot
        currentBalance += profitLoss;
        
        trades.push({
          entry_date: activeTrade.entryDate,
          exit_date: currentBar.date,
          type: activeTrade.type,
          entry_price: activeTrade.entryPrice,
          exit_price: exitPrice,
          profit_loss: parseFloat(profitLoss.toFixed(2)),
          profit_percent: parseFloat(((profitLoss / (currentBalance - profitLoss)) * 100).toFixed(2)),
          result
        });

        activeTrade = null;
      }
    }

    // 2. Check for new signals if no active trade
    if (!activeTrade) {
      const sma10 = calculateSMA(historicalPrices, 10);
      const sma50 = calculateSMA(historicalPrices, 50);
      const prevSma10 = calculateSMA(prevPrices, 10);
      const prevSma50 = calculateSMA(prevPrices, 50);
      const rsi = calculateRSI(historicalPrices, 14);
      const sma200 = calculateSMA(historicalPrices, 200); // Long term trend

      if (sma10 && sma50 && prevSma10 && prevSma50 && rsi) {
        let signal: 'BUY' | 'SELL' | null = null;
        
        // Crossover Detection
        const bullishCross = prevSma10 <= prevSma50 && sma10 > sma50;
        const bearishCross = prevSma10 >= prevSma50 && sma10 < sma50;

        if (bullishCross) {
          // BUY Filter: RSI not overbought + Price above SMA200 (if available)
          if (rsi < 70 && (!sma200 || currentBar.close > sma200)) {
            signal = 'BUY';
          }
        } else if (bearishCross) {
          // SELL Filter: RSI not oversold + Price below SMA200 (if available)
          if (rsi > 30 && (!sma200 || currentBar.close < sma200)) {
            signal = 'SELL';
          }
        }

        if (signal) {
          const entryPrice = currentBar.close;
          const sl = signal === 'BUY' ? entryPrice - (slPips * pipValue) : entryPrice + (slPips * pipValue);
          const tp = signal === 'BUY' ? entryPrice + (tpPips * pipValue) : entryPrice - (tpPips * pipValue);
          
          activeTrade = {
            type: signal,
            entryPrice,
            sl,
            tp,
            entryDate: currentBar.date,
            lotSize: 1
          };
        }
      }
    }

    // Track equity
    if (currentBalance > maxBalance) maxBalance = currentBalance;
    const drawdown = ((maxBalance - currentBalance) / maxBalance) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    
    equityGrowth.push({ date: currentBar.date, balance: parseFloat(currentBalance.toFixed(2)) });
  }

  const wins = trades.filter(t => t.result === 'WIN').length;
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
  const totalProfit = currentBalance - initialBalance;
  const profitPercent = (totalProfit / initialBalance) * 100;

  return {
    strategy_name: strategy.name,
    total_trades: trades.length,
    win_rate: parseFloat(winRate.toFixed(2)),
    total_profit: parseFloat(totalProfit.toFixed(2)),
    profit_percent: parseFloat(profitPercent.toFixed(2)),
    max_drawdown: parseFloat(maxDrawdown.toFixed(2)),
    trades,
    equity_growth: equityGrowth
  };
}
