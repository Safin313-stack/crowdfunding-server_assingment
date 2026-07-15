import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { verifyToken, verifyRole, verifyEmailMatch } from '../middleware/auth.js';

export default function userRoutes({ usersCol }) {
  const router = Router();

  // create user on register / first google login. Gives one-time signup credits.
  router.post('/users', async (req, res) => {
    const user = req.body; // { name, email, photo, role }
    const existing = await usersCol.findOne({ email: user.email });
    if (existing) return res.send({ message: 'user already exists', insertedId: null });

    const credits = user.role === 'creator' ? 20 : 50;
    const newUser = { ...user, role: user.role || 'supporter', credits, createdAt: new Date() };
    const result = await usersCol.insertOne(newUser);
    res.send(result);
  });

  router.get('/users/role/:email', verifyToken, verifyEmailMatch, async (req, res) => {
    const user = await usersCol.findOne({ email: req.params.email });
    res.send({ role: user?.role, credits: user?.credits });
  });

  router.get('/users', verifyToken, verifyRole('admin'), async (req, res) => {
    res.send(await usersCol.find().toArray());
  });

  router.patch('/users/role/:id', verifyToken, verifyRole('admin'), async (req, res) => {
    const result = await usersCol.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { role: req.body.role } }
    );
    res.send(result);
  });

  router.delete('/users/:id', verifyToken, verifyRole('admin'), async (req, res) => {
    res.send(await usersCol.deleteOne({ _id: new ObjectId(req.params.id) }));
  });

  return router;
}
