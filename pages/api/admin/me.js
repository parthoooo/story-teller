import connectDB from '../../../lib/mongodb';
import Admin from '../../../models/Admin';
import { withAuth } from '../../../middleware/adminAuth';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    // req.admin is populated by withAuth
    if (!req.admin) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const admin = await Admin.findById(req.admin._id).select('-password').lean();

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.status(200).json({
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin,
      },
    });
  } catch (error) {
    console.error('Get current admin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

export default withAuth(handler);

