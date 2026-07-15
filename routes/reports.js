import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { verifyToken, verifyRole } from '../middleware/auth.js';

export default function reportRoutes({ reportsCol, campaignsCol }) {
  const router = Router();

  router.post('/reports', verifyToken, verifyRole('supporter'), async (req, res) => {
    const report = { ...req.body, date: new Date(), status: 'open' };
    res.send(await reportsCol.insertOne(report));
  });

  router.get('/admin/reports', verifyToken, verifyRole('admin'), async (req, res) => {
    res.send(await reportsCol.find().sort({ date: -1 }).toArray());
  });

  router.patch('/admin/reports/:id/resolve', verifyToken, verifyRole('admin'), async (req, res) => {
    const { action } = req.body; // 'suspend' | 'delete' | 'dismiss'
    const report = await reportsCol.findOne({ _id: new ObjectId(req.params.id) });
    if (action === 'suspend') {
      await campaignsCol.updateOne({ _id: new ObjectId(report.campaign_id) }, { $set: { status: 'rejected' } });
    } else if (action === 'delete') {
      await campaignsCol.deleteOne({ _id: new ObjectId(report.campaign_id) });
    }
    await reportsCol.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status: 'resolved' } });
    res.send({ updated: true });
  });

  return router;
}
