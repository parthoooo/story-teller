import connectDB from '../lib/mongodb';
import Admin from '../models/Admin';

export async function authenticateAdmin(usernameOrEmail, password) {
  await connectDB();

  const admin = await Admin.findOne({
    $or: [
      { username: usernameOrEmail },
      { email: usernameOrEmail },
    ],
    isActive: true,
  });

  if (!admin) {
    return null;
  }

  const isMatch = await admin.comparePassword(password);
  if (!isMatch) {
    return null;
  }

  admin.lastLogin = new Date();
  await admin.save();

  return admin;
}

export async function getAdminById(id) {
  await connectDB();
  return Admin.findById(id).select('-password');
}

