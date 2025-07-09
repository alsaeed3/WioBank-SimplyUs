const jwt = require('jsonwebtoken');

/**
 * Authentication middleware
 */
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

/**
 * Optional authentication middleware
 */
const optionalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
      req.user = decoded;
    } catch (error) {
      // Token is invalid, but we continue without authentication
    }
  }
  
  next();
};

module.exports = {
  authMiddleware,
  optionalAuth
};
