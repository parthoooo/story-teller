import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import AudioRecorder from '../components/AudioRecorder';
import { validateForm, validateEmail, validateZipCode, validateName, validateFileUpload } from '../utils/validateForm';
import Link from 'next/link';

const SubmitForm = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    zipCode: '',
    textStory: '',
    procQuestion1: '',
    procQuestion2: '',
    consentAgreed: false,
    continuedEngagement: false,
    audioRecording: null,
    uploadedFiles: []
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fieldValidation, setFieldValidation] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const fileInputRef = useRef(null);
  const formRef = useRef(null);

  // Tracking hooks
  useEffect(() => {
    // Track form start
    logInteraction('form_started', { sessionId });
    
    // Track page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logInteraction('form_hidden', { sessionId });
      } else {
        logInteraction('form_visible', { sessionId });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sessionId]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Clear field-specific errors
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Real-time validation for specific fields
    if (name === 'email' && value) {
      const emailValidation = validateEmail(value);
      setFieldValidation(prev => ({
        ...prev,
        email: emailValidation
      }));
    } else if (name === 'zipCode' && value) {
      const zipValidation = validateZipCode(value);
      setFieldValidation(prev => ({
        ...prev,
        zipCode: zipValidation
      }));
    } else if ((name === 'firstName' || name === 'lastName') && value) {
      const nameValidation = validateName(value, name === 'firstName' ? 'First Name' : 'Last Name');
      setFieldValidation(prev => ({
        ...prev,
        [name]: nameValidation
      }));
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const validation = validateFileUpload(files);
    
    if (!validation.isValid) {
      setErrors(prev => ({
        ...prev,
        uploadedFiles: validation.errors.join(', ')
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      uploadedFiles: [...prev.uploadedFiles, ...files]
    }));
    
    // Clear file upload errors
    setErrors(prev => ({
      ...prev,
      uploadedFiles: ''
    }));
    
    // Track file upload
    logInteraction('file_uploaded', { 
      sessionId, 
      fileCount: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0)
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validation = validateFileUpload(files);
    
    if (!validation.isValid) {
      setErrors(prev => ({
        ...prev,
        uploadedFiles: validation.errors.join(', ')
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      uploadedFiles: [...prev.uploadedFiles, ...files]
    }));
    
    logInteraction('file_dropped', { 
      sessionId, 
      fileCount: files.length 
    });
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter((_, i) => i !== index)
    }));
    
    logInteraction('file_removed', { sessionId, fileIndex: index });
  };

  const handleAudioRecorded = (audioBlob) => {
    console.log('🎤 Audio Recorded Debug:', {
      audioBlob,
      audioBlobKeys: audioBlob ? Object.keys(audioBlob) : 'null',
      hasBlob: audioBlob && audioBlob.blob,
      hasBlobData: audioBlob && audioBlob.blobData,
      hasBlobURL: audioBlob && audioBlob.blobURL
    });
    
    setFormData(prev => ({
      ...prev,
      audioRecording: audioBlob
    }));
    
    if (audioBlob) {
      logInteraction('audio_recorded', { 
        sessionId, 
        duration: audioBlob.duration || 0 
      });
    } else {
      logInteraction('audio_deleted', { sessionId });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Wait a bit to ensure state updates have completed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Debug form data before validation
    console.log('📋 Form Data Before Validation:', {
      hasAudioRecording: !!formData.audioRecording,
      audioRecordingType: typeof formData.audioRecording,
      audioRecordingHasBlobData: formData.audioRecording?.blobData ? 'YES' : 'NO',
      audioRecordingHasBlob: formData.audioRecording?.blob ? 'YES' : 'NO',
      uploadedFilesCount: formData.uploadedFiles?.length || 0,
      textStoryLength: formData.textStory?.length || 0,
      fullAudioRecording: formData.audioRecording
    });
    
    // Validate form
    const validation = validateForm(formData);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      logInteraction('form_validation_failed', { 
        sessionId, 
        errors: Object.keys(validation.errors) 
      });
      
      // Scroll to first error
      const firstErrorField = Object.keys(validation.errors)[0];
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorElement.focus();
      }
      
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      // Prepare form data for submission
      const formDataToSubmit = new FormData();
      
      // Add text fields
      Object.keys(formData).forEach(key => {
        if (key !== 'uploadedFiles' && key !== 'audioRecording') {
          formDataToSubmit.append(key, formData[key]);
        }
      });
      
      // Add uploaded files
      formData.uploadedFiles.forEach(file => {
        formDataToSubmit.append('uploadedFiles', file);
      });
      
      // Add audio recording
      if (formData.audioRecording) {
        formDataToSubmit.append('audioRecording', JSON.stringify({
          blobData: formData.audioRecording.blobData,
          duration: formData.audioRecording.duration,
          format: formData.audioRecording.format || 'webm'
        }));
      }
      
      // Add session tracking
      formDataToSubmit.append('sessionId', sessionId);
      
      // Submit form
      const response = await fetch('/api/submit-form', {
        method: 'POST',
        body: formDataToSubmit,
        headers: {
          'X-Session-ID': sessionId
        }
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setSubmitSuccess(true);
        logInteraction('form_submitted', { 
          sessionId, 
          submissionId: result.submissionId 
        });
        
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          zipCode: '',
          textStory: '',
          procQuestion1: '',
          procQuestion2: '',
          consentAgreed: false,
          continuedEngagement: false,
          audioRecording: null,
          uploadedFiles: []
        });
        
        // Scroll to success message
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
      } else {
        setSubmitError(result.message || 'An error occurred while submitting the form');
        setErrors(result.errors || {});
        
        logInteraction('form_submission_failed', { 
          sessionId, 
          error: result.message 
        });
      }
      
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitError('Network error. Please check your connection and try again.');
      
      logInteraction('form_submission_error', { 
        sessionId, 
        error: error.message 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const logInteraction = (eventType, data) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      ...data
    };
    
    console.log('📊 USER INTERACTION:', logEntry);
    
    // Store in localStorage for now
    if (typeof window !== 'undefined') {
      const existingLogs = JSON.parse(localStorage.getItem('interactionLogs') || '[]');
      existingLogs.push(logEntry);
      localStorage.setItem('interactionLogs', JSON.stringify(existingLogs));
    }
  };

  const renderFilePreview = (file, index) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    
    return (
      <div key={index} className="file-preview">
        <div className="file-info">
          <div className="file-icon">
            {isImage && '🖼️'}
            {isVideo && '🎥'}
            {isAudio && '🎵'}
            {!isImage && !isVideo && !isAudio && '📄'}
          </div>
          <div className="file-details">
            <span className="file-name">{file.name}</span>
            <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => removeFile(index)}
          className="remove-file-btn"
          aria-label={`Remove ${file.name}`}
        >
          ×
        </button>
      </div>
    );
  };

  if (submitSuccess) {
    return (
      <div className="success-container">
        <Head>
          <title>Submission Successful - CORSEP Audio Form</title>
        </Head>
        <div className="success-message">
          <div className="success-icon">✅</div>
          <h1>Thank You!</h1>
          <p>Your story has been submitted successfully. We've sent a confirmation email to your address.</p>
          <p>Our team will review your submission and get back to you within 2-3 business days.</p>
          <button 
            onClick={() => {
              setSubmitSuccess(false);
              window.location.reload();
            }}
            className="submit-another-btn"
          >
            Submit Another Story
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <Head>
        <title>Submit Your Story - CORSEP Audio Form</title>
        <meta name="description" content="Share your story through audio recording, file upload, or text entry" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      
      <header className="form-header">
      <div className="cta-buttons">
            <Link href="/" className="cta-button primary">
              Home
            </Link>
            <Link href="/admin/dashboard" className="cta-button secondary">
              ⚙️ Admin Dashboard
            </Link>
          </div>
        <h1>Share Your Story</h1>      
        <p>Tell us your experience through audio recording, file upload, or written text.</p>
      </header>

      <form ref={formRef} onSubmit={handleSubmit} className="story-form">
        {submitError && (
          <div className="error-banner" role="alert">
            <strong>Error:</strong> {submitError}
          </div>
        )}

        {/* Personal Information */}
        <section className="form-section">
          <h2>Personal Information</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">
                First Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={errors.firstName ? 'error' : ''}
                aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                required
              />
              {errors.firstName && (
                <span id="firstName-error" className="error-message" role="alert">
                  {errors.firstName}
                </span>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="lastName">
                Last Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={errors.lastName ? 'error' : ''}
                aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                required
              />
              {errors.lastName && (
                <span id="lastName-error" className="error-message" role="alert">
                  {errors.lastName}
                </span>
              )}
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">
                Email Address <span className="required">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={errors.email ? 'error' : ''}
                aria-describedby={errors.email ? 'email-error' : undefined}
                required
              />
              {errors.email && (
                <span id="email-error" className="error-message" role="alert">
                  {errors.email}
                </span>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="zipCode">
                Zip Code <span className="required">*</span>
              </label>
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleInputChange}
                className={errors.zipCode ? 'error' : ''}
                aria-describedby={errors.zipCode ? 'zipCode-error' : undefined}
                placeholder="12345 or 12345-6789"
                required
              />
              {errors.zipCode && (
                <span id="zipCode-error" className="error-message" role="alert">
                  {errors.zipCode}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Story Content */}
        <section className="form-section">
          <h2>Share Your Story</h2>
          <p className="section-description">
            You can share your story in any of the following ways. At least one is required.
          </p>
          
          {/* Audio Recording */}
          <div className="form-group">
            <label>Audio Recording</label>
            <p className="help-text">Record your story directly in your browser</p>
            <AudioRecorder
              onAudioRecorded={handleAudioRecorded}
              disabled={isSubmitting}
            />
          </div>

          {/* File Upload */}
          <div className="form-group">
            <label>File Upload</label>
            <p className="help-text">Upload audio, video, or image files</p>
            <div
              className={`file-upload-area ${dragActive ? 'drag-active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="upload-content">
                <div className="upload-icon">📁</div>
                <p>Drag and drop files here, or <button type="button" onClick={() => fileInputRef.current?.click()}>browse</button></p>
                <p className="upload-limits">Max 50MB per file, 100MB total</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="audio/*,video/*,image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </div>
            
            {formData.uploadedFiles.length > 0 && (
              <div className="uploaded-files">
                <h4>Uploaded Files:</h4>
                {formData.uploadedFiles.map((file, index) => renderFilePreview(file, index))}
              </div>
            )}
            
            {errors.uploadedFiles && (
              <span className="error-message" role="alert">
                {errors.uploadedFiles}
              </span>
            )}
          </div>

          {/* Text Story */}
          <div className="form-group">
            <label htmlFor="textStory">Written Story <span className="optional-label">(Optional)</span></label>
            <p className="help-text">Alternatively, you can write your story here</p>
            <textarea
              id="textStory"
              name="textStory"
              value={formData.textStory}
              onChange={handleInputChange}
              rows={6}
              placeholder="Tell us your story..."
              className={errors.textStory ? 'error' : ''}
              aria-describedby={errors.textStory ? 'textStory-error' : undefined}
            />
            {errors.textStory && (
              <span id="textStory-error" className="error-message" role="alert">
                {errors.textStory}
              </span>
            )}
          </div>
          
          {errors.content && (
            <div className="error-message" role="alert">
              {errors.content}
            </div>
          )}
        </section>

        {/* PROC Questions */}
        <section className="form-section">
          <h2>Additional Questions</h2>
          <p className="section-description">Optional questions related to PROC (Patient-Reported Outcome Consortium)</p>
          
          <div className="form-group">
            <label htmlFor="procQuestion1">
              How has your experience affected your daily life?
            </label>
            <select
              id="procQuestion1"
              name="procQuestion1"
              value={formData.procQuestion1}
              onChange={handleInputChange}
            >
              <option value="">Select an option</option>
              <option value="significantly_improved">Significantly improved</option>
              <option value="somewhat_improved">Somewhat improved</option>
              <option value="no_change">No change</option>
              <option value="somewhat_worse">Somewhat worse</option>
              <option value="significantly_worse">Significantly worse</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="procQuestion2">
              Would you recommend this experience to others?
            </label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="procQuestion2"
                  value="definitely_yes"
                  checked={formData.procQuestion2 === 'definitely_yes'}
                  onChange={handleInputChange}
                />
                Definitely yes
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="procQuestion2"
                  value="probably_yes"
                  checked={formData.procQuestion2 === 'probably_yes'}
                  onChange={handleInputChange}
                />
                Probably yes
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="procQuestion2"
                  value="not_sure"
                  checked={formData.procQuestion2 === 'not_sure'}
                  onChange={handleInputChange}
                />
                Not sure
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="procQuestion2"
                  value="probably_no"
                  checked={formData.procQuestion2 === 'probably_no'}
                  onChange={handleInputChange}
                />
                Probably no
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="procQuestion2"
                  value="definitely_no"
                  checked={formData.procQuestion2 === 'definitely_no'}
                  onChange={handleInputChange}
                />
                Definitely no
              </label>
            </div>
          </div>
        </section>

        {/* Consent */}
        <section className="form-section">
          <h2>Consent & Release</h2>
          
          <div className="consent-group">
            <div className="consent-text">
              <h3>Terms of Consent & Release</h3>
              <p>By submitting this form, you agree to the following:</p>
              <ul>
                <li>You consent to the collection and processing of your personal information as described</li>
                <li>You grant permission for your story to be used for research and educational purposes</li>
                <li>You understand that your submission may be shared with authorized team members</li>
                <li>You confirm that all information provided is accurate and truthful</li>
                <li>You understand that participation is voluntary and you may withdraw at any time</li>
              </ul>
            </div>
            
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="consentAgreed"
                  checked={formData.consentAgreed}
                  onChange={handleInputChange}
                  required
                />
                <span className="required">*</span> I have read and agree to the consent and release terms
              </label>
              {errors.consentAgreed && (
                <span className="error-message" role="alert">
                  {errors.consentAgreed}
                </span>
              )}
            </div>
            
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="continuedEngagement"
                  checked={formData.continuedEngagement}
                  onChange={handleInputChange}
                />
                I would like to receive updates about this project and future opportunities to participate
              </label>
            </div>
          </div>
        </section>

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            disabled={isSubmitting}
            className="submit-btn"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Story'}
          </button>
        </div>
      </form>


    </div>
  );
};

export default SubmitForm; 