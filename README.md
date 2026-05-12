# SoSo Copilot ◈ Institutional Intelligence for Retail Traders

**An AI-powered personal finance copilot designed for the On-Chain Retail Trader.** 

SoSo Copilot synthesizes live institutional ETF flows, macro calendar events, and crypto indices from **SoSoValue**, uses **Claude 3.5 Sonnet** to generate actionable daily market signals, and provides a direct pathway for on-chain execution via **SoDEX**.

## ◈ Value Proposition

In a market increasingly dominated by institutional spot ETFs and complex macro variables, retail traders often lack the "big picture" data used by hedge funds. SoSo Copilot bridges this gap by:
- **Democratizing Data**: Surfacing real-time institutional flow data that was previously hard to find or interpret.
- **AI-Driven Synthesis**: Using advanced LLMs to process hundreds of data points into a single, actionable market brief.
- **One-Click Execution**: Closing the loop between research and action with integrated wallet support and simulated trade execution.

## ◈ Features
- **Daily Market Briefs**: Synthesizes complex market data into clear BULLISH/BEARISH/NEUTRAL signals with confidence scores.
- **AI Research Assistant**: Chat with Claude in real-time about current market conditions, specific ETF flows, or trade ideas.
- **Live SoSoValue Data**: Integrates real-time Bitcoin spot ETF flows and upcoming macroeconomic events via the SoSoValue API.
- **Web3 Wallet Integration**: Connect via **Reown AppKit** to view your real on-chain balances and portfolio performance.
- **SoDEX Execution**: Act on AI-generated research by simulating trades directly through the unified dashboard with mock transaction tracking.

## ◈ Setup & Installation

Follow these steps to run the prototype locally:

1. **Clone and Install**
   ```bash
   git clone https://github.com/Nursca/soso-copilot.git
   cd soso-copilot
   npm install
   ```

2. **Environment Configuration**
   Copy the `.env.example` file to create your local environment file:
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and add your required API keys:
   - `ANTHROPIC_API_KEY`: For AI generation (get from [Anthropic Console](https://console.anthropic.com/))
   - `SOSOVALUE_API_KEY`: For market data (get from [SoSoValue](https://sosovalue.com/api))
   - `NEXT_PUBLIC_REOWN_PROJECT_ID`: For wallet connection (get from [Reown Cloud](https://cloud.reown.com/))

3. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## ◈ Technical Architecture

- **Frontend**: Next.js 16 (App Router), React 19, Vanilla CSS (focused on high-signal typography and layout).
- **Backend**: Serverless Route Handlers using **Vercel AI SDK** for streaming Claude 3.5 Sonnet responses.
- **Market Data**: **SoSoValue API** for ETF flows and macro events; **CoinGecko API** for real-time 30-day BTC price charts.
- **Web3 Layer**: `@reown/appkit`, `wagmi`, and `viem` for cross-platform wallet connectivity and on-chain data fetching.
- **Execution**: Simulated trade flow ("SoDEX") demonstrating how AI insights can trigger on-chain actions.

---
*Built for the 2026 SoSoValue Hackathon.*
