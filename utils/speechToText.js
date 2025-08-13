// Speech-to-Text utilities for converting audio to text with timing
export class SpeechToTextService {
  constructor(options = {}) {
    this.options = {
      language: 'en-US',
      continuous: true,
      interimResults: true,
      maxAlternatives: 1,
      ...options
    };
    this.recognition = null;
    this.isSupported = this.checkSupport();
  }

  checkSupport() {
    // Only check support on client side
    if (typeof window === 'undefined') return false;
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  // Convert audio file to text using Web Speech API
  async convertAudioToText(audioFile, onProgress = null, onComplete = null) {
    if (typeof window === 'undefined') {
      throw new Error('Speech recognition is only available in the browser');
    }
    
    if (!this.isSupported) {
      throw new Error('Speech recognition is not supported in this browser');
    }

    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const audioURL = URL.createObjectURL(audioFile);
      audio.src = audioURL;

      // Create speech recognition instance
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      // Configure recognition
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.options.language;
      this.recognition.maxAlternatives = this.options.maxAlternatives;

      let finalTranscript = '';
      let wordTimings = [];
      let currentWordIndex = 0;
      let audioStartTime = 0;

      // Handle recognition results
      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          
          if (result.isFinal) {
            finalTranscript += transcript + ' ';
            
            // Generate word timings based on audio progress
            const words = transcript.trim().split(/\s+/);
            const currentTime = audio.currentTime;
            const segmentDuration = currentTime - audioStartTime;
            const avgWordDuration = segmentDuration / words.length;
            
            words.forEach((word, index) => {
              const startTime = audioStartTime + (index * avgWordDuration);
              const endTime = startTime + avgWordDuration;
              
              wordTimings.push({
                word: word.replace(/[.,!?;:]$/, ''), // Remove punctuation
                startTime: parseFloat(startTime.toFixed(2)),
                endTime: parseFloat(endTime.toFixed(2)),
                confidence: result[0].confidence || 0.9
              });
              currentWordIndex++;
            });
            
            audioStartTime = currentTime;
            
            if (onProgress) {
              onProgress({
                transcript: finalTranscript,
                wordTimings: [...wordTimings],
                progress: (currentTime / audio.duration) * 100
              });
            }
          } else {
            interimTranscript += transcript;
          }
        }
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        reject(new Error(`Speech recognition failed: ${event.error}`));
      };

      this.recognition.onend = () => {
        audio.pause();
        URL.revokeObjectURL(audioURL);
        
        const result = {
          transcript: finalTranscript.trim(),
          wordTimings: wordTimings,
          duration: audio.duration,
          confidence: wordTimings.length > 0 
            ? wordTimings.reduce((sum, word) => sum + word.confidence, 0) / wordTimings.length 
            : 0
        };

        if (onComplete) {
          onComplete(result);
        }
        
        resolve(result);
      };

      // Start audio and recognition together
      audio.onloadedmetadata = () => {
        console.log('🎵 Audio loaded, starting transcription...');
        audio.play();
        this.recognition.start();
      };

      audio.onerror = (error) => {
        reject(new Error(`Audio loading failed: ${error.message}`));
      };
    });
  }

  // Convert audio element by playing it and using speech recognition
  async transcribeAudioElement(audioElement, onProgress = null) {
    if (typeof window === 'undefined') {
      throw new Error('Speech recognition is only available in the browser');
    }
    
    if (!this.isSupported) {
      throw new Error('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
    }

    return new Promise((resolve, reject) => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      // Configure recognition for better accuracy
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.options.language;
      this.recognition.maxAlternatives = 1;

      let finalTranscript = '';
      let wordTimings = [];
      let startTime = Date.now();
      let audioStartTime = 0;
      let lastResultTime = 0;

      // Set up audio element
      audioElement.currentTime = 0;
      const audioDuration = audioElement.duration || 0;

      this.recognition.onstart = () => {
        console.log('🎤 Speech recognition started - please ensure your speakers are audible to your microphone');
        startTime = Date.now();
        audioStartTime = audioElement.currentTime;
      };

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          
          if (result.isFinal) {
            finalTranscript += transcript + ' ';
            
            // Calculate timing based on audio position
            const currentAudioTime = audioElement.currentTime;
            const words = transcript.trim().split(/\s+/);
            const segmentDuration = Math.max(1, currentAudioTime - lastResultTime);
            const timePerWord = segmentDuration / words.length;
            
            words.forEach((word, index) => {
              const wordStart = lastResultTime + (index * timePerWord);
              const wordEnd = lastResultTime + ((index + 1) * timePerWord);
              
              wordTimings.push({
                word: word.replace(/[.,!?;:]$/, ''),
                startTime: parseFloat(wordStart.toFixed(2)),
                endTime: parseFloat(wordEnd.toFixed(2)),
                confidence: result[0].confidence || 0.9
              });
            });
            
            lastResultTime = currentAudioTime;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (onProgress) {
          const progress = audioDuration > 0 ? (audioElement.currentTime / audioDuration) * 100 : 0;
          onProgress({
            transcript: finalTranscript + interimTranscript,
            wordTimings: [...wordTimings],
            progress: Math.min(progress, 100)
          });
        }
      };

      this.recognition.onerror = (event) => {
        console.error('❌ Speech recognition error:', event.error);
        
        let errorMessage = 'Speech recognition failed';
        if (event.error === 'no-speech') {
          errorMessage = 'No speech detected. Please ensure your audio is playing loudly enough for your microphone to capture it.';
        } else if (event.error === 'not-allowed') {
          errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
        } else if (event.error === 'network') {
          errorMessage = 'Network error occurred during speech recognition.';
        }
        
        reject(new Error(errorMessage));
      };

      this.recognition.onend = () => {
        console.log('🎤 Speech recognition ended');
        
        // Calculate average confidence
        const avgConfidence = wordTimings.length > 0 
          ? wordTimings.reduce((sum, word) => sum + word.confidence, 0) / wordTimings.length
          : 0;

        resolve({
          transcript: finalTranscript.trim(),
          wordTimings: wordTimings,
          confidence: avgConfidence,
          duration: audioDuration
        });
      };

      // Start playing audio and recognition together
      audioElement.play().then(() => {
        console.log('🔊 Audio started playing');
        this.recognition.start();
        
        // Stop recognition when audio ends
        audioElement.onended = () => {
          console.log('🔊 Audio ended, stopping recognition');
          setTimeout(() => {
            if (this.recognition) {
              this.recognition.stop();
            }
          }, 1000); // Give recognition a bit more time
        };
        
        // Update progress during playback
        const progressInterval = setInterval(() => {
          if (audioElement.paused || audioElement.ended) {
            clearInterval(progressInterval);
            return;
          }
          
          if (onProgress && audioDuration > 0) {
            const progress = (audioElement.currentTime / audioDuration) * 100;
            onProgress({
              transcript: finalTranscript,
              wordTimings: [...wordTimings],
              progress: Math.min(progress, 100)
            });
          }
        }, 500);
        
      }).catch(error => {
        reject(new Error(`Failed to play audio: ${error.message}`));
      });
    });
  }

  stop() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }
}

// Server-side transcription using cloud services (for production)
export class CloudSpeechService {
  constructor(apiKey, provider = 'google') {
    this.apiKey = apiKey;
    this.provider = provider;
  }

  // Google Cloud Speech-to-Text
  async transcribeWithGoogle(audioBuffer, options = {}) {
    const config = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: 'en-US',
      enableWordTimeOffsets: true,
      enableSpeakerDiarization: true,
      diarizationSpeakerCount: 1,
      model: 'latest_long',
      useEnhanced: true,
      ...options
    };

    const audio = {
      content: audioBuffer.toString('base64')
    };

    const request = {
      config: config,
      audio: audio
    };

    try {
      const response = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request)
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Transcription failed');
      }

      return this.parseGoogleResponse(result);
    } catch (error) {
      throw new Error(`Google Speech API error: ${error.message}`);
    }
  }

  parseGoogleResponse(response) {
    const alternatives = response.results?.[0]?.alternatives?.[0];
    if (!alternatives) {
      throw new Error('No transcription results found');
    }

    const transcript = alternatives.transcript;
    const words = alternatives.words || [];
    
    const wordTimings = words.map(wordInfo => ({
      word: wordInfo.word,
      startTime: parseFloat(wordInfo.startTime?.replace('s', '') || 0),
      endTime: parseFloat(wordInfo.endTime?.replace('s', '') || 0),
      confidence: wordInfo.confidence || 0.9
    }));

    return {
      transcript,
      wordTimings,
      confidence: alternatives.confidence || 0.9
    };
  }

  // AssemblyAI transcription (alternative service)
  async transcribeWithAssemblyAI(audioUrl, options = {}) {
    const transcriptRequest = {
      audio_url: audioUrl,
      word_boost: ['healthcare', 'medical', 'patient', 'treatment'],
      boost_param: 'high',
      language_detection: true,
      ...options
    };

    try {
      // Submit transcription job
      const submitResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transcriptRequest)
      });

      const submitResult = await submitResponse.json();
      const transcriptId = submitResult.id;

      // Poll for completion
      let transcript;
      do {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
          headers: {
            'Authorization': this.apiKey
          }
        });
        
        transcript = await pollResponse.json();
      } while (transcript.status === 'processing' || transcript.status === 'queued');

      if (transcript.status === 'error') {
        throw new Error(transcript.error);
      }

      return this.parseAssemblyAIResponse(transcript);
    } catch (error) {
      throw new Error(`AssemblyAI error: ${error.message}`);
    }
  }

  parseAssemblyAIResponse(transcript) {
    const wordTimings = transcript.words?.map(wordInfo => ({
      word: wordInfo.text,
      startTime: wordInfo.start / 1000, // Convert ms to seconds
      endTime: wordInfo.end / 1000,
      confidence: wordInfo.confidence
    })) || [];

    return {
      transcript: transcript.text,
      wordTimings,
      confidence: transcript.confidence
    };
  }
}

// Utility functions
export const generateDemoTimings = (transcript, duration = 30) => {
  const words = transcript.trim().split(/\s+/);
  const avgWordDuration = duration / words.length;
  
  return words.map((word, index) => ({
    word: word.replace(/[.,!?;:]$/, ''),
    startTime: parseFloat((index * avgWordDuration).toFixed(2)),
    endTime: parseFloat(((index + 1) * avgWordDuration).toFixed(2)),
    confidence: 0.95
  }));
};

export const saveTranscriptionToSubmission = async (submissionId, transcriptionData) => {
  try {
    const response = await fetch('/api/submissions/update-transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submissionId,
        transcript: transcriptionData.transcript,
        wordTimings: transcriptionData.wordTimings,
        confidence: transcriptionData.confidence
      })
    });

    return await response.json();
  } catch (error) {
    console.error('Failed to save transcription:', error);
    throw error;
  }
};
