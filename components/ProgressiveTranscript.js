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
      return;
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
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
    
    // Auto-generated timings based on audio duration
    
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
  
  // Production-ready component with minimal logging

  // Split transcript into words for highlighting
  const renderProgressiveTranscript = () => {
    if (!transcript) return <p>No transcript available</p>;

    if (effectiveTimings.length === 0) {
      // Fallback: simple text without word-level highlighting
      return <p className="simple-transcript">{transcript}</p>;
    }

    return effectiveTimings.map((timing, index) => {
      const isHeard = currentTime > timing.endTime;
      const isCurrent = currentTime >= timing.startTime && currentTime <= timing.endTime;
      
      return (
        <span
          key={index}
          className={`transcript-word ${isHeard ? 'heard' : ''} ${isCurrent ? 'current' : ''}`}
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


      </div>
    );
  }

  // Non-card version (inline)
  return (
    <div className={`progressive-transcript-inline ${className}`}>
      <div className="transcript-text">
        {renderProgressiveTranscript()}
      </div>


    </div>
  );
};

export default ProgressiveTranscript;
