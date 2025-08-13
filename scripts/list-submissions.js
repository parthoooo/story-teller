import connectDB from '../lib/mongodb.js';
import Submission from '../models/Submission.js';

async function listSubmissions() {
  try {
    await connectDB();
    
    const submissions = await Submission.find().select('_id personalInfo.firstName personalInfo.lastName content.audioRecording.filename').limit(5);
    
    console.log('📋 Current submissions in MongoDB:');
    submissions.forEach(sub => {
      console.log(`ID: ${sub._id}`);
      console.log(`Name: ${sub.personalInfo.firstName} ${sub.personalInfo.lastName}`);
      console.log(`Audio: ${sub.content.audioRecording.filename || 'No audio'}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

listSubmissions();
