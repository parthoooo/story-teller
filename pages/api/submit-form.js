import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import connectDB from '../../lib/mongodb';
import Submission from '../../models/Submission';
import { validateForm } from '../../utils/validateForm';
import { sendConfirmationEmail } from '../../utils/emailStub';

// Disable Next.js body parsing to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();
    
    // Parse form data
    const form = formidable({
      uploadDir: uploadsDir,
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB per file
      maxTotalFileSize: 100 * 1024 * 1024, // 100MB total
      filename: (name, ext, path, form) => {
        // Generate unique filename
        const timestamp = Date.now();
        const uniqueId = uuidv4().split('-')[0];
        return `${timestamp}_${uniqueId}${ext}`;
      }
    });

    const [fields, files] = await form.parse(req);

    // Convert form data to proper format
    const formData = parseFormData(fields);

    // Validate form data
    const validation = validateForm(formData);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        errors: validation.errors 
      });
    }

    // Generate unique submission ID
    const submissionId = uuidv4();

    // Handle file uploads
    const uploadedFiles = [];
    if (files.uploadedFiles) {
      const fileArray = Array.isArray(files.uploadedFiles) ? files.uploadedFiles : [files.uploadedFiles];
      
      for (const file of fileArray) {
        if (file.size > 0) {
          const fileInfo = {
            originalName: file.originalFilename,
            filename: path.basename(file.filepath),
            size: file.size,
            mimetype: file.mimetype,
            uploadedAt: new Date()
          };
          uploadedFiles.push(fileInfo);
        }
      }
    }

    // Handle audio recording if present
    let audioData = {
      duration: 0,
      format: 'wav',
      recordedAt: new Date(),
      hasRecording: false
    };

    if (formData.audioRecording) {
      try {
        const audioRecordingData = JSON.parse(formData.audioRecording);
        if (audioRecordingData.blobData) {
          // Convert base64 to buffer
          const audioBuffer = Buffer.from(audioRecordingData.blobData, 'base64');
          
          // Generate filename
          const timestamp = Date.now();
          const shortId = submissionId.split('-')[0];
          const filename = `${timestamp}_${shortId}.webm`;
          
          // Save audio file
          const filepath = path.join(uploadsDir, filename);
          fs.writeFileSync(filepath, audioBuffer);
          
          audioData = {
            filename: filename,
            filepath: filepath,
            duration: audioRecordingData.duration || 0,
            format: 'webm',
            recordedAt: new Date(),
            hasRecording: true,
            size: audioBuffer.length
          };
          
          console.log('✅ Audio recording saved:', filename);
        }
      } catch (error) {
        console.error('❌ Error saving audio recording:', error);
      }
    }

    // Create submission document
    const submission = new Submission({
      submittedAt: new Date(),
      personalInfo: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        zipCode: formData.zipCode
      },
      content: {
        textStory: formData.textStory || '',
        audioRecording: audioData,
        uploadedFiles: uploadedFiles
      },
      procResponses: {
        question1: formData.procQuestion1 || '',
        question2: formData.procQuestion2 || ''
      },
      consent: {
        agreed: formData.consentAgreed === 'true',
        agreedAt: new Date(),
        continuedEngagement: formData.continuedEngagement === 'true'
      },
      tracking: {
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || '',
        sessionId: req.headers['x-session-id'] || formData.sessionId || ''
      },
      status: 'pending'
    });

    // Save to MongoDB
    await submission.save();
    
    console.log('✅ Submission saved:', submission._id);

    // Send confirmation email
    try {
      await sendConfirmationEmail({
        to: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        submissionId: submission._id,
        submissionType: audioData.hasRecording ? 'Audio Recording' : 'Text Story',
        zipCode: formData.zipCode,
        procQuestion1: formData.procQuestion1,
        procQuestion2: formData.procQuestion2,
        consent: formData.consentAgreed === 'true',
        continuedEngagement: formData.continuedEngagement === 'true',
        submittedAt: submission.submittedAt
      });
    } catch (emailError) {
      console.error('❌ Error sending confirmation email:', emailError);
    }

    // Log submission event for analytics
    console.log('📊 SUBMISSION EVENT:', {
      timestamp: new Date().toISOString(),
      eventType: 'submission_completed',
      submissionId: submission._id,
      hasAudio: audioData.hasRecording,
      hasFiles: uploadedFiles.length > 0,
      hasText: formData.textStory ? formData.textStory.length > 0 : false,
      fileCount: uploadedFiles.length
    });

    res.status(200).json({
      message: 'Submission received successfully',
      submissionId: submission._id,
      timestamp: submission.submittedAt
    });

  } catch (error) {
    console.error('❌ Submission error:', error);
    res.status(500).json({ error: 'Server error processing submission' });
  }
}

// Helper function to parse FormData
const parseFormData = (fields) => {
  const formData = {};
  
  // Handle single values and arrays
  Object.keys(fields).forEach(key => {
    const value = fields[key];
    formData[key] = Array.isArray(value) ? value[0] : value;
  });
  
  return formData;
}; 