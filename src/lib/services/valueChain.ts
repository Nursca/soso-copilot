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
export async function fetchPortfolio(address: string, ethBalance?: { formatted: string; symbol: string }): Promise<Portfolio> {
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const realEthAmount = ethBalance ? parseFloat(ethBalance.formatted) : 2.42;
  const ethPrice = 2450; // Mock ETH price
  const ethValueUsd = realEthAmount * ethPrice;
  
  const btcValueUsd = 16890;
  const sosoValueUsd = 2001;
  const totalValueUsd = btcValueUsd + ethValueUsd + sosoValueUsd;

  return {
    totalValueUsd,
    changeUsdToday: 583.20,
    changePctToday: 2.4,
    holdings: [
      {
        asset: "Ethereum",
        ticker: "ETH",
        amount: realEthAmount,
        valueUsd: ethValueUsd,
        allocationPct: Math.round((ethValueUsd / totalValueUsd) * 100),
        priceChange: 3.5
      },
      {
        asset: "Bitcoin",
        ticker: "BTC",
        amount: 0.185,
        valueUsd: btcValueUsd,
        allocationPct: Math.round((btcValueUsd / totalValueUsd) * 100),
        priceChange: 2.1
      },
      {
        asset: "SoSoValue",
        ticker: "SOSO",
        amount: 8200,
        valueUsd: sosoValueUsd,
        allocationPct: Math.round((sosoValueUsd / totalValueUsd) * 100),
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
