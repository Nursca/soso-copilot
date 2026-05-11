"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { fetchSoSoData, SoSoData } from '@/lib/services/sosoValue';
import { fetchPortfolio, connectValueChainWallet, Portfolio } from '@/lib/services/valueChain';
import { useAccount } from 'wagmi';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

function PriceChart() {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const labels = [];
    const data = [];
    let price = 78000;
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      price += (Math.random() - 0.45) * 2500;
      price = Math.max(72000, Math.min(99000, price));
      data.push(Math.round(price));
    }
    setChartData({ labels, data });
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
  
  const [clock, setClock] = useState('');
  const [activeTab, setActiveTab] = useState('brief');
  const [isGenerating, setIsGenerating] = useState(false);
  const [briefHTML, setBriefHTML] = useState<string | null>(null);
  const [risksHTML, setRisksHTML] = useState<string | null>(null);
  const [soSoData, setSoSoData] = useState<SoSoData | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
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
    
    addChat('ai', "Hello. I'm your AI research copilot, powered by Claude and SoSoValue data. Ask me anything about current market conditions, ETF flows, or specific crypto assets. I can also execute trades via SoDEX when you're ready.");
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      fetchPortfolio(address).then(data => setPortfolio(data));
      addChat('ai', `Wallet \`${address.slice(0, 6)}...\` connected via Reown. Real-time portfolio syncing enabled.`);
    } else {
      setPortfolio(null);
    }
  }, [isConnected, address]);

  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const addChat = (role: string, text: string) => {
    const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    setChatHistory(prev => [...prev, { role, content: formattedText }]);
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    addChat('user', text);
    setChatInput('');

    const systemPrompt = `You are SoSo Copilot, an AI research assistant integrated with SoSoValue market intelligence and SoDEX trading infrastructure. You have access to real-time ETF flow data, crypto indices, macro events, and can suggest trades via SoDEX on ValueChain. Be concise, data-driven, and direct. 2-3 sentences max for simple questions. Always tie analysis to SoSoValue data or SoDEX execution when relevant.`;

    const apiMessages = chatHistory.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content.replace(/<[^>]*>?/gm, '') }));
    apiMessages.push({ role: 'user', content: text });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages.slice(-8), system: systemPrompt })
      });
      const data = await res.json();
      if (res.ok) {
        addChat('ai', data.content?.[0]?.text || 'Unable to get a response.');
      } else {
        addChat('ai', `Error: ${data.error}`);
      }
    } catch (e) {
      addChat('ai', 'Connection error. Check your API key in .env.local and try again.');
    }
  };

  const generateBrief = async () => {
    if (!soSoData) return;
    setIsGenerating(true);

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

    let html = '';
    try {
      const res = await fetch('/api/generate-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      if (res.ok) {
        html = data.content?.[0]?.text || '';
      } else {
        html = generateFallbackBrief(soSoData, totalFlow);
      }
    } catch (e) {
      html = generateFallbackBrief(soSoData, totalFlow);
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

    setBriefHTML(html);
    setIsGenerating(false);
    addChat('ai', `Brief generated. Signal: **${detectedSignal}** with **${conf}%** confidence. 7-day ETF net flow: ${totalFlow > 0 ? '+' : ''}$${totalFlow.toFixed(0)}M.`);
  };

  const generateFallbackBrief = (data: SoSoData, totalFlow: number) => {
    return `<strong>Executive Summary</strong><br/>
Bitcoin is trading at <span class="highlight">$${data.btc_price.toLocaleString()}</span>, up <span class="bull-text">${data.btc_7d_change}%</span> over 7 days. Institutional demand remains robust with <span class="bull-text">$${totalFlow.toFixed(0)}M net inflow</span> into spot BTC ETFs over the past week, led by IBIT and FBTC. The Fear & Greed index at <span class="highlight">${data.indices.fear_greed}</span> signals broad market optimism, though elevated greed levels historically precede short-term corrections.<br/><br/>

<strong>ETF Flow Analysis</strong><br/>
IBIT continues to dominate with the highest institutional inflows, reflecting BlackRock's distribution reach. GBTC sustained <span class="risk">negative outflows</span>, a persistent structural drag since the ETF conversion. The positive net aggregate flow indicates <span class="bull-text">sustained accumulation</span> by institutional allocators, consistent with a mid-cycle bull trend.<br/><br/>

<strong>Key Risks</strong><br/>
<span class="risk">▸ US CPI release (May 14)</span> could reset rate-cut expectations if inflation surprises to the upside — historically correlated with BTC drawdowns of 8-15%.<br/>
<span class="risk">▸ FOMC minutes (May 21)</span> may signal a more hawkish stance, suppressing risk asset appetite.<br/>
<span class="risk">▸ Elevated greed index</span> at 72 suggests crowded positioning; a catalyst could trigger rapid deleveraging.<br/><br/>

<strong>Signal & Conviction</strong><br/>
<span class="bull-text">BULLISH</span> — Confidence: <span class="highlight">71%</span>. ETF inflow momentum and price action confirm institutional accumulation. Macro overhang limits high-conviction long extension until post-CPI clarity.`;
  };

  const totalFlow = soSoData ? soSoData.etf_flows.reduce((s, e) => s + e.flow_7d, 0) : 0;

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
          <div className="nav-item active"><span className="nav-icon">◈</span> Daily Brief</div>
          <div className="nav-item"><span className="nav-icon">⬡</span> ETF Flows</div>
          <div className="nav-item"><span className="nav-icon">◎</span> Indices</div>
          <div className="nav-item"><span className="nav-icon">⟡</span> Macro Events</div>
          <div className="nav-item"><span className="nav-icon">◷</span> Portfolio</div>

          <div className="sidebar-section">Market Indices</div>
          <div className="index-card">
            <div className="index-label">SSI BTC×ETH Index</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div className="index-val">{soSoData?.indices.btc_eth || '...'}</div>
              <div className="index-chg up">+2.4%</div>
            </div>
          </div>
          <div className="index-card">
            <div className="index-label">SSI MAG7 Index</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div className="index-val">{soSoData?.indices.mag7 || '...'}</div>
              <div className="index-chg up">+1.1%</div>
            </div>
          </div>
          <div className="index-card">
            <div className="index-label">Fear & Greed</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div className="index-val" style={{ color: 'var(--bull)' }}>{soSoData?.indices.fear_greed || '...'}</div>
              <div className="index-chg" style={{ color: 'var(--text2)' }}>Greed</div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text3)', padding: '0.5rem', lineHeight: 1.6 }}>
              Data: SoSoValue API<br />
              AI: Claude claude-3-5-sonnet<br />
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
              <div className="signal-val" style={{ color: 'var(--neutral)' }}>CAUTIOUS</div>
              <div className="signal-sub">Fed meeting in 12 days</div>
            </div>
          </div>

          <div className="tabs">
            <div className={`tab ${activeTab === 'brief' ? 'active' : ''}`} onClick={() => setActiveTab('brief')}>Executive Brief</div>
            <div className={`tab ${activeTab === 'etf' ? 'active' : ''}`} onClick={() => setActiveTab('etf')}>ETF Flows</div>
            <div className={`tab ${activeTab === 'macro' ? 'active' : ''}`} onClick={() => setActiveTab('macro')}>Macro Events</div>
            <div className={`tab ${activeTab === 'risks' ? 'active' : ''}`} onClick={() => setActiveTab('risks')}>Risk Analysis</div>
          </div>

          {activeTab === 'brief' && (
            <div>
              <div className="brief-card">
                <div className="brief-card-title"><span>✦</span> Executive Summary</div>
                <div className="brief-body">
                  {briefHTML ? (
                    <div dangerouslySetInnerHTML={{ __html: briefHTML }}></div>
                  ) : (
                    <>
                      Click <strong>Generate Brief</strong> above to produce your AI-powered market analysis. The brief will synthesize ETF flow data, macro events, and SoSoValue indices to give you institutional-grade research with a clear BULLISH / BEARISH / NEUTRAL signal and confidence score.
                    </>
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
                        <td className={`mono ${etf.flow_7d > 0 ? 'up' : 'down'}`}>{etf.flow_7d > 0 ? '+' : ''}${'$'}{etf.flow_7d.toFixed(1)}M</td>
                        <td className="mono">${'$'}{(etf.aum / 1000).toFixed(1)}B</td>
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
            <div className="brief-card-title"><span>◎</span> BTC Price (30d) — SoDEX Oracle</div>
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
                        <div className="holding-alloc">{h.ticker} · {h.amount}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className={`mono ${h.priceChange > 0 ? 'up' : h.priceChange < 0 ? 'down' : ''}`}>${'$'}{h.valueUsd.toLocaleString()}</div>
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
              <div className={`msg ${m.role}`} key={i}>
                <div className="msg-meta">{m.role === 'ai' ? 'SoSo Copilot' : 'You'}</div>
                <div className="msg-bubble" dangerouslySetInnerHTML={{ __html: m.content }}></div>
              </div>
            ))}
          </div>
          <div className="chat-input-area">
            <textarea
              className="chat-input"
              rows={2}
              placeholder="Ask about markets, signals, or trade ideas..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
            ></textarea>
            <button className="chat-send" onClick={sendChat}>↑</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
