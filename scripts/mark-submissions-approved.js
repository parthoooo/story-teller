// Quick script to mark some submissions as approved for testing
const mongoose = require('mongoose');
const Submission = require('../models/Submission');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/corsep-audio-form');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const markSubmissionsApproved = async () => {
  try {
    await connectDB();

    // Get all submissions with audio
    const submissions = await Submission.find({
      'content.audioRecording.hasRecording': true
    });

    console.log(`Found ${submissions.length} submissions with audio`);

    // Mark the first few as approved for demo
    const toApprove = Math.min(submissions.length, 3); // Approve up to 3 submissions

    for (let i = 0; i < toApprove; i++) {
      const submission = submissions[i];
      submission.status = 'approved';
      submission.reviewedAt = new Date();
      submission.reviewedBy = 'admin-script';
      
      await submission.save();
      
      console.log(`✅ Approved: ${submission.personalInfo.firstName} ${submission.personalInfo.lastName} (${submission._id})`);
    }

    // Mark remaining as pending
    for (let i = toApprove; i < submissions.length; i++) {
      const submission = submissions[i];
      submission.status = 'pending';
      
      await submission.save();
      
      console.log(`⏳ Set as pending: ${submission.personalInfo.firstName} ${submission.personalInfo.lastName} (${submission._id})`);
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Approved: ${toApprove}`);
    console.log(`⏳ Pending: ${submissions.length - toApprove}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

markSubmissionsApproved();
