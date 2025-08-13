import React, { useState, useEffect, useRef } from 'react';

const ProgressiveTranscript = ({ 
  audioRef, 
  transcript, 
  timings = [], 
  className = '',
  showAsCard = true 
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(null);
  const transcriptRef = useRef(null);

  // Listen to audio element events
  useEffect(() => {
    if (!audioRef || !audioRef.current) {
      console.log('❌ ProgressiveTranscript: audioRef not found:', audioRef);
      return;
    }

    const audio = audioRef.current;
    console.log('✅ ProgressiveTranscript: Connected to audio element');

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);
      console.log('⏰ Time update:', time.toFixed(2) + 's');
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleSeeked = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setAudioDuration(audio.duration);
        console.log('🎵 Audio duration loaded:', audio.duration.toFixed(1) + 's');
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('seeked', handleSeeked);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    // Try to get duration immediately if already loaded
    if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
      setAudioDuration(audio.duration);
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('seeked', handleSeeked);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [audioRef]);

  // If no timings provided, create simple character-based timing
  const createCharacterTimings = (text, audioDuration = null) => {
    const words = text.trim().split(/\s+/);
    const totalWords = words.length;
    
    // Try to get actual audio duration from multiple sources
    let duration = audioDuration;
    
    // First, try to get from audio element directly
    if (!duration && audioRef && audioRef.current) {
      const audio = audioRef.current;
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        duration = audio.duration;
      }
    }
    
    // If still no duration, use a more reasonable estimation
    if (!duration || isNaN(duration) || duration === Infinity) {
      // More realistic: 180 words per minute average speaking rate
      duration = Math.max(8, (totalWords / 180) * 60);
    }
    
    console.log(`📏 Auto-timing for "${text.substring(0, 30)}...": ${totalWords} words, ${duration.toFixed(1)}s duration, ${(duration/totalWords).toFixed(2)}s per word`);
    
    const timePerWord = duration / totalWords;
    
    return words.map((word, index) => ({
      word: word.replace(/[.,!?;:]$/, ''),
      startTime: index * timePerWord,
      endTime: (index + 1) * timePerWord,
      confidence: 0.95
    }));
  };

  // Get effective timings (provided or generated)
  const effectiveTimings = timings.length > 0 ? timings : createCharacterTimings(transcript, audioDuration);
  
  // Debug logging (reduced frequency)
  if (Math.floor(currentTime * 10) % 10 === 0) { // Only log every second
    console.log('📊 ProgressiveTranscript Debug:', {
      transcript: transcript?.substring(0, 50) + '...',
      providedTimings: timings.length,
      effectiveTimings: effectiveTimings.length,
      currentTime,
      firstTiming: effectiveTimings[0],
      audioRef: !!audioRef?.current
    });
  }

  // Split transcript into words for highlighting
  const renderProgressiveTranscript = () => {
    if (!transcript) return <p>No transcript available</p>;

    if (effectiveTimings.length === 0) {
      // Fallback: simple text without word-level highlighting
      return <p className="simple-transcript">{transcript}</p>;
    }

    console.log('🎨 Rendering transcript with', effectiveTimings.length, 'words');
    
    return effectiveTimings.map((timing, index) => {
      const isHeard = currentTime > timing.endTime;
      const isCurrent = currentTime >= timing.startTime && currentTime <= timing.endTime;
      
      // Debug the first few words
      if (index < 3 && currentTime > 0) {
        const classes = `transcript-word ${isHeard ? 'heard' : ''} ${isCurrent ? 'current' : ''}`;
        console.log(`🎯 Word ${index}: "${timing.word}" - start:${timing.startTime}s, end:${timing.endTime}s, current:${currentTime.toFixed(2)}s, isHeard:${isHeard}, isCurrent:${isCurrent}, CLASSES:${classes}`);
      }
      
      return (
        <span
          key={index}
          className={`transcript-word ${isHeard ? 'heard' : ''} ${isCurrent ? 'current' : ''}`}
          style={{
            // Inline backup styles for testing
            ...(isHeard && { 
              fontWeight: '900', 
              backgroundColor: '#ffff00', 
              color: '#000',
              textDecoration: 'underline'
            }),
            ...(isCurrent && { 
              fontWeight: '900', 
              backgroundColor: '#ff0000', 
              color: '#fff',
              padding: '5px 10px',
              borderRadius: '8px',
              border: '3px solid #000'
            })
          }}
          onClick={() => handleWordClick(timing)}
          title={`${timing.startTime.toFixed(1)}s - ${timing.endTime.toFixed(1)}s`}
        >
          {timing.word}
          {index < effectiveTimings.length - 1 ? ' ' : ''}
        </span>
      );
    });
  };

  const handleWordClick = (timing) => {
    if (audioRef && audioRef.current) {
      audioRef.current.currentTime = timing.startTime;
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (showAsCard) {
    return (
      <div className={`progressive-transcript-card ${className}`}>
        <div className="transcript-card-header">
          <h4>📝 Audio Transcript</h4>
          <div className="transcript-status">
            {isPlaying ? (
              <span className="status-playing">🔊 Playing</span>
            ) : (
              <span className="status-paused">⏸️ Paused</span>
            )}
            <span className="time-display">{formatTime(currentTime)}</span>
          </div>
        </div>
        
        <div className="transcript-content" ref={transcriptRef}>
          <div className="transcript-text">
            {renderProgressiveTranscript()}
          </div>
        </div>

        <div className="transcript-legend">
          <span className="legend-item">
            <span className="legend-sample normal">Normal</span> - Not yet played
          </span>
          <span className="legend-item">
            <span className="legend-sample current">Blue</span> - Currently playing
          </span>
          <span className="legend-item">
            <span className="legend-sample heard">Bold</span> - Already heard
          </span>
        </div>

        <style jsx>{`
          .progressive-transcript-card {
            background: white;
            border: 2px solid #e9ecef;
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          .transcript-card-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
          }

          .transcript-card-header h4 {
            margin: 0;
            font-size: 1.3rem;
            font-weight: 600;
          }

          .transcript-status {
            display: flex;
            align-items: center;
            gap: 15px;
          }

          .status-playing, .status-paused {
            font-size: 0.9rem;
            font-weight: 500;
          }

          .time-display {
            background: rgba(255, 255, 255, 0.2);
            padding: 6px 12px;
            border-radius: 20px;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            backdrop-filter: blur(10px);
          }

          .transcript-content {
            padding: 25px;
            max-height: 300px;
            overflow-y: auto;
          }

          .transcript-text {
            line-height: 1.8;
            font-size: 1.1rem;
            color: #333;
          }

          .simple-transcript {
            color: #666;
            font-style: italic;
          }

          .transcript-word {
            cursor: pointer;
            padding: 2px 1px;
            border-radius: 3px;
            transition: all 0.3s ease;
            display: inline;
          }

          .transcript-word:hover {
            background-color: #e3f2fd;
            text-decoration: underline;
          }

          .transcript-word.heard {
            font-weight: 900 !important;
            color: #000 !important;
            background-color: #ffff00 !important;
            text-decoration: underline !important;
          }

          .transcript-word.current {
            font-weight: 900 !important;
            color: #fff !important;
            background-color: #ff0000 !important;
            padding: 5px 10px !important;
            border-radius: 8px !important;
            border: 3px solid #000 !important;
            animation: currentWordPulse 1.5s infinite;
          }

          .transcript-word.current:hover {
            background-color: #0056b3;
          }

          @keyframes currentWordPulse {
            0% { box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.3); }
            50% { box-shadow: 0 0 0 6px rgba(0, 123, 255, 0.5); }
            100% { box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.3); }
          }

          .transcript-legend {
            background: #f8f9fa;
            padding: 15px 25px;
            border-top: 1px solid #e9ecef;
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            justify-content: center;
          }

          .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
            color: #666;
          }

          .legend-sample {
            padding: 2px 8px;
            border-radius: 3px;
            font-weight: 600;
            font-size: 0.85rem;
          }

          .legend-sample.normal {
            color: #333;
            background: transparent;
          }

          .legend-sample.current {
            color: #fff;
            background: #007bff;
          }

          .legend-sample.heard {
            font-weight: 700;
            color: #2c3e50;
            background-color: rgba(108, 117, 125, 0.15);
          }

          /* Scrollbar styling */
          .transcript-content::-webkit-scrollbar {
            width: 6px;
          }

          .transcript-content::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
          }

          .transcript-content::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 3px;
          }

          .transcript-content::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }

          @media (max-width: 768px) {
            .transcript-card-header {
              flex-direction: column;
              align-items: stretch;
              gap: 15px;
            }

            .transcript-status {
              justify-content: space-between;
            }

            .transcript-content {
              padding: 20px;
              max-height: 250px;
            }

            .transcript-text {
              font-size: 1rem;
              line-height: 1.6;
            }

            .transcript-legend {
              flex-direction: column;
              gap: 10px;
              align-items: center;
            }
          }
        `}</style>
      </div>
    );
  }

  // Non-card version (inline)
  return (
    <div className={`progressive-transcript-inline ${className}`}>
      <div className="transcript-text">
        {renderProgressiveTranscript()}
      </div>

      <style jsx>{`
        .progressive-transcript-inline {
          margin: 15px 0;
        }

        .transcript-text {
          line-height: 1.8;
          font-size: 1rem;
          color: #333;
        }

        .transcript-word {
          cursor: pointer;
          padding: 1px;
          border-radius: 2px;
          transition: all 0.3s ease;
        }

        .transcript-word:hover {
          background-color: #e3f2fd;
        }

        .transcript-word.heard {
          font-weight: 700;
          color: #2c3e50;
        }

        .transcript-word.current {
          font-weight: 700;
          color: #fff;
          background-color: #007bff;
          padding: 2px 4px;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
};

export default ProgressiveTranscript;
