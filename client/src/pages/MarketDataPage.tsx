import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Customized
} from 'recharts';
import { Activity, SignalHigh, ServerCrash, BarChart3, TrendingUp, CandlestickChart } from 'lucide-react';
import { parseISO, format, isToday } from 'date-fns';

interface MarketDataPoint {
  time: string;
  displayTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type ChartType = 'line' | 'area' | 'candlestick';

// Custom Tooltip for OHLC
const CustomTooltip = ({ active, payload, label, chartType }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-3 shadow-2xl text-sm">
      <p className="text-gray-400 mb-2 font-mono text-xs">{label}</p>
      {chartType === 'candlestick' ? (
        <div className="space-y-1">
          <div className="flex justify-between gap-6">
            <span className="text-gray-500">Open</span>
            <span className="text-white font-mono">{data.open?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-gray-500">High</span>
            <span className="text-emerald-400 font-mono">{data.high?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-gray-500">Low</span>
            <span className="text-red-400 font-mono">{data.low?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-gray-500">Close</span>
            <span className={`font-mono font-bold ${data.close >= data.open ? 'text-emerald-400' : 'text-red-400'}`}>
              {data.close?.toFixed(2)}
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex justify-between gap-6">
            <span className="text-gray-500">Close</span>
            <span className="text-blue-400 font-mono font-bold">{data.close?.toFixed(2)}</span>
          </div>
          {data.volume > 0 && (
            <div className="flex justify-between gap-6">
              <span className="text-gray-500">Volume</span>
              <span className="text-gray-300 font-mono">{data.volume?.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Candlestick renderer using Recharts Customized component
const CandlestickRenderer = ({ chartData }: { chartData: MarketDataPoint[] }) => {
  return (props: any) => {
    const { xAxisMap, yAxisMap } = props;
    if (!xAxisMap || !yAxisMap) return null;

    const xAxis = Object.values(xAxisMap)[0] as any;
    const yAxis = yAxisMap?.price;
    if (!xAxis?.scale || !yAxis?.scale) return null;

    const xScale = xAxis.scale;
    const yScale = yAxis.scale;
    const bandwidth = xScale.bandwidth ? xScale.bandwidth() : 6;

    return (
      <g className="candlestick-layer">
        {chartData.map((d, i) => {
          const x = xScale(d.displayTime);
          if (x === undefined || x === null || isNaN(x)) return null;

          const isGreen = d.close >= d.open;
          const color = isGreen ? '#22c55e' : '#ef4444';

          const yHigh = yScale(d.high);
          const yLow = yScale(d.low);
          const yOpen = yScale(d.open);
          const yClose = yScale(d.close);

          if ([yHigh, yLow, yOpen, yClose].some(v => v === undefined || isNaN(v))) return null;

          const bodyTop = Math.min(yOpen, yClose);
          const bodyHeight = Math.max(Math.abs(yOpen - yClose), 1);
          const candleWidth = Math.max(bandwidth * 0.6, 1.5);
          const centerX = x + bandwidth / 2;

          return (
            <g key={i}>
              <line
                x1={centerX} y1={yHigh}
                x2={centerX} y2={yLow}
                stroke={color} strokeWidth={1}
              />
              <rect
                x={centerX - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={color}
                rx={0.5}
              />
            </g>
          );
        })}
      </g>
    );
  };
};

export default function MarketDataPage() {
  const [data, setData] = useState<MarketDataPoint[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [ltp, setLtp] = useState<number | null>(null);
  const [symbol, setSymbol] = useState<'NIFTY' | 'BANKNIFTY'>('NIFTY');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [isLoading, setIsLoading] = useState(false);

  const symbolRef = useRef(symbol);

  const todayData = useMemo(() => {
    return data.filter(d => {
      try { return isToday(parseISO(d.time)); }
      catch { return true; }
    });
  }, [data]);

  const chartData = todayData.length > 0 ? todayData : data;

  useEffect(() => {
    symbolRef.current = symbol;
    setLtp(null);
    setData([]);
    setIsLoading(true);

    fetch(`${import.meta.env.VITE_API_URL}/market/historical/${symbol}`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data && json.data.length > 0) {
          const formatted: MarketDataPoint[] = json.data.map((d: any) => {
            let displayTime: string;
            try { displayTime = format(parseISO(d.time), 'HH:mm'); }
            catch { displayTime = d.time; }
            return {
              time: d.time,
              displayTime,
              open: Number(d.open),
              high: Number(d.high),
              low: Number(d.low),
              close: Number(d.close),
              volume: Number(d.volume) || 0
            };
          });
          setData(formatted);
          setLtp(Number(formatted[formatted.length - 1].close));
        }
      })
      .catch(err => console.error("Failed to fetch historical data", err))
      .finally(() => setIsLoading(false));
  }, [symbol]);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_API_URL?.replace('http', 'ws') || 'ws://localhost:5000/api';
    const ws = new WebSocket(`${wsUrl}/ws`);

    ws.onopen = () => setIsConnected(true);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'market_data' && msg.data) {
          const currentToken = symbolRef.current === 'NIFTY' ? '26000' : '26009';
          const msgToken = msg.data.token;
          if (msgToken && String(msgToken).includes(currentToken)) {
            const rawLtp = msg.data.last_traded_price || msg.data.ltp;
            const newLtp = Number(rawLtp);
            if (newLtp && !isNaN(newLtp)) {
              setLtp(newLtp);
              setData(prev => {
                const now = new Date();
                const newPoint: MarketDataPoint = {
                  time: now.toISOString(),
                  displayTime: format(now, 'HH:mm:ss'),
                  open: newLtp, high: newLtp, low: newLtp, close: newLtp,
                  volume: msg.data.volume_traded || 0
                };
                const newData = [...prev, newPoint];
                if (newData.length > 200) return newData.slice(newData.length - 200);
                return newData;
              });
            }
          }
        }
      } catch {}
    };
    ws.onclose = () => setIsConnected(false);
    return () => ws.close();
  }, []);

  const firstClose = chartData.length > 0 ? chartData[0].close : 0;
  const priceChange = ltp && firstClose ? ltp - firstClose : 0;
  const priceChangePercent = firstClose ? ((priceChange / firstClose) * 100) : 0;

  // Memoize the candlestick renderer to avoid re-creating on every render
  const candlestickComponent = useMemo(() => CandlestickRenderer({ chartData }), [chartData]);

  const chartTypeOptions: { value: ChartType; label: string; icon: React.ReactNode }[] = [
    { value: 'line', label: 'Line', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { value: 'area', label: 'Area', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { value: 'candlestick', label: 'OHLC', icon: <CandlestickChart className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Activity className="w-6 h-6 text-primary" />
            Live Market Data
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time intraday feed from Angel One SmartAPI</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value as any)}
            className="bg-[#0F0F0F] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="NIFTY">NIFTY 50</option>
            <option value="BANKNIFTY">BANKNIFTY</option>
          </select>

          <div className="flex bg-[#0F0F0F] border border-white/10 rounded-lg overflow-hidden">
            {chartTypeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setChartType(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
                  chartType === opt.value
                    ? 'bg-primary/20 text-primary'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {opt.icon}
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 bg-[#0F0F0F] border border-white/5 px-4 py-2 rounded-xl">
            <div className="flex items-center gap-1.5">
              {isConnected ? (
                <SignalHigh className="w-4 h-4 text-emerald-500 animate-pulse" />
              ) : (
                <ServerCrash className="w-4 h-4 text-red-500" />
              )}
              <span className="text-xs font-medium text-gray-400 hidden sm:inline">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex flex-col text-right">
              <span className="text-xs text-muted-foreground">{symbol}</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white font-mono">
                  {ltp != null && !isNaN(ltp) ? ltp.toFixed(2) : '---'}
                </span>
                {ltp != null && !isNaN(ltp) && firstClose > 0 && (
                  <span className={`text-xs font-mono font-semibold ${priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0F0F0F]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

        {isLoading ? (
          <div className="h-[500px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading market data...</p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[500px] flex items-center justify-center">
            <p className="text-gray-500">No data available. Market may be closed.</p>
          </div>
        ) : (
          <div className="h-[500px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />

                <XAxis
                  dataKey="displayTime"
                  stroke="#666"
                  tick={{ fill: '#666', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.max(Math.floor(chartData.length / 12), 1)}
                />

                <YAxis
                  yAxisId="price"
                  stroke="#666"
                  tick={{ fill: '#888', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => v.toLocaleString()}
                />

                <YAxis
                  yAxisId="volume"
                  orientation="right"
                  stroke="#666"
                  tickLine={false}
                  axisLine={false}
                  hide
                />

                <Tooltip content={<CustomTooltip chartType={chartType} />} />

                {/* Volume bars — always shown */}
                <Bar
                  yAxisId="volume"
                  dataKey="volume"
                  fill="url(#volumeGradient)"
                  name="Volume"
                  radius={[2, 2, 0, 0]}
                  barSize={chartType === 'candlestick' ? 4 : 12}
                  opacity={0.4}
                />

                {/* Candlestick via Customized — renders candles using axis scales */}
                {chartType === 'candlestick' && (
                  <Customized component={candlestickComponent} />
                )}

                {/* Line chart */}
                {chartType === 'line' && (
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="close"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    name="Close"
                    activeDot={{ r: 5, fill: '#3b82f6', stroke: '#000', strokeWidth: 2 }}
                  />
                )}

                {/* Area chart */}
                {chartType === 'area' && (
                  <Area
                    yAxisId="price"
                    type="monotone"
                    dataKey="close"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#areaGradient)"
                    name="Close"
                    activeDot={{ r: 5, fill: '#3b82f6', stroke: '#000', strokeWidth: 2 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
