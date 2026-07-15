import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { connectDB } from './db.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import campaignRoutes from './routes/campaigns.js';
import contributionRoutes from './routes/contributions.js';
import withdrawalRoutes from './routes/withdrawals.js';
import notificationRoutes from './routes/notifications.js';
import paymentRoutes from './routes/payments.js';
import reportRoutes from './routes/reports.js';
import statsRoutes from './routes/stats.js';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: [process.env.CLIENT_URL, 'http://localhost:5173'], credentials: true }));
app.use(express.json());

async function start() {
  const collections = await connectDB();

  app.use(authRoutes(collections));
  app.use(userRoutes(collections));
  app.use(campaignRoutes(collections));
  app.use(contributionRoutes(collections));
  app.use(withdrawalRoutes(collections));
  app.use(notificationRoutes(collections));
  app.use(paymentRoutes(collections));
  app.use(reportRoutes(collections));
  app.use(statsRoutes(collections));

  app.get('/', (req, res) => res.send('Crowdfunding server running'));
  app.listen(port, () => console.log(`Server listening on port ${port}`));
}

start().catch(console.dir);
