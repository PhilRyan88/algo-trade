import { NseIndia } from 'stock-nse-india';

const nse = new NseIndia();

export class NseService {
  async getDividendActions(): Promise<any[]> {
    try {
      console.log('Fetching NSE Corporate Actions...');
      const actions = await nse.getDataByEndpoint('/api/corporates-corporateActions?index=equities');

      if (!Array.isArray(actions)) {
        return [];
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Filter for dividends
      let dividends = actions
        .filter((action) => action.subject && action.subject.toLowerCase().includes('dividend'))
        .map((action, index) => {
          let dividendPerShare = 0;
          const match = action.subject.match(/Rs ([\d.]+)/i);
          if (match && match[1]) {
            dividendPerShare = parseFloat(match[1]);
          }

          // Convert DD-MMM-YYYY to YYYY-MM-DD
          const [day, monthStr, year] = action.exDate.split('-');
          const monthMap: Record<string, string> = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
            'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
          };
          const month = monthMap[monthStr] || '01';
          const isoDate = `${year}-${month}-${day.padStart(2, '0')}`;

          return {
            id: `${action.symbol}-${index}`,
            symbol: action.symbol,
            buyDate: isoDate,
            sellDate: isoDate,
            dividendPerShare: dividendPerShare,
            price: 0,
            yield: 0
          };
        })
        .filter(action => new Date(action.buyDate).getTime() >= today.getTime());

      // Limit to max 10 to avoid getting rate limited by NSE
      dividends = dividends.slice(0, 10);

      // Fetch LTP and calculate yield
      for (const div of dividends) {
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

      return dividends;
    } catch (error) {
      console.error('Error fetching NSE corporate actions:', error);
      return [];
    }
  }
}

export const nseService = new NseService();
