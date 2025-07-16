// Email stub functions for local development
// These will be replaced with actual email service integration later

export const sendConfirmationEmail = async (formData) => {
  const emailData = {
    to: formData.email,
    subject: 'Thank you for your submission - CORSEP Audio Form',
    body: `
      Dear ${formData.firstName} ${formData.lastName},

      Thank you for submitting your story through our audio form. We have received your submission and will review it shortly.

      Submission Details:
      - Name: ${formData.firstName} ${formData.lastName}
      - Email: ${formData.email}
      - Zip Code: ${formData.zipCode}
      - Submission Type: ${getSubmissionType(formData)}
      - Submitted at: ${new Date().toLocaleString()}
      - Consent Agreed: ${formData.consentAgreed ? 'Yes' : 'No'}
      - Continued Engagement: ${formData.continuedEngagement ? 'Yes' : 'No'}

      ${formData.procQuestion1 ? `PROC Question 1: ${formData.procQuestion1}` : ''}
      ${formData.procQuestion2 ? `PROC Question 2: ${formData.procQuestion2}` : ''}

      Our team will review your submission and get back to you within 2-3 business days.

      Best regards,
      The CORSEP Team
    `
  };

  // Simulate email sending delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('📧 CONFIRMATION EMAIL SENT:', emailData);
  
  // Log to track email interactions
  logEmailInteraction('confirmation', formData.email, 'sent', formData.submissionId);
  
  return {
    success: true,
    emailId: generateEmailId(),
    timestamp: new Date().toISOString()
  };
};

export const sendApprovalEmail = async (submissionId, recipientEmail, status = 'approved', followUpLinks = []) => {
  const emailData = {
    to: recipientEmail,
    subject: `Submission ${status.charAt(0).toUpperCase() + status.slice(1)} - CORSEP Audio Form`,
    body: `
      Dear Participant,

      Your submission (ID: ${submissionId}) has been ${status}.

      ${status === 'approved' ? 
        `Congratulations! Your story has been approved and may be featured in our upcoming project.` :
        `Thank you for your submission. While we cannot use your story for this project, we appreciate your participation.`
      }

      ${followUpLinks.length > 0 ? `
        Follow-up Actions:
        ${followUpLinks.map(link => `- ${link.title}: ${link.url}`).join('\n        ')}
      ` : ''}

      ${status === 'approved' ? `
        Next Steps:
        - You may be contacted for additional information
        - Check your email for updates on the project timeline
        - Visit our website for project updates
      ` : ''}

      Thank you for your participation in the CORSEP project.

      Best regards,
      The CORSEP Team
    `
  };

  // Simulate email sending delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('📧 APPROVAL EMAIL SENT:', emailData);
  
  // Log to track email interactions
  logEmailInteraction('approval', recipientEmail, 'sent', submissionId, { status, followUpLinks });
  
  return {
    success: true,
    emailId: generateEmailId(),
    timestamp: new Date().toISOString()
  };
};

export const sendReminderEmail = async (submissionId, recipientEmail) => {
  const emailData = {
    to: recipientEmail,
    subject: 'Reminder: Your CORSEP Audio Form Submission',
    body: `
      Dear Participant,

      This is a friendly reminder about your submission (ID: ${submissionId}) to our CORSEP Audio Form.

      We are still reviewing your submission and will contact you soon with an update.

      If you have any questions or concerns, please don't hesitate to reach out to us.

      Best regards,
      The CORSEP Team
    `
  };

  // Simulate email sending delay
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('📧 REMINDER EMAIL SENT:', emailData);
  
  // Log to track email interactions
  logEmailInteraction('reminder', recipientEmail, 'sent', submissionId);
  
  return {
    success: true,
    emailId: generateEmailId(),
    timestamp: new Date().toISOString()
  };
};

// Helper functions
const getSubmissionType = (formData) => {
  const types = [];
  
  if (formData.audioRecording && formData.audioRecording.blob) {
    types.push('Audio Recording');
  }
  
  if (formData.uploadedFiles && formData.uploadedFiles.length > 0) {
    types.push(`File Upload (${formData.uploadedFiles.length} files)`);
  }
  
  if (formData.textStory && formData.textStory.trim()) {
    types.push('Text Story');
  }
  
  return types.join(', ') || 'Unknown';
};

const generateEmailId = () => {
  return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const logEmailInteraction = (type, recipient, status, submissionId, additionalData = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    recipient,
    status,
    submissionId,
    ...additionalData
  };
  
  console.log('📊 EMAIL INTERACTION LOG:', logEntry);
  
  // In a real implementation, this would save to a database or analytics service
  // For now, we'll store in localStorage for tracking
  if (typeof window !== 'undefined') {
    const existingLogs = JSON.parse(localStorage.getItem('emailLogs') || '[]');
    existingLogs.push(logEntry);
    localStorage.setItem('emailLogs', JSON.stringify(existingLogs));
  }
};

// Email template helpers
export const getEmailTemplate = (type, data) => {
  const templates = {
    confirmation: {
      subject: 'Thank you for your submission - CORSEP Audio Form',
      getBody: (data) => `
        Dear ${data.firstName} ${data.lastName},
        
        Thank you for submitting your story through our audio form.
        
        Submission Details:
        - Submitted at: ${new Date().toLocaleString()}
        - Submission ID: ${data.submissionId}
        
        We'll review your submission and get back to you within 2-3 business days.
        
        Best regards,
        The CORSEP Team
      `
    },
    approval: {
      subject: 'Submission Approved - CORSEP Audio Form',
      getBody: (data) => `
        Dear Participant,
        
        Your submission (ID: ${data.submissionId}) has been approved!
        
        Congratulations! Your story has been approved and may be featured in our upcoming project.
        
        Best regards,
        The CORSEP Team
      `
    },
    rejection: {
      subject: 'Submission Update - CORSEP Audio Form',
      getBody: (data) => `
        Dear Participant,
        
        Thank you for your submission (ID: ${data.submissionId}).
        
        While we cannot use your story for this project, we appreciate your participation.
        
        Best regards,
        The CORSEP Team
      `
    }
  };
  
  return templates[type] || null;
};

// Email queue simulation (for batch processing)
export const emailQueue = {
  queue: [],
  
  add: (emailData) => {
    emailQueue.queue.push({
      ...emailData,
      id: generateEmailId(),
      addedAt: new Date().toISOString(),
      status: 'queued'
    });
    console.log('📬 Email added to queue:', emailData);
  },
  
  process: async () => {
    console.log('📮 Processing email queue...');
    
    for (const email of emailQueue.queue) {
      if (email.status === 'queued') {
        try {
          email.status = 'sending';
          
          // Simulate email sending
          await new Promise(resolve => setTimeout(resolve, 500));
          
          email.status = 'sent';
          email.sentAt = new Date().toISOString();
          
          console.log('✅ Email sent:', email.id);
        } catch (error) {
          email.status = 'failed';
          email.error = error.message;
          console.error('❌ Email failed:', email.id, error);
        }
      }
    }
  },
  
  getStatus: () => {
    return emailQueue.queue.reduce((stats, email) => {
      stats[email.status] = (stats[email.status] || 0) + 1;
      return stats;
    }, {});
  }
}; 