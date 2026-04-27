import { GoogleGenAI, Type } from "@google/genai";
import { ForexData } from "./forexService";

const SYSTEM_INSTRUCTION = `You are TradeIQ, an advanced forex trading assistant.
Your goal is to provide actionable trade signals based on a professional weighted scoring system.

CORE ANALYSIS PROTOCOL (Weighted Scoring - Total 100):

1. Trend Analysis (25 points):
   - Analyze EMA 50/200, overall price structure, and higher timeframe alignment.
   - High points if trend is strong and consistent across timeframes.

2. Support & Resistance (20 points):
   - Identify proximity to major and minor S/R levels.
   - High points if trading from a major "walled" level.

3. Momentum (20 points):
   - Use RSI, MACD, and candle velocity to gauge strength.
   - High points if momentum supports the direction.

4. Entry Confirmation (20 points):
   - Look for specific candlestick patterns (Hammer, Engulfing, Morning/Evening Star) and volume/price action tails.
   - High points if clear reversal or continuation patterns exist.

5. Risk/Reward (15 points):
   - Calculate potential target (Take Profit) vs risk (Stop Loss). 
   - Minimum R:R for any signal is 1.5.
   - High points for R:R > 2.5.

DECISION LOGIC:
- Score >= 70 → Strong BUY or Strong SELL
- Score 50–69 → WEAK BUY or WEAK SELL (requires caution)
- Score < 50 → WAIT (market structure unclear or risky)

NOTE: You must determine the direction (BUY or SELL) automatically based on the trend analysis.

STRICT OUTPUT REQUIREMENTS:
- Signal: (Type of signal like 'STRONG BUY', 'WEAK SELL', etc.)
- Recommendation: (BUY / SELL / WAIT / AVOID)
- Score: Total calculated score out of 100 based on the weights above.
- Reasoning: Detail exactly how points were assigned for each of the 5 weighted categories.
`;

export interface TradeAnalysis {
  currency_pair: string;
  current_price: number;
  trend: "Bullish" | "Bearish" | "Ranging";
  volatility: "Low" | "Medium" | "High";
  market_condition: string;
  score: number; // Total weighted score
  score_details: {
    trend_score: number;      // max 25
    levels_score: number;     // max 20
    momentum_score: number;   // max 20
    entry_score: number;      // max 20
    rr_score: number;         // max 15
  };
  recommendation: "BUY" | "SELL" | "WEAK BUY" | "WEAK SELL" | "WAIT" | "AVOID";
  execution_signal: string; // The user visible signal text (e.g. "STRONG BUY")
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  risk_reward: string;
  execution_timing: string;
  time_window: string;
  expected_duration: string;
  session: string;
  confidence: "Low" | "Medium" | "High";
  confidence_percentage: number;
  reasoning: string;
  current_price_estimate: string;
  analysis_notes: string[];
}

export async function analyzeTrade(params: {
  currency_pair: string;
  direction?: 'BUY' | 'SELL';
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
  timeframe: string;
  marketData: ForexData;
  performanceSummary?: string;
  isAiSignalMode?: boolean;
}): Promise<TradeAnalysis> {
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  const { marketData, performanceSummary, isAiSignalMode } = params;

  const userSetupPrompt = isAiSignalMode 
    ? "AI AUTO-SIGNAL MODE: Determine the direction yourself based on trend analysis. Generate the optimal trade setup (Entry, SL, TP) based on current market conditions."
    : `USER SETUP (Analyze this specific direction and levels):
    - Direction: ${params.direction || 'Determine Automatically'}
    - Target Entry: ${params.entry_price}
    - Stop Loss: ${params.stop_loss}
    - Take Profit: ${params.take_profit}`;

  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze this market for ${params.currency_pair} on ${params.timeframe} timeframe. 
    
    REAL-TIME MARKET DATA:
    - Current Price: ${marketData.current_price}
    - Daily High: ${marketData.high}
    - Daily Low: ${marketData.low}
    
    ${userSetupPrompt}
    
    ${performanceSummary ? `USER PERFORMANCE FEEDBACK:\n${performanceSummary}` : ""}
    
    Use the weighted scoring system (Trend 25, S/R 20, Momentum 20, Entry 20, R:R 15).
    Be active in generating signals (Avoid excessive WAIT signals if there is some confluence).`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          currency_pair: { type: Type.STRING },
          current_price: { type: Type.NUMBER },
          trend: { type: Type.STRING, enum: ["Bullish", "Bearish", "Ranging"] },
          volatility: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
          market_condition: { type: Type.STRING },
          score: { type: Type.NUMBER },
          score_details: {
            type: Type.OBJECT,
            properties: {
              trend_score: { type: Type.NUMBER },
              levels_score: { type: Type.NUMBER },
              momentum_score: { type: Type.NUMBER },
              entry_score: { type: Type.NUMBER },
              rr_score: { type: Type.NUMBER }
            },
            required: ["trend_score", "levels_score", "momentum_score", "entry_score", "rr_score"]
          },
          recommendation: { type: Type.STRING, enum: ["BUY", "SELL", "WEAK BUY", "WEAK SELL", "WAIT", "AVOID"] },
          execution_signal: { type: Type.STRING },
          entry_price: { type: Type.NUMBER },
          stop_loss: { type: Type.NUMBER },
          take_profit: { type: Type.NUMBER },
          risk_reward: { type: Type.STRING },
          execution_timing: { type: Type.STRING },
          time_window: { type: Type.STRING },
          expected_duration: { type: Type.STRING },
          session: { type: Type.STRING },
          confidence: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
          confidence_percentage: { type: Type.NUMBER },
          reasoning: { type: Type.STRING },
          current_price_estimate: { type: Type.STRING },
          analysis_notes: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: [
          "currency_pair",
          "current_price",
          "trend",
          "volatility",
          "market_condition",
          "score",
          "score_details",
          "recommendation",
          "execution_signal",
          "entry_price",
          "stop_loss",
          "take_profit",
          "risk_reward",
          "execution_timing",
          "time_window",
          "expected_duration",
          "session",
          "confidence",
          "confidence_percentage",
          "reasoning",
          "current_price_estimate",
          "analysis_notes"
        ]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export interface ChartImageAnalysis {
  analysis_type: string;
  direction: "BUY" | "SELL" | "WAIT";
  trend: string;
  market_structure: string;
  support_resistance: string;
  score: number;
  score_details: {
    trend_score: number;
    levels_score: number;
    momentum_score: number;
    entry_score: number;
    rr_score: number;
  };
  recommendation: "BUY" | "SELL" | "WEAK BUY" | "WEAK SELL" | "WAIT" | "AVOID";
  confidence: "Low" | "Medium" | "High";
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  risk_reward: string;
  execution_signal: string;
  execution_timing: string;
  confidence_percentage: number;
  reasoning: string;
}

const CHART_ANALYSIS_SYSTEM_INSTRUCTION = `You are a Senior Technical Analyst. Perform visual analysis and determine direction automatically.

CORE ANALYSIS PROTOCOL (Weighted Scoring - Total 100):
1. Trend (25)
2. Support/Resistance (20)
3. Momentum (20)
4. Entry Patterns (20)
5. Risk/Reward (15)

DECISION:
- Score >= 70 → Strong Signal
- Score 50–69 → Weak Signal
- Score < 50 → WAIT 

Provide a high-probability trade setup. Return exactly structured JSON.`;

export async function analyzeChartImage(base64Image: string, mimeType: string, currencyPair: string, timeframe: string): Promise<ChartImageAnalysis> {
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  
  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: mimeType,
    },
  };

  const textPart = {
    text: `Analyze this ${currencyPair} ${timeframe} chart. 
    Use the weighted scoring system (Trend 25, S/R 20, Momentum 20, Entry 20, R:R 15).
    Determine the direction (BUY or SELL) yourself.
    Be active in generating signals (Avoid excessive WAIT if some confirmations exist).`,
  };

  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts: [imagePart, textPart] },
    config: {
      systemInstruction: CHART_ANALYSIS_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis_type: { type: Type.STRING },
          direction: { type: Type.STRING, enum: ["BUY", "SELL", "WAIT"] },
          trend: { type: Type.STRING },
          market_structure: { type: Type.STRING },
          support_resistance: { type: Type.STRING },
          score: { type: Type.NUMBER },
          score_details: {
            type: Type.OBJECT,
            properties: {
              trend_score: { type: Type.NUMBER },
              levels_score: { type: Type.NUMBER },
              momentum_score: { type: Type.NUMBER },
              entry_score: { type: Type.NUMBER },
              rr_score: { type: Type.NUMBER }
            },
            required: ["trend_score", "levels_score", "momentum_score", "entry_score", "rr_score"]
          },
          recommendation: { type: Type.STRING, enum: ["BUY", "SELL", "WEAK BUY", "WEAK SELL", "WAIT", "AVOID"] },
          confidence: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
          entry_price: { type: Type.NUMBER },
          stop_loss: { type: Type.NUMBER },
          take_profit: { type: Type.NUMBER },
          risk_reward: { type: Type.STRING },
          execution_signal: { type: Type.STRING },
          execution_timing: { type: Type.STRING },
          confidence_percentage: { type: Type.NUMBER },
          reasoning: { type: Type.STRING }
        },
        required: [
          "analysis_type",
          "direction",
          "trend",
          "market_structure",
          "support_resistance",
          "score",
          "score_details",
          "recommendation",
          "confidence",
          "entry_price",
          "stop_loss",
          "take_profit",
          "risk_reward",
          "execution_signal",
          "execution_timing",
          "confidence_percentage",
          "reasoning"
        ]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

