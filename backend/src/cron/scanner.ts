import cron from 'node-cron';
import { FastifyInstance } from 'fastify';
import axios from 'axios';

export const setupCronJobs = (fastify: FastifyInstance) => {
  // Run every Saturday at 10:00 AM
  cron.schedule('0 10 * * 6', async () => {
    fastify.log.info('Running weekly breakout scanner cron job...');
    try {
      // Assuming the python microservice exposes an endpoint to trigger analysis
      const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || 'http://localhost:8000';
      
      const response = await axios.post(`${PYTHON_ENGINE_URL}/analyze/breakouts`, {
        timeframe: '1w',
        symbols: ['AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'NVDA'] // Or fetch from DB
      });

      const breakouts = response.data.results;
      
      // Store results in DB
      const client = await fastify.pg.connect();
      try {
        await client.query('BEGIN');
        // Clear old ones (optional depending on logging needs)
        await client.query('DELETE FROM breakouts WHERE created_at < NOW() - INTERVAL \'7 days\'');
        
        for (const b of breakouts) {
          await client.query(
            `INSERT INTO breakouts (symbol, entry_price, target_price, stoploss, confidence)
             VALUES ($1, $2, $3, $4, $5)`,
            [b.symbol, b.entry, b.target, b.stoploss, b.confidence]
          );
        }
        await client.query('COMMIT');
        

        fastify.log.info(`Imported ${breakouts.length} new breakouts.`);
      } catch (dbErr) {
        await client.query('ROLLBACK');
        throw dbErr;
      } finally {
        client.release();
      }
    } catch (error) {
      fastify.log.error(error, 'Error running weekly scanner:');
    }
  });
};
