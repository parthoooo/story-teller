import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ProgressiveTranscript from '../../components/ProgressiveTranscript';

export default function CollectionPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [submissions, setSubmissions] = useState([]);
  const [collectionInfo, setCollectionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const audioRefs = useRef({});

  useEffect(() => {
    if (!slug) return;
    setFetchError('');
    Promise.all([
      fetch(`/api/approved-submissions?collection=${encodeURIComponent(slug)}&limit=50`).then((r) => r.json()),
      fetch('/api/collections').then((r) => r.json())
    ])
      .then(([subData, colData]) => {
        if (subData.error) {
          setFetchError(subData.error);
          setSubmissions([]);
        } else if (subData.submissions) {
          setSubmissions(subData.submissions);
        }
        const col = (colData.collections || []).find((c) => c.slug === slug);
        setCollectionInfo(col || { name: slug, description: '' });
      })
      .catch(() => setFetchError('Failed to load collection'))
      .finally(() => setLoading(false));
  }, [slug]);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const title = collectionInfo ? `${collectionInfo.name} – Collection` : 'Collection';

  if (loading) {
    return (
      <div className="collection-page">
        <div className="loading-spinner">Loading collection...</div>
      </div>
    );
  }

  return (
    <div className="collection-page">
      <Head>
        <title>{title}</title>
        <meta name="description" content={collectionInfo?.description || `Stories in ${collectionInfo?.name || slug}`} />
      </Head>

      <header className="collection-header">
        <Link href="/">← All stories</Link>
        <h1>{collectionInfo?.name || slug}</h1>
        {collectionInfo?.description && <p className="collection-description">{collectionInfo.description}</p>}
      </header>

      <main className="collection-content">
        {fetchError && <p className="error-message">{fetchError}</p>}
        {submissions.length === 0 && !fetchError ? (
          <p>No stories in this collection yet.</p>
        ) : submissions.length > 0 ? (
          <div className="stories-grid">
            {submissions.map((sub) => (
              <div key={sub.id} className="story-card">
                <div className="story-header">
                  <h3>
                    <Link href={`/stories/${sub.id}`}>{sub.firstName} {sub.lastName}</Link>
                  </h3>
                  <span className="story-date">{formatDate(sub.submittedAt)}</span>
                </div>
                {sub.transcriptGenerated && sub.fullTranscript ? (
                  <ProgressiveTranscript
                    audioRef={{ current: audioRefs.current[sub.id] }}
                    transcript={sub.fullTranscript}
                    timings={sub.wordTimings}
                    showAsCard={true}
                  />
                ) : sub.textStory ? (
                  <ProgressiveTranscript
                    audioRef={{ current: audioRefs.current[sub.id] }}
                    transcript={sub.textStory}
                    timings={[]}
                    showAsCard={true}
                  />
                ) : (
                  <ProgressiveTranscript
                    audioRef={{ current: audioRefs.current[sub.id] }}
                    transcript={`${sub.firstName}'s audio story.`}
                    timings={[]}
                    showAsCard={true}
                  />
                )}
                <div className="audio-player-section">
                  <audio
                    ref={(el) => (audioRefs.current[sub.id] = el)}
                    controls
                    preload="metadata"
                    className="story-audio-player"
                  >
                    <source src={`/uploads/${sub.audioFilename}`} type="audio/webm" />
                  </audio>
                  <Link href={`/stories/${sub.id}`} className="share-link">Share this story →</Link>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
}
