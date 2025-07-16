import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import AudioRecorder from '../components/AudioRecorder';
import { validateForm, validateEmail, validateZipCode, validateName, validateFileUpload } from '../utils/validateForm';

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
            <label htmlFor="textStory">Written Story</label>
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

      <style jsx>{`
        .form-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          line-height: 1.6;
        }

        .form-header {
          text-align: center;
          margin-bottom: 40px;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 10px;
        }

        .form-header h1 {
          margin: 0 0 10px 0;
          font-size: 2.5rem;
        }

        .form-header p {
          margin: 0;
          font-size: 1.1rem;
          opacity: 0.9;
        }

        .story-form {
          background: white;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          padding: 30px;
        }

        .form-section {
          margin-bottom: 40px;
          padding-bottom: 30px;
          border-bottom: 2px solid #f0f0f0;
        }

        .form-section:last-child {
          border-bottom: none;
        }

        .form-section h2 {
          color: #333;
          margin-bottom: 10px;
          font-size: 1.8rem;
        }

        .section-description {
          color: #666;
          margin-bottom: 20px;
          font-style: italic;
        }

        .form-row {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }

        .form-group {
          flex: 1;
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 600;
          color: #333;
        }

        .required {
          color: #dc3545;
        }

        .help-text {
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 10px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 6px;
          font-size: 16px;
          transition: border-color 0.3s ease;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-group input.error,
        .form-group select.error,
        .form-group textarea.error {
          border-color: #dc3545;
        }

        .error-message {
          color: #dc3545;
          font-size: 0.9rem;
          margin-top: 5px;
          display: block;
        }

        .error-banner {
          background-color: #f8d7da;
          color: #721c24;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
          border: 1px solid #f5c6cb;
        }

        .file-upload-area {
          border: 2px dashed #ddd;
          border-radius: 10px;
          padding: 40px;
          text-align: center;
          background: #f9f9f9;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .file-upload-area:hover,
        .file-upload-area.drag-active {
          border-color: #667eea;
          background: #f0f4ff;
        }

        .upload-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .upload-icon {
          font-size: 3rem;
          margin-bottom: 10px;
        }

        .upload-limits {
          color: #666;
          font-size: 0.9rem;
        }

        .uploaded-files {
          margin-top: 20px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .uploaded-files h4 {
          margin: 0 0 15px 0;
          color: #333;
        }

        .file-preview {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: white;
          border-radius: 6px;
          margin-bottom: 10px;
          border: 1px solid #ddd;
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .file-icon {
          font-size: 1.5rem;
        }

        .file-details {
          display: flex;
          flex-direction: column;
        }

        .file-name {
          font-weight: 600;
          color: #333;
        }

        .file-size {
          color: #666;
          font-size: 0.9rem;
        }

        .remove-file-btn {
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .remove-file-btn:hover {
          background: #c82333;
        }

        .radio-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .radio-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 5px;
        }

        .radio-label input[type="radio"] {
          width: auto;
          margin: 0;
        }

        .consent-group {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #dee2e6;
        }

        .consent-text h3 {
          margin-top: 0;
          color: #333;
        }

        .consent-text ul {
          margin: 15px 0;
          padding-left: 20px;
        }

        .consent-text li {
          margin-bottom: 8px;
        }

        .checkbox-group {
          margin: 15px 0;
        }

        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          cursor: pointer;
          line-height: 1.4;
        }

        .checkbox-label input[type="checkbox"] {
          width: auto;
          margin: 0;
          margin-top: 2px;
        }

        .form-actions {
          text-align: center;
          padding-top: 20px;
          border-top: 2px solid #f0f0f0;
        }

        .submit-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 15px 40px;
          font-size: 1.1rem;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          min-width: 200px;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .success-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 20px;
          text-align: center;
        }

        .success-message {
          background: white;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .success-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }

        .success-message h1 {
          color: #28a745;
          margin-bottom: 20px;
        }

        .success-message p {
          color: #666;
          margin-bottom: 15px;
          font-size: 1.1rem;
        }

        .submit-another-btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
          margin-top: 20px;
        }

        .submit-another-btn:hover {
          background: #5a6fd8;
        }

        @media (max-width: 768px) {
          .form-container {
            padding: 10px;
          }

          .form-header h1 {
            font-size: 2rem;
          }

          .form-row {
            flex-direction: column;
            gap: 0;
          }

          .story-form {
            padding: 20px;
          }

          .radio-group {
            gap: 8px;
          }

          .file-upload-area {
            padding: 20px;
          }

          .upload-icon {
            font-size: 2rem;
          }

          .submit-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default SubmitForm; 