import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json([
    { id: '1', symbol: 'NIFTY', type: 'CE', strike: 22000, entry: 150, target: 200, sl: 120, confidence: 85 },
    { id: '2', symbol: 'BANKNIFTY', type: 'PE', strike: 46000, entry: 300, target: 450, sl: 220, confidence: 90 }
  ]);
});

export default router;
