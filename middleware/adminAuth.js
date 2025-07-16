import jwt from 'jsonwebtoken';
import connectDB from '../lib/mongodb';
import Admin from '../models/Admin';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export default async function adminAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    await connectDB();
    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: 'Access denied. Invalid token.' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Access denied. Invalid token.' });
  }
}

// Helper function to wrap API routes with auth
export function withAuth(handler) {
  return async (req, res) => {
    await adminAuth(req, res, async () => {
      await handler(req, res);
    });
  };
} 