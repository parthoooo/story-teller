import connectDB from '../../lib/mongodb';
import Collection from '../../models/Collection';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    const collections = await Collection.find({})
      .sort({ createdAt: -1 })
      .select('name slug description')
      .lean();

    res.status(200).json({ collections });
  } catch (error) {
    console.error('Get collections error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
