import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ProgressiveTranscript from '../../components/ProgressiveTranscript';

export default function StoryPage() {
  const router = useRouter();
  const { id } = router.query;
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const audioRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/stories/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Story not found' : 'Failed to load');
        return res.json();
      })
      .then(setStory)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const title = story ? `${story.firstName} ${story.lastName} – Story` : 'Story';
  const description = story?.fullTranscript
    ? story.fullTranscript.substring(0, 160) + (story.fullTranscript.length > 160 ? '…' : '')
    : story?.textStory
    ? story.textStory.substring(0, 160) + (story.textStory.length > 160 ? '…' : '')
    : 'Listen to this story.';

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  if (loading) {
    return (
      <div className="story-page">
        <div className="loading-spinner">Loading story...</div>
      </div>
    );
  }
  if (error || !story) {
    return (
      <div className="story-page">
        <Head><title>Story not found</title></Head>
        <p>{error || 'Story not found.'}</p>
        <Link href="/">← Back to home</Link>
      </div>
    );
  }

  return (
    <div className="story-page">
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="article" />
        {baseUrl && <meta property="og:url" content={`${baseUrl}/stories/${story.id}`} />}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Head>

      <header className="story-page-header">
        <Link href="/">← All stories</Link>
      </header>

      <article className="story-page-content">
        <div className="story-header">
          <h1>{story.firstName} {story.lastName}</h1>
          <span className="story-meta">{formatDate(story.submittedAt)}</span>
          {(story.tags?.length > 0 || story.collectionSlug) && (
            <div className="story-tags">
              {story.tags?.map((t) => <span key={t} className="tag">{t}</span>)}
              {story.collectionSlug && <span className="tag collection">{story.collectionSlug}</span>}
            </div>
          )}
        </div>

        {story.transcriptGenerated && story.fullTranscript ? (
          <ProgressiveTranscript
            audioRef={audioRef}
            transcript={story.fullTranscript}
            timings={story.wordTimings}
            showAsCard={true}
          />
        ) : story.textStory ? (
          <ProgressiveTranscript audioRef={audioRef} transcript={story.textStory} timings={[]} showAsCard={true} />
        ) : (
          <ProgressiveTranscript
            audioRef={audioRef}
            transcript={`${story.firstName}'s audio story. Transcript will appear when available.`}
            timings={[]}
            showAsCard={true}
          />
        )}

        <div className="audio-player-section">
          <h2>Listen</h2>
          <audio ref={audioRef} controls preload="metadata" className="story-audio-player">
            <source src={`/uploads/${story.audioFilename}`} type="audio/webm" />
            Your browser does not support the audio element.
          </audio>
        </div>

        {(story.procResponses?.question1 || story.procResponses?.question2) && (
          <div className="story-responses">
            {story.procResponses.question1 && <p><strong>PROC Q1:</strong> {story.procResponses.question1}</p>}
            {story.procResponses.question2 && <p><strong>PROC Q2:</strong> {story.procResponses.question2}</p>}
          </div>
        )}
      </article>

      <footer className="story-page-footer">
        <Link href="/">← Back to all stories</Link>
        {story.collectionSlug && <Link href={`/collections/${story.collectionSlug}`}>View collection →</Link>}
      </footer>
    </div>
  );
}
