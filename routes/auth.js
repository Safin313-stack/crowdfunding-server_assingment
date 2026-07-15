import { Router } from 'express';
import jwt from 'jsonwebtoken';

export default function authRoutes({ usersCol }) {
  const router = Router();

  router.post('/jwt', async (req, res) => {
    const { email } = req.body;
    const user = await usersCol.findOne({ email });
    if (!user) return res.status(404).send({ message: 'user not found' });
    const token = jwt.sign({ email: user.email, role: user.role }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' });
    res.send({ token });
  });

  return router;
}
