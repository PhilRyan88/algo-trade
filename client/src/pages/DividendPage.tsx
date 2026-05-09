import React, { useState, useEffect } from 'react';
import { useGetDividendsQuery } from '../features/api/apiSlice';
import { Calendar, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';

export default function DividendPage() {
  const [page, setPage] = useState(1);
  const { data: response, isLoading, isFetching, error } = useGetDividendsQuery(page);
  
  const dividends = response?.data || [];
  const hasMore = response?.hasMore ?? true;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return format(parseISO(dateStr), 'dd-MM-yyyy');
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100 && !isFetching && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dividend Calendar</h1>
          <p className="text-muted-foreground mt-1">Found {response?.total || 0} eligible opportunities.</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-500/10 text-blue-500 px-4 py-2 rounded-xl border border-blue-500/20">
          <DollarSign className="w-4 h-4" />
          <span className="text-sm font-bold">NSE Equities</span>
        </div>
      </div>

      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-destructive/5 rounded-3xl border border-destructive/10">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h3 className="text-xl font-bold">Connection Failed</h3>
          <p className="text-muted-foreground mt-2 max-w-xs">Could not fetch data from the exchange. Please check your connection.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-destructive text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Retry Now
          </button>
        </div>
      ) : (
        <div 
          className="flex-1 overflow-y-auto pr-2 custom-scrollbar"
          onScroll={handleScroll}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
            {dividends.map((div: any, idx: number) => (
              <div 
                key={`${div.id}-${idx}`}
                className="glass-card p-6 flex flex-col gap-6 group hover:border-primary/30 transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${(idx % 10) * 50}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-primary/20 flex items-center justify-center font-bold text-lg text-primary border border-white/5">
                      {div.symbol[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{div.symbol}</h3>
                      <p className="text-xs text-muted-foreground mt-1">LTP: ₹{div.price}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Yield</p>
                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-sm font-bold border border-primary/20">
                      {div.yield}%
                    </div>
                  </div>
                </div>

                <div className="h-px bg-white/5 w-full" />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Dividend</p>
                    <p className="text-xl font-bold text-blue-500">₹{div.dividendPerShare}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Buy Before</p>
                    <div className="flex items-center justify-end gap-1 text-white font-medium">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm">{formatDate(div.buyDate)}</span>
                    </div>
                  </div>
                </div>

                <button className="w-full py-2.5 bg-white/5 hover:bg-primary hover:text-black rounded-xl text-sm font-bold transition-all border border-white/10 hover:border-primary">
                  View Analysis
                </button>
              </div>
            ))}
          </div>

          {isFetching && (
            <div className="py-8 flex justify-center">
              <div className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                <span className="text-sm font-medium text-muted-foreground">Loading more opportunities...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
