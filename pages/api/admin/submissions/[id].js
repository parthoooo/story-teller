import connectDB from '../../../../lib/mongodb';
import Submission from '../../../../models/Submission';
import { withAuth } from '../../../../middleware/adminAuth';

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      await connectDB();

      const { status, adminNotes } = req.body;

      // Validate status
      const validStatuses = ['pending', 'reviewed', 'approved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      // Update submission
      const submission = await Submission.findByIdAndUpdate(
        id,
        {
          status,
          adminNotes: adminNotes || '',
          reviewedAt: new Date(),
          reviewedBy: req.admin.username
        },
        { new: true }
      );

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      console.log(`✅ Submission ${id} updated to ${status} by ${req.admin.username}`);

      res.status(200).json({
        message: 'Submission updated successfully',
        submission
      });

    } catch (error) {
      console.error('Update submission error:', error);
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