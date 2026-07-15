import { Router } from 'express';
import { verifyToken, verifyEmailMatch } from '../middleware/auth.js';

export default function notificationRoutes({ notificationsCol }) {
  const router = Router();

  router.get('/notifications/:email', verifyToken, verifyEmailMatch, async (req, res) => {
    res.send(await notificationsCol.find({ toEmail: req.params.email }).sort({ time: -1 }).toArray());
  });

  return router;
}
