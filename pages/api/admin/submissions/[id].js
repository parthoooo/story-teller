import connectDB from '../../../../lib/mongodb';
import Submission from '../../../../models/Submission';
import { withAuth } from '../../../../middleware/adminAuth';
import { sanitizeInput } from '../../../../utils/validateForm';
import { logger } from '../../../../utils/logger';

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      await connectDB();

      const { status, adminNotes, tags, collectionSlug } = req.body;

      // Validate status
      const validStatuses = ['pending', 'reviewed', 'approved', 'rejected'];
      if (!validStatuses.includes(status)) {
        logger.warn('admin_update_submission_validation_failed', {
          submissionId: id,
          status,
          adminId: req.admin?._id ? String(req.admin._id) : undefined,
        });
        return res.status(400).json({ error: 'Invalid status' });
      }

      const safeAdminNotes = adminNotes ? sanitizeInput(adminNotes) : '';
      const safeTags = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : undefined;
      const safeCollectionSlug = collectionSlug != null ? String(collectionSlug).trim().toLowerCase() : undefined;

      const update = {
        status,
        adminNotes: safeAdminNotes,
        reviewedAt: new Date(),
        reviewedBy: req.admin.username
      };
      if (safeTags !== undefined) update.tags = safeTags;
      if (safeCollectionSlug !== undefined) update.collectionSlug = safeCollectionSlug;

      const submission = await Submission.findByIdAndUpdate(id, update, { new: true });

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      logger.info('admin_update_submission', {
        submissionId: id,
        status,
        adminId: req.admin?._id ? String(req.admin._id) : undefined,
        username: req.admin?.username,
      });

      res.status(200).json({
        message: 'Submission updated successfully',
        submission
      });

    } catch (error) {
      logger.error('admin_update_submission_error', { error, submissionId: id });
      res.status(500).json({ error: 'Server error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await connectDB();

      const submission = await Submission.findByIdAndDelete(id);

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      console.log(`🗑️ Submission ${id} deleted by ${req.admin.username}`);

      res.status(200).json({
        message: 'Submission deleted successfully'
      });

    } catch (error) {
      console.error('Delete submission error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default withAuth(handler); 