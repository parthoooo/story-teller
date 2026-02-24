import fs from 'fs';
import path from 'path';
import connectDB from '../../../../lib/mongodb';
import Submission from '../../../../models/Submission';
import { withAuth } from '../../../../middleware/adminAuth';
import { logger } from '../../../../utils/logger';

async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { submissionId } = req.body;

    if (!submissionId) {
      logger.warn('admin_delete_submission_validation_failed', {
        reason: 'missing_submission_id',
        adminId: req.admin?._id ? String(req.admin._id) : undefined,
      });
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
          logger.info('admin_delete_submission_file_deleted', {
            filename: path.basename(filePath),
            submissionId,
          });
        }
      } catch (error) {
        logger.error('admin_delete_submission_file_delete_error', {
          filename: path.basename(filePath),
          submissionId,
          error,
        });
        failedFiles.push(path.basename(filePath));
      }
    }

    // Delete submission from database
    await Submission.findByIdAndDelete(submissionId);

    logger.info('admin_delete_submission', {
      submissionId,
      adminId: req.admin?._id ? String(req.admin._id) : undefined,
      username: req.admin?.username,
      filesDeleted: deletedFiles.length,
      filesFailed: failedFiles.length,
    });

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
    logger.error('admin_delete_submission_error', { error });
    res.status(500).json({ 
      error: 'Server error deleting submission',
      details: error.message 
    });
  }
}

export default withAuth(handler);
