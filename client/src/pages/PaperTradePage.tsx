import { useState } from 'react';
import { Target, TrendingUp, AlertCircle, TrendingDown, DollarSign } from 'lucide-react';

interface Position {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
}

export default function PaperTradePage() {
  const [symbol, setSymbol] = useState('NIFTY');
  const [quantity, setQuantity] = useState('50');
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [positions, setPositions] = useState<Position[]>([
    {
      id: '1',
      symbol: 'RELIANCE',
      type: 'BUY',
      quantity: 100,
      entryPrice: 2950.50,
      currentPrice: 2980.00,
      pnl: 2950.00
    },
    {
      id: '2',
      symbol: 'BANKNIFTY 46000 CE',
      type: 'SELL',
      quantity: 150,
      entryPrice: 320.00,
      currentPrice: 345.50,
      pnl: -3825.00
    }
  ]);

  const handleTrade = (e: React.FormEvent) => {
    e.preventDefault();
    const newPosition: Position = {
      id: Math.random().toString(),
      symbol: symbol.toUpperCase(),
      type: orderType,
      quantity: Number(quantity),
      entryPrice: 22000, // Mock entry price
      currentPrice: 22000,
      pnl: 0
    };
    setPositions([...positions, newPosition]);
  };

  const closePosition = (id: string) => {
    setPositions(positions.filter(p => p.id !== id));
  };

  const totalPnL = positions.reduce((acc, pos) => acc + pos.pnl, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Target className="w-6 h-6 text-primary" />
            Paper Trading
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Execute virtual trades to test your strategies</p>
        </div>
        
        <div className="bg-[#0F0F0F] border border-white/5 rounded-2xl p-4 flex items-center gap-6 shadow-xl">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Available Margin</p>
            <p className="text-xl font-bold text-white font-mono">₹ 10,00,000</p>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div>
            <p className="text-xs text-muted-foreground mb-1">Net P&L</p>
            <p className={`text-xl font-bold font-mono flex items-center gap-1 ${totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {totalPnL >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              ₹ {Math.abs(totalPnL).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Form */}
        <div className="bg-[#0F0F0F]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl h-fit">
          <h3 className="text-lg font-semibold text-white mb-6">Place New Order</h3>
          
          <form onSubmit={handleTrade} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOrderType('BUY')}
                className={`py-3 rounded-xl font-semibold transition-all ${
                  orderType === 'BUY' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => setOrderType('SELL')}
                className={`py-3 rounded-xl font-semibold transition-all ${
                  orderType === 'SELL' 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                SELL
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400 ml-1">Symbol</label>
              <input 
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all font-mono uppercase"
                placeholder="e.g. NIFTY, RELIANCE"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400 ml-1">Quantity</label>
              <input 
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all font-mono"
              />
            </div>

            <button 
              type="submit" 
              className={`w-full py-4 font-bold rounded-xl transition-all shadow-lg text-black ${
                orderType === 'BUY' 
                ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] text-white'
              }`}
            >
              EXECUTE {orderType}
            </button>
          </form>
        </div>

        {/* Active Positions */}
        <div className="lg:col-span-2 bg-[#0F0F0F]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
          <h3 className="text-lg font-semibold text-white mb-6">Open Positions</h3>
          
          {positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertCircle className="w-12 h-12 text-gray-600 mb-3" />
              <p className="text-gray-400">No active positions</p>
              <p className="text-sm text-gray-600 mt-1">Place an order to start trading</p>
            </div>
          ) : (
            <div className="space-y-4">
              {positions.map((pos) => (
                <div key={pos.id} className="bg-black/40 border border-white/5 rounded-2xl p-5 flex items-center justify-between group hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-1.5 h-12 rounded-full ${pos.type === 'BUY' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${pos.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {pos.type}
                        </span>
                        <h4 className="font-bold text-white">{pos.symbol}</h4>
                      </div>
                      <p className="text-sm text-gray-400">
                        Qty: <span className="text-white font-mono">{pos.quantity}</span> • Avg: <span className="font-mono text-white">₹{pos.entryPrice.toFixed(2)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-xs text-gray-400 mb-1">Current</p>
                      <p className="font-mono text-white">₹{pos.currentPrice.toFixed(2)}</p>
                    </div>
                    <div className="text-right w-32">
                      <p className="text-xs text-gray-400 mb-1">P&L</p>
                      <p className={`font-mono font-bold ${pos.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {pos.pnl >= 0 ? '+' : ''}₹{pos.pnl.toFixed(2)}
                      </p>
                    </div>
                    <button 
                      onClick={() => closePosition(pos.id)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-all opacity-0 group-hover:opacity-100"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
