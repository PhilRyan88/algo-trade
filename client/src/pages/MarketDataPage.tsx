import { useEffect, useState } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, SignalHigh, ServerCrash } from 'lucide-react';

interface MarketDataPoint {
  time: string;
  price: number;
  volume: number;
}

export default function MarketDataPage() {
  const [data, setData] = useState<MarketDataPoint[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [ltp, setLtp] = useState<number | null>(null);

  useEffect(() => {
    // Fetch historical data
    fetch(`${import.meta.env.VITE_API_URL}/market/historical/NIFTY`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setData(json.data.map((d: any) => ({
            time: d.time.split('T')[1]?.substring(0, 5) || d.time,
            price: d.price,
            volume: d.volume
          })));
          if (json.data.length > 0) {
            setLtp(json.data[json.data.length - 1].price);
          }
        }
      })
      .catch(err => console.error("Failed to fetch historical data", err));

    const wsUrl = import.meta.env.VITE_API_URL?.replace('http', 'ws') || 'ws://localhost:5000/api';
    const ws = new WebSocket(`${wsUrl}/ws`);

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'market_data' && msg.data) {
          // Parse AngelOne WebSocket data
          // Assuming it's NIFTY and has ltp
          const newLtp = msg.data.last_traded_price || msg.data.ltp;
          if (newLtp) {
            setLtp(newLtp);
            setData(prev => {
              const newData = [...prev, {
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                price: newLtp,
                volume: msg.data.volume_traded || 0
              }];
              // Keep only last 100 points
              if (newData.length > 100) return newData.slice(newData.length - 100);
              return newData;
            });
          }
        }
      } catch (err) {
        // console.error("Error parsing WS data", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Activity className="w-6 h-6 text-primary" />
            Live Market Data
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time WebSocket feed from Angel One SmartAPI</p>
        </div>
        <div className="flex items-center gap-4 bg-[#0F0F0F] border border-white/5 px-4 py-2 rounded-xl">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <SignalHigh className="w-4 h-4 text-emerald-500 animate-pulse" />
            ) : (
              <ServerCrash className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm font-medium text-gray-300">
              {isConnected ? 'WS Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex flex-col text-right">
            <span className="text-xs text-muted-foreground">NIFTY 50</span>
            <span className="text-lg font-bold text-white font-mono">
              {ltp ? ltp.toFixed(2) : '---'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-[#0F0F0F]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="h-[500px] w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="#666" 
                tick={{fill: '#888', fontSize: 12}} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                yAxisId="left"
                stroke="#666" 
                tick={{fill: '#888', fontSize: 12}} 
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
                tickFormatter={(value) => value.toFixed(0)}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                stroke="#666" 
                tick={{fill: '#888', fontSize: 12}}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '12px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar 
                yAxisId="right" 
                dataKey="volume" 
                fill="url(#colorVolume)" 
                name="Volume" 
                radius={[4, 4, 0, 0]}
                barSize={20}
              />
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="price" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                dot={false} 
                name="LTP"
                activeDot={{ r: 6, fill: '#3b82f6', stroke: '#000', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
