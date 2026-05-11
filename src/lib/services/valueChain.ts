export interface Holding {
  asset: string;
  ticker: string;
  amount: number;
  valueUsd: number;
  allocationPct: number;
  priceChange: number;
}

export interface Portfolio {
  totalValueUsd: number;
  changeUsdToday: number;
  changePctToday: number;
  holdings: Holding[];
}

// Mock wallet connection
export async function connectValueChainWallet(): Promise<string> {
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 800));
  return "0x7F20...869B";
}

// Mock portfolio fetch
export async function fetchPortfolio(address: string): Promise<Portfolio> {
  await new Promise(resolve => setTimeout(resolve, 600));
  
  return {
    totalValueUsd: 24831.50,
    changeUsdToday: 583.20,
    changePctToday: 2.4,
    holdings: [
      {
        asset: "Bitcoin",
        ticker: "BTC",
        amount: 0.185,
        valueUsd: 16890,
        allocationPct: 68,
        priceChange: 2.1
      },
      {
        asset: "Ethereum",
        ticker: "ETH",
        amount: 2.42,
        valueUsd: 5940,
        allocationPct: 24,
        priceChange: 3.5
      },
      {
        asset: "SoSoValue",
        ticker: "SOSO",
        amount: 8200,
        valueUsd: 2001,
        allocationPct: 8,
        priceChange: -0.5
      }
    ]
  };
}

export async function executeTrade(ticker: string, amountUsd: number, side: 'BUY' | 'SELL'): Promise<{ success: boolean; txHash: string }> {
  // Simulate transaction signing and execution on ValueChain
  await new Promise(resolve => setTimeout(resolve, 1500));
  return {
    success: true,
    txHash: "0x" + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2)
  };
}
