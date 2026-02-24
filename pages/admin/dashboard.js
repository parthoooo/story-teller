import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminUser, setAdminUser] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    page: 1
  });
  const [pagination, setPagination] = useState({});
  const [statusStats, setStatusStats] = useState({});
  const router = useRouter();

  useEffect(() => {
    // On mount or filter change, ensure we are authenticated and then load submissions
    const ensureAuthenticatedAndLoad = async () => {
      try {
        const meResponse = await fetch('/api/admin/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (meResponse.status === 401) {
          router.push('/admin/login');
          return;
        }

        if (!meResponse.ok) {
          setError('Failed to load admin session');
          setLoading(false);
          return;
        }

        const meData = await meResponse.json();
        setAdminUser(meData.admin || null);
        await loadSubmissions();
      } catch (e) {
        console.error('Auth check error:', e);
        setError('Network error. Please try again.');
        setLoading(false);
      }
    };

    ensureAuthenticatedAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, filters]);

  const loadSubmissions = async () => {
    try {
      const params = new URLSearchParams({
        page: filters.page.toString(),
        status: filters.status,
        search: filters.search
      });

      const response = await fetch(`/api/admin/submissions?${params}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setSubmissions(data.submissions);
        setPagination(data.pagination);
        setStatusStats(data.statusStats);
      } else {
        if (response.status === 401) {
          router.push('/admin/login');
        } else {
          setError(data.error || 'Failed to load submissions');
        }
      }
    } catch (error) {
      console.error('Load submissions error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Logging out is handled via API to clear the cookie; fall back to redirect.
    fetch('/api/admin/logout', {
      method: 'POST',
      credentials: 'include',
    }).finally(() => {
      router.push('/admin/login');
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ed8936';
      case 'reviewed': return '#3182ce';
      case 'approved': return '#38a169';
      case 'rejected': return '#e53e3e';
      default: return '#718096';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleStatusUpdate = async (submissionId, newStatus) => {
    try {
      const response = await fetch(`/api/admin/submissions/${submissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Submission ${submissionId} updated to ${newStatus}`);
        
        // Update the submission in the local state
        setSubmissions(prev => 
          prev.map(sub => 
            sub._id === submissionId 
              ? { ...sub, status: newStatus, reviewedAt: new Date(), reviewedBy: adminUser.username }
              : sub
          )
        );
        
        // Refresh the data to get updated stats
        await loadSubmissions();
      } else {
        console.error('Failed to update submission:', data.error);
        setError(data.error || 'Failed to update submission');
      }
    } catch (error) {
      console.error('Error updating submission:', error);
      setError('Network error. Please try again.');
    }
  };

  const handleDeleteSubmission = async (submissionId, submissionName) => {
    // Confirm deletion
    const confirmMessage = `Are you sure you want to DELETE this submission?\n\nSubmission: ${submissionName}\nID: ${submissionId}\n\nThis will permanently delete:\n- The submission from the database\n- All associated audio files\n- All uploaded files\n\nThis action cannot be undone!`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/submissions/delete-submission', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ submissionId })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Submission deleted:', data);
        
        // Show success message
        alert(`Submission deleted successfully!\n\nFiles deleted: ${data.deletedFiles.length}\nFiles failed: ${data.failedFiles.length}`);
        
        // Remove from local state
        setSubmissions(prev => prev.filter(sub => sub._id !== submissionId));
        
        // Refresh the data to get updated stats
        await loadSubmissions();
      } else {
        console.error('Failed to delete submission:', data.error);
        setError(data.error || 'Failed to delete submission');
      }
    } catch (error) {
      console.error('Error deleting submission:', error);
      setError('Network error. Please try again.');
    }
  };

  const handleTranscriptChange = (submissionId, transcript) => {
    setSubmissions(prevSubmissions => 
      prevSubmissions.map(sub => 
        sub._id === submissionId 
          ? { 
              ...sub, 
              content: { 
                ...sub.content, 
                audioRecording: { 
                  ...sub.content.audioRecording, 
                  fullTranscript: transcript 
                } 
              } 
            }
          : sub
      )
    );
  };

  const generateAITranscript = async (submissionId, audioFilename) => {
    // Set loading state
    setSubmissions(prevSubmissions => 
      prevSubmissions.map(sub => 
        sub._id === submissionId ? { ...sub, _generating: true } : sub
      )
    );

    try {
      const response = await fetch('/api/admin/generate-ai-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          submissionId,
          audioFilename
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`AI Transcript generated successfully!\n\nConfidence: ${Math.round((data.confidence || 0) * 100)}%\nWords: ${data.wordCount || 0}`);
        
        // Update the local state with the new transcript
        setSubmissions(prevSubmissions => 
          prevSubmissions.map(sub => 
            sub._id === submissionId 
              ? { 
                  ...sub, 
                  _generating: false,
                  content: { 
                    ...sub.content, 
                    audioRecording: { 
                      ...sub.content.audioRecording, 
                      transcriptGenerated: true,
                      fullTranscript: data.transcript,
                      transcriptConfidence: data.confidence
                    } 
                  } 
                }
              : sub
          )
        );
      } else {
        alert(data.error || 'Failed to generate AI transcript');
        setSubmissions(prevSubmissions => 
          prevSubmissions.map(sub => 
            sub._id === submissionId ? { ...sub, _generating: false } : sub
          )
        );
      }
    } catch (error) {
      console.error('Error generating AI transcript:', error);
      alert('Error generating AI transcript');
      setSubmissions(prevSubmissions => 
        prevSubmissions.map(sub => 
          sub._id === submissionId ? { ...sub, _generating: false } : sub
        )
      );
    }
  };

  const saveTranscript = async (submissionId, transcript) => {
    try {
      const response = await fetch('/api/submissions/update-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          submissionId,
          transcript,
          wordTimings: [], // Will be auto-generated on homepage
          confidence: 1.0
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Transcript saved successfully');
        // Update the local state to mark transcript as generated
        setSubmissions(prevSubmissions => 
          prevSubmissions.map(sub => 
            sub._id === submissionId 
              ? { 
                  ...sub, 
                  content: { 
                    ...sub.content, 
                    audioRecording: { 
                      ...sub.content.audioRecording, 
                      transcriptGenerated: true,
                      fullTranscript: transcript
                    } 
                  } 
                }
              : sub
          )
        );
      } else {
        alert(data.error || 'Failed to save transcript');
      }
    } catch (error) {
      console.error('Error saving transcript:', error);
      alert('Error saving transcript');
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard - CORSEP Audio Form</title>
      </Head>

      <div className="admin-dashboard">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-content">
            <h1> <a href='/'>📊 Admin Dashboard</a></h1>
            <div className="header-actions">
              <span className="user-info">Welcome, {adminUser?.username}</span>
              <button onClick={handleLogout} className="logout-btn">Logout</button>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Submissions</h3>
            <div className="stat-number">{pagination.totalSubmissions || 0}</div>
          </div>
          <div className="stat-card">
            <h3>Pending Review</h3>
            <div className="stat-number pending">{statusStats.pending || 0}</div>
          </div>
          <div className="stat-card">
            <h3>Approved</h3>
            <div className="stat-number approved">{statusStats.approved || 0}</div>
          </div>
          <div className="stat-card">
            <h3>Rejected</h3>
            <div className="stat-number rejected">{statusStats.rejected || 0}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters">
          <div className="filter-group">
            <label>Status:</label>
            <select 
              value={filters.status} 
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Search:</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search by name, email, or zip code"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && <div className="error-message">{error}</div>}

        {/* Submissions Table */}
        <div className="submissions-container">
          <h2>Submissions ({pagination.totalSubmissions || 0})</h2>
          
          {submissions.length === 0 ? (
            <div className="no-submissions">No submissions found.</div>
          ) : (
            <>
              <div className="submissions-table">
                {submissions.map((submission) => (
                  <div key={submission._id} className="submission-card">
                    <div className="submission-header">
                      <div className="submission-info">
                        <h3>{submission.personalInfo.firstName} {submission.personalInfo.lastName}</h3>
                        <p className="email">{submission.personalInfo.email}</p>
                        <p className="zip-code">Zip: {submission.personalInfo.zipCode}</p>
                      </div>
                      <div className="submission-meta">
                        <span 
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(submission.status) }}
                        >
                          {submission.status}
                        </span>
                        <span className="date">{formatDate(submission.submittedAt)}</span>
                      </div>
                    </div>

                    <div className="submission-content">
                      {submission.content.textStory && (
                        <div className="content-section">
                          <strong>Text Story:</strong>
                          <p>{submission.content.textStory}</p>
                        </div>
                      )}

                      {submission.content.audioRecording && submission.content.audioRecording.hasRecording && (
                        <div className="content-section">
                          <strong>Audio Recording:</strong>
                          <div className="audio-info">
                            {submission.content.audioRecording.filename ? (
                              <div>
                                <audio controls>
                                  <source src={`/uploads/${submission.content.audioRecording.filename}`} type="audio/webm" />
                                  Your browser does not support the audio element.
                                </audio>
                                <p className="file-info">
                                  {submission.content.audioRecording.filename} 
                                  ({submission.content.audioRecording.size ? formatFileSize(submission.content.audioRecording.size) : 'Unknown size'}) - 
                                  Duration: {submission.content.audioRecording.duration || 0}s
                                </p>
                                
                                {/* AI Transcript generation */}
                                <div className="transcript-section">
                                  <label><strong>Transcript:</strong></label>
                                  
                                  {!submission.content.audioRecording.fullTranscript ? (
                                    <div className="transcript-generate">
                                      <p>No transcript yet. Generate one using AI:</p>
                                      <button 
                                        onClick={() => generateAITranscript(submission._id, submission.content.audioRecording.filename)}
                                        className="btn-primary"
                                        disabled={submission._generating}
                                      >
                                        {submission._generating ? '🤖 Generating...' : '🤖 Generate AI Transcript'}
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="transcript-edit">
                                      <textarea
                                        placeholder="Edit transcript if needed..."
                                        value={submission.content.audioRecording.fullTranscript || ''}
                                        onChange={(e) => handleTranscriptChange(submission._id, e.target.value)}
                                        rows={4}
                                        className="transcript-input"
                                      />
                                      <div className="transcript-actions">
                                        <button 
                                          onClick={() => saveTranscript(submission._id, submission.content.audioRecording.fullTranscript || '')}
                                          className="btn-small btn-primary"
                                        >
                                          💾 Save Changes
                                        </button>
                                        <button 
                                          onClick={() => generateAITranscript(submission._id, submission.content.audioRecording.filename)}
                                          className="btn-small btn-secondary"
                                          disabled={submission._generating}
                                        >
                                          {submission._generating ? '🤖 Regenerating...' : '🔄 Regenerate'}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p>Audio recording available (no file saved)</p>
                                <p className="file-info">
                                  Duration: {submission.content.audioRecording.duration || 0}s - 
                                  Format: {submission.content.audioRecording.format || 'Unknown'}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {submission.content.uploadedFiles.length > 0 && (
                        <div className="content-section">
                          <strong>Uploaded Files:</strong>
                          <ul>
                            {submission.content.uploadedFiles.map((file, index) => (
                              <li key={index}>
                                {file.originalName} ({formatFileSize(file.size)})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="proc-responses">
                        <div className="proc-question">
                          <strong>PROC Question 1:</strong> {submission.procResponses.question1 || 'Not answered'}
                        </div>
                        <div className="proc-question">
                          <strong>PROC Question 2:</strong> {submission.procResponses.question2 || 'Not answered'}
                        </div>
                      </div>

                      <div className="consent-info">
                        <strong>Consent:</strong> {submission.consent.agreed ? 'Yes' : 'No'}
                        {submission.consent.continuedEngagement && ' | Continued Engagement: Yes'}
                      </div>

                      {/* Admin Actions */}
                      <div className="admin-actions">
                        <div className="action-buttons">
                          <button 
                            className="approve-btn"
                            onClick={() => handleStatusUpdate(submission._id, 'approved')}
                            disabled={submission.status === 'approved'}
                          >
                            {submission.status === 'approved' ? '✅ Approved' : '👍 Approve'}
                          </button>
                          <button 
                            className="reject-btn"
                            onClick={() => handleStatusUpdate(submission._id, 'rejected')}
                            disabled={submission.status === 'rejected'}
                          >
                            {submission.status === 'rejected' ? '❌ Rejected' : '👎 Reject'}
                          </button>
                          <button 
                            className="review-btn"
                            onClick={() => handleStatusUpdate(submission._id, 'reviewed')}
                            disabled={submission.status === 'reviewed'}
                          >
                            {submission.status === 'reviewed' ? '👀 Reviewed' : '📋 Mark as Reviewed'}
                          </button>
                          <button 
                            className="delete-btn"
                            onClick={() => handleDeleteSubmission(
                              submission._id, 
                              `${submission.personalInfo.firstName} ${submission.personalInfo.lastName}`
                            )}
                            title="Permanently delete this submission and all associated files"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                        
                        {submission.reviewedBy && (
                          <div className="review-info">
                            <small>
                              Reviewed by: {submission.reviewedBy} 
                              {submission.reviewedAt && ` on ${formatDate(submission.reviewedAt)}`}
                            </small>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="pagination">
                  <button 
                    onClick={() => handlePageChange(filters.page - 1)}
                    disabled={!pagination.hasPrevPage}
                  >
                    Previous
                  </button>
                  <span>
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <button 
                    onClick={() => handlePageChange(filters.page + 1)}
                    disabled={!pagination.hasNextPage}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>


    </>
  );
} 