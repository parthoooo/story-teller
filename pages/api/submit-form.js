import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import connectDB from '../../lib/mongodb';
import Submission from '../../models/Submission';
import { validateForm, sanitizeInput } from '../../utils/validateForm';
import { sendConfirmationEmail } from '../../utils/emailStub';
import { logger } from '../../utils/logger';

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
      filter: ({ mimetype, originalFilename }) => {
        // Allow only common safe document/image/audio types
        const allowedMimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
          'image/gif',
          'audio/mpeg',
          'audio/wav',
          'audio/webm',
          'audio/ogg',
        ];

        const isAllowed = mimetype ? allowedMimeTypes.includes(mimetype) : false;

        if (!isAllowed) {
          console.warn('Blocked uploaded file due to disallowed mimetype:', {
            mimetype,
            originalFilename,
          });
        }

        return isAllowed;
      },
      filename: (name, ext, path, form) => {
        // Generate unique filename (never trust original name)
        const timestamp = Date.now();
        const uniqueId = uuidv4().split('-')[0];
        return `${timestamp}_${uniqueId}${ext}`;
      }
    });

    const [fields, files] = await form.parse(req);

    // Convert form data to proper format
    const formData = parseFormData(fields);
    
    // Add uploadedFiles array for validation (will be processed later)
    formData.uploadedFiles = files.uploadedFiles ? 
      (Array.isArray(files.uploadedFiles) ? files.uploadedFiles : [files.uploadedFiles]) : [];
    
    logger.info('submission_form_parsed', {
      keys: Object.keys(formData),
      hasAudioRecording: !!formData.audioRecording,
      hasTextStory: !!formData.textStory,
      uploadedFilesCount: formData.uploadedFiles?.length || 0,
    });

    // Validate form data
    const validation = validateForm(formData);
    if (!validation.isValid) {
      logger.warn('submission_validation_failed', { errors: validation.errors });
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
        // Handle both object and string formats
        let audioRecordingData = formData.audioRecording;
        if (typeof formData.audioRecording === 'string') {
          audioRecordingData = JSON.parse(formData.audioRecording);
        }
        
        if (audioRecordingData.blobData) {
          // Convert base64 to buffer
          const audioBuffer = Buffer.from(audioRecordingData.blobData, 'base64');

          // Basic safety limit on recorded audio size (in bytes)
          const maxAudioBytes = 50 * 1024 * 1024; // 50MB
          if (audioBuffer.length > maxAudioBytes) {
            logger.warn('submission_audio_too_large', {
              sizeBytes: audioBuffer.length,
              maxBytes: maxAudioBytes,
            });
            return res.status(400).json({ error: 'Audio recording too large' });
          }
          
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
          
          logger.info('submission_audio_saved', {
            filename,
            sizeBytes: audioBuffer.length,
            durationSeconds: audioRecordingData.duration || 0,
          });
        }
      } catch (error) {
        logger.error('submission_audio_save_error', { error });
        // Fallback for basic audio recording tracking
        audioData.hasRecording = true;
      }
    }

    // Create submission document
    const submission = new Submission({
      submittedAt: new Date(),
      personalInfo: {
        firstName: sanitizeInput(formData.firstName),
        lastName: sanitizeInput(formData.lastName),
        email: sanitizeInput(formData.email),
        zipCode: sanitizeInput(formData.zipCode)
      },
      content: {
        textStory: sanitizeInput(formData.textStory || ''),
        audioRecording: audioData,
        uploadedFiles: uploadedFiles
      },
      procResponses: {
        question1: sanitizeInput(formData.procQuestion1 || ''),
        question2: sanitizeInput(formData.procQuestion2 || '')
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

    logger.info('submission_saving', {
      hasRecording: audioData.hasRecording,
      filename: audioData.filename,
      duration: audioData.duration,
      size: audioData.size,
    });
    
    // Save to MongoDB
    await submission.save();
    
    logger.info('submission_saved', { submissionId: String(submission._id) });

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
      logger.error('submission_confirmation_email_error', { error: emailError });
    }

    // Log submission event for analytics
    logger.info('submission_completed', {
      submissionId: String(submission._id),
      hasAudio: audioData.hasRecording,
      hasFiles: uploadedFiles.length > 0,
      hasText: formData.textStory ? formData.textStory.length > 0 : false,
      fileCount: uploadedFiles.length,
    });

    res.status(200).json({
      message: 'Submission received successfully',
      submissionId: submission._id,
      timestamp: submission.submittedAt
    });

  } catch (error) {
    logger.error('submission_error', { error });
    res.status(500).json({ error: 'Server error processing submission' });
  }
}

// Helper function to parse FormData
const parseFormData = (fields) => {
  const formData = {};
  
  // Handle single values and arrays
  Object.keys(fields).forEach(key => {
    const value = fields[key];
    const finalValue = Array.isArray(value) ? value[0] : value;
    
    // Special handling for audioRecording JSON string
    if (key === 'audioRecording' && typeof finalValue === 'string' && finalValue.trim().startsWith('{')) {
      try {
        formData[key] = JSON.parse(finalValue);
      } catch (e) {
        formData[key] = finalValue; // Keep as string if parsing fails
      }
    } else {
      formData[key] = finalValue;
    }
  });
  
  return formData;
}; 