import connectDB from '../../../lib/mongodb';
import Submission from '../../../models/Submission';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Story ID required' });
  }

  try {
    await connectDB();

    const submission = await Submission.findOne({
      _id: id.trim(),
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
        'content.audioRecording.transcriptGenerated': 1,
        'content.audioRecording.fullTranscript': 1,
        'content.audioRecording.wordTimings': 1,
        'content.audioRecording.transcriptConfidence': 1,
        submittedAt: 1,
        procResponses: 1,
        tags: 1,
        collectionSlug: 1
      })
      .lean();

    if (!submission) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const story = {
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
    };

    res.status(200).json(story);
  } catch (error) {
    console.error('Get story error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ error: 'Story not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
}
