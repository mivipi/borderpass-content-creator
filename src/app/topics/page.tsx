'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { Topic, ContentChannel } from '@/lib/types';
import { CHANNEL_SIDEBAR_ITEMS } from '@/lib/channels';

interface ScrapedItemRef {
  id: string;
  sourceName: string;
  source: string;
  title: string;
  url: string;
}

export default function TopicsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: 'var(--neutral-500)' }}>Loading...</div>}>
      <TopicsInner />
    </Suspense>
  );
}

function TopicsInner() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sourceMap, setSourceMap] = useState<Map<string, ScrapedItemRef>>(new Map());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const loadTopics = useCallback(async () => {
    const [topicsRes, scrapeRes] = await Promise.all([
      fetch('/api/topics'),
      fetch('/api/scrape'),
    ]);
    const [topicsData, scrapeData] = await Promise.all([topicsRes.json(), scrapeRes.json()]);
    setTopics(topicsData.topics ?? []);
    const map = new Map<string, ScrapedItemRef>();
    for (const item of (scrapeData.items ?? [])) {
      map.set(item.id, item);
    }
    setSourceMap(map);
  }, []);

  useEffect(() => { loadTopics(); }, [loadTopics]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm('Delete this topic and all its content?')) return;
    setDeletingId(id);
    await fetch(`/api/topics/${id}`, { method: 'DELETE' });
    setTopics(t => t.filter(x => x.id !== id));
    setDeletingId(null);
    showToast('Topic deleted');
  }

  async function handleNewBlank() {
    const res = await fetch('/api/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Topic', angle: '', audience: 'general' }),
    });
    const data = await res.json();
    setTopics(t => [data.topic, ...t]);
  }

  function generatedChannels(topic: Topic): ContentChannel[] {
    return (Object.keys(topic.content) as ContentChannel[]).filter(c => topic.content[c]);
  }

  function sourceChips(topic: Topic) {
    return topic.sourceIds
      .map(id => sourceMap.get(id))
      .filter(Boolean)
      .slice(0, 3) as ScrapedItemRef[];
  }

  // Get the display channels (collapsed groups) that have been generated
  function generatedDisplayCount(topic: Topic): number {
    const gen = generatedChannels(topic);
    const seen = new Set<string>();
    for (const ch of gen) {
      const item = CHANNEL_SIDEBAR_ITEMS.find(i =>
        i.type === 'single' ? i.channel === ch : i.subChannels.some(s => s.id === ch)
      );
      if (item) seen.add(item.type === 'single' ? item.channel : item.label);
    }
    return seen.size;
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <div className="page-shell">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-heading">Topic Library</h1>
            <p className="page-subheading">
              {topics.length > 0
                ? `${topics.length} saved topic${topics.length > 1 ? 's' : ''} — click any to open the Content Studio`
                : 'No topics yet — go to the Intelligence feed to scrape and generate topics'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn btn-outline btn-sm" onClick={handleNewBlank}>+ Blank Topic</button>
            <Link href="/" className="btn btn-secondary btn-sm">
              ← Back to Feed
            </Link>
          </div>
        </div>

        {topics.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 80 }}>
            <div className="empty-state-icon">✦</div>
            <p className="empty-state-title">No topics yet</p>
            <p className="empty-state-body">
              Go to the <Link href="/" style={{ color: 'var(--blue-600)' }}>Intelligence feed</Link>, select articles, and click &quot;Generate Topics&quot;.
            </p>
          </div>
        ) : (
          <div className="topics-grid" style={{ height: 'auto', overflow: 'visible', padding: 0 }}>
            {topics.map(topic => {
              const chips = sourceChips(topic);
              const genCount = generatedDisplayCount(topic);
              const totalDisplayChannels = CHANNEL_SIDEBAR_ITEMS.length;
              return (
                <Link key={topic.id} href={`/topic/${topic.id}`} className="topic-card">
                  <div className="topic-card-header">
                    <h2 className="topic-card-title">{topic.title}</h2>
                    <span className={`topic-card-audience audience-${topic.audience}`}>
                      {topic.audience}
                    </span>
                  </div>

                  {topic.angle && <p className="topic-card-angle">{topic.angle}</p>}

                  {chips.length > 0 && (
                    <div className="source-chips">
                      {chips.map(chip => (
                        <span key={chip.id} className={`source-chip source-chip-${chip.source}`}>
                          {chip.sourceName}
                        </span>
                      ))}
                      {topic.sourceIds.length > 3 && (
                        <span className="source-chip">+{topic.sourceIds.length - 3} more</span>
                      )}
                    </div>
                  )}

                  <div className="topic-card-footer">
                    <span className="topic-card-date">{formatDate(topic.createdAt)}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {genCount > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--neutral-500)' }}>
                          {genCount}/{totalDisplayChannels} channels
                        </span>
                      )}
                      <span className={`status-badge status-${topic.status}`}>
                        {topic.status.replace('_', ' ')}
                      </span>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--neutral-400)', padding: '0 6px' }}
                        onClick={e => handleDelete(topic.id, e)}
                        disabled={deletingId === topic.id}
                      >
                        {deletingId === topic.id ? '...' : '×'}
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {toast && <div className="toast-container"><div className="toast toast-success">{toast}</div></div>}
    </>
  );
}
