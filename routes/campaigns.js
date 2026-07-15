import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { verifyToken, verifyRole, verifyEmailMatch } from '../middleware/auth.js';
import { addNotification } from '../db.js';

export default function campaignRoutes({ campaignsCol, contributionsCol, usersCol }) {
  const router = Router();

  router.get('/campaigns/top', async (req, res) => {
    const top = await campaignsCol.find({ status: 'approved' }).sort({ amount_raised: -1 }).limit(6).toArray();
    res.send(top);
  });

  // public: only approved, deadline not passed
  router.get('/campaigns', async (req, res) => {
    const { category, search } = req.query;
    const query = { status: 'approved', deadline: { $gte: new Date().toISOString().slice(0, 10) } };
    if (category) query.category = category;
    if (search) query.campaign_title = { $regex: search, $options: 'i' };
    res.send(await campaignsCol.find(query).toArray());
  });

  router.get('/campaigns/:id', async (req, res) => {
    res.send(await campaignsCol.findOne({ _id: new ObjectId(req.params.id) }));
  });

  router.post('/campaigns', verifyToken, verifyRole('creator'), async (req, res) => {
    const campaign = { ...req.body, status: 'pending', amount_raised: 0, createdAt: new Date() };
    res.send(await campaignsCol.insertOne(campaign));
  });

  router.get('/campaigns/creator/:email', verifyToken, verifyEmailMatch, async (req, res) => {
    const list = await campaignsCol.find({ creator_email: req.params.email }).sort({ deadline: -1 }).toArray();
    res.send(list);
  });

  router.patch('/campaigns/:id', verifyToken, verifyRole('creator'), async (req, res) => {
    const { campaign_title, campaign_story, reward_info } = req.body;
    res.send(await campaignsCol.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { campaign_title, campaign_story, reward_info } }
    ));
  });

  // delete campaign + refund approved supporters
  router.delete('/campaigns/:id', verifyToken, verifyRole('creator', 'admin'), async (req, res) => {
    const id = req.params.id;
    const approved = await contributionsCol.find({ campaign_id: id, status: 'approved' }).toArray();
    for (const c of approved) {
      await usersCol.updateOne({ email: c.Supporter_email }, { $inc: { credits: c.Contribution_amount } });
    }
    await campaignsCol.deleteOne({ _id: new ObjectId(id) });
    res.send({ deleted: true, refunded: approved.length });
  });

  router.get('/admin/campaigns/pending', verifyToken, verifyRole('admin'), async (req, res) => {
    res.send(await campaignsCol.find({ status: 'pending' }).toArray());
  });

  router.get('/admin/campaigns', verifyToken, verifyRole('admin'), async (req, res) => {
    res.send(await campaignsCol.find().toArray());
  });

  router.patch('/admin/campaigns/:id/status', verifyToken, verifyRole('admin'), async (req, res) => {
    const { status } = req.body; // approved | rejected
    const campaign = await campaignsCol.findOne({ _id: new ObjectId(req.params.id) });
    await campaignsCol.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status } });
    await addNotification(
      `Your campaign "${campaign.campaign_title}" was ${status} by admin`,
      campaign.creator_email,
      '/dashboard/creator-home'
    );
    res.send({ updated: true });
  });

  return router;
}
