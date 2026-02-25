import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

import ProgressiveTranscript from '../components/ProgressiveTranscript';

const HomePage = () => {
  const [approvedSubmissions, setApprovedSubmissions] = useState([]);
  const [collections, setCollections] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ tags: [] });
  const [filters, setFilters] = useState({ tag: '', collection: '' });
  const [loading, setLoading] = useState(true);
  const audioRefs = useRef({});

  useEffect(() => {
    Promise.all([
      fetch('/api/collections').then((r) => r.json()),
      fetch('/api/filter-options').then((r) => r.json())
    ]).then(([colData, optData]) => {
      if (colData.collections) setCollections(colData.collections);
      if (optData.tags) setFilterOptions((o) => ({ ...o, tags: optData.tags }));
    });
  }, []);

  useEffect(() => {
    loadApprovedSubmissions();
  }, [filters.tag, filters.collection]);

  const loadApprovedSubmissions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 24 });
      if (filters.tag) params.set('tag', filters.tag);
      if (filters.collection) params.set('collection', filters.collection);
      const response = await fetch(`/api/approved-submissions?${params}`);
      const data = await response.json();
      if (response.ok) setApprovedSubmissions(data.submissions || []);
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
          <div className="cta-buttons">
            <Link href="/submit" className="cta-button primary">
              Share Your Story
            </Link>

            <Link href="/admin/dashboard" className="cta-button secondary">
              ⚙️ Admin Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* Collections section */}
        {collections.length > 0 && (
          <section className="collections-section">
            <h2>📂 Collections</h2>
            <p>Browse stories by collection</p>
            <div className="collections-list">
              {collections.map((c) => (
                <Link key={c.slug} href={`/collections/${c.slug}`} className="collection-chip">
                  {c.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Approved Submissions Section */}
        <section className="approved-submissions-section">
          <h2>📻 Featured Stories</h2>
          <p>Listen to approved stories from our community members</p>

          <div className="filters-bar">
            <label>
              Tag
              <select value={filters.tag} onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))}>
                <option value="">All</option>
                {filterOptions.tags.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Collection
              <select value={filters.collection} onChange={(e) => setFilters((f) => ({ ...f, collection: e.target.value }))}>
                <option value="">All</option>
                {collections.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </label>
          </div>
          
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
                    <h3>
                      <Link href={`/stories/${submission.id}`}>{submission.firstName} {submission.lastName}</Link>
                    </h3>
                    <span className="story-date">{formatDate(submission.submittedAt)}</span>
                    {(submission.tags?.length > 0 || submission.collectionSlug) && (
                      <div className="story-tags-inline">
                        {submission.tags?.map((t) => <span key={t} className="tag">{t}</span>)}
                        {submission.collectionSlug && <span className="tag collection">{submission.collectionSlug}</span>}
                      </div>
                    )}
                  </div>
                  
                  <div className="story-audio-section">
                    {/* Transcript Card - Shows ABOVE the audio player */}
                    {submission.transcriptGenerated && submission.fullTranscript ? (
                      <ProgressiveTranscript
                          audioRef={{ current: audioRefs.current[submission.id] }}
                          transcript={submission.fullTranscript}
                          timings={submission.wordTimings}
                          showAsCard={true}
                        />
                    ) : submission.textStory ? (
                      // Text story with demo progressive highlighting
                      <ProgressiveTranscript
                        audioRef={{ current: audioRefs.current[submission.id] }}
                        transcript={submission.textStory}
                        timings={[]} // Will auto-generate demo timings
                        showAsCard={true}
                      />
                    ) : (
                      // Demo transcript for audio without text
                      <ProgressiveTranscript
                        audioRef={{ current: audioRefs.current[submission.id] }}
                        transcript={`This is ${submission.firstName}'s audio story. The transcript will be generated automatically when you use the transcription tools. For now, you can see how the progressive highlighting works with this demo text as the audio plays. Words will become bold as they are heard, and the current word will be highlighted in blue.`}
                        timings={[]} // Will auto-generate demo timings
                        showAsCard={true}
                      />
                    )}

                    {/* Audio Player - Shows BELOW the transcript */}
                    <div className="audio-player-section">
                      <h4>🎧 {submission.firstName}'s Audio Story</h4>
                      <audio
                        ref={el => audioRefs.current[submission.id] = el}
                        controls
                        preload="metadata"
                        className="story-audio-player"
                      >
                        <source src={`/uploads/${submission.audioFilename}`} type="audio/webm" />
                        Your browser does not support the audio element.
                      </audio>
                      
                      <div className="audio-info">
                        <small>
                          {formatFileSize(submission.audioSize)} • 
                          {submission.audioDuration > 0 ? ` ${Math.round(submission.audioDuration)}s` : ' Audio'}
                          {submission.transcriptGenerated && (
                            <> • ✅ Transcript Available ({Math.round((submission.transcriptConfidence || 0) * 100)}% confidence)</>
                          )}
                        </small>
                      </div>
                    </div>

                    {/* Note for transcripts */}
                    {!submission.transcriptGenerated && (
                      <div className="no-transcript-notice">
                        <p>📝 <em>Transcript will be added by admin for progressive highlighting.</em></p>
                      </div>
                    )}
                    <div className="story-actions">
                      <Link href={`/stories/${submission.id}`} className="share-story-link">Share this story →</Link>
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
      </main>

      <footer className="footer">
        <p>&copy; 2024 CORSEP Audio Form. All rights reserved.</p>
        <div className="footer-links">
          <Link href="/submit">Submit Story</Link>
          <span className="separator">|</span>
          <a href="mailto:support@corsep.org">Contact Support</a>
        </div>
      </footer>


    </div>
  );
};

export default HomePage; 