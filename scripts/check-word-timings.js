import connectDB from '../lib/mongodb.js';
import Submission from '../models/Submission.js';

async function checkWordTimings() {
  try {
    await connectDB();
    
    const submissions = await Submission.find({
      'content.audioRecording.transcriptGenerated': true
    }).select('personalInfo.firstName content.audioRecording.transcriptGenerated content.audioRecording.fullTranscript content.audioRecording.wordTimings').lean();
    
    console.log('🔍 Checking word timings in database:');
    submissions.forEach(sub => {
      console.log(`\n📝 ${sub.personalInfo.firstName}:`);
      console.log(`  - transcriptGenerated: ${sub.content.audioRecording.transcriptGenerated}`);
      console.log(`  - fullTranscript: "${sub.content.audioRecording.fullTranscript?.substring(0, 50)}..."`);
      console.log(`  - wordTimings count: ${sub.content.audioRecording.wordTimings?.length || 0}`);
      if (sub.content.audioRecording.wordTimings?.length > 0) {
        console.log(`  - First timing:`, sub.content.audioRecording.wordTimings[0]);
        console.log(`  - Second timing:`, sub.content.audioRecording.wordTimings[1]);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkWordTimings();
