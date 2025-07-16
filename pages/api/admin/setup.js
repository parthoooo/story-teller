import connectDB from '../../../lib/mongodb';
import Admin from '../../../models/Admin';

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
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Create initial admin user
    const admin = new Admin({
      username,
      email,
      password,
      role: 'admin'
    });

    await admin.save();

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
    console.error('Setup error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
} 