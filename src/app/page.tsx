"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { fetchSoSoData, SoSoData } from '@/lib/services/sosoValue';
import { fetchPortfolio, executeTrade, Portfolio } from '@/lib/services/valueChain';
import { useAccount, useBalance } from 'wagmi';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

function PriceChart() {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily')
      .then(r => r.json())
      .then(data => {
        if (data.prices) {
          const labels = [];
          const pts = [];
          // Coingecko returns extra data point for current day, so slice last 30
          for (const p of data.prices.slice(-30)) {
            labels.push(new Date(p[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            pts.push(Math.round(p[1]));
          }
          setChartData({ labels, data: pts });
        }
      })
      .catch(() => {
        // Fallback
        const labels = [];
        const data = [];
        let price = 78000;
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
          price += (Math.random() - 0.45) * 2500;
          data.push(Math.round(price));
        }
        setChartData({ labels, data });
      });
  }, []);

  if (!chartData) return null;

  const data = {
    labels: chartData.labels,
    datasets: [{
      label: 'BTC/USD',
      data: chartData.data,
      borderColor: '#869B7E',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHoverBackgroundColor: '#869B7E',
      fill: true,
      backgroundColor: (context: any) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, 'rgba(134,155,126,0.25)');
        gradient.addColorStop(1, 'rgba(134,155,126,0)');
        return gradient;
      },
      tension: 0.3
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' as const },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#C9CAAC',
        borderColor: 'rgba(127,32,32,0.3)',
        borderWidth: 1,
        titleColor: '#7F2020',
        bodyColor: '#869B7E',
        bodyFont: { family: 'JetBrains Mono', size: 13 },
        callbacks: {
          label: (ctx: any) => ' $' + ctx.raw.toLocaleString()
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(127,32,32,0.1)' },
        ticks: { color: '#7F2020', font: { family: 'JetBrains Mono', size: 10 }, maxTicksLimit: 6, autoSkip: true }
      },
      y: {
        grid: { color: 'rgba(127,32,32,0.1)' },
        ticks: { color: '#7F2020', font: { family: 'JetBrains Mono', size: 10 }, callback: (v: any) => '$' + (v / 1000).toFixed(0) + 'k' }
      }
    }
  };

  return <Line data={data} options={options} />;
}

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { data: ethBalance } = useBalance({ address });
  
  const [clock, setClock] = useState('');
  const [activeTab, setActiveTab] = useState('brief');
  const [isGenerating, setIsGenerating] = useState(false);
  const [briefHTML, setBriefHTML] = useState<string | null>(null);
  const [risksHTML, setRisksHTML] = useState<string | null>(null);
  const [soSoData, setSoSoData] = useState<SoSoData | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [tradeStatus, setTradeStatus] = useState<{loading: boolean, hash: string | null}>({loading: false, hash: null});

  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([
    { role: 'ai', content: "Hello. I'm your AI research copilot, powered by Claude and SoSoValue data. Ask me anything about current market conditions, ETF flows, or specific crypto assets. I can also execute trades via SoDEX when you're ready." }
  ]);

  const addChat = (role: string, text: string) => {
    setChatHistory(prev => [...prev, { role, content: text }]);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    addChat('user', text);
    setChatInput('');

    const systemPrompt = `You are SoSo Copilot, an AI research assistant integrated with SoSoValue market intelligence and SoDEX trading infrastructure. You have access to real-time ETF flow data, crypto indices, macro events, and can suggest trades via SoDEX on ValueChain. Be concise, data-driven, and direct. 2-3 sentences max for simple questions. Always tie analysis to SoSoValue data or SoDEX execution when relevant.
      
      CURRENT BRIEF CONTEXT:
      ${briefHTML ? briefHTML.replace(/<[^>]*>?/gm, '') : 'No brief generated yet.'}`;

    const apiMessages = chatHistory.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content.replace(/<[^>]*>?/gm, '') }));
    apiMessages.push({ role: 'user', content: text });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages.slice(-8), system: systemPrompt })
      });
      if (!res.body) throw new Error('No body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let responseText = '';
      
      setChatHistory(prev => [...prev, { role: 'ai', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        responseText += chunk;
        setChatHistory(prev => {
          const updated = [...prev];
          updated[updated.length - 1].content = responseText.replace(/\\n/g, '<br/>');
          return updated;
        });
      }
    } catch {
      addChat('ai', 'Connection error. Please check your Anthropic API key.');
    }
  };

  const chatAreaRef = useRef<HTMLDivElement>(null);

  const [signal, setSignal] = useState('BULLISH');
  const [confidence, setConfidence] = useState('74');

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toUTCString().slice(17, 25) + ' UTC');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchSoSoData().then(data => setSoSoData(data));
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      fetchPortfolio(address, ethBalance as any).then(data => setPortfolio(data));
    } else if (portfolio !== null) {
      setPortfolio(null);
    }
  }, [isConnected, address, ethBalance, portfolio]);

  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const generateBrief = async () => {
    if (!soSoData) return;
    setIsGenerating(true);
    setBriefHTML('');
    setRisksHTML(null);

    const totalFlow = soSoData.etf_flows.reduce((s, e) => s + e.flow_7d, 0);
    const netSignal = totalFlow > 300 ? 'BULLISH' : totalFlow > 0 ? 'NEUTRAL' : 'BEARISH';

    const prompt = `You are SoSo Copilot, an institutional-grade AI research analyst for crypto markets. You have access to SoSoValue market data.

TODAY'S DATA (${new Date().toDateString()}):
- BTC Price: $${soSoData.btc_price.toLocaleString()} (${soSoData.btc_7d_change > 0 ? '+' : ''}${soSoData.btc_7d_change}% 7d)
- BTC/ETH SSI Index: ${soSoData.indices.btc_eth}
- MAG7 Crypto Index: ${soSoData.indices.mag7}
- Fear & Greed Index: ${soSoData.indices.fear_greed}/100 (Greed)

ETF FLOWS (7-day net):
${soSoData.etf_flows.map(e => `- ${e.ticker}: ${e.flow_7d > 0 ? '+' : ''}$${e.flow_7d}M`).join('\n')}
- TOTAL 7d NET FLOW: ${totalFlow > 0 ? '+' : ''}$${totalFlow.toFixed(1)}M

UPCOMING MACRO EVENTS:
${soSoData.macro_events.map(e => `- ${e.date}: ${e.name} [${e.impact}]`).join('\n')}

Produce a structured market brief with exactly these four sections, formatted with HTML:

1. <strong>Executive Summary</strong> — 3-4 sentences explaining the overall market picture
2. <strong>ETF Flow Analysis</strong> — What the institutional money flow tells us
3. <strong>Key Risks</strong> — 2-3 specific risks to monitor (use <span class="risk"> for risk items)
4. <strong>Signal & Conviction</strong> — State BULLISH/BEARISH/NEUTRAL with a confidence % (0-100) and one-line reasoning

Keep it sharp and analytical. Institutional tone. No fluff. Use <span class="highlight"> for key numbers and <span class="bull-text"> for bullish data points and <span class="risk"> for bearish/risk items.`;

    try {
      const res = await fetch('/api/generate-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!res.body) throw new Error('No body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let html = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        html += chunk;
        setBriefHTML(html);
      }

      const signalMatch = html.match(/\b(BULLISH|BEARISH|NEUTRAL)\b/i);
      const confMatch = html.match(/(\d{2,3})%/);
      const detectedSignal = signalMatch ? signalMatch[1].toUpperCase() : netSignal;
      const conf = confMatch ? confMatch[1] : '71';

      setSignal(detectedSignal);
      setConfidence(conf);

      const risksIdx = html.indexOf('Key Risks');
      const signalIdx = html.indexOf('Signal');
      if (risksIdx !== -1 && signalIdx !== -1) {
        setRisksHTML(html.slice(risksIdx, signalIdx));
      } else {
        setRisksHTML(html);
      }
      addChat('ai', `Brief generated successfully. Signal: **${detectedSignal}** with **${conf}%** confidence. 7-day ETF net flow: ${totalFlow > 0 ? '+' : ''}$${totalFlow.toFixed(0)}M.`);

    } catch {
      setBriefHTML('<strong>Error</strong>: Could not generate brief. Please check your Anthropic API key.');
    }
    setIsGenerating(false);
  };

  const handleExecuteTrade = async () => {
    setTradeStatus({ loading: true, hash: null });
    addChat('user', 'Execute trade on SoDEX based on the current signal.');
    addChat('ai', `Preparing to execute ${signal === 'BULLISH' ? 'BUY' : 'SELL'} order on SoDEX...`);
    
    try {
      const res = await executeTrade('BTC', 1000, signal === 'BULLISH' ? 'BUY' : 'SELL');
      setTradeStatus({ loading: false, hash: res.txHash });
      addChat('ai', `Trade executed successfully. Transaction Hash: \`${res.txHash}\``);
      // Refresh portfolio
      if (address) {
         fetchPortfolio(address, ethBalance as any).then(data => setPortfolio(data));
      }
    } catch {
      setTradeStatus({ loading: false, hash: null });
      addChat('ai', `Trade failed to execute.`);
    }
  };

  const totalFlow = soSoData ? soSoData.etf_flows.reduce((s, e) => s + e.flow_7d, 0) : 0;
  
  // Calculate macro sentiment based on upcoming HIGH impact events within 7 days
  const getMacroSentiment = () => {
    if (!soSoData) return { text: '...', sub: '...' };
    const now = new Date();
    const highEventWithin7Days = soSoData.macro_events.find(e => {
      if (e.impact !== 'HIGH') return false;
      // Parse date - handle format like "May 14"
      const eventDate = new Date(`${e.date}, ${now.getFullYear()}`);
      const diffTime = eventDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    });

    if (highEventWithin7Days) {
      return { text: 'CAUTIOUS', sub: `High Impact in <7d: ${highEventWithin7Days.name}` };
    }
    return { text: 'BULLISH', sub: 'No major macro risks <7d' };
  };
  const macroSent = getMacroSentiment();

  return (
    <div className="shell">
      <header className="topbar">
        <div className="logo">SoSo<span>Copilot</span></div>
        <div className="topbar-right">
          <div className="live-dot" title="Live data"></div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text3)', fontFamily: "'JetBrains Mono', monospace" }}>{clock}</span>
          <div className={`badge ${signal === 'BULLISH' ? 'badge-bull' : signal === 'BEARISH' ? 'badge-bear' : 'badge-neutral'}`}>{signal}</div>
          {/* @ts-ignore */}
          <appkit-button />
        </div>
      </header>

      <div className="main">
        <aside className="sidebar">
          <div className={`nav-item ${activeTab === 'brief' ? 'active' : ''}`} onClick={() => setActiveTab('brief')}><span className="nav-icon">◈</span> Daily Brief</div>
          <div className={`nav-item ${activeTab === 'etf' ? 'active' : ''}`} onClick={() => setActiveTab('etf')}><span className="nav-icon">⬡</span> ETF Flows</div>
          <div className={`nav-item ${activeTab === 'indices' ? 'active' : ''}`} onClick={() => setActiveTab('indices')}><span className="nav-icon">◎</span> Indices</div>
          <div className={`nav-item ${activeTab === 'macro' ? 'active' : ''}`} onClick={() => setActiveTab('macro')}><span className="nav-icon">⟡</span> Macro Events</div>
          <div className={`nav-item ${activeTab === 'portfolio' ? 'active' : ''}`} onClick={() => setActiveTab('portfolio')}><span className="nav-icon">◷</span> Portfolio</div>

          <div className="sidebar-section">Market Indices</div>
          <div className="index-card">
            <div className="index-label">SSI BTC×ETH Index</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div className={`index-val ${!soSoData ? 'skeleton-text' : ''}`}>{soSoData?.indices.btc_eth || '...'}</div>
              {soSoData && <div className={`index-chg ${soSoData.indices.btc_eth_chg >= 0 ? 'up' : 'down'}`}>
                {soSoData.indices.btc_eth_chg >= 0 ? '+' : ''}{soSoData.indices.btc_eth_chg}%
              </div>}
            </div>
          </div>
          <div className="index-card">
            <div className="index-label">SSI MAG7 Index</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div className={`index-val ${!soSoData ? 'skeleton-text' : ''}`}>{soSoData?.indices.mag7 || '...'}</div>
              {soSoData && <div className={`index-chg ${soSoData.indices.mag7_chg >= 0 ? 'up' : 'down'}`}>
                {soSoData.indices.mag7_chg >= 0 ? '+' : ''}{soSoData.indices.mag7_chg}%
              </div>}
            </div>
          </div>
          <div className="index-card">
            <div className="index-label">Fear & Greed</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div className={`index-val ${!soSoData ? 'skeleton-text' : ''}`} style={{ color: 'var(--bull)' }}>{soSoData?.indices.fear_greed || '...'}</div>
              <div className="index-chg" style={{ color: 'var(--text2)' }}>Greed</div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text3)', padding: '0.5rem', lineHeight: 1.6 }}>
              Data: SoSoValue API<br />
              AI: claude-3-5-sonnet-20241022<br />
              Exchange: SoDEX / ValueChain
            </div>
          </div>
        </aside>

        <main className="center">
          <div className="brief-header">
            <div>
              <div className="brief-title">AI Market Brief</div>
              <div className="brief-sub">— {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} —</div>
            </div>
            <button className="gen-btn" disabled={isGenerating} onClick={generateBrief}>
              {isGenerating ? <div className="spinner"></div> : <span>✦</span>}
              <span style={{ marginLeft: '0.5rem' }}>{isGenerating ? 'Generating...' : 'Generate Brief'}</span>
            </button>
          </div>

          <div className="signal-row">
            <div className={`signal-card ${signal.toLowerCase()}`}>
              <div className="signal-label">Overall Signal</div>
              <div className={`signal-val ${signal === 'BULLISH' ? 'up' : signal === 'BEARISH' ? 'down' : ''}`}>{signal}</div>
              <div className="signal-sub">Confidence: {confidence}%</div>
            </div>
            <div className="signal-card">
              <div className="signal-label">BTC ETF Flows (7d)</div>
              <div className={`signal-val ${totalFlow > 0 ? 'up' : 'down'}`}>{(totalFlow > 0 ? '+' : '') + '$' + Math.abs(totalFlow / 1000).toFixed(2) + 'B'}</div>
              <div className="signal-sub">Institutional accumulation</div>
            </div>
            <div className="signal-card">
              <div className="signal-label">Macro Sentiment</div>
              <div className="signal-val" style={{ color: macroSent.text === 'CAUTIOUS' ? 'var(--neutral)' : 'var(--bull)' }}>{macroSent.text}</div>
              <div className="signal-sub">{macroSent.sub}</div>
            </div>
          </div>

          <div className="tabs">
            <div className={`tab ${activeTab === 'brief' ? 'active' : ''}`} onClick={() => setActiveTab('brief')}>Executive Brief</div>
            <div className={`tab ${activeTab === 'etf' ? 'active' : ''}`} onClick={() => setActiveTab('etf')}>ETF Flows</div>
            <div className={`tab ${activeTab === 'macro' ? 'active' : ''}`} onClick={() => setActiveTab('macro')}>Macro Events</div>
            <div className={`tab ${activeTab === 'indices' ? 'active' : ''}`} onClick={() => setActiveTab('indices')}>Market Indices</div>
            <div className={`tab ${activeTab === 'portfolio' ? 'active' : ''}`} onClick={() => setActiveTab('portfolio')}>My Portfolio</div>
            <div className={`tab ${activeTab === 'risks' ? 'active' : ''}`} onClick={() => setActiveTab('risks')}>Risk Analysis</div>
          </div>

          {activeTab === 'brief' && (
            <div>
              <div className="brief-card">
                <div className="brief-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div><span>✦</span> Executive Summary</div>
                  {briefHTML && (
                    <button className="execute-btn" onClick={handleExecuteTrade} disabled={tradeStatus.loading}>
                      {tradeStatus.loading ? 'Executing...' : 'Execute on SoDEX'}
                    </button>
                  )}
                </div>
                <div className="brief-body">
                  {briefHTML ? (
                    <div dangerouslySetInnerHTML={{ __html: briefHTML }}></div>
                  ) : (
                    <>
                      Click <strong>Generate Brief</strong> above to produce your AI-powered market analysis. The brief will synthesize ETF flow data, macro events, and SoSoValue indices to give you institutional-grade research with a clear BULLISH / BEARISH / NEUTRAL signal and confidence score.
                    </>
                  )}
                </div>
                {tradeStatus.hash && (
                  <div style={{ marginTop: '1rem', padding: '0.8rem', background: 'rgba(134,155,126,0.1)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.8rem', fontFamily: "'JetBrains Mono', monospace" }}>
                    <span style={{ color: 'var(--bull)' }}>✓ Trade Executed</span><br/>
                    Hash: {tradeStatus.hash}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'indices' && (
            <div>
              <div className="brief-card">
                <div className="brief-card-title"><span>◎</span> Market Indices Breakdown</div>
                <div className="brief-body">
                  The SSI (SoSo Institutional) Indices track the relative strength and flow of institutional capital across major asset classes.
                  <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="index-card" style={{ border: '1px solid var(--border)', background: 'var(--bg2)' }}>
                      <div className="index-label">BTC×ETH Index</div>
                      <div className="index-val">{soSoData?.indices.btc_eth}</div>
                      <div className={`index-chg ${soSoData && soSoData.indices.btc_eth_chg >= 0 ? 'up' : 'down'}`}>
                        {soSoData && (soSoData.indices.btc_eth_chg >= 0 ? '+' : '')}{soSoData?.indices.btc_eth_chg}% vs 7d ago
                      </div>
                    </div>
                    <div className="index-card" style={{ border: '1px solid var(--border)', background: 'var(--bg2)' }}>
                      <div className="index-label">MAG7 Crypto Index</div>
                      <div className="index-val">{soSoData?.indices.mag7}</div>
                      <div className={`index-chg ${soSoData && soSoData.indices.mag7_chg >= 0 ? 'up' : 'down'}`}>
                        {soSoData && (soSoData.indices.mag7_chg >= 0 ? '+' : '')}{soSoData?.indices.mag7_chg}% vs 7d ago
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div>
              <div className="brief-card">
                <div className="brief-card-title"><span>◷</span> Portfolio Analysis</div>
                <div className="brief-body">
                  {isConnected ? (
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text1)' }}>${portfolio?.totalValueUsd.toLocaleString()}</div>
                      <div className="up">+{portfolio?.changePctToday}% today</div>
                      <div style={{ marginTop: '1.5rem' }}>
                        <table className="etf-table">
                          <thead>
                            <tr><th>Asset</th><th>Amount</th><th>Value</th><th>Allocation</th></tr>
                          </thead>
                          <tbody>
                            {portfolio?.holdings.map((h, i) => (
                              <tr key={i}>
                                <td>{h.asset} ({h.ticker})</td>
                                <td className="mono">{h.amount.toLocaleString()}</td>
                                <td className="mono">${h.valueUsd.toLocaleString()}</td>
                                <td className="mono">{h.allocationPct}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                      Connect your wallet to see your real-time portfolio analysis and on-chain holdings.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'etf' && (
            <div>
              <div className="brief-card">
                <div className="brief-card-title"><span>◈</span> BTC Spot ETF — 7-Day Flow Summary</div>
                <table className="etf-table">
                  <thead>
                    <tr><th>Fund</th><th>Ticker</th><th>7d Net Flow</th><th>AUM</th><th>Signal</th></tr>
                  </thead>
                  <tbody>
                    {soSoData ? soSoData.etf_flows.map((etf, i) => (
                      <tr key={i}>
                        <td>{etf.name}</td>
                        <td className="mono">{etf.ticker}</td>
                        <td className={`mono ${etf.flow_7d > 0 ? 'up' : 'down'}`}>{etf.flow_7d > 0 ? '+' : ''}${Math.abs(etf.flow_7d).toFixed(1)}M</td>
                        <td className="mono">${(etf.aum / 1000).toFixed(1)}B</td>
                        <td><span className={`badge ${etf.flow_7d > 0 ? 'badge-bull' : 'badge-bear'}`}>{etf.flow_7d > 0 ? 'INFLOW' : 'OUTFLOW'}</span></td>
                      </tr>
                    )) : <tr><td colSpan={5} style={{ color: 'var(--text3)', textAlign: 'center', padding: '2rem' }}>Loading data...</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'macro' && (
            <div>
              <div className="brief-card">
                <div className="brief-card-title"><span>⟡</span> Upcoming Macro Events</div>
                <div className="event-list">
                  {soSoData?.macro_events.map((e, i) => (
                    <div className="event-item" key={i}>
                      <div className="event-time">{e.date}</div>
                      <div className="event-name">{e.name}</div>
                      <div className={`event-impact impact-${e.impact.toLowerCase()}`}>{e.impact}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'risks' && (
            <div>
              <div className="brief-card">
                <div className="brief-card-title"><span>⚠</span> Risk Factors</div>
                <div className="brief-body">
                  {risksHTML ? (
                    <div dangerouslySetInnerHTML={{ __html: risksHTML }}></div>
                  ) : (
                    'Generate a brief to surface AI-identified risk factors for the current market environment.'
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="brief-card">
            <div className="brief-card-title"><span>◎</span> BTC Price (30d) — Oracle</div>
            <div className="chart-wrap">
              <PriceChart />
            </div>
          </div>
        </main>

        <aside className="right-panel">
          <div className="portfolio-section">
            <div className="portfolio-title">Portfolio Value</div>
            {isConnected ? (
              <>
                <div className="portfolio-total">${portfolio ? portfolio.totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '...'}</div>
                <div className="portfolio-chg up">+{portfolio ? `$${portfolio.changeUsdToday.toFixed(2)} (${portfolio.changePctToday}%)` : '...'} today</div>

                <div style={{ marginTop: '1rem' }}>
                  {portfolio?.holdings.map((h, i) => (
                    <div className="holding-row" key={i}>
                      <div>
                        <div className="holding-name">{h.asset}</div>
                        <div className="holding-alloc">{h.ticker} · {h.amount.toLocaleString(undefined, {maximumFractionDigits: 4})}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className={`mono ${h.priceChange > 0 ? 'up' : h.priceChange < 0 ? 'down' : ''}`}>${h.valueUsd.toLocaleString()}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>{h.allocationPct}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text3)', fontSize: '0.8rem', padding: '1rem 0' }}>
                Connect wallet to view portfolio.
              </div>
            )}
          </div>

          <div className="panel-header">
            <span style={{ color: 'var(--accent)' }}>✦</span> AI Research Assistant
          </div>
          <div className="chat-area" ref={chatAreaRef}>
            {chatHistory.map((m, i) => (
              <div className={`msg ${m.role === 'user' ? 'user' : 'ai'}`} key={i}>
                <div className="msg-meta">{m.role === 'ai' ? 'SoSo Copilot' : 'You'}</div>
                <div className="msg-bubble" dangerouslySetInnerHTML={{ __html: m.content.replace(/\n/g, '<br/>') }}></div>
              </div>
            ))}
          </div>
          <form className="chat-input-area" onSubmit={handleChatSubmit}>
            <textarea
              className="chat-input"
              rows={2}
              placeholder="Ask about markets, signals, or trade ideas..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(e as any); } }}
            ></textarea>
            <button type="submit" className="chat-send">↑</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
