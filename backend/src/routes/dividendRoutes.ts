import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json([
    { id: '1', symbol: 'KO', price: 60.50, buyDate: '2026-05-01', sellDate: '2026-06-01', dividendPerShare: 0.46, yield: 3.1 },
    { id: '2', symbol: 'T', price: 15.20, buyDate: '2026-04-20', sellDate: '2026-05-10', dividendPerShare: 0.28, yield: 7.2 }
  ]);
});

export default router;
