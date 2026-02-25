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
    const tag = (req.query.tag || '').trim();
    const collection = (req.query.collection || '').trim();

    const baseQuery = {
      status: 'approved',
      'content.audioRecording.hasRecording': true,
      'content.audioRecording.filename': { $ne: '' }
    };
    if (tag) baseQuery.tags = tag;
    if (collection) baseQuery.collectionSlug = collection;

    const approvedSubmissions = await Submission.find(baseQuery)
    .select({
      'personalInfo.firstName': 1,
      'personalInfo.lastName': 1,
      'content.textStory': 1,
      'content.audioRecording.filename': 1,
      'content.audioRecording.duration': 1,
      'content.audioRecording.size': 1,
      'content.audioRecording.transcriptGenerated': 1,
      'content.audioRecording.fullTranscript': 1,
      'content.audioRecording.wordTimings': 1,
      'content.audioRecording.transcriptConfidence': 1,
      'submittedAt': 1,
      'procResponses': 1,
      tags: 1,
      collectionSlug: 1
    })
    .sort({ submittedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

    const totalApproved = await Submission.countDocuments(baseQuery);

    // Format the response to be safe for public display
    const formattedSubmissions = approvedSubmissions.map(submission => ({
      id: String(submission._id),
      firstName: submission.personalInfo.firstName,
      lastName: submission.personalInfo.lastName,
      textStory: submission.content.textStory,
      audioFilename: submission.content.audioRecording.filename,
      audioDuration: submission.content.audioRecording.duration,
      audioSize: submission.content.audioRecording.size,
      submittedAt: submission.submittedAt,
      procResponses: submission.procResponses,
      tags: submission.tags || [],
      collectionSlug: submission.collectionSlug || '',
      transcriptGenerated: submission.content.audioRecording.transcriptGenerated || false,
      fullTranscript: submission.content.audioRecording.fullTranscript || '',
      wordTimings: submission.content.audioRecording.wordTimings || [],
      transcriptConfidence: submission.content.audioRecording.transcriptConfidence || 0
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