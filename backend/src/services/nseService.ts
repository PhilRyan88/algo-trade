import { NseIndia } from 'stock-nse-india';
import { parse, subDays, isBefore, set, format, isSunday, isSaturday } from 'date-fns';

const nse = new NseIndia();

export class NseService {
  async getDividendActions(page: number = 1, limit: number = 10): Promise<{ data: any[], total: number, hasMore: boolean, page: number, limit: number }> {
    try {
      console.log(`Fetching NSE Corporate Actions (Page ${page}, Limit ${limit})...`);
      const actions = await nse.getDataByEndpoint('/api/corporates-corporateActions?index=equities');

      if (!Array.isArray(actions)) {
        return { data: [], total: 0, hasMore: false, page, limit };
      }

      const now = new Date();
      
      // Filter for dividends
      let dividends = actions
        .filter((action) => {
          const subject = (action.subject || '').toLowerCase();
          return subject.includes('dividend');
        })
        .map((action, index) => {
          let dividendPerShare = 0;
          const match = action.subject.match(/Rs\.?\s*([\d.]+)/i);
          if (match && match[1]) {
            dividendPerShare = parseFloat(match[1]);
          }

          // Parse DD-MMM-YYYY using date-fns
          const exDate = parse(action.exDate, 'dd-MMM-yyyy', new Date());
          
          // Buy date is one trading day before ex-date
          let buyDate = subDays(exDate, 1);
          
          // If buy date is a weekend, move to Friday
          if (isSunday(buyDate)) buyDate = subDays(buyDate, 2);
          else if (isSaturday(buyDate)) buyDate = subDays(buyDate, 1);

          return {
            id: `${action.symbol}-${action.exDate}-${index}`,
            symbol: action.symbol,
            buyDate: format(buyDate, 'yyyy-MM-dd'),
            exDate: format(exDate, 'yyyy-MM-dd'),
            dividendPerShare: dividendPerShare,
            price: 0,
            yield: 0
          };
        })
        .filter(action => {
          if (action.dividendPerShare <= 0) return false;

          const buyDate = parse(action.buyDate, 'yyyy-MM-dd', new Date());
          const deadline = set(buyDate, { hours: 15, minutes: 30, seconds: 0, milliseconds: 0 });
          
          return isBefore(now, deadline);
        })
        .sort((a, b) => new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime());

      console.log(`Found ${dividends.length} eligible dividends out of ${actions.length} total actions.`);

      // Pagination
      const total = dividends.length;
      const startIndex = (page - 1) * limit;
      const paginatedDividends = dividends.slice(startIndex, startIndex + limit);
      const hasMore = startIndex + limit < total;

      // Fetch LTP and calculate yield only for paginated results
      for (const div of paginatedDividends) {
        try {
          const details = await nse.getEquityDetails(div.symbol);
          if (details && details.priceInfo && details.priceInfo.lastPrice) {
            div.price = details.priceInfo.lastPrice;
            if (div.price > 0 && div.dividendPerShare > 0) {
              div.yield = Number(((div.dividendPerShare / div.price) * 100).toFixed(2));
            }
          }
        } catch (e) {
          console.warn(`Could not fetch LTP for ${div.symbol}`);
        }
      }

      return {
        data: paginatedDividends,
        total,
        hasMore,
        page,
        limit
      };
    } catch (error) {
      console.error('Error fetching NSE corporate actions:', error);
      return { data: [], total: 0, hasMore: false, page, limit };
    }
  }
}

export const nseService = new NseService();
