import connectDB from '../../../lib/mongodb';
import Submission from '../../../models/Submission';
import { withAuth } from '../../../middleware/adminAuth';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || '';
    const search = req.query.search || '';

    // Build query
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
        { 'personalInfo.lastName': { $regex: search, $options: 'i' } },
        { 'personalInfo.email': { $regex: search, $options: 'i' } },
        { 'personalInfo.zipCode': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const submissions = await Submission.find(query)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalSubmissions = await Submission.countDocuments(query);
    const totalPages = Math.ceil(totalSubmissions / limit);

    // Get status counts
    const statusCounts = await Submission.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusStats = {
      pending: 0,
      reviewed: 0,
      approved: 0,
      rejected: 0
    };

    statusCounts.forEach(stat => {
      statusStats[stat._id] = stat.count;
    });

    res.status(200).json({
      submissions,
      pagination: {
        currentPage: page,
        totalPages,
        totalSubmissions,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      statusStats
    });

  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

export default withAuth(handler); 