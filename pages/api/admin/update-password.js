import connectDB from '../../../lib/mongodb';
import Admin from '../../../models/Admin';
import { withAuth } from '../../../middleware/adminAuth';
import { logger } from '../../../utils/logger';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const admin = await Admin.findById(req.admin?._id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const matches = await admin.comparePassword(currentPassword);
    if (!matches) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    admin.password = newPassword;
    await admin.save();

    logger.info('admin_password_updated', { adminId: String(admin._id), username: admin.username });

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error('admin_update_password_error', { error });
    return res.status(500).json({ error: 'Server error' });
  }
}

export default withAuth(handler);

