import { format, parseISO } from 'date-fns';
import React from 'react';
import { useGetBreakoutsQuery, useGetOptionsQuery } from '../features/market/marketApiSlice';
import { useGetDividendsQuery } from '../features/dividends/dividendApiSlice';
import { TrendingUp, DollarSign, Zap, Calendar, Target, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const { data: breakouts, isLoading: bl } = useGetBreakoutsQuery();
  const { data: divResponse, isLoading: dl } = useGetDividendsQuery(1);
  const { data: options, isLoading: ol } = useGetOptionsQuery();

  const dividends = divResponse?.data || [];
  const isLoading = bl || dl || ol;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={<TrendingUp className="text-primary" />} 
          label="Live Breakouts" 
          value={breakouts?.length || 0} 
          trend="+12% from last week" 
        />
        <StatCard 
          icon={<DollarSign className="text-blue-500" />} 
          label="Upcoming Dividends" 
          value={divResponse?.total || 0} 
          trend="Total ₹42,500 expected" 
        />
        <StatCard 
          icon={<Zap className="text-yellow-500" />} 
          label="Active Options" 
          value={options?.length || 0} 
          trend="High confidence (85%+)" 
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Options Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Active Options Radar</h2>
            <button className="text-xs text-primary font-medium hover:underline">View All</button>
          </div>
          <div className="grid gap-4">
            {options?.map((opt) => (
              <OptionCard key={opt.id} data={opt} />
            ))}
          </div>
        </section>

        {/* Dividends Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Upcoming Dividends</h2>
            <button className="text-xs text-primary font-medium hover:underline">Market Calendar</button>
          </div>
          <div className="grid gap-4">
            {dividends.map((div: any) => (
              <DividendCard key={div.id} data={div} />
            ))}
          </div>
        </section>
      </div>

      {/* Breakouts Table */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Technical Breakout Signals</h2>
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Symbol</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entry</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stop Loss</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {breakouts?.map((brk) => (
                <tr key={brk.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-xs text-primary border border-primary/20">
                        {brk.symbol[0]}
                      </div>
                      <span className="font-semibold">{brk.symbol}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">₹{brk.entry_price}</td>
                  <td className="px-6 py-4 text-sm text-primary font-medium">₹{brk.target_price}</td>
                  <td className="px-6 py-4 text-sm text-destructive font-medium">₹{brk.stoploss}</td>
                  <td className="px-6 py-4">
                    <div className="w-full bg-white/5 rounded-full h-1.5 max-w-[100px]">
                      <div 
                        className="bg-primary h-full rounded-full" 
                        style={{ width: `${brk.confidence}%` }} 
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, trend }: any) {
  return (
    <div className="glass-card p-6 flex flex-col gap-4 relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/[0.02] rounded-full group-hover:scale-125 transition-transform duration-500" />
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
          <h3 className="text-2xl font-bold">{value}</h3>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{trend}</p>
    </div>
  );
}

function OptionCard({ data }: any) {
  const isCE = data.type === 'CE';
  return (
    <div className="glass-card p-5 flex items-center justify-between group hover:border-primary/30 transition-all cursor-pointer">
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-bold text-[10px]",
          isCE ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
        )}>
          <span>{data.type}</span>
          <span className="text-[14px] leading-tight">{data.strike}</span>
        </div>
        <div>
          <h4 className="font-bold">{data.symbol}</h4>
          <div className="flex items-center gap-2 mt-1">
            <Target className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Target: ₹{data.target}</span>
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <p className="text-xs text-muted-foreground mb-1 uppercase">Confidence</p>
        <p className="text-lg font-bold text-primary">{data.confidence}%</p>
      </div>
    </div>
  );
}

function DividendCard({ data }: any) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return format(parseISO(dateStr), 'dd-MM-yyyy');
  };

  return (
    <div className="glass-card p-5 flex items-center justify-between group hover:border-blue-500/30 transition-all cursor-pointer">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
          {data.symbol[0]}
        </div>
        <div>
          <h4 className="font-bold">{data.symbol}</h4>
          <div className="flex items-center gap-2 mt-1">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Buy Before: {formatDate(data.buyDate)}</span>
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <p className="text-xs text-muted-foreground mb-1 uppercase">Div / Share</p>
        <p className="text-lg font-bold text-blue-500">₹{data.dividendPerShare}</p>
      </div>
    </div>
  );
}
