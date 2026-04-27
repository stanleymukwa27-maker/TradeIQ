export interface ForexData {
  currency_pair: string;
  current_price: number;
  high: number;
  low: number;
  timestamp: string;
  is_stale?: boolean;
  error?: string;
  is_weekend?: boolean;
}

export async function fetchForexData(pair: string): Promise<ForexData> {
  const url = `/api/forex?pair=${encodeURIComponent(pair)}`;
  try {
    // Call our backend proxy to fetch real-time data using the API key
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch forex data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching forex data from ${url}:`, error);
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error(`Network error: Could not connect to the forex data service at ${url}. This might be due to a server crash or network issue.`);
    }
    throw error;
  }
}

export interface HistoricalBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export async function fetchHistoricalData(pair: string, days: number = 30): Promise<HistoricalBar[]> {
  try {
    const response = await fetch(`/api/historical?pair=${encodeURIComponent(pair)}&days=${days}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch historical data: ${response.statusText}`);
    }
    const data = await response.json();
    return data.history;
  } catch (error) {
    console.error('Error fetching historical data:', error);
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Network error: Could not connect to the historical data service.');
    }
    throw error;
  }
}
