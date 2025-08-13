import fs from 'fs';
import path from 'path';
import connectDB from '../../../../lib/mongodb';
import Submission from '../../../../models/Submission';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { submissionId } = req.body;

    if (!submissionId) {
      return res.status(400).json({ error: 'Submission ID is required' });
    }

    // Find the submission first to get file paths
    const submission = await Submission.findById(submissionId);
    
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Collect files to delete
    const filesToDelete = [];

    // Audio recording file
    if (submission.content?.audioRecording?.filename) {
      const audioPath = path.join(process.cwd(), 'public', 'uploads', submission.content.audioRecording.filename);
      filesToDelete.push(audioPath);
    }

    // Uploaded files
    if (submission.content?.uploadedFiles?.length > 0) {
      submission.content.uploadedFiles.forEach(file => {
        if (file.filename) {
          const filePath = path.join(process.cwd(), 'public', 'uploads', file.filename);
          filesToDelete.push(filePath);
        }
      });
    }

    // Delete files from storage
    const deletedFiles = [];
    const failedFiles = [];
    
    for (const filePath of filesToDelete) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          deletedFiles.push(path.basename(filePath));
          console.log('✅ Deleted file:', path.basename(filePath));
        }
      } catch (error) {
        console.error('❌ Failed to delete file:', path.basename(filePath), error);
        failedFiles.push(path.basename(filePath));
      }
    }

    // Delete submission from database
    await Submission.findByIdAndDelete(submissionId);

    console.log('✅ Submission deleted:', submissionId);

    res.status(200).json({
      message: 'Submission deleted successfully',
      submissionId: submissionId,
      deletedFiles: deletedFiles,
      failedFiles: failedFiles,
      summary: {
        submissionDeleted: true,
        filesDeleted: deletedFiles.length,
        filesFailed: failedFiles.length
      }
    });

  } catch (error) {
    console.error('❌ Delete submission error:', error);
    res.status(500).json({ 
      error: 'Server error deleting submission',
      details: error.message 
    });
  }
}
