import React, { useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import ProgressiveTranscript from '../components/ProgressiveTranscript';

const DemoHighlighting = () => {
  const audioRef = useRef(null);

  const demoTranscript = `
    Welcome to this demonstration of progressive transcript highlighting. 
    As this audio plays, you will see the words become bold as they are heard. 
    The currently playing word will be highlighted in blue with a special animation. 
    Words that haven't been spoken yet will remain in normal text. 
    You can click on any word to jump to that part of the audio. 
    Try using the audio controls to seek forward or backward and watch how 
    the highlighting updates immediately to show exactly what has been heard.
  `;

  return (
    <div className="demo-page">
      <Head>
        <title>Progressive Highlighting Demo - CORSEP</title>
        <meta name="description" content="See how progressive transcript highlighting works" />
      </Head>

      <header className="demo-header">
        <Link href="/" className="back-link">← Back to Home</Link>
        <h1>🎯 Progressive Highlighting Demo</h1>
        <p>See exactly how the transcript highlighting works with real audio</p>
      </header>

      <main className="demo-content">
        <section className="instructions">
          <h2>📋 How to Test:</h2>
          <ol>
            <li><strong>Click Play</strong> on the audio below</li>
            <li><strong>Watch the transcript</strong> - words become bold as heard</li>
            <li><strong>Current word</strong> is highlighted in blue</li>
            <li><strong>Try seeking</strong> forward/backward with audio controls</li>
            <li><strong>Click words</strong> to jump to that timestamp</li>
          </ol>
        </section>

        <section className="demo-section">
          {/* This shows the EXACT same component used on the homepage */}
          <ProgressiveTranscript
            audioRef={audioRef}
            transcript={demoTranscript}
            timings={[]} // Auto-generates timing based on audio duration
            showAsCard={true}
          />

          {/* Audio player */}
          <div className="audio-player-section">
            <h4>🎧 Demo Audio</h4>
            <audio
              ref={audioRef}
              controls
              preload="metadata"
              className="demo-audio-player"
            >
              <source src="/uploads/1752580784789_bb2b4ce7.webm" type="audio/webm" />
              <source src="/uploads/1752589556844_8d37aef9.webm" type="audio/webm" />
              Your browser does not support the audio element.
            </audio>
          </div>
        </section>

        <section className="explanation">
          <h2>🔍 What You're Seeing:</h2>
          <div className="explanation-grid">
            <div className="explanation-card">
              <h3>📝 Transcript Card</h3>
              <p>Full text displayed ABOVE the audio player in a beautiful card format</p>
            </div>
            
            <div className="explanation-card">
              <h3>⚡ Real-Time Highlighting</h3>
              <p>Words become <strong>bold</strong> as they're heard, current word is <span className="blue-highlight">blue</span></p>
            </div>
            
            <div className="explanation-card">
              <h3>🎯 Perfect Sync</h3>
              <p>Forward/backward seeking updates highlighting instantly</p>
            </div>
            
            <div className="explanation-card">
              <h3>👆 Interactive</h3>
              <p>Click any word to jump to that timestamp in the audio</p>
            </div>
          </div>
        </section>

        <section className="homepage-info">
          <h2>🏠 On the Homepage:</h2>
          <p>
            This exact same functionality is now active on the homepage for all audio submissions. 
            Each audio story will show:
          </p>
          <ul>
            <li><strong>Transcript Card</strong> - Above each audio player</li>
            <li><strong>Progressive Highlighting</strong> - As visitors play audio</li>
            <li><strong>Transcript Generator</strong> - To create real transcripts with precise timing</li>
          </ul>
          <Link href="/" className="home-link">
            View Homepage with Progressive Highlighting →
          </Link>
        </section>
      </main>

      <style jsx>{`
        .demo-page {
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          background: #f8f9fa;
        }

        .demo-header {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
          position: relative;
        }

        .back-link {
          position: absolute;
          top: 20px;
          left: 20px;
          color: rgba(255, 255, 255, 0.9);
          text-decoration: none;
          padding: 8px 16px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          transition: all 0.3s ease;
        }

        .back-link:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .demo-header h1 {
          margin: 0 0 10px 0;
          font-size: 2.5rem;
          font-weight: 700;
        }

        .demo-header p {
          margin: 0;
          font-size: 1.2rem;
          opacity: 0.9;
        }

        .demo-content {
          max-width: 1000px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .instructions,
        .demo-section,
        .explanation,
        .homepage-info {
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 30px;
        }

        .instructions h2,
        .explanation h2,
        .homepage-info h2 {
          margin-top: 0;
          color: #333;
          font-size: 1.8rem;
          margin-bottom: 20px;
        }

        .instructions ol {
          padding-left: 20px;
        }

        .instructions li {
          margin-bottom: 10px;
          font-size: 1.1rem;
          line-height: 1.6;
        }

        .audio-player-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid #e9ecef;
          margin-top: 20px;
        }

        .audio-player-section h4 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 1.1rem;
        }

        .demo-audio-player {
          width: 100%;
          border-radius: 8px;
          height: 40px;
        }

        .explanation-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .explanation-card {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }

        .explanation-card h3 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 1.1rem;
        }

        .explanation-card p {
          margin: 0;
          color: #666;
          line-height: 1.5;
        }

        .blue-highlight {
          background: #007bff;
          color: white;
          padding: 2px 4px;
          border-radius: 3px;
          font-weight: bold;
        }

        .homepage-info ul {
          margin: 20px 0;
          padding-left: 20px;
        }

        .homepage-info li {
          margin-bottom: 8px;
          color: #555;
        }

        .home-link {
          display: inline-block;
          background: #007bff;
          color: white;
          padding: 12px 24px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          margin-top: 20px;
          transition: background 0.3s ease;
        }

        .home-link:hover {
          background: #0056b3;
        }

        @media (max-width: 768px) {
          .demo-header {
            padding: 30px 20px;
          }

          .demo-header h1 {
            font-size: 2rem;
          }

          .back-link {
            position: static;
            display: inline-block;
            margin-bottom: 20px;
          }

          .demo-content {
            padding: 20px 15px;
          }

          .instructions,
          .demo-section,
          .explanation,
          .homepage-info {
            padding: 20px;
            margin-bottom: 20px;
          }

          .explanation-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default DemoHighlighting;
