import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Node-fetch fallback for older Node versions or specific environments
import fetch from 'node-fetch';

dotenv.config();

// Create an HTTPS agent that ignores certificate errors (for ZynlePay's expired cert)
const zynlepayAgent = new https.Agent({
  rejectUnauthorized: false
});

const ZYNLEPAY_API_KEY = process.env.ZYNLEPAY_API_KEY;
const ZYNLEPAY_MERCHANT_ID = process.env.ZYNLEPAY_MERCHANT_ID;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin
let firebaseConfig: any = {};
try {
  const configPath = path.join(__dirname, 'firebase-applet-config.json');
  firebaseConfig = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (e) {
  console.warn('[FIREBASE] firebase-applet-config.json not found or invalid. Firestore features may be limited.');
}

if (!admin.apps.length && firebaseConfig.projectId) {
  try {
    // Standard initialization for this environment
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
    console.log('[FIREBASE] Admin initialized with project:', firebaseConfig.projectId);
  } catch (e) {
    console.error('[FIREBASE] Fatal error initializing Firebase Admin:', e);
  }
}

// Use the specific database ID if provided, otherwise use default
let firestore: any;
let isUsingNamedDatabase = false;
let isFirestoreHealthy = true;
let apiKeyUnsubscribe: (() => void) | null = null;
let apiKeyRetryCount = 0;
const MAX_API_KEY_RETRIES = 3; // Reduced to fail faster and fallback

function setupApiKeySync() {
  if (!firestore || !isFirestoreHealthy) {
    if (!isFirestoreHealthy) {
      console.warn('[CONFIG] Firestore marked unhealthy, using environment variables for API keys');
    }
    return;
  }
  
  if (apiKeyUnsubscribe) {
    try {
      apiKeyUnsubscribe();
    } catch (e) {
      // Ignore unsubscribe errors
    }
  }
  
  try {
    apiKeyUnsubscribe = firestore.collection('system_config').doc('api_keys').onSnapshot((doc: any) => {
      apiKeyRetryCount = 0; // Reset on success
      if (doc.exists) {
        const data = doc.data();
        console.log('[CONFIG] API keys updated from Firestore');
        liveApiKeys = {
          FOREX_API_KEY: data.FOREX_API_KEY || process.env.FOREX_API_KEY,
          TWELVE_DATA_API_KEY: data.TWELVE_DATA_API_KEY || process.env.TWELVE_DATA_API_KEY,
          ALPHA_VANTAGE_API_KEY: data.ALPHA_VANTAGE_API_KEY || process.env.ALPHA_VANTAGE_API_KEY,
          EXCHANGE_RATE_API_KEY: data.EXCHANGE_RATE_API_KEY || process.env.EXCHANGE_RATE_API_KEY,
          keyPool: data.keyPool || []
        };
      }
    }, (err: any) => {
      const errMsg = err.message || String(err);
      
      // Handle "Exceeded maximum number of retries allowed" or permanent errors
      if (errMsg.includes('Exceeded maximum number of retries allowed') || 
          errMsg.includes('PERMISSION_DENIED') || 
          errMsg.includes('NOT_FOUND') || 
          errMsg.includes('UNAUTHENTICATED')) {
        
        if (isUsingNamedDatabase) {
          console.warn(`[CONFIG] Named database issue (${errMsg.split(':')[0]}), falling back to (default)`);
          updateFirestore(getFirestore(admin.app()), false);
        } else {
          console.warn('[CONFIG] Firestore sync unavailable, using environment variables');
          isFirestoreHealthy = false;
          if (apiKeyUnsubscribe) {
            try { apiKeyUnsubscribe(); } catch(e) {}
            apiKeyUnsubscribe = null;
          }
        }
        return;
      }
      
      apiKeyRetryCount++;
      if (apiKeyRetryCount < MAX_API_KEY_RETRIES) {
        const delay = 5000 * Math.pow(2, apiKeyRetryCount - 1);
        setTimeout(setupApiKeySync, delay);
      } else {
        console.warn('[CONFIG] Max retries reached for API key sync, falling back to environment variables');
        isFirestoreHealthy = false;
      }
    });
  } catch (e) {
    console.error('[CONFIG] Failed to setup API key sync:', e);
    isFirestoreHealthy = false;
  }
}

function updateFirestore(newInstance: any, isNamed: boolean) {
  if (firestore === newInstance && isUsingNamedDatabase === isNamed) return;
  firestore = newInstance;
  isUsingNamedDatabase = isNamed;
  isFirestoreHealthy = true; // Reset health on new instance
  apiKeyRetryCount = 0; 
  setupApiKeySync();
}

try {
  if (admin.apps.length > 0 && firebaseConfig.projectId) {
    const hasNamedDb = !!firebaseConfig.firestoreDatabaseId;
    const initialFirestore = hasNamedDb 
      ? getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId)
      : getFirestore(admin.app());
    
    firestore = initialFirestore;
    isUsingNamedDatabase = hasNamedDb;
    setupApiKeySync();
    
    // Quick health check
    initialFirestore.collection('health_check').limit(1).get().catch((err: any) => {
      const errMsg = err.message || String(err);
      if (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('NOT_FOUND') || errMsg.includes('Exceeded maximum number of retries allowed')) {
        if (isUsingNamedDatabase) {
          console.warn(`[FIREBASE] Named database unreachable, falling back to (default)`);
          updateFirestore(getFirestore(admin.app()), false);
        } else {
          console.warn('[FIREBASE] Default database unreachable, Firestore features disabled');
          isFirestoreHealthy = false;
        }
      }
    });
  } else {
    console.warn('[FIREBASE] Firebase Admin not initialized, Firestore features disabled');
    isFirestoreHealthy = false;
  }
} catch (e) {
  console.error('[FIREBASE] Error initializing Firestore:', e);
  if (admin.apps.length > 0) {
    updateFirestore(getFirestore(admin.app()), false);
  } else {
    isFirestoreHealthy = false;
  }
}

// Simple in-memory cache for Forex rates (Layer 1)
const forexCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 60 * 1000; // Increased to 60 seconds to respect API limits
const GLOBAL_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for global cache
let apiQuotaExceededUntil = 0; // Circuit breaker timestamp
let twelveDataQuotaExceededUntil = 0;
let alphaVantageQuotaExceededUntil = 0;
const requestQueue: Record<string, Promise<any>> = {}; // Request merging

// Real-time API Keys from Firestore
let liveApiKeys: { 
  FOREX_API_KEY?: string,
  TWELVE_DATA_API_KEY?: string,
  ALPHA_VANTAGE_API_KEY?: string,
  EXCHANGE_RATE_API_KEY?: string,
  keyPool?: any[]
} = {
  FOREX_API_KEY: process.env.FOREX_API_KEY,
  TWELVE_DATA_API_KEY: process.env.TWELVE_DATA_API_KEY,
  ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY,
  EXCHANGE_RATE_API_KEY: process.env.EXCHANGE_RATE_API_KEY,
  keyPool: []
};

// Helper to get active key for a service
function getActiveKey(service: string): string | undefined {
  // 1. Check if there's an active key in the pool for this service
  const poolKey = liveApiKeys.keyPool?.find(k => k.service === service && k.active);
  if (poolKey) return poolKey.value;

  // 2. Fallback to global keys
  if (service === 'forex') return liveApiKeys.FOREX_API_KEY;
  if (service === 'twelve_data') return liveApiKeys.TWELVE_DATA_API_KEY;
  if (service === 'alpha_vantage') return liveApiKeys.ALPHA_VANTAGE_API_KEY;
  if (service === 'exchange_rate') return liveApiKeys.EXCHANGE_RATE_API_KEY;
  
  return undefined;
}

async function getGlobalCache(pair: string) {
  if (!isFirestoreHealthy) return null;
  try {
    const docId = pair.replace('/', '_');
    const doc = await firestore.collection('forex_cache').doc(docId).get();
    if (doc.exists) {
      return doc.data();
    }
  } catch (e: any) {
    const errMsg = e.message || String(e);
    if (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('NOT_FOUND') || errMsg.includes('Exceeded maximum number of retries allowed')) {
      if (isUsingNamedDatabase) {
        console.warn(`[CACHE] Named database issue, falling back to (default)`);
        updateFirestore(getFirestore(admin.app()), false);
      } else {
        isFirestoreHealthy = false;
      }
    } else {
      console.error('[CACHE] Error reading global cache:', e);
    }
  }
  return null;
}

async function setGlobalCache(pair: string, data: any) {
  if (!isFirestoreHealthy) return;
  try {
    const docId = pair.replace('/', '_');
    await firestore.collection('forex_cache').doc(docId).set({
      ...data,
      global_timestamp: new Date().toISOString()
    });
  } catch (e: any) {
    const errMsg = e.message || String(e);
    if (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('NOT_FOUND') || errMsg.includes('Exceeded maximum number of retries allowed')) {
      if (isUsingNamedDatabase) {
        console.warn(`[CACHE] Named database issue on write, falling back to (default)`);
        updateFirestore(getFirestore(admin.app()), false);
      } else {
        isFirestoreHealthy = false;
      }
    } else {
      console.error('[CACHE] Error writing global cache:', e);
    }
  }
}

const app = express();

async function startServer() {
  const PORT = 3000;

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.get('/api/forex', async (req, res) => {
    const { pair } = req.query;
    console.log(`[API] GET /api/forex - pair: ${pair}`);
    
    if (!pair || typeof pair !== 'string') {
      console.warn('[API] Missing currency pair');
      return res.status(400).json({ error: 'Currency pair is required' });
    }

    const isWeekend = () => {
      const now = new Date();
      const day = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
      const hour = now.getUTCHours();
      // Friday after 22:00 UTC
      if (day === 5 && hour >= 22) return true;
      // Saturday all day
      if (day === 6) return true;
      // Sunday before 22:00 UTC
      if (day === 0 && hour < 22) return true;
      return false;
    };

    const cleanPair = pair.toUpperCase().replace(/[^A-Z0-9/]/g, '');
    const cacheKey = cleanPair;

    // 1. Check Local Cache first (Layer 1)
    const cached = forexCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      console.log(`[API] Returning local cached data for ${cacheKey}`);
      return res.json({ ...cached.data, is_weekend: isWeekend() });
    }

    // 2. Check Global Cache (Layer 2)
    const globalCached = await getGlobalCache(cleanPair);
    if (globalCached) {
      const age = Date.now() - new Date(globalCached.global_timestamp).getTime();
      if (age < 30 * 1000) { // Still use global cache if fresh (within 30s)
        console.log(`[API] Returning global cached data for ${cacheKey} (Age: ${Math.round(age/1000)}s)`);
        forexCache[cacheKey] = { data: globalCached, timestamp: Date.now() };
        return res.json({ ...globalCached, is_weekend: isWeekend() });
      }
    }

    // 3. Request Merging (prevent concurrent duplicates)
    if (requestQueue[cacheKey]) {
      console.log(`[API] Merging request for ${cacheKey}`);
      try {
        const result = await requestQueue[cacheKey];
        return res.json({ ...result, is_weekend: isWeekend() });
      } catch (e) {
        // Fall through to actual implementation if merged request failed
      }
    }

    const mergePromise = (async () => {
      // 1. Identify explicit base/quote if possible
      let base = '';
      let quote = '';
      let symbol = cleanPair; // Default symbol to cleanPair

      // Handle common Index nicknames that look like 6-char forex pairs but aren't
      const isIndex = ['NAS100', 'SPX500', 'GER40', 'UK100', 'US30'].includes(cleanPair);

      if (cleanPair.includes('/')) {
        [base, quote] = cleanPair.split('/');
      } else if (cleanPair.length === 6 && !isIndex) {
        base = cleanPair.substring(0, 3);
        quote = cleanPair.substring(3);
      } else {
        base = cleanPair;
        quote = 'USD';
      }

      const TWELVE_DATA_KEY = getActiveKey('twelve_data');
      const ALPHA_VANTAGE_KEY = getActiveKey('alpha_vantage');
      const EXCHANGE_RATE_KEY = getActiveKey('exchange_rate');

      // --- FALLBACK SYSTEM ---
      
      // 1. PRIMARY: Twelve Data
      if (TWELVE_DATA_KEY && Date.now() > twelveDataQuotaExceededUntil) {
        try {
          // Prepare Twelve Data Symbol
          let tdSymbol = symbol;
          
          const symbolMap: Record<string, string> = {
            'NAS100': 'NDX',
            'US30': 'DJI',
            'SPX500': 'SPX',
            'GER40': 'DAX',
            'XAU/USD': 'XAU/USD',
            'BTC/USD': 'BTC/USD',
            'ETH/USD': 'ETH/USD'
          };
          
          if (symbolMap[tdSymbol]) {
            tdSymbol = symbolMap[tdSymbol];
          } else if (!tdSymbol.includes('/') && tdSymbol.length === 6 && !isIndex) {
            tdSymbol = `${tdSymbol.substring(0, 3)}/${tdSymbol.substring(3)}`;
          }

          console.log(`[API] Trying Twelve Data for ${tdSymbol}...`);
          const response = await fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(tdSymbol)}&apikey=${TWELVE_DATA_KEY}`);
          const data: any = await response.json();
          if (data.close && data.high && data.low) {
            return {
              currency_pair: cleanPair,
              current_price: parseFloat(data.close),
              high: parseFloat(data.high),
              low: parseFloat(data.low),
              timestamp: new Date().toISOString(),
              provider: 'twelvedata'
            };
          }
          
          if (data.message && (data.message.includes('run out of API credits') || data.message.includes('Grow or Venture plan'))) {
            const isPlanRestricted = data.message.includes('Grow or Venture plan');
            console.warn(`[API] Twelve Data ${isPlanRestricted ? 'plan restricted' : 'rate limit hit'} for ${tdSymbol}. Circuit breaker for 60s.`);
            twelveDataQuotaExceededUntil = Date.now() + 60000;
          } else {
            console.warn(`[API] Twelve Data failed for ${tdSymbol}: ${data.message || 'No data'}`);
          }
        } catch (e) {
          console.warn(`[API] Twelve Data error:`, e);
        }
      }

      // 2. FALLBACK: Alpha Vantage
      if (ALPHA_VANTAGE_KEY && Date.now() > alphaVantageQuotaExceededUntil) {
        try {
          console.log(`[API] Trying Alpha Vantage for ${isIndex ? symbol : (base + '/' + quote)}...`);
          await new Promise(resolve => setTimeout(resolve, 500)); 
          
          let avUrl = '';
          if (isIndex) {
            const avSymbolMap: Record<string, string> = {
              'NAS100': 'QQQ', // Using QQQ as a very stable proxy for Nasdaq 100 on AV
              'SPX500': 'SPY', // SPY as proxy for S&P 500
              'US30': 'DIA',   // DIA for Dow Jones
              'GER40': 'DAX',
              'UK100': 'Z'
            };
            const avSymbol = avSymbolMap[cleanPair] || cleanPair;
            avUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${avSymbol}&apikey=${ALPHA_VANTAGE_KEY}`;
          } else {
            avUrl = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${base}&to_currency=${quote}&apikey=${ALPHA_VANTAGE_KEY}`;
          }

          const response = await fetch(avUrl);
          const data: any = await response.json();
          
          if (isIndex) {
            const quoteData = data['Global Quote'];
            if (quoteData && quoteData['05. price']) {
              const price = parseFloat(quoteData['05. price']);
              // Scale QQQ/SPY/DIA back to Index levels if using proxies
              let displayPrice = price;
              if (cleanPair === 'NAS100' && price < 1000) displayPrice = price * 40; // Approx QQQ to NDX
              if (cleanPair === 'SPX500' && price < 1000) displayPrice = price * 10; // Approx SPY to SPX
              if (cleanPair === 'US30' && price < 1000) displayPrice = price * 100;  // Approx DIA to DJI
              
              return {
                currency_pair: cleanPair,
                current_price: displayPrice,
                high: displayPrice * 1.002,
                low: displayPrice * 0.998,
                timestamp: new Date().toISOString(),
                provider: 'alphavantage'
              };
            }
          } else {
            const rateData = data['Realtime Currency Exchange Rate'];
            if (rateData) {
              const price = parseFloat(rateData['5. Exchange Rate']);
              return {
                currency_pair: cleanPair,
                current_price: price,
                high: price * 1.002,
                low: price * 0.998,
                timestamp: new Date().toISOString(),
                provider: 'alphavantage'
              };
            }
          }  
          if (data.Information || (data.message && data.message.includes('rate limit'))) {
            console.warn(`[API] Alpha Vantage rate limit hit or info message: ${data.Information || data.message}. Circuit breaker for 1 hour.`);
            alphaVantageQuotaExceededUntil = Date.now() + (60 * 60 * 1000); 
          } else {
            console.warn(`[API] Alpha Vantage failed: ${JSON.stringify(data)}`);
          }
        } catch (e) {
          console.warn(`[API] Alpha Vantage error:`, e);
        }
      }

      // 3. BACKUP: ExchangeRate API
      // STRICTLY for 3x3 Forex only (Fiat)
      if (EXCHANGE_RATE_KEY && base.length === 3 && quote.length === 3 && !isIndex) {
        try {
          const validCurrency = /^[A-Z]{3}$/.test(base);
          // Exclude known cryptos/commodities that ExchangeRate-API doesn't support as base
          const isNonFiat = ['BTC', 'ETH', 'XAU', 'XAG', 'LTC', 'BCH', 'XRP', 'SOL', 'USDT'].includes(base);
          
          if (validCurrency && !isNonFiat) {
            console.log(`[API] Trying ExchangeRate-API for ${base}...`);
            const response = await fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_KEY}/latest/${base}`);
            const data: any = await response.json();
            if (data.result === 'success' && data.conversion_rates && data.conversion_rates[quote]) {
              const price = data.conversion_rates[quote];
              return {
                currency_pair: cleanPair,
                current_price: price,
                high: price * 1.002,
                low: price * 0.998,
                timestamp: new Date().toISOString(),
                provider: 'exchangerate-api'
              };
            }
            console.warn(`[API] ExchangeRate-API failed for ${base}: ${data['error-type'] || 'No data'}`);
          }
        } catch (e) {
          console.warn(`[API] ExchangeRate-API error:`, e);
        }
      }

      // 4. Stale/Mock Fallback
      if (globalCached || cached) {
        const data = (globalCached || cached.data);
        console.log(`[API] Returning last cached price for ${cleanPair}`);
        return { 
          ...data, 
          is_stale: true, 
          error: "Market data temporarily unavailable" 
        };
      }

      // Final fallback: Mock data if absolutely nothing else works
      console.warn(`[API] No cache available for ${cleanPair}, generating mock data`);
      const mockPrices: Record<string, number> = {
        'EUR/USD': 1.0850, 'GBP/USD': 1.2650, 'USD/JPY': 150.20,
        'AUD/USD': 0.6540, 'USD/CAD': 1.3520, 'USD/CHF': 0.8820,
        'NZD/USD': 0.6120, 'EUR/GBP': 0.8550, 'EUR/JPY': 162.40,
        'GBP/JPY': 190.10, 'XAU/USD': 2150.50, 'BTC/USD': 65000.00,
        'ETH/USD': 3500.00, 'NAS100': 18150.00
      };
      const basePair = cleanPair.includes('/') ? cleanPair : (cleanPair.substring(0, 3) + '/' + cleanPair.substring(3));
      const bp = mockPrices[basePair] || mockPrices[cleanPair] || 1.1525;
      const vol = bp * 0.001;
      const cp = bp + (Math.random() - 0.5) * (vol * 0.2);
      return {
        currency_pair: cleanPair,
        current_price: parseFloat(cp.toFixed(5)),
        high: parseFloat((cp + vol).toFixed(5)),
        low: parseFloat((cp - vol).toFixed(5)),
        timestamp: new Date().toISOString(),
        is_mock: true,
        note: "Using simulated data due to provider rate limits."
      };
    })();

    requestQueue[cacheKey] = mergePromise;
    
    try {
      const result = await mergePromise;
      delete requestQueue[cacheKey];
      
      const finalResult = { ...result, is_weekend: isWeekend() };
      forexCache[cacheKey] = { data: finalResult, timestamp: Date.now() };
      await setGlobalCache(cacheKey, finalResult);
      return res.json(finalResult);
    } catch (err: any) {
      delete requestQueue[cacheKey];
      console.error(`[API] Error in mergePromise for ${cacheKey}:`, err);
      return res.status(500).json({ error: 'Internal API Error', details: err.message });
    }
  });

  function returnMockData(res: any, cleanPair: string, staleCache: any = null, isWeekendVal: boolean = false) {
    if (staleCache) {
      const data = staleCache.data || staleCache;
      console.log(`[API] Using stale cache for ${cleanPair} as fallback`);
      return res.json({ ...data, is_stale: true, is_weekend: isWeekendVal });
    }

    // Improved mock data generation with trend simulation
    const mockPrices: Record<string, number> = {
      'EUR/USD': 1.0850,
      'GBP/USD': 1.2650,
      'USD/JPY': 150.20,
      'AUD/USD': 0.6540,
      'USD/CAD': 1.3520,
      'USD/CHF': 0.8820,
      'NZD/USD': 0.6120,
      'EUR/GBP': 0.8550,
      'EUR/JPY': 162.40,
      'GBP/JPY': 190.10,
      'XAU/USD': 2150.50,
      'BTC/USD': 65000.00,
    };

    const basePair = cleanPair.includes('/') ? cleanPair : (cleanPair.substring(0, 3) + '/' + cleanPair.substring(3));
    const basePrice = mockPrices[basePair] || mockPrices[cleanPair] || 1.1525;

    // Simulate a trend based on the minute of the hour to make it consistent for a while
    const minute = new Date().getMinutes();
    const trendFactor = Math.sin(minute / 10) * 0.002; // Slow oscillation
    const volatility = basePrice * 0.001;
    
    const currentPrice = basePrice + trendFactor + (Math.random() - 0.5) * (volatility * 0.2);
    const high = currentPrice + volatility * (0.5 + Math.random() * 0.5);
    const low = currentPrice - volatility * (0.5 + Math.random() * 0.5);

    console.log(`[API] Returning realistic mock data for ${cleanPair}: ${currentPrice.toFixed(5)} (Trend: ${trendFactor > 0 ? 'Bullish' : 'Bearish'})`);

    return res.json({
      currency_pair: cleanPair,
      current_price: parseFloat(currentPrice.toFixed(5)),
      high: parseFloat(high.toFixed(5)),
      low: parseFloat(low.toFixed(5)),
      timestamp: new Date().toISOString(),
      is_mock: true,
      is_weekend: isWeekendVal,
      note: isWeekendVal ? "Market is closed. Showing simulated weekend movement." : "Using high-fidelity simulated data due to API quota limits."
    });
  }

  app.get('/api/historical', async (req, res) => {
    const { pair, days = 30 } = req.query;
    console.log(`[API] GET /api/historical - pair: ${pair}, days: ${days}`);
    
    if (!pair || typeof pair !== 'string') {
      console.warn('[API] Missing currency pair for historical data');
      return res.status(400).json({ error: 'Currency pair is required' });
    }

    const numDays = parseInt(days as string) || 30;
    const API_KEY = getActiveKey('forex');
    const TWELVE_DATA_KEY = getActiveKey('twelve_data');
    const cleanPair = pair.toUpperCase().replace(/[^A-Z0-9/]/g, '');
    
    // 0. Check Circuit Breaker
    const isQuotaExceeded = Date.now() < apiQuotaExceededUntil;
    
    // 1. Check Local Cache
    const cacheKey = `hist_${cleanPair}_${numDays}`;
    const cached = forexCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL * 12)) { // 1 hour for historical
      console.log(`[API] Returning local cached historical data for ${cacheKey}`);
      return res.json(cached.data);
    }

    // 2. Check Global Cache
    const globalCached = await getGlobalCache(cacheKey);
    if (globalCached) {
      const age = Date.now() - new Date(globalCached.global_timestamp).getTime();
      const maxAge = isQuotaExceeded ? GLOBAL_CACHE_TTL * 30 : GLOBAL_CACHE_TTL * 24;
      if (age < maxAge) {
        console.log(`[API] Returning global cached historical data for ${cacheKey} (Age: ${Math.round(age/3600000)}h)${isQuotaExceeded ? ' [QUOTA EXCEEDED FALLBACK]' : ''}`);
        forexCache[cacheKey] = { data: globalCached, timestamp: Date.now() };
        return res.json(globalCached);
      }
    }

    if (isQuotaExceeded) {
      console.warn(`[API] Skipping external historical fetch for ${cleanPair} due to active quota circuit breaker.`);
      return returnMockHistorical(res, cleanPair, numDays, cached || globalCached);
    }

    // Handle common Index nicknames
    const isIndex = ['NAS100', 'SPX500', 'GER40', 'UK100', 'US30'].includes(cleanPair);

    let base = '';
    let quote = '';
    if (cleanPair.includes('/')) {
      [base, quote] = cleanPair.split('/');
    } else if (cleanPair.length === 6 && !isIndex) {
      base = cleanPair.substring(0, 3);
      quote = cleanPair.substring(3);
    } else {
      base = cleanPair;
      quote = 'USD';
    }

    try {
      // Try Twelve Data first if available (higher precision)
      if (TWELVE_DATA_KEY) {
        let symbol = cleanPair;
        
        // Specific mappings for common indices
        const symbolMap: Record<string, string> = {
          'NAS100': 'NDX',
          'US30': 'DJI',
          'SPX500': 'SPX',
          'GER40': 'DAX',
          'XAU/USD': 'XAU/USD',
          'BTC/USD': 'BTC/USD',
          'ETH/USD': 'ETH/USD'
        };
        
        if (symbolMap[symbol]) {
          symbol = symbolMap[symbol];
        } else if (!symbol.includes('/') && symbol.length === 6 && !isIndex) {
          symbol = `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
        }
        
        console.log(`[API] Fetching historical data from Twelve Data for ${symbol}...`);
        const tdResponse = await fetch(`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=${numDays}&apikey=${TWELVE_DATA_KEY}`);
        const tdData: any = await tdResponse.json();

        if (tdData.values && Array.isArray(tdData.values)) {
          const history = tdData.values.map((v: any) => ({
            date: v.datetime,
            open: parseFloat(v.open),
            high: parseFloat(v.high),
            low: parseFloat(v.low),
            close: parseFloat(v.close)
          })).reverse(); // Twelve Data returns newest first

          const result = {
            currency_pair: cleanPair,
            history,
            timestamp: new Date().toISOString(),
            provider: 'twelvedata'
          };
          forexCache[cacheKey] = { data: result, timestamp: Date.now() };
          await setGlobalCache(cacheKey, result);
          return res.json(result);
        }
        
        if (tdData.message && (tdData.message.includes('run out of API credits') || tdData.message.includes('Grow or Venture plan'))) {
          const isPlanRestricted = tdData.message.includes('Grow or Venture plan');
          console.warn(`[API] Twelve Data historical ${isPlanRestricted ? 'plan restricted' : 'rate limit hit'} for ${symbol}.`);
        } else {
          console.warn(`[API] Twelve Data historical failed for ${symbol}: ${tdData.message || 'Unknown error'}`);
        }
      }

      if (!API_KEY) {
        throw new Error('FOREX_API_KEY is not configured');
      }

      const endDate = new Date();
      const startDate = new Date();
      // Cap at 29 days to stay safe within the 30-day limit for free plans
      const effectiveDays = Math.min(numDays, 29);
      startDate.setDate(endDate.getDate() - effectiveDays);

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      console.log(`[API] Fetching historical data for ${base}/${quote} from ${startStr} to ${endStr} (Effective days: ${effectiveDays})...`);
      
      const response = await fetch(`https://api.forexrateapi.com/v1/timeframe?api_key=${API_KEY}&base=${base}&currencies=${quote}&start_date=${startStr}&end_date=${endStr}`);
      
      if (!response.ok) {
        throw new Error(`External API responded with status: ${response.status}`);
      }

      const data: any = await response.json();
      
      if (data.error) {
        const errorInfo = data.error.info || data.error.message || JSON.stringify(data.error);
        // Specific check for quota error or plan restriction
        const lowerError = errorInfo.toLowerCase();
        if (lowerError.includes('allowance') || lowerError.includes('reached') || lowerError.includes('30 days')) {
          const isPlanError = lowerError.includes('30 days');
          console.warn(`[API] ${isPlanError ? 'Plan restriction' : 'Quota reached'} for Historical Forex API. ${!isPlanError ? 'Activating circuit breaker for 1 hour.' : ''}`);
          if (!isPlanError) {
            apiQuotaExceededUntil = Date.now() + (60 * 60 * 1000);
          }
          return returnMockHistorical(res, cleanPair, numDays, cached || globalCached);
        }
        throw new Error(`Historical API Error: ${errorInfo}`);
      }

      if (!data.rates) {
        throw new Error(`Historical API response missing rates object. Success: ${data.success}`);
      }

      const history = Object.entries(data.rates).map(([date, rates]: [string, any]) => {
        let price = rates[quote];
        
        // Handle missing quote rate in historical data
        if (price === undefined) {
          if (base === quote) {
            price = 1.0;
          } else if (data.base === quote && rates[base]) {
            price = 1 / rates[base];
          } else {
            // Fallback to 1.0 or skip? Let's use 1.0 for now to avoid breaking the map
            price = 1.0;
          }
        }

        // Since timeframe API usually gives one rate per day, we'll mock OHLC around it for simulation
        const volatility = 0.005;
        return {
          date,
          open: parseFloat((price * (1 + (Math.random() - 0.5) * 0.001)).toFixed(5)),
          high: parseFloat((price * (1 + Math.random() * volatility)).toFixed(5)),
          low: parseFloat((price * (1 - Math.random() * volatility)).toFixed(5)),
          close: parseFloat(price.toFixed(5)),
        };
      }).sort((a, b) => a.date.localeCompare(b.date));

      console.log(`[API] Successfully fetched ${history.length} historical bars for ${base}/${quote}`);

      const result = {
        currency_pair: cleanPair,
        history
      };

      // Update Caches
      forexCache[cacheKey] = { data: result, timestamp: Date.now() };
      await setGlobalCache(cacheKey, result);

      res.json(result);

    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      if (errorMsg.toLowerCase().includes('allowance') || errorMsg.toLowerCase().includes('reached')) {
        apiQuotaExceededUntil = Date.now() + (60 * 60 * 1000);
      }
      console.error('[API] Error fetching historical data, falling back to mock:', error);
      return returnMockHistorical(res, cleanPair, numDays, cached || globalCached);
    }
  });

  function returnMockHistorical(res: any, cleanPair: string, numDays: number, staleCache: any = null) {
    if (staleCache) {
      const data = staleCache.data || staleCache;
      console.log(`[API] Using stale historical cache for ${cleanPair} as fallback`);
      return res.json({ ...data, is_stale: true });
    }

    const mockPrices: Record<string, number> = {
      'EUR/USD': 1.0850,
      'GBP/USD': 1.2650,
      'USD/JPY': 150.20,
      'AUD/USD': 0.6540,
      'USD/CAD': 1.3520,
      'USD/CHF': 0.8820,
      'NZD/USD': 0.6120,
    };

    const basePrice = mockPrices[cleanPair] || 1.0;
    const history = [];
    let currentPrice = basePrice;

    for (let i = numDays; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const dailyVolatility = 0.008;
      const open = currentPrice;
      const close = open + (Math.random() - 0.5) * dailyVolatility;
      const high = Math.max(open, close) + Math.random() * (dailyVolatility / 2);
      const low = Math.min(open, close) - Math.random() * (dailyVolatility / 2);
      
      history.push({
        date: date.toISOString().split('T')[0],
        open: parseFloat(open.toFixed(5)),
        high: parseFloat(high.toFixed(5)),
        low: parseFloat(low.toFixed(5)),
        close: parseFloat(close.toFixed(5)),
      });
      
      currentPrice = close;
    }

    return res.json({
      currency_pair: cleanPair,
      history,
      is_mock: true
    });
  }

  // Admin API Status
  app.get('/api/admin/api-status', async (req, res) => {
    const API_KEY = getActiveKey('forex');
    const TWELVE_DATA_KEY = getActiveKey('twelve_data');
    
    const status = {
      forex: {
        connected: !!API_KEY,
        quota_reached: false,
        last_error: null as string | null,
        cache_size: Object.keys(forexCache).length
      },
      twelve_data: {
        connected: !!TWELVE_DATA_KEY,
        last_error: null as string | null,
        is_working: false
      },
      timestamp: new Date().toISOString()
    };

    // Check ForexRateAPI
    try {
      if (API_KEY) {
        const response = await fetch(`https://api.forexrateapi.com/v1/latest?api_key=${API_KEY}&base=USD&currencies=EUR`);
        const data: any = await response.json();
        if (data.error) {
          const errorInfo = data.error.info || data.error.message || JSON.stringify(data.error);
          if (errorInfo.toLowerCase().includes('allowance') || errorInfo.toLowerCase().includes('reached')) {
            status.forex.quota_reached = true;
          }
          status.forex.last_error = errorInfo;
        }
      }
    } catch (e) {
      status.forex.last_error = e instanceof Error ? e.message : String(e);
    }

    // Check Twelve Data
    try {
      if (TWELVE_DATA_KEY) {
        const tdResponse = await fetch(`https://api.twelvedata.com/quote?symbol=EUR/USD&apikey=${TWELVE_DATA_KEY}`);
        const tdData: any = await tdResponse.json();
        if (tdData.close) {
          status.twelve_data.is_working = true;
        } else {
          status.twelve_data.last_error = tdData.message || 'Unknown error';
        }
      }
    } catch (e) {
      status.twelve_data.last_error = e instanceof Error ? e.message : String(e);
    }

    res.json(status);
  });

  // --- PAYMENT ENDPOINTS (ZYNLEPAY - Zambia) ---

  // ZynlePay: Initiate Payment
  app.post('/api/payment/zynlepay/initiate', async (req, res) => {
    const { plan, userId, userEmail, userName } = req.body;
    
    console.log(`[ZYNLEPAY] Config check - API_KEY: ${ZYNLEPAY_API_KEY ? 'Set' : 'Missing'}, MERCHANT_ID: ${ZYNLEPAY_MERCHANT_ID ? 'Set' : 'Missing'}`);

    if (!ZYNLEPAY_API_KEY || !ZYNLEPAY_MERCHANT_ID) {
      return res.status(500).json({ error: 'ZynlePay is not configured on the server' });
    }

    const prices: Record<string, number> = {
      'Pro': 19.99,
      'Elite': 49.99
    };

    const amount = prices[plan];
    if (!amount) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const reference = `TIQ-${userId}-${Date.now()}`;

    try {
      // ZynlePay Initiation API
      const response = await fetch('https://api.zynlepay.com/api/v1/payments/initiate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ZYNLEPAY_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        agent: zynlepayAgent,
        body: JSON.stringify({
          merchant_id: ZYNLEPAY_MERCHANT_ID,
          reference,
          amount,
          currency: 'USD', // ZynlePay supports USD and ZMW
          description: `TradeIQ ${plan} Plan Subscription`,
          callback_url: `${req.headers.origin}/Subscription?reference=${reference}`,
          customer: {
            email: userEmail,
            name: userName || 'TradeIQ User',
          },
          metadata: {
            userId,
            plan
          }
        })
      });

      const responseText = await response.text();
      console.log(`[ZYNLEPAY] Response Status: ${response.status} ${response.statusText}`);
      console.log(`[ZYNLEPAY] Raw Response: ${responseText.substring(0, 500)}`);

      if (responseText.trim().startsWith('<!DOCTYPE html>') || responseText.trim().startsWith('<html')) {
        throw new Error('Invalid API endpoint or server error (HTML returned). Please check the API URL.');
      }

      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('[ZYNLEPAY] Failed to parse JSON response from ZynlePay:', responseText);
        throw new Error(`ZynlePay returned invalid response format (Status ${response.status}). Expected JSON but received something else.`);
      }

      if (data.status === 'success' || data.success) {
        res.json({ url: data.payment_url || data.data?.payment_url, reference });
      } else {
        throw new Error(data.message || 'Failed to initiate ZynlePay payment');
      }
    } catch (error: any) {
      console.error('[ZYNLEPAY] Error initiating payment:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ZynlePay: Verify Transaction
  app.get('/api/payment/zynlepay/verify', async (req, res) => {
    const { reference } = req.query;

    if (!reference || !ZYNLEPAY_API_KEY) {
      return res.status(400).json({ error: 'Missing reference or server configuration' });
    }

    try {
      const response = await fetch(`https://api.zynlepay.com/api/v1/payments/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ZYNLEPAY_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        agent: zynlepayAgent
      });

      const responseText = await response.text();
      console.log(`[ZYNLEPAY VERIFY] Response Status: ${response.status} ${response.statusText}`);
      
      if (responseText.trim().startsWith('<!DOCTYPE html>') || responseText.trim().startsWith('<html')) {
        console.error('[ZYNLEPAY VERIFY] Received HTML instead of JSON:', responseText.substring(0, 500));
        return res.redirect(`${process.env.APP_URL}/?payment=error&message=${encodeURIComponent('Invalid API endpoint or server error (HTML returned)')}`);
      }

      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('[ZYNLEPAY VERIFY] Failed to parse JSON response:', responseText);
        return res.redirect(`${process.env.APP_URL}/?payment=error&message=${encodeURIComponent('Invalid response format from payment provider')}`);
      }
      
      if ((data.status === 'success' || data.success) && (data.data?.status === 'completed' || data.data?.status === 'successful')) {
        const { userId, plan } = data.data.metadata;
        const amount = data.data.amount;
        const currency = data.data.currency;

        console.log(`[ZYNLEPAY] Payment verified for user ${userId}, plan ${plan}`);

        // Update user plan in Firestore
        if (isFirestoreHealthy) {
          await firestore.collection('users').doc(userId).update({
            plan: plan,
            subscriptionStatus: 'active',
            lastPaymentDate: new Date().toISOString()
          });
          
          // Log the transaction
          await firestore.collection('transactions').add({
            userId,
            plan,
            amount,
            currency,
            status: 'completed',
            provider: 'zynlepay',
            zynlepayReference: reference,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        return res.redirect(`${process.env.APP_URL}/?payment=success&plan=${plan}`);
      } else {
        return res.redirect(`${process.env.APP_URL}/?payment=failed&message=${encodeURIComponent(data.message || 'Verification failed')}`);
      }
    } catch (error: any) {
      console.error('[ZYNLEPAY] Error verifying transaction:', error);
      res.redirect(`${process.env.APP_URL}/?payment=error&message=${encodeURIComponent(error.message)}`);
    }
  });

  // ZynlePay: Webhook
  app.post('/api/payment/zynlepay/webhook', async (req, res) => {
    // ZynlePay sends a signature or token for verification
    const signature = req.headers['x-zynlepay-signature'];
    
    // Simple validation if a secret is provided
    const webhookSecret = process.env.ZYNLEPAY_WEBHOOK_SECRET;
    if (webhookSecret && signature !== webhookSecret) {
      return res.status(401).send('Unauthorized');
    }

    const payload = req.body;
    
    if (payload.status === 'completed' || payload.event === 'payment.success') {
      const { reference, amount, currency, metadata } = payload.data || payload;
      
      if (metadata && metadata.userId) {
        const { userId, plan } = metadata;
        console.log(`[ZYNLEPAY WEBHOOK] Payment successful for user ${userId}, plan ${plan}`);

        if (isFirestoreHealthy) {
          try {
            await firestore.collection('users').doc(userId).update({
              plan: plan,
              subscriptionStatus: 'active',
              lastPaymentDate: new Date().toISOString()
            });
            
            await firestore.collection('transactions').add({
              userId,
              plan,
              amount,
              currency,
              status: 'completed',
              provider: 'zynlepay',
              zynlepayReference: reference,
              timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
          } catch (e) {
            console.error('[ZYNLEPAY WEBHOOK] Error updating user plan:', e);
          }
        }
      }
    }

    res.status(200).send('Webhook received');
  });

  // Manual Payment: Submit Receipt
  app.post('/api/payment/manual/submit', async (req, res) => {
    const { userId, plan, receiptUrl, notes } = req.body;
    
    if (!userId || !plan || !receiptUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (isFirestoreHealthy) {
      try {
        await firestore.collection('manual_payments').add({
          userId,
          plan,
          receiptUrl,
          notes,
          status: 'pending',
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Notify admin (simulated)
        console.log(`[MANUAL PAYMENT] New receipt submitted by user ${userId} for plan ${plan}`);
        
        res.json({ status: 'success', message: 'Receipt submitted successfully. Our team will verify it shortly.' });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    } else {
      res.status(500).json({ error: 'Database unavailable' });
    }
  });

  // Mobile Money: Initiate Payment (Live via ZynlePay)
  app.post('/api/payment/mobile-money/initiate', async (req, res) => {
    const { plan, userId, phoneNumber, provider, userEmail, userName } = req.body;
    
    console.log(`[MOBILE MONEY] Config check - API_KEY: ${ZYNLEPAY_API_KEY ? 'Set' : 'Missing'}, MERCHANT_ID: ${ZYNLEPAY_MERCHANT_ID ? 'Set' : 'Missing'}`);

    if (!ZYNLEPAY_API_KEY || !ZYNLEPAY_MERCHANT_ID) {
      return res.status(500).json({ error: 'ZynlePay is not configured on the server' });
    }

    const prices: Record<string, number> = {
      'Pro': 19.99,
      'Elite': 49.99
    };

    const amount = prices[plan];
    if (!amount) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const reference = `MM-${userId}-${Date.now()}`;
    console.log(`[MOBILE MONEY] Initiating live payment for ${plan} via ${provider} for ${phoneNumber}. Reference: ${reference}`);

    try {
      // Log request body for debugging
      console.log('[MOBILE MONEY] Request Body:', JSON.stringify(req.body));
      
      if (!phoneNumber || !provider) {
        return res.status(400).json({ error: 'Phone number and provider are required' });
      }

      // 1. Log the pending transaction in Firestore
      if (isFirestoreHealthy) {
        await firestore.collection('transactions').add({
          userId,
          plan,
          phoneNumber,
          provider,
          amount,
          currency: 'USD',
          status: 'pending',
          reference,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      // 2. Call ZynlePay Mobile Money Collection API
      // Note: ZynlePay uses a specific endpoint for direct mobile money collection
      // Mapping providers to ZynlePay expected values
      let zynleProvider = 'mtn';
      const provLower = provider.toLowerCase();
      if (provLower.includes('airtel')) zynleProvider = 'airtel';
      else if (provLower.includes('zamtel')) zynleProvider = 'zamtel';
      else if (provLower.includes('mtn')) zynleProvider = 'mtn';
      
      // ZynlePay Mobile Money usually requires ZMW (Zambian Kwacha)
      // We'll use a fixed rate of 25 for now (1 USD = 25 ZMW)
      const amountZMW = Math.round(amount * 25);

      console.log(`[MOBILE MONEY] Fetching ZynlePay API with provider: ${zynleProvider}, amount: ${amountZMW} ZMW`);

      const response = await fetch('https://api.zynlepay.com/api/v1/payments/collection', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ZYNLEPAY_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        agent: zynlepayAgent,
        body: JSON.stringify({
          merchant_id: ZYNLEPAY_MERCHANT_ID,
          reference,
          amount: amountZMW,
          currency: 'ZMW',
          phone_number: phoneNumber.replace(/[\s+]/g, ''), // Remove spaces and +
          provider: zynleProvider,
          description: `TradeIQ ${plan} Subscription`,
          metadata: {
            userId,
            plan,
            originalAmount: amount,
            originalCurrency: 'USD'
          }
        })
      });

      const responseText = await response.text();
      console.log(`[MOBILE MONEY] ZynlePay Response Status: ${response.status} ${response.statusText}`);
      console.log(`[MOBILE MONEY] Raw Response: ${responseText.substring(0, 500)}`);

      if (responseText.trim().startsWith('<!DOCTYPE html>') || responseText.trim().startsWith('<html')) {
        throw new Error('Invalid API endpoint or server error (HTML returned). Please check the API URL.');
      }

      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('[MOBILE MONEY] Failed to parse JSON response from ZynlePay:', responseText);
        throw new Error(`ZynlePay returned invalid response format (Status ${response.status}). Expected JSON but received something else.`);
      }

      if (data.status === 'success' || data.success) {
        res.json({ 
          status: 'pending', 
          message: data.message || 'Payment prompt sent to your phone. Please enter your PIN to complete.',
          transactionId: data.transaction_id || reference
        });
      } else {
        throw new Error(data.message || 'Failed to trigger Mobile Money prompt');
      }

    } catch (error: any) {
      console.error('[MOBILE MONEY] Error initiating live payment:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global API Error Handler to ensure we ALWAYS return JSON for /api/* routes
  // This prevents the "Unexpected token <" error on the frontend
  app.use('/api', (err: any, req: any, res: any, next: any) => {
    console.error(`[API ERROR] ${req.method} ${req.url}:`, err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] TradeIQ Backend listening on port ${PORT}`);
    console.log(`[SERVER] Health check: http://localhost:${PORT}/api/health`);
    console.log(`[SERVER] Forex API: http://localhost:${PORT}/api/forex?pair=EUR/USD`);
  });
}

startServer().catch(err => {
  console.error('[SERVER] Fatal error during startup:', err);
  process.exit(1);
});

export default app;
