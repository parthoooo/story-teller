# CORSEP Audio Form

A comprehensive, compliant, and user-friendly form application built with Next.js that allows users to record audio, upload files, and share their stories through various media formats.

## Features

### 📱 User Experience
- **In-browser audio recording** using react-mic
- **File upload support** for audio, video, and image files
- **Text entry alternative** for written stories
- **Responsive design** that works on desktop and mobile
- **Accessibility compliant** with ARIA labels and keyboard navigation

### 🔧 Technical Features
- **Local file storage** in `/public/uploads` directory
- **Form validation** with real-time feedback
- **Email confirmations** (stubbed for development)
- **Submission tracking** and analytics (localStorage-based)
- **Drag-and-drop file upload**
- **File type and size validation**

### 🛡️ Compliance & Security
- **Required consent checkbox** for data collection
- **Timestamped consent** in stored submissions
- **Input sanitization** and validation
- **Privacy-focused design** with local storage
- **GDPR-ready** consent management

## Project Structure

```
├── components/
│   └── AudioRecorder.js     # Reusable audio recording component
├── pages/
│   ├── index.js            # Homepage with project information
│   ├── submit.js           # Main form page
│   ├── _app.js             # Next.js app configuration
│   └── api/
│       └── submit-form.js  # API route for form submission
├── utils/
│   ├── validateForm.js     # Form validation utilities
│   └── emailStub.js        # Email stub functions
├── styles/
│   └── globals.css         # Global CSS styles
├── public/
│   └── uploads/            # Local file storage directory
├── data/
│   ├── submissions.json    # Form submissions storage
│   └── submission-logs.json # Interaction logs
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation Steps

1. **Clone or download the project**
   ```bash
   cd corsep-audio-form
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create required directories**
   ```bash
   mkdir -p public/uploads data
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## Usage

### For Users

1. **Visit the homepage** to learn about the project
2. **Click "Share Your Story"** to access the form
3. **Fill in personal information** (required fields marked with *)
4. **Share your story** through one or more methods:
   - 🎤 Record audio directly in the browser
   - 📁 Upload existing audio/video/image files
   - ✍️ Write your story in the text area
5. **Answer optional PROC questions**
6. **Read and accept the consent terms** (required)
7. **Submit your story**

### Form Fields

#### Required Fields
- First Name
- Last Name  
- Email Address
- Zip Code
- At least one story format (audio, file, or text)
- Consent agreement checkbox

#### Optional Fields
- PROC-related questions (dropdown and radio buttons)
- Continued engagement opt-in
- Multiple story formats can be combined

### File Upload Specifications

- **Supported formats**: Audio (WAV, MP3, OGG), Video (MP4, AVI, MOV), Images (JPEG, PNG, GIF, WebP)
- **Size limits**: 50MB per file, 100MB total
- **Upload methods**: Drag-and-drop or browse button
- **File preview**: Shows file name, type, and size

## Development

### Key Technologies
- **Next.js 14** - React framework
- **react-mic** - Audio recording
- **formidable** - File upload handling
- **fs-extra** - File system operations
- **uuid** - Unique ID generation

### API Routes

#### POST /api/submit-form
Handles form submissions with:
- Form data validation
- File upload processing
- Local storage of submissions
- Email confirmation sending (stubbed)
- Interaction logging

### Data Storage

#### Local Storage (Development)
- **Submissions**: `data/submissions.json`
- **Logs**: `data/submission-logs.json`
- **Files**: `public/uploads/`

#### Browser Storage (Tracking)
- **Interaction logs**: `localStorage.interactionLogs`
- **Email logs**: `localStorage.emailLogs`

### Validation Rules

- **Email**: Valid email format required
- **Zip Code**: US format (12345 or 12345-6789)
- **Names**: Minimum 2 characters
- **Content**: At least one story format required
- **Files**: Type and size validation
- **Consent**: Required checkbox

## Accessibility Features

- **ARIA labels** for screen readers
- **Keyboard navigation** support
- **Focus management** with visible focus indicators
- **Error announcements** with `role="alert"`
- **High contrast mode** support
- **Reduced motion** support
- **Mobile-friendly** responsive design

## Email System (Stubbed)

The application includes stubbed email functionality for:

1. **Confirmation emails** - Sent immediately after submission
2. **Approval/rejection emails** - For administrative follow-up
3. **Reminder emails** - For incomplete submissions

All emails are logged to console and localStorage for development.

## Analytics & Tracking

Stubbed tracking includes:
- Form start/completion rates
- Drop-off points
- File upload vs. audio recording usage
- Device/browser information
- User interaction patterns

## Future Enhancements

### Phase 2 Roadmap
- **AWS S3 integration** for file storage
- **MongoDB database** for submissions
- **Real email service** (SendGrid, AWS SES)
- **Advanced analytics** dashboard
- **Additional media types** support
- **User authentication** system

### Express.js Backend
The current implementation uses Next.js API routes but is structured to easily migrate to Express.js for MongoDB integration.

## Testing

### Manual Testing Checklist
- [ ] Audio recording functionality
- [ ] File upload (drag-and-drop and browse)
- [ ] Form validation (all fields)
- [ ] Mobile responsiveness
- [ ] Accessibility with keyboard navigation
- [ ] Error handling
- [ ] Success flow completion

### Browser Compatibility
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Common Issues

1. **Audio recording not working**
   - Check browser permissions for microphone
   - Ensure HTTPS in production
   - Verify react-mic compatibility

2. **File upload failing**
   - Check file size limits
   - Verify file type support
   - Ensure uploads directory exists

3. **Form submission errors**
   - Check form validation
   - Verify API route functionality
   - Check console for detailed errors

### Debug Mode
Enable debug logging by setting `DEBUG=true` in browser console.

## Contributing

### Code Style
- Use consistent indentation (2 spaces)
- Follow React best practices
- Include accessibility attributes
- Add comments for complex logic

### Submission Process
1. Fork the repository
2. Create a feature branch
3. Test thoroughly
4. Submit pull request with description

## License

This project is for educational and research purposes. Please ensure compliance with local data protection regulations.

## Support

For technical issues or questions:
- Check the troubleshooting section
- Review browser console for errors
- Contact: support@corsep.org

---

**Note**: This is a development version with local storage. Production deployment requires additional security measures and proper data storage solutions. 