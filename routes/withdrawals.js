import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { verifyToken, verifyRole, verifyEmailMatch } from '../middleware/auth.js';
import { addNotification } from '../db.js';

export default function withdrawalRoutes({ withdrawalsCol, campaignsCol }) {
  const router = Router();

  router.post('/withdrawals', verifyToken, verifyRole('creator'), async (req, res) => {
    const w = { ...req.body, status: 'pending', withdraw_date: new Date() };
    res.send(await withdrawalsCol.insertOne(w));
  });

  router.get('/withdrawals/creator/:email', verifyToken, verifyEmailMatch, async (req, res) => {
    res.send(await withdrawalsCol.find({ creator_email: req.params.email }).toArray());
  });

  router.get('/admin/withdrawals/pending', verifyToken, verifyRole('admin'), async (req, res) => {
    res.send(await withdrawalsCol.find({ status: 'pending' }).toArray());
  });

  router.patch('/admin/withdrawals/:id/approve', verifyToken, verifyRole('admin'), async (req, res) => {
    const w = await withdrawalsCol.findOne({ _id: new ObjectId(req.params.id) });
    await withdrawalsCol.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status: 'approved' } });
    await campaignsCol.updateMany(
      { creator_email: w.creator_email },
      { $inc: { amount_raised: 0 } } // raised stays historical; separate ledger not reduced per-campaign
    );
    await addNotification(
      `Your withdrawal of $${w.withdrawal_amount} has been processed`,
      w.creator_email,
      '/dashboard/payment-history'
    );
    res.send({ updated: true });
  });

  return router;
}
