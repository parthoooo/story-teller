import React, { useState, useRef, useEffect } from 'react';
import { SpeechToTextService } from '../utils/speechToText';

const AudioTranscriber = ({ 
  audioSrc, 
  submissionId = null,
  onTranscriptGenerated = null,
  className = '' 
}) => {
  const [transcriptionState, setTranscriptionState] = useState('idle'); // idle, processing, completed, error
  const [transcript, setTranscript] = useState('');
  const [wordTimings, setWordTimings] = useState([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [confidence, setConfidence] = useState(0);
  
  const audioRef = useRef(null);
  const speechService = useRef(null);

  useEffect(() => {
    // Initialize speech service only on client side
    if (typeof window !== 'undefined') {
      speechService.current = new SpeechToTextService({
        language: 'en-US',
        continuous: true,
        interimResults: true
      });
    }

    return () => {
      if (speechService.current) {
        speechService.current.stop();
      }
    };
  }, []);

  const startTranscription = async () => {
    if (!audioRef.current) {
      setError('Audio element not ready');
      return;
    }

    if (!speechService.current) {
      setError('Speech service not initialized. Please refresh the page.');
      return;
    }

    if (!speechService.current.isSupported) {
      setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    setTranscriptionState('processing');
    setError('');
    setProgress(0);
    setTranscript('');
    setWordTimings([]);

    try {
      const result = await speechService.current.transcribeAudioElement(
        audioRef.current,
        (progressData) => {
          // Update progress during transcription
          setTranscript(progressData.transcript);
          setWordTimings(progressData.wordTimings);
          setProgress(progressData.progress);
        }
      );

      setTranscript(result.transcript);
      setWordTimings(result.wordTimings);
      setConfidence(result.confidence || 0);
      setTranscriptionState('completed');
      setProgress(100);

      // Save to database if submissionId provided
      if (submissionId) {
        await saveTranscript(submissionId, result);
      }

      // Notify parent component
      if (onTranscriptGenerated) {
        onTranscriptGenerated(result);
      }

      console.log('✅ Transcription completed:', {
        wordCount: result.wordTimings.length,
        confidence: result.confidence,
        duration: result.duration
      });

    } catch (err) {
      console.error('❌ Transcription failed:', err);
      setError(err.message);
      setTranscriptionState('error');
    }
  };

  const saveTranscript = async (submissionId, transcriptData) => {
    try {
      const response = await fetch('/api/submissions/update-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId,
          transcript: transcriptData.transcript,
          wordTimings: transcriptData.wordTimings,
          confidence: transcriptData.confidence
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error);
      }

      console.log('✅ Transcript saved to database:', result);
    } catch (error) {
      console.error('❌ Failed to save transcript:', error);
      // Don't fail the transcription, just log the error
    }
  };

  const stopTranscription = () => {
    if (speechService.current) {
      speechService.current.stop();
    }
    setTranscriptionState('idle');
    setProgress(0);
  };

  const clearTranscript = () => {
    setTranscript('');
    setWordTimings([]);
    setTranscriptionState('idle');
    setProgress(0);
    setError('');
    setConfidence(0);
  };

  const downloadTranscript = () => {
    if (!transcript) return;

    const data = {
      transcript,
      wordTimings,
      confidence,
      generatedAt: new Date().toISOString(),
      submissionId
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${submissionId || 'audio'}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatConfidence = (conf) => {
    return `${Math.round(conf * 100)}%`;
  };

  return (
    <div className={`audio-transcriber ${className}`}>
      <div className="transcriber-header">
        <h4>🎤 Real Audio Transcription</h4>
        <p className="instruction-text">
          <strong>Important:</strong> This will play your audio and use your microphone to transcribe it. 
          Please ensure your speakers are turned up and your microphone can hear the audio clearly.
        </p>
        <div className="transcriber-actions">
          {transcriptionState === 'idle' && (
            <button 
              onClick={startTranscription} 
              className="btn-primary"
              disabled={!speechService.current || !speechService.current.isSupported}
            >
              {!speechService.current ? 'Loading...' : 
               !speechService.current.isSupported ? 'Not Supported' : 
               'Generate Transcript'}
            </button>
          )}
          
          {transcriptionState === 'processing' && (
            <button onClick={stopTranscription} className="btn-danger">
              Stop Transcription
            </button>
          )}
          
          {transcriptionState === 'completed' && (
            <>
              <button onClick={downloadTranscript} className="btn-secondary">
                📥 Download
              </button>
              <button onClick={clearTranscript} className="btn-secondary">
                🗑️ Clear
              </button>
              <button onClick={startTranscription} className="btn-primary">
                🔄 Regenerate
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hidden audio element for transcription */}
      <audio
        ref={audioRef}
        src={audioSrc}
        preload="metadata"
        style={{ display: 'none' }}
      />

      {/* Progress indicator */}
      {transcriptionState === 'processing' && (
        <div className="transcription-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="progress-text">
            Transcribing... {Math.round(progress)}%
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
          <div className="error-help">
            <p>💡 <strong>Tips for better transcription:</strong></p>
            <ul>
              <li>Use Chrome, Edge, or Safari browser</li>
              <li>Ensure your microphone is not being used by other apps</li>
              <li>Make sure the audio is clear and not too quiet</li>
              <li>Try refreshing the page and trying again</li>
            </ul>
          </div>
        </div>
      )}

      {/* Transcript display */}
      {transcript && (
        <div className="transcript-result">
          <div className="transcript-stats">
            <div className="stat">
              <span className="stat-label">Words:</span>
              <span className="stat-value">{wordTimings.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Confidence:</span>
              <span className="stat-value">{formatConfidence(confidence)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Status:</span>
              <span className={`stat-value status-${transcriptionState}`}>
                {transcriptionState === 'completed' ? '✅ Complete' : '⏳ Processing'}
              </span>
            </div>
          </div>

          <div className="transcript-text">
            <h5>Generated Transcript:</h5>
            {transcriptionState === 'completed' && (
              <div className="success-notice">
                <p>✅ <strong>Transcription completed successfully!</strong></p>
                <p>The transcript is now available above the audio player with progressive highlighting. 
                   Play the audio to see words become bold as they are heard.</p>
              </div>
            )}
            <div className="transcript-content">
              {transcript}
            </div>
          </div>

          {wordTimings.length > 0 && (
            <div className="word-timings-preview">
              <h5>Word Timings Preview:</h5>
              <div className="timings-list">
                {wordTimings.slice(0, 10).map((word, index) => (
                  <span key={index} className="timing-word">
                    {word.word} ({word.startTime}s-{word.endTime}s)
                  </span>
                ))}
                {wordTimings.length > 10 && (
                  <span className="more-words">
                    ... and {wordTimings.length - 10} more words
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="transcriber-info">
        <p>
          <strong>ℹ️ How it works:</strong> This tool uses your browser's built-in speech recognition 
          to convert the audio to text with word-level timing. The generated transcript will then 
          be synchronized with audio playback.
        </p>
      </div>

      <style jsx>{`
        .audio-transcriber {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
          margin: 15px 0;
        }

        .transcriber-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .transcriber-header h4 {
          margin: 0;
          color: #333;
          font-size: 1.1rem;
        }

        .transcriber-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn-primary, .btn-secondary, .btn-danger {
          padding: 8px 16px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover {
          background: #0056b3;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background: #545b62;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover {
          background: #c82333;
        }

        .transcription-progress {
          margin: 15px 0;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #007bff, #0056b3);
          transition: width 0.3s ease;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }

        .progress-text {
          text-align: center;
          color: #666;
          font-size: 0.9rem;
        }

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 15px;
          border-radius: 5px;
          margin: 15px 0;
          border: 1px solid #f5c6cb;
        }

        .error-help {
          margin-top: 10px;
          font-size: 0.9rem;
        }

        .error-help ul {
          margin: 8px 0;
          padding-left: 20px;
        }

        .transcript-result {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 5px;
          padding: 15px;
          margin: 15px 0;
        }

        .transcript-stats {
          display: flex;
          gap: 20px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .stat-label {
          font-weight: 600;
          color: #666;
        }

        .stat-value {
          color: #333;
        }

        .status-completed {
          color: #28a745;
        }

        .status-processing {
          color: #ffc107;
        }

        .transcript-text h5 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 1rem;
        }

        .success-notice {
          background: #d4edda;
          border: 1px solid #c3e6cb;
          border-radius: 4px;
          padding: 12px;
          margin: 10px 0;
          color: #155724;
        }

        .success-notice p {
          margin: 5px 0;
        }

        .instruction-text {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 4px;
          padding: 10px;
          margin: 10px 0;
          color: #856404;
          font-size: 0.9rem;
        }

        .transcript-content {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 4px;
          border: 1px solid #e9ecef;
          line-height: 1.6;
          font-size: 0.95rem;
          max-height: 200px;
          overflow-y: auto;
        }

        .word-timings-preview {
          margin-top: 15px;
        }

        .word-timings-preview h5 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 1rem;
        }

        .timings-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .timing-word {
          background: #e3f2fd;
          padding: 4px 8px;
          border-radius: 3px;
          font-size: 0.8rem;
          color: #1976d2;
          border: 1px solid #bbdefb;
        }

        .more-words {
          color: #666;
          font-style: italic;
          font-size: 0.85rem;
        }

        .transcriber-info {
          background: #d1ecf1;
          border: 1px solid #bee5eb;
          border-radius: 5px;
          padding: 12px;
          margin-top: 15px;
        }

        .transcriber-info p {
          margin: 0;
          font-size: 0.9rem;
          color: #0c5460;
        }

        @media (max-width: 768px) {
          .transcriber-header {
            flex-direction: column;
            align-items: stretch;
          }

          .transcriber-actions {
            justify-content: center;
          }

          .transcript-stats {
            flex-direction: column;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default AudioTranscriber;
