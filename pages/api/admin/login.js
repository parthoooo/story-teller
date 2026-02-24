import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { authenticateAdmin } from '../../../services/adminService';
import { logger } from '../../../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const TOKEN_NAME = 'adminToken';
const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      logger.warn('admin_login_validation_failed', { reason: 'missing_credentials' });
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Authenticate admin user via service layer
    const admin = await authenticateAdmin(username, password);

    if (!admin) {
      logger.warn('admin_login_failed', { usernameOrEmail: username });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: admin._id, 
        username: admin.username, 
        role: admin.role 
      },
      JWT_SECRET,
      { expiresIn: TOKEN_MAX_AGE_SECONDS }
    );

    const isProduction = process.env.NODE_ENV === 'production';

    // Set secure HTTP-only cookie with the JWT
    res.setHeader(
      'Set-Cookie',
      serialize(TOKEN_NAME, token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: TOKEN_MAX_AGE_SECONDS,
      })
    );

    logger.info('admin_login_success', { adminId: String(admin._id), username: admin.username });

    res.status(200).json({
      message: 'Login successful',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin
      }
    });

  } catch (error) {
    logger.error('admin_login_error', { error });
    res.status(500).json({ error: 'Server error' });
  }
} 