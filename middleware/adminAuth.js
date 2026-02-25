import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { getAdminById } from '../services/adminService';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const TOKEN_NAME = 'adminToken';

export default async function adminAuth(req, res, next) {
  try {
    const cookies = req.cookies || (req.headers.cookie ? cookie.parse(req.headers.cookie) : {});
    const cookieToken = cookies[TOKEN_NAME];
    // Fall back to Authorization header for backwards compatibility
    const headerToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.replace('Bearer ', '')
      : undefined;

    const token = cookieToken || headerToken;
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    const admin = await getAdminById(decoded.id);
    
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