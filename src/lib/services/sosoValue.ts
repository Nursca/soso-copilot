export interface EtfFlow {
  name: string;
  ticker: string;
  flow_7d: number;
  aum: number;
}

export interface MacroEvent {
  date: string;
  name: string;
  impact: 'HIGH' | 'MED' | 'LOW';
}

export interface SoSoData {
  etf_flows: EtfFlow[];
  indices: {
    btc_eth: number;
    mag7: number;
    fear_greed: number;
  };
  macro_events: MacroEvent[];
  btc_price: number;
  btc_7d_change: number;
  etf_real?: any;
}

export function getMockSoSoData(): SoSoData {
  return {
    etf_flows: [
      { name: 'iShares Bitcoin Trust', ticker: 'IBIT', flow_7d: 624.5, aum: 52400 },
      { name: 'Fidelity Wise Origin', ticker: 'FBTC', flow_7d: 312.1, aum: 18200 },
      { name: 'ARK 21Shares Bitcoin', ticker: 'ARKB', flow_7d: -42.3, aum: 4800 },
      { name: 'Bitwise Bitcoin ETF', ticker: 'BITB', flow_7d: 88.7, aum: 3900 },
      { name: 'Grayscale Bitcoin Trust', ticker: 'GBTC', flow_7d: -198.4, aum: 21000 },
    ],
    indices: {
      btc_eth: 1847.3,
      mag7: 423.1,
      fear_greed: 72
    },
    macro_events: [
      { date: 'May 14', name: 'US CPI (April)', impact: 'HIGH' },
      { date: 'May 15', name: 'US PPI + Retail Sales', impact: 'HIGH' },
      { date: 'May 21', name: 'FOMC Meeting Minutes', impact: 'HIGH' },
      { date: 'May 22', name: 'US Jobless Claims', impact: 'MED' },
      { date: 'May 29', name: 'US GDP (Q1 Final)', impact: 'MED' },
    ],
    btc_price: 91240,
    btc_7d_change: 5.8
  };
}

export async function fetchSoSoData(): Promise<SoSoData> {
  try {
    const res = await fetch('/api/soso-data');
    const data = getMockSoSoData();
    if (res.ok) {
      const json = await res.json();
      if (json.etf_real) data.etf_real = json.etf_real;
    }
    return data;
  } catch(e) {
    return getMockSoSoData();
  }
}
