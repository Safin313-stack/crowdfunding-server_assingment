import { Router } from 'express';
import { verifyToken, verifyRole } from '../middleware/auth.js';

export default function statsRoutes({ usersCol, paymentsCol }) {
  const router = Router();

  router.get('/admin/stats', verifyToken, verifyRole('admin'), async (req, res) => {
    const totalSupporters = await usersCol.countDocuments({ role: 'supporter' });
    const totalCreators = await usersCol.countDocuments({ role: 'creator' });
    const creditsAgg = await usersCol.aggregate([{ $group: { _id: null, sum: { $sum: '$credits' } } }]).toArray();
    const totalPayments = await paymentsCol.countDocuments();
    res.send({
      totalSupporters,
      totalCreators,
      totalCredits: creditsAgg[0]?.sum || 0,
      totalPayments,
    });
  });

  return router;
}
