import connectDB from '../../../lib/mongodb';
import Admin from '../../../models/Admin';
import { validateEmail, sanitizeInput } from '../../../utils/validateForm';
import { logger } from '../../../utils/logger';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    // Check if any admin users already exist
    const adminCount = await Admin.countDocuments();
    if (adminCount > 0) {
      return res.status(400).json({ error: 'Admin users already exist' });
    }

    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      logger.warn('admin_setup_validation_failed', { reason: 'missing_fields' });
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      logger.warn('admin_setup_validation_failed', { reason: 'invalid_email' });
      return res.status(400).json({ error: emailValidation.error });
    }

    if (password.length < 8) {
      logger.warn('admin_setup_validation_failed', { reason: 'weak_password' });
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Create initial admin user
    const admin = new Admin({
      username: sanitizeInput(username),
      email: sanitizeInput(email),
      password,
      role: 'admin'
    });

    await admin.save();

    logger.info('admin_setup_created', { adminId: String(admin._id), username: admin.username });

    res.status(201).json({
      message: 'Initial admin user created successfully',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {
    logger.error('admin_setup_error', { error });
    
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
} 