import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { SpeechToTextService } from '../../utils/speechToText';

const AdminTranscripts = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all'); // all, need_transcript, has_transcript
  const [speechService, setSpeechService] = useState(null);

  // Initialize speech service only on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSpeechService(new SpeechToTextService());
    }
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const response = await fetch('/api/admin/submissions?includeAudio=true', {
        headers: {
          'Authorization': 'Bearer admin-token' // Add proper auth
        }
      });
      
      if (!response.ok) {
        // Fallback to approved submissions for demo
        const fallbackResponse = await fetch('/api/approved-submissions?limit=50');
        const fallbackData = await fallbackResponse.json();
        setSubmissions(fallbackData.submissions || []);
      } else {
        const data = await response.json();
        setSubmissions(data.submissions || []);
      }
    } catch (error) {
      console.error('Failed to load submissions:', error);
      // Try loading approved submissions as fallback
      try {
        const response = await fetch('/api/approved-submissions?limit=50');
        const data = await response.json();
        setSubmissions(data.submissions || []);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const generateTranscriptForSubmission = async (submission) => {
    if (!speechService) {
      addLog('Speech service not initialized', 'error');
      return;
    }
    
    if (!speechService.isSupported) {
      addLog('Speech recognition not supported in this browser', 'error');
      return;
    }

    setProcessingId(submission.id);
    setProcessingProgress(0);
    addLog(`Starting transcription for ${submission.firstName} ${submission.lastName}`, 'info');

    try {
      // Create audio element
      const audio = new Audio(`/uploads/${submission.audioFilename}`);
      
      await new Promise((resolve, reject) => {
        audio.onloadedmetadata = resolve;
        audio.onerror = reject;
      });

      addLog(`Audio loaded. Duration: ${Math.round(audio.duration)}s`, 'info');

      // Generate transcript
      const result = await speechService.transcribeAudioElement(
        audio,
        (progressData) => {
          setProcessingProgress(progressData.progress);
          addLog(`Progress: ${Math.round(progressData.progress)}% - Words: ${progressData.wordTimings.length}`, 'info');
        }
      );

      addLog(`Transcription completed. ${result.wordTimings.length} words generated`, 'success');

      // Save to database
      const saveResponse = await fetch('/api/submissions/update-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId: submission.id,
          transcript: result.transcript,
          wordTimings: result.wordTimings,
          confidence: result.confidence
        })
      });

      if (saveResponse.ok) {
        addLog(`Transcript saved successfully for ${submission.firstName}`, 'success');
        // Update local state
        setSubmissions(prev => prev.map(sub => 
          sub.id === submission.id 
            ? { 
                ...sub, 
                transcriptGenerated: true,
                fullTranscript: result.transcript,
                wordTimings: result.wordTimings,
                transcriptConfidence: result.confidence
              }
            : sub
        ));
      } else {
        addLog('Failed to save transcript to database', 'error');
      }

    } catch (error) {
      addLog(`Error generating transcript: ${error.message}`, 'error');
    } finally {
      setProcessingId(null);
      setProcessingProgress(0);
    }
  };

  const generateAllTranscripts = async () => {
    const needTranscripts = submissions.filter(sub => 
      sub.audioFilename && !sub.transcriptGenerated
    );

    if (needTranscripts.length === 0) {
      addLog('No submissions need transcripts', 'info');
      return;
    }

    addLog(`Starting bulk transcription for ${needTranscripts.length} submissions`, 'info');

    for (const submission of needTranscripts) {
      await generateTranscriptForSubmission(submission);
      // Wait 2 seconds between transcriptions to avoid overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    addLog('Bulk transcription completed', 'success');
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (filter === 'need_transcript') return sub.audioFilename && !sub.transcriptGenerated;
    if (filter === 'has_transcript') return sub.transcriptGenerated;
    return sub.audioFilename; // Only show submissions with audio
  });

  const stats = {
    total: submissions.filter(sub => sub.audioFilename).length,
    withTranscripts: submissions.filter(sub => sub.transcriptGenerated).length,
    needTranscripts: submissions.filter(sub => sub.audioFilename && !sub.transcriptGenerated).length
  };

  return (
    <div className="admin-transcripts">
      <Head>
        <title>Transcript Management - Admin</title>
      </Head>

      <header className="admin-header">
        <div className="header-content">
          <Link href="/admin/dashboard" className="back-link">← Back to Admin</Link>
          <h1>🎤 Transcript Management</h1>
          <p>Pre-generate transcripts for audio submissions</p>
        </div>
      </header>

      <main className="admin-content">
        {/* Stats Dashboard */}
        <section className="stats-section">
          <h2>📊 Transcript Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Total Audio Files</div>
            </div>
            <div className="stat-card success">
              <div className="stat-number">{stats.withTranscripts}</div>
              <div className="stat-label">With Transcripts</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-number">{stats.needTranscripts}</div>
              <div className="stat-label">Need Transcripts</div>
            </div>
          </div>
        </section>

        {/* Speech Recognition Status */}
        {speechService && !speechService.isSupported && (
          <section className="warning-section">
            <div className="warning-message">
              <h3>⚠️ Speech Recognition Not Supported</h3>
              <p>
                Speech recognition is not available in this browser. Please use <strong>Chrome, Edge, or Safari</strong> to generate transcripts.
              </p>
            </div>
          </section>
        )}

        {/* Bulk Actions */}
        <section className="actions-section">
          <h2>🛠️ Bulk Actions</h2>
          <div className="bulk-actions">
            <button 
              onClick={generateAllTranscripts}
              disabled={processingId || stats.needTranscripts === 0 || !speechService}
              className="btn-primary bulk-btn"
            >
              {!speechService ? 'Loading...' : processingId ? 'Processing...' : `Generate All Transcripts (${stats.needTranscripts})`}
            </button>
            <button 
              onClick={() => setLogs([])}
              className="btn-secondary"
            >
              Clear Logs
            </button>
          </div>
        </section>

        {/* Filters */}
        <section className="filter-section">
          <h2>🔍 Filter Submissions</h2>
          <div className="filter-controls">
            <button 
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
            >
              All Audio ({stats.total})
            </button>
            <button 
              onClick={() => setFilter('need_transcript')}
              className={filter === 'need_transcript' ? 'filter-btn active' : 'filter-btn'}
            >
              Need Transcripts ({stats.needTranscripts})
            </button>
            <button 
              onClick={() => setFilter('has_transcript')}
              className={filter === 'has_transcript' ? 'filter-btn active' : 'filter-btn'}
            >
              Has Transcripts ({stats.withTranscripts})
            </button>
          </div>
        </section>

        {/* Submissions List */}
        <section className="submissions-section">
          <h2>📋 Audio Submissions</h2>
          
          {loading ? (
            <div className="loading">Loading submissions...</div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="no-submissions">
              <p>No submissions found for the selected filter.</p>
            </div>
          ) : (
            <div className="submissions-grid">
              {filteredSubmissions.map(submission => (
                <div key={submission.id} className="submission-card">
                  <div className="submission-header">
                    <h3>{submission.firstName} {submission.lastName}</h3>
                    <div className="submission-status">
                      {submission.transcriptGenerated ? (
                        <span className="status-success">✅ Has Transcript</span>
                      ) : (
                        <span className="status-warning">⭕ No Transcript</span>
                      )}
                    </div>
                  </div>

                  <div className="submission-details">
                    <div className="detail-item">
                      <strong>File:</strong> {submission.audioFilename}
                    </div>
                    <div className="detail-item">
                      <strong>Duration:</strong> {Math.round(submission.audioDuration)}s
                    </div>
                    <div className="detail-item">
                      <strong>Size:</strong> {Math.round(submission.audioSize / 1024)}KB
                    </div>
                    {submission.transcriptGenerated && (
                      <>
                        <div className="detail-item">
                          <strong>Words:</strong> {submission.wordTimings?.length || 0}
                        </div>
                        <div className="detail-item">
                          <strong>Confidence:</strong> {Math.round((submission.transcriptConfidence || 0) * 100)}%
                        </div>
                      </>
                    )}
                  </div>

                  {submission.transcriptGenerated && submission.fullTranscript && (
                    <div className="transcript-preview">
                      <strong>Transcript:</strong>
                      <div className="transcript-text">
                        {submission.fullTranscript.substring(0, 200)}...
                      </div>
                    </div>
                  )}

                  <div className="submission-actions">
                    {!submission.transcriptGenerated ? (
                      <button
                        onClick={() => generateTranscriptForSubmission(submission)}
                        disabled={processingId === submission.id || !speechService}
                        className="btn-primary"
                      >
                        {!speechService ? 'Loading...' :
                         processingId === submission.id ? 
                          `Processing... ${Math.round(processingProgress)}%` : 
                          'Generate Transcript'
                        }
                      </button>
                    ) : (
                      <button
                        onClick={() => generateTranscriptForSubmission(submission)}
                        disabled={!speechService}
                        className="btn-secondary"
                      >
                        {!speechService ? 'Loading...' : 'Regenerate Transcript'}
                      </button>
                    )}
                  </div>

                  {processingId === submission.id && (
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${processingProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Processing Logs */}
        {logs.length > 0 && (
          <section className="logs-section">
            <h2>📝 Processing Logs</h2>
            <div className="logs-container">
              {logs.map((log, index) => (
                <div key={index} className={`log-entry log-${log.type}`}>
                  <span className="log-time">[{log.timestamp}]</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <style jsx>{`
        .admin-transcripts {
          min-height: 100vh;
          background: #f8f9fa;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }

        .admin-header {
          background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%);
          color: white;
          padding: 40px 20px;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
        }

        .back-link {
          color: rgba(255, 255, 255, 0.9);
          text-decoration: none;
          padding: 8px 16px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          transition: all 0.3s ease;
          display: inline-block;
          margin-bottom: 20px;
        }

        .back-link:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .admin-header h1 {
          margin: 0 0 10px 0;
          font-size: 2.5rem;
          font-weight: 700;
        }

        .admin-header p {
          margin: 0;
          font-size: 1.2rem;
          opacity: 0.9;
        }

        .admin-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .stats-section,
        .warning-section,
        .actions-section,
        .filter-section,
        .submissions-section,
        .logs-section {
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 30px;
        }

        .warning-section {
          background: #fff3cd;
          border: 2px solid #ffeaa7;
        }

        .warning-message h3 {
          margin-top: 0;
          color: #856404;
          font-size: 1.3rem;
        }

        .warning-message p {
          color: #856404;
          margin-bottom: 0;
          font-size: 1rem;
        }

        .stats-section h2,
        .actions-section h2,
        .filter-section h2,
        .submissions-section h2,
        .logs-section h2 {
          margin-top: 0;
          color: #333;
          font-size: 1.8rem;
          margin-bottom: 20px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .stat-card {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          border: 2px solid #dee2e6;
        }

        .stat-card.success {
          border-color: #28a745;
          background: #d4edda;
        }

        .stat-card.warning {
          border-color: #ffc107;
          background: #fff3cd;
        }

        .stat-number {
          font-size: 2.5rem;
          font-weight: 700;
          color: #333;
          margin-bottom: 5px;
        }

        .stat-label {
          color: #666;
          font-size: 1rem;
        }

        .bulk-actions {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }

        .bulk-btn {
          min-width: 250px;
        }

        .filter-controls {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 10px 20px;
          border: 2px solid #dee2e6;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.3s ease;
        }

        .filter-btn:hover {
          border-color: #6f42c1;
          background: #f8f9fa;
        }

        .filter-btn.active {
          border-color: #6f42c1;
          background: #6f42c1;
          color: white;
        }

        .loading,
        .no-submissions {
          text-align: center;
          padding: 40px;
          color: #666;
          font-size: 1.1rem;
        }

        .submissions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
        }

        .submission-card {
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
          background: #f8f9fa;
        }

        .submission-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .submission-header h3 {
          margin: 0;
          color: #333;
          font-size: 1.2rem;
        }

        .status-success {
          color: #155724;
          background: #d4edda;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .status-warning {
          color: #856404;
          background: #fff3cd;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .submission-details {
          margin-bottom: 15px;
        }

        .detail-item {
          margin-bottom: 5px;
          font-size: 0.9rem;
          color: #666;
        }

        .transcript-preview {
          background: white;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 15px;
          border: 1px solid #e9ecef;
        }

        .transcript-text {
          margin-top: 8px;
          font-size: 0.85rem;
          color: #555;
          line-height: 1.4;
        }

        .submission-actions {
          margin-bottom: 10px;
        }

        .btn-primary,
        .btn-secondary {
          padding: 8px 16px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .btn-primary {
          background: #6f42c1;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #5a2d91;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background: #545b62;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: #e9ecef;
          border-radius: 3px;
          overflow: hidden;
          margin-top: 10px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #6f42c1, #e83e8c);
          transition: width 0.3s ease;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }

        .logs-container {
          background: #212529;
          color: #fff;
          padding: 20px;
          border-radius: 6px;
          max-height: 400px;
          overflow-y: auto;
          font-family: 'Courier New', monospace;
          font-size: 0.85rem;
        }

        .log-entry {
          margin-bottom: 5px;
          padding: 2px 0;
        }

        .log-time {
          color: #6c757d;
          margin-right: 10px;
        }

        .log-info .log-message {
          color: #17a2b8;
        }

        .log-success .log-message {
          color: #28a745;
        }

        .log-error .log-message {
          color: #dc3545;
        }

        @media (max-width: 768px) {
          .admin-content {
            padding: 20px 15px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .submissions-grid {
            grid-template-columns: 1fr;
          }

          .bulk-actions {
            flex-direction: column;
          }

          .filter-controls {
            flex-direction: column;
          }

          .submission-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminTranscripts;
