import connectDB from '../../../lib/mongodb';
import Collection from '../../../models/Collection';
import { withAuth } from '../../../middleware/adminAuth';
import { sanitizeInput } from '../../../utils/validateForm';

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await connectDB();
      const collections = await Collection.find({}).sort({ createdAt: -1 }).lean();
      return res.status(200).json({ collections });
    } catch (error) {
      console.error('Admin get collections error:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      await connectDB();
      const { name, slug, description } = req.body;
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }
      const safeName = sanitizeInput(name);
      const rawSlug = (slug || name || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const safeSlug = rawSlug || safeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (!safeSlug) {
        return res.status(400).json({ error: 'Slug must contain at least one letter or number' });
      }
      const existing = await Collection.findOne({ slug: safeSlug });
      if (existing) {
        return res.status(400).json({ error: 'A collection with this slug already exists' });
      }
      const collection = new Collection({
        name: safeName,
        slug: safeSlug,
        description: description ? sanitizeInput(description) : ''
      });
      await collection.save();
      return res.status(201).json({ message: 'Collection created', collection: { id: collection._id, name: collection.name, slug: collection.slug, description: collection.description } });
    } catch (error) {
      console.error('Admin create collection error:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);
