import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const HomePage = () => {
  const [approvedSubmissions, setApprovedSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApprovedSubmissions();
  }, []);

  const loadApprovedSubmissions = async () => {
    try {
      const response = await fetch('/api/approved-submissions?limit=6');
      const data = await response.json();
      
      if (response.ok) {
        setApprovedSubmissions(data.submissions);
      } else {
        console.error('Failed to load approved submissions:', data.error);
      }
    } catch (error) {
      console.error('Error loading approved submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="home-container">
      <Head>
        <title>CORSEP Audio Form - Share Your Story</title>
        <meta name="description" content="Share your story through audio recording, file upload, or text entry. Help us understand your experience." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      
      <header className="hero-section">
        <div className="hero-content">
          <h1>Welcome to CORSEP Audio Form</h1>
          <p className="hero-description">
            Share your story and help us understand your experience through audio recording, 
            file upload, or written text. Your voice matters.
          </p>
          <Link href="/submit" className="cta-button">
            Share Your Story
          </Link>
        </div>
      </header>

      <main className="main-content">
        <section className="features-section">
          <h2>How It Works</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎤</div>
              <h3>Audio Recording</h3>
              <p>Record your story directly in your browser with our easy-to-use audio recorder.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📁</div>
              <h3>File Upload</h3>
              <p>Upload existing audio, video, or image files from your device.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">✍️</div>
              <h3>Written Story</h3>
              <p>Prefer to write? Share your experience through our text form.</p>
            </div>
          </div>
        </section>

        {/* Approved Submissions Section */}
        <section className="approved-submissions-section">
          <h2>📻 Featured Stories</h2>
          <p>Listen to approved stories from our community members</p>
          
          {loading ? (
            <div className="loading-spinner">Loading stories...</div>
          ) : approvedSubmissions.length === 0 ? (
            <div className="no-stories">
              <p>No approved stories yet. Be the first to share your story!</p>
            </div>
          ) : (
            <div className="stories-grid">
              {approvedSubmissions.map((submission) => (
                <div key={submission.id} className="story-card">
                  <div className="story-header">
                    <h3>{submission.firstName} {submission.lastName}</h3>
                    <span className="story-date">{formatDate(submission.submittedAt)}</span>
                  </div>
                  
                  {submission.textStory && (
                    <div className="story-text">
                      <p>{submission.textStory}</p>
                    </div>
                  )}
                  
                  <div className="story-audio">
                    <audio controls preload="metadata">
                      <source src={`/uploads/${submission.audioFilename}`} type="audio/webm" />
                      Your browser does not support the audio element.
                    </audio>
                    <div className="audio-info">
                      <small>
                        {formatFileSize(submission.audioSize)} • 
                        {submission.audioDuration > 0 ? ` ${Math.round(submission.audioDuration)}s` : ' Audio'}
                      </small>
                    </div>
                  </div>
                  
                  {(submission.procResponses.question1 || submission.procResponses.question2) && (
                    <div className="story-responses">
                      {submission.procResponses.question1 && (
                        <div className="response-item">
                          <strong>PROC Q1:</strong> {submission.procResponses.question1}
                        </div>
                      )}
                      {submission.procResponses.question2 && (
                        <div className="response-item">
                          <strong>PROC Q2:</strong> {submission.procResponses.question2}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="info-section">
          <h2>About CORSEP</h2>
          <div className="info-content">
            <p>
              The CORSEP (Consortium for Real-world Evidence and Patient-centered Outcomes Research) 
              project aims to collect and analyze patient experiences to improve healthcare outcomes.
            </p>
            <p>
              Your participation helps us understand real-world experiences and develop 
              better solutions for patients and healthcare providers.
            </p>
          </div>
        </section>

        <section className="privacy-section">
          <h2>Privacy & Security</h2>
          <div className="privacy-content">
            <div className="privacy-card">
              <div className="privacy-icon">🔒</div>
              <h3>Secure Storage</h3>
              <p>Your data is stored securely with industry-standard encryption.</p>
            </div>
            
            <div className="privacy-card">
              <div className="privacy-icon">🛡️</div>
              <h3>Privacy Protected</h3>
              <p>We respect your privacy and only use your data for research purposes.</p>
            </div>
            
            <div className="privacy-card">
              <div className="privacy-icon">✅</div>
              <h3>Consent Required</h3>
              <p>Your explicit consent is required before any data collection begins.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>&copy; 2024 CORSEP Audio Form. All rights reserved.</p>
        <div className="footer-links">
          <Link href="/submit">Submit Story</Link>
          <span className="separator">|</span>
          <a href="mailto:support@corsep.org">Contact Support</a>
        </div>
      </footer>

      <style jsx>{`
        .home-container {
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          line-height: 1.6;
          color: #333;
        }

        .hero-section {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 80px 20px;
          text-align: center;
          min-height: 60vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hero-content {
          max-width: 800px;
          margin: 0 auto;
        }

        .hero-section h1 {
          font-size: 3.5rem;
          margin-bottom: 20px;
          font-weight: 700;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
        }

        .hero-description {
          font-size: 1.3rem;
          margin-bottom: 40px;
          opacity: 0.95;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .cta-button {
          display: inline-block;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          padding: 18px 40px;
          border-radius: 50px;
          text-decoration: none;
          font-size: 1.2rem;
          font-weight: 600;
          transition: all 0.3s ease;
          border: 2px solid rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(10px);
        }

        .cta-button:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        }

        .main-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .features-section {
          padding: 80px 0;
          text-align: center;
        }

        .features-section h2 {
          font-size: 2.5rem;
          margin-bottom: 50px;
          color: #333;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 40px;
          margin-top: 50px;
        }

        .feature-card {
          background: white;
          padding: 40px 30px;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          border: 1px solid #f0f0f0;
        }

        .feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
        }

        .feature-icon {
          font-size: 3.5rem;
          margin-bottom: 20px;
        }

        .feature-card h3 {
          font-size: 1.5rem;
          margin-bottom: 15px;
          color: #333;
        }

        .feature-card p {
          color: #666;
          font-size: 1.1rem;
          line-height: 1.6;
        }

        .info-section {
          padding: 80px 0;
          background: #f8f9fa;
          border-radius: 20px;
          margin: 40px 0;
        }

        .info-section h2 {
          text-align: center;
          font-size: 2.5rem;
          margin-bottom: 40px;
          color: #333;
        }

        .info-content {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 40px;
        }

        .info-content p {
          font-size: 1.2rem;
          margin-bottom: 20px;
          color: #555;
          text-align: center;
        }

        .privacy-section {
          padding: 80px 0;
          text-align: center;
        }

        .privacy-section h2 {
          font-size: 2.5rem;
          margin-bottom: 50px;
          color: #333;
        }

        .privacy-content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 30px;
          margin-top: 50px;
        }

        .privacy-card {
          background: white;
          padding: 30px 20px;
          border-radius: 12px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
          border: 1px solid #f0f0f0;
        }

        .privacy-icon {
          font-size: 2.5rem;
          margin-bottom: 15px;
        }

        .privacy-card h3 {
          font-size: 1.3rem;
          margin-bottom: 10px;
          color: #333;
        }

        .privacy-card p {
          color: #666;
          font-size: 1rem;
        }

        .footer {
          background: #333;
          color: white;
          padding: 40px 20px;
          text-align: center;
          margin-top: 80px;
        }

        .footer p {
          margin: 0 0 20px 0;
          font-size: 1rem;
        }

        .footer-links {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 15px;
        }

        .footer-links a {
          color: #ccc;
          text-decoration: none;
          transition: color 0.3s ease;
        }

        .footer-links a:hover {
          color: white;
        }

        .separator {
          color: #666;
        }

        /* Approved Submissions Section */
        .approved-submissions-section {
          background: #f8f9fa;
          padding: 80px 20px;
          text-align: center;
        }

        .approved-submissions-section h2 {
          font-size: 2.5rem;
          margin-bottom: 10px;
          color: #333;
        }

        .approved-submissions-section p {
          font-size: 1.2rem;
          color: #666;
          margin-bottom: 50px;
        }

        .loading-spinner {
          font-size: 1.2rem;
          color: #666;
          padding: 50px;
        }

        .no-stories {
          background: white;
          padding: 50px;
          border-radius: 12px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
          margin: 0 auto;
          max-width: 600px;
        }

        .no-stories p {
          font-size: 1.1rem;
          color: #666;
          margin: 0;
        }

        .stories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 30px;
          margin-top: 50px;
        }

        .story-card {
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
          border: 1px solid #f0f0f0;
          text-align: left;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .story-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        }

        .story-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #f0f0f0;
        }

        .story-header h3 {
          font-size: 1.4rem;
          color: #333;
          margin: 0;
        }

        .story-date {
          font-size: 0.9rem;
          color: #999;
          background: #f8f9fa;
          padding: 4px 12px;
          border-radius: 20px;
        }

        .story-text {
          margin-bottom: 20px;
        }

        .story-text p {
          font-size: 1rem;
          color: #555;
          line-height: 1.6;
          margin: 0;
          text-align: left;
        }

        .story-audio {
          margin-bottom: 20px;
        }

        .story-audio audio {
          width: 100%;
          border-radius: 8px;
          margin-bottom: 10px;
        }

        .audio-info {
          text-align: center;
        }

        .audio-info small {
          color: #777;
          font-size: 0.85rem;
        }

        .story-responses {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin-top: 20px;
        }

        .response-item {
          margin-bottom: 8px;
          font-size: 0.9rem;
          color: #555;
        }

        .response-item:last-child {
          margin-bottom: 0;
        }

        .response-item strong {
          color: #333;
        }

        @media (max-width: 768px) {
          .hero-section {
            padding: 60px 20px;
            min-height: 50vh;
          }

          .hero-section h1 {
            font-size: 2.5rem;
          }

          .hero-description {
            font-size: 1.1rem;
          }

          .cta-button {
            padding: 15px 30px;
            font-size: 1.1rem;
          }

          .stories-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .story-card {
            padding: 20px;
          }

          .story-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .features-section {
            padding: 60px 0;
          }

          .features-section h2 {
            font-size: 2rem;
          }

          .features-grid {
            grid-template-columns: 1fr;
            gap: 30px;
          }

          .info-section {
            padding: 60px 0;
            margin: 30px 0;
          }

          .info-section h2 {
            font-size: 2rem;
          }

          .info-content {
            padding: 0 20px;
          }

          .info-content p {
            font-size: 1.1rem;
          }

          .privacy-section {
            padding: 60px 0;
          }

          .privacy-section h2 {
            font-size: 2rem;
          }

          .privacy-content {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .footer-links {
            flex-direction: column;
            gap: 10px;
          }

          .separator {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default HomePage; 