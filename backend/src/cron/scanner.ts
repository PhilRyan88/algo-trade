import cron from 'node-cron';
import { angelOneService } from '../market/marketData/angelOneService';
import { detectBreakout } from '../shared/utils/analysisService';
import { Breakout } from '../database/models/Breakout';

export const setupCronJobs = () => {
  // Run every Saturday at 10:00 AM
  cron.schedule('0 10 * * 6', async () => {
    console.log('Running weekly breakout scanner cron job...');
    try {
      const symbolsToScan = ['AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'NVDA'];
      
      const isAuthenticated = await angelOneService.authenticate();
      if (!isAuthenticated) {
          console.error('Failed to authenticate with Angel One API. Skipping scan.');
          return;
      }

      let newBreakoutsCount = 0;

      for (const symbol of symbolsToScan) {
        // Fetch historical data
        const candles = await angelOneService.getHistoricalData(symbol);
        
        // Analyze data
        const result = detectBreakout(candles);

        // If breakout detected, save to MongoDB
        if (result.is_breakout) {
            const breakoutDoc = new Breakout({
                symbol,
                entry_price: result.entry_price,
                target_price: result.target_price,
                stoploss: result.stoploss,
                confidence: result.confidence
            });
            await breakoutDoc.save();
            newBreakoutsCount++;
        }
      }

      console.log(`Imported ${newBreakoutsCount} new breakouts.`);

    } catch (error) {
      console.error('Error running weekly scanner:', error);
    }
  });
};
