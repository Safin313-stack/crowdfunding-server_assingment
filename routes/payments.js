import { Router } from 'express';
import Stripe from 'stripe';
import { verifyToken, verifyEmailMatch } from '../middleware/auth.js';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export default function paymentRoutes({ paymentsCol, usersCol }) {
  const router = Router();

  router.post('/create-payment-intent', verifyToken, async (req, res) => {
    if (!stripe) return res.status(500).send({ message: 'stripe not configured' });
    const { price } = req.body; // in dollars
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(price * 100),
      currency: 'usd',
      payment_method_types: ['card'],
    });
    res.send({ clientSecret: paymentIntent.client_secret });
  });

  router.post('/payments', verifyToken, async (req, res) => {
    const payment = req.body; // { email, price, credits, transactionId, date }
    await paymentsCol.insertOne(payment);
    await usersCol.updateOne({ email: payment.email }, { $inc: { credits: payment.credits } });
    res.send({ inserted: true });
  });

  router.get('/payments/:email', verifyToken, verifyEmailMatch, async (req, res) => {
    res.send(await paymentsCol.find({ email: req.params.email }).sort({ date: -1 }).toArray());
  });

  return router;
}
