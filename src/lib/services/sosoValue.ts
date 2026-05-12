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
    btc_eth_chg: number;
    mag7: number;
    mag7_chg: number;
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
      btc_eth_chg: 2.4,
      mag7: 423.1,
      mag7_chg: 1.8,
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
  const data = getMockSoSoData();
  try {
    const res = await fetch('/api/soso-data');
    if (res.ok) {
      const json = await res.json();
      
      // Parse real ETF flows if available
      if (json.etf_real) {
        let etfData = [];
        if (Array.isArray(json.etf_real.data)) {
          etfData = json.etf_real.data;
        } else if (Array.isArray(json.etf_real)) {
          etfData = json.etf_real;
        }

        if (etfData.length > 0) {
          const mappedEtfs = etfData.slice(0, 5).map((e: any) => ({
            name: e.name || e.fundName || e.ticker || 'Unknown ETF',
            ticker: e.ticker || 'N/A',
            flow_7d: parseFloat(e.netInflow || e.flow_7d || e.net_inflow || 0),
            aum: parseFloat(e.totalNetAssets || e.aum || e.total_net_assets || 0)
          }));
          data.etf_flows = mappedEtfs;
        }
      }

      // Parse real news/macro events if available
      if (json.news_real) {
        let newsData = [];
        if (Array.isArray(json.news_real.data)) {
          newsData = json.news_real.data;
        } else if (Array.isArray(json.news_real)) {
          newsData = json.news_real;
        }

        if (newsData.length > 0) {
          const mappedNews = newsData.slice(0, 5).map((n: any) => ({
            date: n.publishDate ? new Date(n.publishDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Today',
            name: n.title || n.newsTitle || 'Market Update',
            impact: (n.importance || 0) > 3 ? 'HIGH' : (n.importance || 0) > 1 ? 'MED' : 'LOW'
          }));
          data.macro_events = mappedNews;
        }
      }
    }
    return data;
  } catch {
    return data;
  }
}
