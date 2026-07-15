import jwt from 'jsonwebtoken';

// verify user is logged in (checks Authorization: Bearer <token>)
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).send({ message: 'unauthorized access' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(401).send({ message: 'unauthorized access' });
    req.decoded = decoded; // { email, role }
    next();
  });
};

// factory: verify role is one of allowed roles. Use AFTER verifyToken.
export const verifyRole = (...allowedRoles) => (req, res, next) => {
  if (!req.decoded?.role || !allowedRoles.includes(req.decoded.role)) {
    return res.status(403).send({ message: 'forbidden access' });
  }
  next();
};

// extra safety: email in token must match email in query/param when relevant
export const verifyEmailMatch = (req, res, next) => {
  const queryEmail = req.query.email || req.params.email;
  if (queryEmail && queryEmail !== req.decoded.email) {
    return res.status(403).send({ message: 'forbidden access' });
  }
  next();
};
