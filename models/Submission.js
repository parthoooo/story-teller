import mongoose from 'mongoose';

const SubmissionSchema = new mongoose.Schema({
  submittedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  personalInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    zipCode: { type: String, required: true }
  },
  content: {
    textStory: { type: String, default: '' },
    audioRecording: {
      filename: { type: String, default: '' },
      filepath: { type: String, default: '' },
      duration: { type: Number, default: 0 },
      format: { type: String, default: '' },
      recordedAt: { type: Date },
      hasRecording: { type: Boolean, default: false },
      size: { type: Number, default: 0 }
    },
    uploadedFiles: [{
      filename: String,
      originalName: String,
      mimetype: String,
      size: Number,
      uploadedAt: Date
    }]
  },
  procResponses: {
    question1: { type: String, default: '' },
    question2: { type: String, default: '' }
  },
  consent: {
    agreed: { type: Boolean, required: true },
    agreedAt: { type: Date, required: true },
    continuedEngagement: { type: Boolean, default: false }
  },
  tracking: {
    userAgent: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    sessionId: { type: String, default: '' }
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    default: ''
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Create indexes for better performance
SubmissionSchema.index({ submittedAt: -1 });
SubmissionSchema.index({ 'personalInfo.email': 1 });
SubmissionSchema.index({ status: 1 });

export default mongoose.models.Submission || mongoose.model('Submission', SubmissionSchema); 