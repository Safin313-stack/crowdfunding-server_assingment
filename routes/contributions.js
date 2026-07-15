import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { verifyToken, verifyRole, verifyEmailMatch } from '../middleware/auth.js';
import { addNotification } from '../db.js';

export default function contributionRoutes({ contributionsCol, campaignsCol, usersCol }) {
  const router = Router();

  router.post('/contributions', verifyToken, verifyRole('supporter'), async (req, res) => {
    const contribution = { ...req.body, status: 'pending', current_date: new Date() };
    const result = await contributionsCol.insertOne(contribution);
    await addNotification(
      `New contribution of ${contribution.Contribution_amount} credits from ${contribution.Supporter_name} on ${contribution.campaign_title}`,
      contribution.creator_email,
      '/dashboard/creator-home'
    );
    res.send(result);
  });

  router.get('/contributions/supporter/:email', verifyToken, verifyEmailMatch, async (req, res) => {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const query = { Supporter_email: req.params.email };
    const total = await contributionsCol.countDocuments(query);
    const list = await contributionsCol.find(query).skip(page * limit).limit(limit).toArray();
    res.send({ list, total });
  });

  router.get('/contributions/creator/:email', verifyToken, verifyEmailMatch, async (req, res) => {
    const status = req.query.status;
    const query = { creator_email: req.params.email };
    if (status) query.status = status;
    res.send(await contributionsCol.find(query).toArray());
  });

  router.patch('/contributions/:id/status', verifyToken, verifyRole('creator'), async (req, res) => {
    const { status } = req.body; // approved | rejected
    const contribution = await contributionsCol.findOne({ _id: new ObjectId(req.params.id) });

    if (status === 'approved') {
      await campaignsCol.updateOne(
        { _id: new ObjectId(contribution.campaign_id) },
        { $inc: { amount_raised: contribution.Contribution_amount } }
      );
    } else if (status === 'rejected') {
      await usersCol.updateOne(
        { email: contribution.Supporter_email },
        { $inc: { credits: contribution.Contribution_amount } }
      );
    }
    await contributionsCol.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status } });
    await addNotification(
      `Your contribution of ${contribution.Contribution_amount} credits to ${contribution.campaign_title} was ${status} by ${contribution.creator_name}`,
      contribution.Supporter_email,
      '/dashboard/supporter-home'
    );
    res.send({ updated: true });
  });

  return router;
}
