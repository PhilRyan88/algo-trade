import { useState, useEffect } from 'react';
import { Target, TrendingUp, AlertCircle, TrendingDown, Zap, Power, BarChart3, Clock, Trophy } from 'lucide-react';

interface Trade {
  _id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  strategy: string;
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number;
  target: number;
  quantity: number;
  pnl: number;
  status: 'OPEN' | 'TARGET_HIT' | 'SL_HIT' | 'CLOSED';
  confidence: number;
  mlScore: number;
  reason: string;
  openedAt: string;
  closedAt: string | null;
}

interface MlStatus {
  isLoaded: boolean;
  lastAccuracy: number;
  lastLoss: number;
  samplesCount: number;
}

interface TodaySummary {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  totalPnl: number;
  winCount: number;
  lossCount: number;
  winRate: string;
}

interface Stats {
  totalTrades: number;
  totalPnl: number;
  startingBalance: number;
  currentBalance: number;
  winCount: number;
  lossCount: number;
  winRate: string;
  avgWin: string;
  avgLoss: string;
  strategies: Record<string, { count: number; pnl: number; wins: number }>;
  openTrades: number;
}

const STRATEGY_COLORS: Record<string, string> = {
  FVG: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  LIQUIDITY_SWEEP: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  BREAKOUT: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  EMA_CROSSOVER: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
};

const STRATEGY_LABELS: Record<string, string> = {
  FVG: 'Fair Value Gap',
  LIQUIDITY_SWEEP: 'Liquidity Sweep',
  BREAKOUT: 'Breakout',
  EMA_CROSSOVER: 'EMA Crossover',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-500/15 text-blue-400',
  TARGET_HIT: 'bg-emerald-500/15 text-emerald-400',
  SL_HIT: 'bg-red-500/15 text-red-400',
  CLOSED: 'bg-gray-500/15 text-gray-400',
};

export default function PaperTradePage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isEngineRunning, setIsEngineRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [mlStatus, setMlStatus] = useState<MlStatus | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [showTrainModal, setShowTrainModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [showCapitalModal, setShowCapitalModal] = useState(false);
  const [newCapital, setNewCapital] = useState('15000');
  const [strategyLogs, setStrategyLogs] = useState<any[]>([]);

  const fetchToday = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/trades/today`);
      const json = await res.json();
      if (json.success) {
        setTrades(json.data.trades);
        setSummary(json.data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch today trades', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/trades/stats`);
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/trades/history?limit=100`);
      const json = await res.json();
      if (json.success) setTrades(json.data);
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  };

  const fetchEngineStatus = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/trades/engine/status`);
      const json = await res.json();
      if (json.success) setIsEngineRunning(json.isRunning);
    } catch (err) {
      console.error('Failed to fetch engine status', err);
    }
  };

  const fetchMlStatus = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/trades/ml/status`);
      const json = await res.json();
      if (json.success) setMlStatus(json.data);
    } catch (err) {
      console.error('Failed to fetch ML status', err);
    }
  };

  const updateCapital = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/trades/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startingCapital: Number(newCapital) })
      });
      const json = await res.json();
      if (json.success) {
        setNotification({ type: 'success', message: 'Starting capital updated successfully!' });
        fetchStats();
        fetchToday();
      } else {
        setNotification({ type: 'error', message: json.message || 'Failed to update capital' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Network error occurred' });
    } finally {
      setShowCapitalModal(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_API_URL?.replace('http', 'ws') || 'ws://localhost:5000/api';
    const ws = new WebSocket(`${wsUrl}/ws`);
    
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'strategy_log' && msg.data) {
          setStrategyLogs(prev => {
            const next = [msg.data, ...prev];
            if (next.length > 30) return next.slice(0, 30);
            return next;
          });
          fetchToday();
          fetchStats();
        }
      } catch {}
    };

    return () => ws.close();
  }, []);

  const trainModel = async () => {
    setIsTraining(true);
    setShowTrainModal(false);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/trades/ml/train/backtest`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const json = await res.json();
      
      if (json.success) {
        setNotification({ type: 'success', message: 'Backtest training started! This will take about a minute.' });
      } else {
        setNotification({ type: 'error', message: json.message || 'Failed to start training' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Network error or server unavailable' });
    } finally {
      setIsTraining(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  useEffect(() => {
    fetchEngineStatus();
    fetchToday();
    fetchStats();
    fetchMlStatus();

    // Auto-refresh every 30 seconds ONLY if engine is running
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isEngineRunning) {
      interval = setInterval(() => {
        if (activeTab === 'today') fetchToday();
        fetchStats();
      }, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isEngineRunning, activeTab]);

  useEffect(() => {
    if (activeTab === 'today') fetchToday();
    else fetchHistory();
  }, [activeTab]);

  const toggleEngine = async () => {
    const action = isEngineRunning ? 'stop' : 'start';
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/trades/engine/${action}`, { method: 'POST' });
      setIsEngineRunning(!isEngineRunning);
    } catch (err) {
      console.error('Failed to toggle engine', err);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Target className="w-6 h-6 text-primary" />
            Automated Paper Trading
          </h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered strategy execution during market hours</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleEngine}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg ${
              isEngineRunning
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
            }`}
          >
            {isEngineRunning ? <Zap className="w-4 h-4" /> : <Power className="w-4 h-4" />}
            {isEngineRunning ? 'Engine Running' : 'Engine Stopped'}
          </button>
        </div>
      </div>

      {/* ML Model Status */}
      {mlStatus && (
        <div className="bg-[#0F0F0F]/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full ${mlStatus.isLoaded ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">Signal Scorer (TF.js)</span>
              <p className="text-sm text-gray-300">
                {mlStatus.isLoaded 
                  ? `Model Active • Accuracy: ${(mlStatus.lastAccuracy * 100).toFixed(1)}% • Samples: ${mlStatus.samplesCount}`
                  : 'Model not trained yet'}
              </p>
            </div>
          </div>
          {mlStatus.lastLoss > 0 && (
            <div className="text-right">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">Loss</span>
              <p className="text-sm font-mono text-gray-400">{mlStatus.lastLoss.toFixed(4)}</p>
            </div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          <div className="bg-[#0F0F0F]/80 border border-white/5 rounded-2xl p-4 ring-1 ring-white/5">
            <p className="text-xs text-gray-500 mb-1">Current Balance</p>
            <p className="text-xl font-bold text-white font-mono">
              ₹{stats.currentBalance?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-[#0F0F0F]/80 border border-white/5 rounded-2xl p-4 relative group hover:border-primary/40 transition-all cursor-pointer shadow-lg hover:shadow-primary/5" onClick={() => { setNewCapital(stats.startingBalance.toString()); setShowCapitalModal(true); }}>
            <p className="text-xs text-gray-500 mb-1 flex items-center justify-between">
              Starting Capital
              <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">Edit</span>
            </p>
            <p className="text-xl font-bold text-white font-mono">
              ₹{stats.startingBalance?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-[#0F0F0F]/80 border border-white/5 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">Total P&L</p>
            <p className={`text-xl font-bold font-mono ${stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {stats.totalPnl >= 0 ? '+' : ''}₹{stats.totalPnl.toFixed(0)}
            </p>
          </div>
          <div className="bg-[#0F0F0F]/80 border border-white/5 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">Win Rate</p>
            <p className="text-xl font-bold text-white font-mono">{stats.winRate}%</p>
          </div>
          <div className="bg-[#0F0F0F]/80 border border-white/5 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">Total Trades</p>
            <p className="text-xl font-bold text-white font-mono">{stats.totalTrades}</p>
          </div>
          <div className="bg-[#0F0F0F]/80 border border-white/5 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">Avg Win</p>
            <p className="text-xl font-bold text-emerald-400 font-mono">+₹{parseFloat(stats.avgWin).toFixed(0)}</p>
          </div>
          <div className="bg-[#0F0F0F]/80 border border-white/5 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">Avg Loss</p>
            <p className="text-xl font-bold text-red-400 font-mono">₹{parseFloat(stats.avgLoss).toFixed(0)}</p>
          </div>
        </div>
      )}

      {/* Strategy Performance */}
      {stats && Object.keys(stats.strategies).length > 0 && (
        <div className="bg-[#0F0F0F]/80 border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4" /> Strategy Performance
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(stats.strategies).map(([strategy, data]) => (
              <div key={strategy} className={`rounded-xl p-3 border ${STRATEGY_COLORS[strategy] || 'bg-white/5 text-white border-white/10'}`}>
                <p className="text-xs font-medium mb-1">{STRATEGY_LABELS[strategy] || strategy}</p>
                <p className={`text-lg font-bold font-mono ${data.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {data.pnl >= 0 ? '+' : ''}₹{data.pnl.toFixed(0)}
                </p>
                <p className="text-xs opacity-70 mt-0.5">
                  {data.wins}/{data.count} wins ({data.count > 0 ? ((data.wins/data.count)*100).toFixed(0) : 0}%)
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Activity Audit Feed */}
      <div className="bg-[#0F0F0F]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary animate-pulse" /> Live Strategy Scan & Activity Feed
          </h3>
          <span className="text-xs text-gray-500 font-mono">Real-time server logs</span>
        </div>
        
        {strategyLogs.length === 0 ? (
          <div className="h-32 flex items-center justify-center border border-dashed border-white/5 rounded-2xl bg-black/20">
            <p className="text-xs text-gray-600 font-mono">Waiting for next 5-minute candle close scan...</p>
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-2.5 pr-2 font-mono scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
            {strategyLogs.map((log, i) => {
              const date = new Date(log.timestamp);
              const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              
              const isTrade = log.signalGenerated !== 'NONE';
              const isRejected = log.rejectedReason !== '';
              
              return (
                <div key={i} className={`p-3 rounded-xl border text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  isTrade && !isRejected 
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' 
                    : isRejected && log.signalGenerated !== 'NONE'
                    ? 'bg-amber-500/5 border-amber-500/20 text-amber-300'
                    : 'bg-white/[0.02] border-white/5 text-gray-400'
                }`}>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded font-bold">{timeStr}</span>
                      <span className="font-bold text-white">{log.symbol}</span>
                      <span className="text-gray-500 text-[10px]">Spot: ₹{log.spotPrice?.toFixed(2)}</span>
                      {log.optionStrike > 0 && (
                        <span className="text-gray-400 font-semibold text-[10px]">({log.optionStrike} {log.optionType})</span>
                      )}
                    </div>
                    
                    <div className="text-[10px] text-gray-500 flex gap-x-4 gap-y-1 flex-wrap">
                      <span>VWAP: {log.vwap?.toFixed(1)}</span>
                      <span>EMA9: {log.ema9?.toFixed(1)}</span>
                      <span>RSI: {log.rsi?.toFixed(1)}</span>
                      <span>ATR: {log.atr?.toFixed(1)}</span>
                      <span>Vol: {log.volume}</span>
                    </div>
                  </div>
                  
                  <div className="text-right flex flex-col items-start md:items-end gap-1 font-bold">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500">Score:</span>
                      <span className={log.score >= 70 ? 'text-emerald-400 font-bold' : 'text-gray-500'}>{log.score}</span>
                    </div>
                    
                    {isRejected ? (
                      <span className="text-[10px] text-amber-500/90 font-medium">REJECTED: {log.rejectedReason}</span>
                    ) : isTrade ? (
                      <span className="text-[10px] text-emerald-400 font-medium animate-pulse">EXECUTION: Order Placed!</span>
                    ) : (
                      <span className="text-[10px] text-gray-600 font-medium">Scan finished • No Setup</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Today Summary Bar */}
      {summary && activeTab === 'today' && (
        <div className="bg-[#0F0F0F] border border-white/5 rounded-2xl p-4 flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-xs text-gray-500">Today's P&L</p>
            <p className={`text-lg font-bold font-mono ${summary.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {summary.totalPnl >= 0 ? '+' : ''}₹{summary.totalPnl.toFixed(2)}
            </p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <p className="text-xs text-gray-500">Open</p>
            <p className="text-lg font-bold text-blue-400 font-mono">{summary.openTrades}</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <p className="text-xs text-gray-500">W / L</p>
            <p className="text-lg font-bold font-mono">
              <span className="text-emerald-400">{summary.winCount}</span>
              <span className="text-gray-600"> / </span>
              <span className="text-red-400">{summary.lossCount}</span>
            </p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <p className="text-xs text-gray-500">Win Rate</p>
            <p className="text-lg font-bold text-white font-mono">{summary.winRate}%</p>
          </div>
        </div>
      )}

      {/* Tab Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('today')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'today'
              ? 'bg-primary/20 text-primary'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-1.5" />Today's Trades
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'history'
              ? 'bg-primary/20 text-primary'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-1.5" />All History
        </button>
      </div>

      {/* Trades Table */}
      <div className="bg-[#0F0F0F]/80 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl overflow-hidden">
        {trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6">
            <AlertCircle className="w-12 h-12 text-gray-600 mb-3" />
            <p className="text-gray-400">No trades yet</p>
            <p className="text-sm text-gray-600 mt-1">
              {isEngineRunning
                ? 'The strategy engine is running and will execute trades during market hours (9:15 AM – 3:20 PM)'
                : 'Start the engine to begin automated trading'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-gray-500 font-medium">Time</th>
                  <th className="text-left p-4 text-gray-500 font-medium">Symbol</th>
                  <th className="text-left p-4 text-gray-500 font-medium">Side</th>
                  <th className="text-left p-4 text-gray-500 font-medium">Strategy</th>
                  <th className="text-right p-4 text-gray-500 font-medium">Entry</th>
                  <th className="text-right p-4 text-gray-500 font-medium">SL</th>
                  <th className="text-right p-4 text-gray-500 font-medium">Target</th>
                  <th className="text-right p-4 text-gray-500 font-medium">Exit</th>
                  <th className="text-right p-4 text-gray-500 font-medium">ML Score</th>
                  <th className="text-right p-4 text-gray-500 font-medium">P&L</th>
                  <th className="text-center p-4 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade._id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="text-white font-mono text-xs">{formatTime(trade.openedAt)}</div>
                      <div className="text-gray-600 text-xs">{formatDate(trade.openedAt)}</div>
                    </td>
                    <td className="p-4 text-white font-semibold">{trade.symbol}</td>
                    <td className="p-4">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        trade.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-md border ${
                        STRATEGY_COLORS[trade.strategy] || 'bg-white/5 text-white border-white/10'
                      }`}>
                        {STRATEGY_LABELS[trade.strategy] || trade.strategy}
                      </span>
                    </td>
                    <td className="p-4 text-right text-white font-mono">{trade.entryPrice.toFixed(2)}</td>
                    <td className="p-4 text-right text-red-400/70 font-mono text-xs">{trade.stopLoss.toFixed(2)}</td>
                    <td className="p-4 text-right text-emerald-400/70 font-mono text-xs">{trade.target.toFixed(2)}</td>
                    <td className="p-4 text-right text-white font-mono">
                      {trade.exitPrice ? trade.exitPrice.toFixed(2) : '—'}
                    </td>
                    <td className="p-4 text-right">
                      <div className={`text-xs font-bold font-mono ${
                        trade.mlScore >= 0.6 ? 'text-emerald-400' : 
                        trade.mlScore >= 0.4 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {(trade.mlScore * 100).toFixed(0)}%
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`font-mono font-bold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {trade.status === 'OPEN' ? '—' : `${trade.pnl >= 0 ? '+' : ''}₹${trade.pnl.toFixed(2)}`}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-xs font-medium px-2 py-1 rounded-md ${STATUS_COLORS[trade.status]}`}>
                        {trade.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-300 ${
          notification.type === 'success' 
            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/20 border-red-500/30 text-red-400'
        }`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? <Trophy className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="font-medium">{notification.message}</p>
          </div>
        </div>
      )}

      {/* Capital Configuration Modal */}
      {showCapitalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0" onClick={() => setShowCapitalModal(false)} />
          <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Adjust Trading Capital</h3>
                <p className="text-sm text-gray-400 mt-1">Configure starting balance</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-8">
              <p className="text-gray-300 text-sm leading-relaxed">
                Enter your custom virtual trading capital. This starting balance is used to calculate your risk limits (2% per trade) and position sizing.
              </p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold font-mono">₹</span>
                <input
                  type="number"
                  value={newCapital}
                  onChange={(e) => setNewCapital(e.target.value)}
                  className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white font-mono focus:outline-none focus:border-primary/50 text-lg"
                  placeholder="15000"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCapitalModal(false)}
                className="flex-1 px-4 py-3 rounded-xl font-semibold text-gray-400 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={updateCapital}
                className="flex-1 px-4 py-3 rounded-xl bg-primary text-black font-bold hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
              >
                Save Capital
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
