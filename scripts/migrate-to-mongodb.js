import fs from 'fs';
import path from 'path';
import connectDB from '../lib/mongodb.js';
import Submission from '../models/Submission.js';

const dataFile = path.join(process.cwd(), 'data', 'submissions.json');

async function migrateSubmissions() {
  try {
    console.log('🚀 Starting migration to MongoDB...');
    
    // Connect to MongoDB
    await connectDB();
    
    // Check if JSON file exists
    if (!fs.existsSync(dataFile)) {
      console.log('📄 No existing submissions.json file found. Nothing to migrate.');
      return;
    }
    
    // Read existing submissions
    const jsonData = fs.readFileSync(dataFile, 'utf8');
    const submissions = JSON.parse(jsonData);
    
    console.log(`📊 Found ${submissions.length} submissions in JSON file`);
    
    if (submissions.length === 0) {
      console.log('📄 No submissions to migrate.');
      return;
    }
    
    // Check if any submissions already exist in MongoDB
    const existingCount = await Submission.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  WARNING: ${existingCount} submissions already exist in MongoDB.`);
      console.log('This migration will only add new submissions that don\'t already exist.');
    }
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    // Process each submission
    for (const submission of submissions) {
      try {
        // Check if submission already exists (by old ID or by email+timestamp)
        const existingSubmission = await Submission.findOne({
          $or: [
            { 'personalInfo.email': submission.personalInfo.email },
            { submittedAt: new Date(submission.submittedAt) }
          ]
        });
        
        if (existingSubmission) {
          console.log(`⏭️  Skipping existing submission: ${submission.personalInfo.email}`);
          skippedCount++;
          continue;
        }
        
        // Transform the old format to new format
        const newSubmission = new Submission({
          submittedAt: new Date(submission.submittedAt),
          personalInfo: {
            firstName: submission.personalInfo.firstName,
            lastName: submission.personalInfo.lastName,
            email: submission.personalInfo.email,
            zipCode: submission.personalInfo.zipCode
          },
          content: {
            textStory: submission.content.textStory || '',
            audioRecording: {
              filename: submission.content.audioRecording?.filename || '',
              filepath: submission.content.audioRecording?.filepath || '',
              duration: submission.content.audioRecording?.duration || 0,
              format: submission.content.audioRecording?.format || '',
              recordedAt: submission.content.audioRecording?.recordedAt 
                ? new Date(submission.content.audioRecording.recordedAt) 
                : new Date(submission.submittedAt),
              hasRecording: submission.content.audioRecording?.hasRecording || false,
              size: submission.content.audioRecording?.size || 0
            },
            uploadedFiles: submission.content.uploadedFiles || []
          },
          procResponses: {
            question1: submission.procResponses?.question1 || '',
            question2: submission.procResponses?.question2 || ''
          },
          consent: {
            agreed: submission.consent?.agreed || false,
            agreedAt: submission.consent?.agreedAt 
              ? new Date(submission.consent.agreedAt)
              : new Date(submission.submittedAt),
            continuedEngagement: submission.consent?.continuedEngagement || false
          },
          tracking: {
            userAgent: submission.tracking?.userAgent || '',
            ipAddress: submission.tracking?.ipAddress || '',
            sessionId: submission.tracking?.sessionId || ''
          },
          status: 'pending' // All migrated submissions start as pending
        });
        
        await newSubmission.save();
        migratedCount++;
        
        console.log(`✅ Migrated: ${submission.personalInfo.firstName} ${submission.personalInfo.lastName}`);
        
      } catch (error) {
        console.error(`❌ Error migrating submission for ${submission.personalInfo?.email}:`, error);
      }
    }
    
    console.log('\n🎉 Migration completed!');
    console.log(`📊 Statistics:`);
    console.log(`   - Total submissions in JSON: ${submissions.length}`);
    console.log(`   - Successfully migrated: ${migratedCount}`);
    console.log(`   - Skipped (already exists): ${skippedCount}`);
    console.log(`   - Total in MongoDB now: ${await Submission.countDocuments()}`);
    
    // Optionally backup the original JSON file
    const backupFile = path.join(process.cwd(), 'data', `submissions-backup-${Date.now()}.json`);
    fs.copyFileSync(dataFile, backupFile);
    console.log(`💾 Original JSON file backed up to: ${path.basename(backupFile)}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateSubmissions()
    .then(() => {
      console.log('✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export default migrateSubmissions; 