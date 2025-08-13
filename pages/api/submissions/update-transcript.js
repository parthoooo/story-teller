import connectDB from '../../../lib/mongodb';
import Submission from '../../../models/Submission';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { submissionId, transcript, wordTimings, confidence } = req.body;

    if (!submissionId || !transcript) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find and update the submission
    const submission = await Submission.findById(submissionId);
    
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Update the submission with transcript data
    submission.content.audioRecording.transcriptGenerated = true;
    submission.content.audioRecording.fullTranscript = transcript;
    submission.content.audioRecording.wordTimings = wordTimings || [];
    submission.content.audioRecording.transcriptConfidence = confidence || 0;
    submission.content.audioRecording.transcriptGeneratedAt = new Date();

    await submission.save();

    console.log('✅ Transcript saved for submission:', submissionId);

    res.status(200).json({
      message: 'Transcript updated successfully',
      submissionId: submissionId,
      transcript: transcript,
      wordCount: wordTimings?.length || 0
    });

  } catch (error) {
    console.error('❌ Transcript update error:', error);
    res.status(500).json({ error: 'Server error updating transcript' });
  }
}


