import connectDB from '../../lib/mongodb';
import Submission from '../../models/Submission';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    const approved = {
      status: 'approved',
      'content.audioRecording.hasRecording': true,
      'content.audioRecording.filename': { $ne: '' }
    };

    const tagDocs = await Submission.aggregate([
      { $match: approved },
      { $unwind: { path: '$tags', preserveNullAndEmptyArrays: false } },
      { $group: { _id: '$tags' } },
      { $sort: { _id: 1 } }
    ]);

    const tags = tagDocs.map((d) => d._id).filter(Boolean);

    res.status(200).json({ tags });
  } catch (error) {
    console.error('Get filter options error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
