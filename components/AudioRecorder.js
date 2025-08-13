import React, { useState, useRef, useEffect } from 'react';
import { useAudioCapture } from 'use-audio-capture';

const AudioRecorder = ({ onAudioRecorded, disabled = false }) => {
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingChunks, setRecordingChunks] = useState([]);
  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  const { start, stop, pause, resume } = useAudioCapture({
    onStart: () => {
      console.log('Recording started');
      setRecordingTime(0);
      setRecordedBlob(null);
      setRecordingChunks([]);
      
      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    },
    onChunk: (blobEvent) => {
      console.log('Audio chunk received:', blobEvent);
      setRecordingChunks(prev => [...prev, blobEvent.data]);
    },
    onStop: (event, chunks) => {
      console.log('🎙️ Recording stopped', chunks);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Create audio file from recorded chunks
      if (chunks && chunks.length > 0) {
        const blob = new Blob(chunks, { type: chunks[0].type });
        const blobURL = URL.createObjectURL(blob);
        
        // Convert blob to base64 for API submission
        const reader = new FileReader();
        reader.onload = function(e) {
          const base64Data = e.target.result.split(',')[1]; // Remove data:audio/webm;base64, prefix
          
          const audioBlob = {
            blob: blob,
            blobURL: blobURL,
            blobData: base64Data, // Add base64 data for API
            duration: recordingTime,
            format: 'webm'
          };
          
          setRecordedBlob(audioBlob);
          onAudioRecorded(audioBlob);
        };
        reader.readAsDataURL(blob);
      }
    },
    onError: (event, { error }) => {
      console.error('Recording error:', error);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  });

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    if (disabled) return;
    
    try {
      await start();
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = async () => {
    try {
      await stop();
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const playRecording = () => {
    if (recordedBlob && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const deleteRecording = () => {
    if (recordedBlob && recordedBlob.blobURL) {
      URL.revokeObjectURL(recordedBlob.blobURL);
    }
    setRecordedBlob(null);
    setRecordingTime(0);
    setIsPlaying(false);
    setRecordingChunks([]);
    onAudioRecorded(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isRecording = recordingChunks.length > 0 && !recordedBlob;

  return (
    <div className="audio-recorder">
      <div className="recording-controls">
        <div className="recording-visualizer">
          {isRecording && (
            <div className="sound-wave">
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
            </div>
          )}
          {!isRecording && !recordedBlob && (
            <div className="recording-placeholder">
              <div className="mic-icon">🎤</div>
              <p>Click to start recording</p>
            </div>
          )}
        </div>
        
        <div className="controls">
          {!recordedBlob && (
            <>
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={disabled}
                className={`record-btn ${isRecording ? 'recording' : ''}`}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                {isRecording ? '⏹️ Stop' : '🎤 Record'}
              </button>
              {isRecording && (
                <span className="recording-time" aria-live="polite">
                  Recording: {formatTime(recordingTime)}
                </span>
              )}
            </>
          )}
          
          {recordedBlob && (
            <div className="recorded-controls">
              <audio
                ref={audioRef}
                src={recordedBlob.blobURL}
                onEnded={() => setIsPlaying(false)}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={playRecording}
                className="play-btn"
                aria-label={isPlaying ? 'Pause recording' : 'Play recording'}
              >
                {isPlaying ? '⏸️ Pause' : '▶️ Play'}
              </button>
              <span className="recording-duration">
                Duration: {formatTime(recordingTime)}
              </span>
              <button
                type="button"
                onClick={deleteRecording}
                className="delete-btn"
                aria-label="Delete recording"
              >
                🗑️ Delete
              </button>
            </div>
          )}
        </div>
      </div>
      

    </div>
  );
};

export default AudioRecorder; 