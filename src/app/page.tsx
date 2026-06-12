'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ScrapedItem, Topic } from '@/lib/types';

type SourceFilter = 'all' | 'ircc' | 'reddit' | 'competitor' | 'news';

interface DateGroup {
  label: string;
  items: ScrapedItem[];
}

function groupByDate(items: ScrapedItem[]): DateGroup[] {
  const map = new Map<string, ScrapedItem[]>();
  const now = new Date();

  for (const item of items) {
    const d = new Date(item.scrapedAt);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    let label: string;
    if (diffDays === 0) label = 'Today';
    else if (diffDays === 1) label = 'Yesterday';
    else label = d.toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' });

    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }

  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

export default function IntelligencePage() {
  const [sources, setSources] = useState<ScrapedItem[]>([]);
  const [lastScrapedAt, setLastScrapedAt] = useState<string | null>(null);
  const [scraping, setScraping] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [generatingTopics, setGeneratingTopics] = useState(false);
  const [generatedTopics, setGeneratedTopics] = useState<Topic[] | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    const res = await fetch('/api/scrape');
    const data = await res.json();
    setSources(data.items ?? []);
    setLastScrapedAt(data.lastScrapedAt ?? null);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleScrape() {
    setScraping(true);
    try {
      const res = await fetch('/api/scrape', { method: 'POST' });
      const data = await res.json();
      setSources(data.items ?? []);
      setLastScrapedAt(data.lastScrapedAt);
      showToast(`Scraped ${data.total} items (+${data.added} new)`);
    } catch {
      showToast('Scrape failed');
    } finally {
      setScraping(false);
    }
  }

  async function handleGenerateTopics() {
    if (selected.size === 0) return;
    setGeneratingTopics(true);
    setGeneratedTopics(null);
    try {
      const res = await fetch('/api/generate-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGeneratedTopics(data.topics);
      setSelected(new Set());
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to generate topics');
    } finally {
      setGeneratingTopics(false);
    }
  }

  function toggleItem(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() { setSelected(new Set(filtered.map(i => i.id))); }
  function clearAll() { setSelected(new Set()); }

  const filtered = sourceFilter === 'all' ? sources : sources.filter(s => s.source === sourceFilter);
  const groups = groupByDate(filtered);

  const formatRelative = (iso: string) => {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const totalSources = sources.length;
  const todayCount = groups.find(g => g.label === 'Today')?.items.length ?? 0;

  return (
    <>
      <div className="intelligence-layout">
        {/* === LEFT: Scrape Feed === */}
        <aside className="intel-feed">
          <div className="intel-feed-header">
            <div className="intel-feed-title">
              <span>Feed</span>
              <button className="btn btn-primary btn-sm" onClick={handleScrape} disabled={scraping}>
                {scraping ? <><span className="spinner" /> Scraping...</> : '↻ Scrape Now'}
              </button>
            </div>

            {lastScrapedAt && (
              <p className="sidebar-meta">
                Last scraped {formatRelative(lastScrapedAt)} · {totalSources} items on file
              </p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div className="filter-tabs">
                {(['all', 'ircc', 'reddit', 'competitor', 'news'] as SourceFilter[]).map(f => (
                  <button
                    key={f}
                    className={`filter-tab ${sourceFilter === f ? 'active' : ''}`}
                    onClick={() => setSourceFilter(f)}
                  >
                    {f === 'all' ? 'All' : f.toUpperCase()}
                  </button>
                ))}
              </div>
              {selected.size > 0 ? (
                <button className="btn btn-ghost btn-sm" onClick={clearAll} style={{ fontSize: 12 }}>Clear</button>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={selectAll} style={{ fontSize: 12 }}>Select all</button>
              )}
            </div>
          </div>

          <div className="intel-feed-scroll">
            {groups.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 16px' }}>
                <div className="empty-state-icon">📡</div>
                <p className="empty-state-title" style={{ fontSize: 16 }}>No sources yet</p>
                <p className="empty-state-body" style={{ fontSize: 13 }}>
                  Click &quot;Scrape Now&quot; to pull today&apos;s immigration news.
                </p>
              </div>
            ) : (
              groups.map(group => (
                <div key={group.label} className="date-group">
                  <div className="date-group-header">
                    <span className="date-group-label">{group.label}</span>
                    <span className="date-group-count">{group.items.length}</span>
                    <span className="date-group-line" />
                  </div>
                  {group.items.map(item => (
                    <div
                      key={item.id}
                      className={`source-card ${selected.has(item.id) ? 'selected' : ''}`}
                      onClick={() => toggleItem(item.id)}
                    >
                      <div className="source-card-header">
                        <p className="source-card-title">{item.title}</p>
                        <span className={`source-badge source-badge-${item.source}`}>{item.source}</span>
                      </div>
                      {item.excerpt && <p className="source-card-excerpt">{item.excerpt}</p>}
                      <div className="source-card-meta">
                        <span className="source-card-source">{item.sourceName}</span>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="source-card-link"
                          onClick={e => e.stopPropagation()}
                        >
                          View ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {selected.size > 0 && (
            <div className="source-select-bar">
              <p className="source-select-bar-text">
                <strong>{selected.size}</strong> source{selected.size > 1 ? 's' : ''} selected
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleGenerateTopics}
                disabled={generatingTopics}
              >
                {generatingTopics ? <><span className="spinner" /> Generating...</> : 'Generate Topics →'}
              </button>
            </div>
          )}
        </aside>

        {/* === RIGHT: Topics panel === */}
        <div className="intel-context">

          {/* Generating state */}
          {generatingTopics && (
            <div style={{
              background: 'var(--blue-100)',
              border: '1.5px solid var(--blue-200)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}>
              <span className="spinner spinner-dark" style={{ width: 24, height: 24, flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 600, color: 'var(--blue-800)', fontSize: 14 }}>Claude is reading your sources...</p>
                <p style={{ fontSize: 13, color: 'var(--blue-600)', marginTop: 2 }}>Identifying the strongest angles. Usually 10–20 seconds.</p>
              </div>
            </div>
          )}

          {/* Generated topics */}
          {!generatingTopics && generatedTopics && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--blue-900)', margin: 0 }}>
                    {generatedTopics.length} topics generated
                  </h2>
                  <p style={{ fontSize: 12, color: 'var(--neutral-500)', marginTop: 2 }}>Click any topic to open the Content Studio</p>
                </div>
                <Link href="/topics" style={{ fontSize: 12, color: 'var(--blue-600)', textDecoration: 'none' }}>
                  View all saved topics →
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {generatedTopics.map(topic => (
                  <Link key={topic.id} href={`/topic/${topic.id}`} style={{ textDecoration: 'none' }}>
                    <div className="intel-topic-card">
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                        <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--blue-900)', lineHeight: 1.35, margin: 0 }}>
                          {topic.title}
                        </p>
                        <span className={`topic-card-audience audience-${topic.audience}`} style={{ flexShrink: 0 }}>
                          {topic.audience}
                        </span>
                      </div>
                      {topic.angle && (
                        <p style={{ fontSize: 12, color: 'var(--neutral-600)', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {topic.angle}
                        </p>
                      )}
                      <p style={{ fontSize: 11, color: 'var(--blue-600)', marginTop: 6, fontWeight: 500 }}>
                        Open in Content Studio →
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Default guide — shown when no topics generated yet */}
          {!generatingTopics && !generatedTopics && (
            <>
              <div className="intel-context-card">
                <h2 className="intel-context-card-title">How to use this</h2>
                <div className="intel-context-card-body">
                  <p style={{ marginBottom: 12 }}>
                    <strong style={{ color: 'var(--blue-800)' }}>1 — Scrape.</strong> Hit &quot;Scrape Now&quot; to pull the latest immigration news from IRCC, Reddit, and news sources. The feed keeps 7 days of history grouped by date.
                  </p>
                  <p style={{ marginBottom: 12 }}>
                    <strong style={{ color: 'var(--blue-800)' }}>2 — Select.</strong> Check the articles that are most relevant or newsworthy. You can filter by source type (IRCC, Reddit, etc.).
                  </p>
                  <p>
                    <strong style={{ color: 'var(--blue-800)' }}>3 — Generate.</strong> Click &quot;Generate Topics&quot; — Claude will surface 5 angles from your selected sources. Click any topic to jump straight into the Content Studio.
                  </p>
                </div>
              </div>

              {sources.length > 0 && (
                <div className="intel-context-card">
                  <h2 className="intel-context-card-title" style={{ fontSize: 16 }}>Feed snapshot</h2>
                  <div style={{ display: 'flex', gap: 24 }}>
                    {[
                      { label: 'Today', value: todayCount },
                      { label: 'Total on file', value: totalSources },
                      { label: 'Selected', value: selected.size },
                    ].map(stat => (
                      <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, color: 'var(--blue-800)' }}>
                          {stat.value}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--neutral-500)' }}>{stat.label}</span>
                      </div>
                    ))}
                  </div>
                  {selected.size === 0 && (
                    <p style={{ fontSize: 13, color: 'var(--neutral-500)', lineHeight: 1.5, marginTop: 8 }}>
                      Select articles from the feed, then click &quot;Generate Topics&quot; to continue.
                    </p>
                  )}
                </div>
              )}

              <div style={{ paddingTop: 4 }}>
                <Link href="/topics" style={{ fontSize: 13, color: 'var(--blue-600)', textDecoration: 'none' }}>
                  View saved topic library →
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {toast && <div className="toast-container"><div className="toast toast-success">{toast}</div></div>}
    </>
  );
}
