# CORSEP Audio Form - Admin System

## Overview
The admin system provides a web interface for managing form submissions with MongoDB integration. Administrators can view, search, and manage all form submissions through a secure dashboard.

## Features

### ✅ Authentication System
- Secure JWT-based authentication
- Password hashing with bcrypt
- Session management
- Role-based access control

### ✅ Admin Dashboard
- View all form submissions
- Search and filter submissions
- Pagination support
- Status management (pending, reviewed, approved, rejected)
- Audio playback functionality
- Real-time statistics

### ✅ MongoDB Integration
- Persistent data storage
- Indexed queries for performance
- Automatic data migration from JSON files
- Backup and recovery support

## Quick Start

### 1. Prerequisites
- MongoDB running locally (port 27017)
- Node.js and npm installed
- Next.js development server running

### 2. Setup Admin Account
Visit the admin setup page to create your first admin user:
```
http://localhost:3000/admin/setup
```

**Default credentials for testing:**
- Username: `admin`
- Email: `admin@corsep.com`
- Password: `corsep123`

### 3. Access Admin Dashboard
After creating an admin account, login at:
```
http://localhost:3000/admin/login
```

Then access the dashboard at:
```
http://localhost:3000/admin/dashboard
```

## Database Schema

### Submissions Collection
```javascript
{
  _id: ObjectId,
  submittedAt: Date,
  personalInfo: {
    firstName: String,
    lastName: String,
    email: String,
    zipCode: String
  },
  content: {
    textStory: String,
    audioRecording: {
      filename: String,
      filepath: String,
      duration: Number,
      format: String,
      recordedAt: Date,
      hasRecording: Boolean,
      size: Number
    },
    uploadedFiles: Array
  },
  procResponses: {
    question1: String,
    question2: String
  },
  consent: {
    agreed: Boolean,
    agreedAt: Date,
    continuedEngagement: Boolean
  },
  tracking: {
    userAgent: String,
    ipAddress: String,
    sessionId: String
  },
  status: String, // pending, reviewed, approved, rejected
  adminNotes: String,
  reviewedAt: Date,
  reviewedBy: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Admin Users Collection
```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  password: String, // hashed with bcrypt
  role: String, // admin, moderator
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### Authentication
- `POST /api/admin/setup` - Create initial admin user
- `POST /api/admin/login` - Admin login

### Submissions Management
- `GET /api/admin/submissions` - Get paginated submissions
  - Query parameters: `page`, `limit`, `status`, `search`
- `PUT /api/admin/submissions/:id` - Update submission status
- `DELETE /api/admin/submissions/:id` - Delete submission

### Example API Usage

#### Login
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "corsep123"}'
```

#### Get Submissions
```bash
curl -X GET "http://localhost:3000/api/admin/submissions?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## File Structure

```
├── lib/
│   └── mongodb.js              # MongoDB connection
├── models/
│   ├── Submission.js           # Submission schema
│   └── Admin.js                # Admin user schema
├── middleware/
│   └── adminAuth.js            # JWT authentication middleware
├── pages/
│   ├── admin/
│   │   ├── setup.js            # Admin setup page
│   │   ├── login.js            # Admin login page
│   │   └── dashboard.js        # Admin dashboard
│   └── api/
│       └── admin/
│           ├── setup.js        # Admin setup API
│           ├── login.js        # Admin login API
│           └── submissions.js  # Submissions API
├── scripts/
│   └── migrate-to-mongodb.js   # Data migration script
└── ADMIN_README.md             # This file
```

## Security Features

- **JWT Tokens**: 24-hour expiration
- **Password Hashing**: bcrypt with salt rounds
- **Route Protection**: Middleware authentication
- **Input Validation**: Form validation and sanitization
- **CORS Protection**: Secure API endpoints

## Audio File Management

Audio recordings are stored in:
- **File Location**: `/public/uploads/`
- **File Format**: `.webm`
- **Naming Convention**: `{timestamp}_{submissionId}.webm`
- **Database Reference**: Filename stored in submission document

## Data Migration

The system includes a migration script to move existing JSON data to MongoDB:

```bash
node scripts/migrate-to-mongodb.js
```

This script:
- Reads existing `data/submissions.json`
- Converts to MongoDB format
- Handles duplicate detection
- Creates backup files
- Provides migration statistics

## Environment Variables

Create a `.env.local` file for production:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/corsep-audio-form

# JWT Secret (change in production)
JWT_SECRET=your-secure-jwt-secret-key

# Admin Setup
ADMIN_SETUP_ENABLED=true
```

## Production Deployment

### 1. Database Setup
- Use MongoDB Atlas or dedicated MongoDB server
- Update `MONGODB_URI` in environment variables
- Configure database indexes for performance

### 2. Security Hardening
- Change default JWT secret
- Use strong admin passwords
- Enable HTTPS
- Configure proper CORS settings

### 3. File Storage
- Consider using cloud storage (AWS S3) for audio files
- Implement file size limits
- Add virus scanning for uploads

## Dashboard Features

### Statistics Dashboard
- Total submissions count
- Pending review count
- Approved submissions count
- Rejected submissions count

### Search & Filter
- Search by name, email, or zip code
- Filter by status (pending, reviewed, approved, rejected)
- Pagination with configurable page size

### Audio Playback
- Built-in audio player for recorded submissions
- File size display
- Download functionality

### Submission Management
- View full submission details
- Update submission status
- Add admin notes
- Track review history

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running locally
   - Check connection string in `.env.local`

2. **Authentication Errors**
   - Verify JWT secret consistency
   - Check token expiration

3. **File Upload Issues**
   - Ensure `/public/uploads/` directory exists
   - Check file permissions

### Development Commands

```bash
# Start MongoDB
brew services start mongodb/brew/mongodb-community

# Stop MongoDB
brew services stop mongodb/brew/mongodb-community

# View MongoDB logs
tail -f /opt/homebrew/var/log/mongodb/mongo.log

# Connect to MongoDB shell
mongosh

# Restart Next.js dev server
npm run dev
```

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review console logs for error messages
3. Verify MongoDB connection and status
4. Ensure all dependencies are installed

---

**Note**: This admin system is designed for internal use. Ensure proper security measures are in place before deploying to production. 