import connectDB from '../../lib/mongodb';
import Submission from '../../models/Submission';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    // Get approved submissions with audio recordings
    const approvedSubmissions = await Submission.find({
      status: 'approved',
      'content.audioRecording.hasRecording': true,
      'content.audioRecording.filename': { $ne: '' }
    })
    .select({
      'personalInfo.firstName': 1,
      'personalInfo.lastName': 1,
      'content.textStory': 1,
      'content.audioRecording.filename': 1,
      'content.audioRecording.duration': 1,
      'content.audioRecording.size': 1,
      'submittedAt': 1,
      'procResponses': 1
    })
    .sort({ submittedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

    const totalApproved = await Submission.countDocuments({
      status: 'approved',
      'content.audioRecording.hasRecording': true,
      'content.audioRecording.filename': { $ne: '' }
    });

    // Format the response to be safe for public display
    const formattedSubmissions = approvedSubmissions.map(submission => ({
      id: submission._id,
      firstName: submission.personalInfo.firstName,
      lastName: submission.personalInfo.lastName,
      textStory: submission.content.textStory,
      audioFilename: submission.content.audioRecording.filename,
      audioDuration: submission.content.audioRecording.duration,
      audioSize: submission.content.audioRecording.size,
      submittedAt: submission.submittedAt,
      procResponses: submission.procResponses
    }));

    res.status(200).json({
      submissions: formattedSubmissions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalApproved / limit),
        totalSubmissions: totalApproved,
        hasNextPage: page < Math.ceil(totalApproved / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get approved submissions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
} 