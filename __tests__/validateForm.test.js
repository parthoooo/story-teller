import {
  validateForm,
  validateEmail,
  validateZipCode,
} from '../utils/validateForm';

describe('validateEmail', () => {
  it('rejects empty email', () => {
    const result = validateEmail('');
    expect(result.isValid).toBe(false);
  });

  it('accepts a valid email', () => {
    const result = validateEmail('user@example.com');
    expect(result.isValid).toBe(true);
  });
});

describe('validateZipCode', () => {
  it('rejects invalid zip code', () => {
    const result = validateZipCode('abc');
    expect(result.isValid).toBe(false);
  });

  it('accepts valid US zip codes', () => {
    expect(validateZipCode('12345').isValid).toBe(true);
    expect(validateZipCode('12345-6789').isValid).toBe(true);
  });
});

describe('validateForm', () => {
  const baseForm = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    zipCode: '12345',
    textStory: '',
    audioRecording: null,
    uploadedFiles: [],
    consentAgreed: true,
  };

  it('requires at least one content source', () => {
    const { isValid, errors } = validateForm(baseForm);
    expect(isValid).toBe(false);
    expect(errors.content).toBeDefined();
  });

  it('accepts a text-only story', () => {
    const { isValid, errors } = validateForm({
      ...baseForm,
      textStory: 'My story',
    });
    expect(isValid).toBe(true);
    expect(Object.keys(errors).length).toBe(0);
  });

  it('accepts an audio recording', () => {
    const { isValid, errors } = validateForm({
      ...baseForm,
      audioRecording: { blobData: 'abc123', duration: 10 },
    });
    expect(isValid).toBe(true);
    expect(Object.keys(errors).length).toBe(0);
  });
});

