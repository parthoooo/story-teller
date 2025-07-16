// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Zip code validation (supports US formats)
const zipCodeRegex = /^\d{5}(-\d{4})?$/;

export const validateForm = (formData) => {
  const errors = {};

  // Required fields validation
  if (!formData.firstName || formData.firstName.trim() === '') {
    errors.firstName = 'First name is required';
  }

  if (!formData.lastName || formData.lastName.trim() === '') {
    errors.lastName = 'Last name is required';
  }

  // Email validation
  if (!formData.email || formData.email.trim() === '') {
    errors.email = 'Email address is required';
  } else if (!emailRegex.test(formData.email.trim())) {
    errors.email = 'Please enter a valid email address';
  }

  // Zip code validation
  if (!formData.zipCode || formData.zipCode.trim() === '') {
    errors.zipCode = 'Zip code is required';
  } else if (!zipCodeRegex.test(formData.zipCode.trim())) {
    errors.zipCode = 'Please enter a valid zip code (e.g., 12345 or 12345-6789)';
  }

  // Content validation - at least one form of content required
  const hasAudioRecording = formData.audioRecording && formData.audioRecording.blob;
  const hasFileUpload = formData.uploadedFiles && formData.uploadedFiles.length > 0;
  const hasTextStory = formData.textStory && formData.textStory.trim() !== '';

  if (!hasAudioRecording && !hasFileUpload && !hasTextStory) {
    errors.content = 'Please provide your story through audio recording, file upload, or text entry';
  }

  // Consent validation
  if (!formData.consentAgreed) {
    errors.consentAgreed = 'You must agree to the consent and release terms to submit';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateEmail = (email) => {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email address is required' };
  }
  
  const isValid = emailRegex.test(email.trim());
  return {
    isValid,
    error: isValid ? null : 'Please enter a valid email address'
  };
};

export const validateZipCode = (zipCode) => {
  if (!zipCode || zipCode.trim() === '') {
    return { isValid: false, error: 'Zip code is required' };
  }
  
  const isValid = zipCodeRegex.test(zipCode.trim());
  return {
    isValid,
    error: isValid ? null : 'Please enter a valid zip code (e.g., 12345 or 12345-6789)'
  };
};

export const validateName = (name, fieldName) => {
  if (!name || name.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  if (name.trim().length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters long` };
  }
  
  return { isValid: true, error: null };
};

export const validateFileUpload = (files) => {
  const errors = [];
  const allowedTypes = {
    'audio/wav': 'WAV Audio',
    'audio/mp3': 'MP3 Audio',
    'audio/mpeg': 'MP3 Audio',
    'audio/ogg': 'OGG Audio',
    'video/mp4': 'MP4 Video',
    'video/avi': 'AVI Video',
    'video/mov': 'MOV Video',
    'video/quicktime': 'MOV Video',
    'image/jpeg': 'JPEG Image',
    'image/jpg': 'JPG Image',
    'image/png': 'PNG Image',
    'image/gif': 'GIF Image',
    'image/webp': 'WebP Image'
  };
  
  const maxFileSize = 50 * 1024 * 1024; // 50MB per file
  const maxTotalSize = 100 * 1024 * 1024; // 100MB total
  
  if (!files || files.length === 0) {
    return { isValid: true, errors: [] };
  }
  
  let totalSize = 0;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Check file type
    if (!allowedTypes[file.type]) {
      errors.push(`${file.name}: File type not supported. Allowed types: ${Object.values(allowedTypes).join(', ')}`);
      continue;
    }
    
    // Check file size
    if (file.size > maxFileSize) {
      errors.push(`${file.name}: File size exceeds 50MB limit`);
      continue;
    }
    
    totalSize += file.size;
  }
  
  // Check total size
  if (totalSize > maxTotalSize) {
    errors.push('Total file size exceeds 100MB limit');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
};

export const formatValidationErrors = (errors) => {
  return Object.entries(errors).map(([field, message]) => ({
    field,
    message
  }));
}; 