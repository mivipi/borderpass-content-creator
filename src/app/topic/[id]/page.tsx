'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { Topic, ContentChannel, Audience, ContentStatus } from '@/lib/types';
import { CHANNELS, CHANNEL_SIDEBAR_ITEMS, SidebarItem, isPngChannel } from '@/lib/channels';
import type { ImageContent, CarouselSlideContent } from '@/lib/image-templates';

interface SourceRef {
  id: string;
  sourceName: string;
  source: string;
  title: string;
  url: string;
  excerpt: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

let toastId = 0;

const AUDIENCE_OPTIONS: Audience[] = ['students', 'employers', 'agents', 'investors', 'general'];
const STATUS_OPTIONS: ContentStatus[] = ['draft', 'in_review', 'approved', 'exported'];

// ── Helpers ────────────────────────────────────────────────────────────────

function isCarouselBody(body: string): boolean {
  return body.trimStart().startsWith('[');
}

function parseCarouselSlides(body: string): string[] {
  try {
    const slides = JSON.parse(body);
    if (Array.isArray(slides)) return slides as string[];
  } catch { /* fall through */ }
  return [body];
}

export default function TopicEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [topic, setTopic] = useState<Topic | null>(null);
  const [sourceRefs, setSourceRefs] = useState<SourceRef[]>([]);
  const [loading, setLoading] = useState(true);
  // activeGroup tracks which sidebar item is active (channel or group label)
  const [activeGroup, setActiveGroup] = useState<string>(CHANNEL_SIDEBAR_ITEMS[0].type === 'single' ? CHANNEL_SIDEBAR_ITEMS[0].channel : CHANNEL_SIDEBAR_ITEMS[0].label);
  // activeChannel is the actual ContentChannel being shown
  const [activeChannel, setActiveChannel] = useState<ContentChannel>(
    (() => {
      const first = CHANNEL_SIDEBAR_ITEMS[0];
      return first.type === 'single' ? first.channel : first.subChannels[0].id;
    })()
  );
  const [generatingChannel, setGeneratingChannel] = useState<ContentChannel | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [downloadingPng, setDownloadingPng] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const loadTopic = useCallback(async () => {
    try {
      const [topicRes, scrapeRes] = await Promise.all([
        fetch(`/api/topics/${id}`),
        fetch('/api/scrape'),
      ]);
      const [data, scrapeData] = await Promise.all([topicRes.json(), scrapeRes.json()]);
      if (!topicRes.ok) throw new Error(data.error);
      setTopic(data.topic);
      const allItems: SourceRef[] = scrapeData.items ?? [];
      setSourceRefs(allItems.filter((i: SourceRef) => data.topic.sourceIds?.includes(i.id)));
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to load topic', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => { loadTopic(); }, [loadTopic]);

  // ── Meta save ─────────────────────────────────────────────────────────────
  const saveMeta = useCallback(async (updates: Partial<Topic>) => {
    if (!topic) return;
    setSavingMeta(true);
    try {
      const res = await fetch(`/api/topics/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTopic(data.topic);
    } catch { addToast('Failed to save', 'error'); }
    finally { setSavingMeta(false); }
  }, [topic, id, addToast]);

  function scheduleMetaSave(updates: Partial<Topic>) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveMeta(updates), 1200);
  }

  function handleFieldChange(field: keyof Topic, value: string) {
    if (!topic) return;
    const updated = { ...topic, [field]: value };
    setTopic(updated);
    scheduleMetaSave({ [field]: value });
  }

  // ── Generate ──────────────────────────────────────────────────────────────
  async function handleGenerateContent(channel: ContentChannel) {
    if (!topic) return;
    setGeneratingChannel(channel);
    try {
      const res = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: topic.id, channel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTopic(data.topic);
      addToast(`${CHANNELS.find((c) => c.id === channel)?.label ?? channel} generated`);
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Generation failed', 'error');
    } finally {
      setGeneratingChannel(null);
    }
  }

  function handleVisualUpdate(channel: ContentChannel, html: string, json: string) {
    if (!topic) return;
    const updatedContent = {
      ...topic.content,
      [channel]: { ...topic.content[channel], body: html, visualJson: json, editedAt: new Date().toISOString() },
    };
    setTopic({ ...topic, content: updatedContent });
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await fetch(`/api/topics/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: updatedContent }),
      });
    }, 1200);
  }

  async function handleTextEdit(channel: ContentChannel, body: string) {
    if (!topic) return;
    const updatedContent = {
      ...topic.content,
      [channel]: { ...topic.content[channel], body, editedAt: new Date().toISOString() },
    };
    setTopic({ ...topic, content: updatedContent });
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await fetch(`/api/topics/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: updatedContent }),
      });
    }, 1200);
  }

  // ── Export / download ─────────────────────────────────────────────────────
  async function renderAndDownloadPng(html: string, filename: string): Promise<void> {
    const res = await fetch('/api/render-png', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, width: 1080, height: 1080 }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Render failed');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExport() {
    if (!topic) return;
    const content = topic.content[activeChannel];
    if (!content) return;

    const slug = topic.title.slice(0, 40).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const ts = Date.now();

    // PNG channels
    if (isPngChannel(activeChannel)) {
      setDownloadingPng(true);
      try {
        if (activeChannel === 'instagram_carousel' && isCarouselBody(content.body)) {
          const slides = parseCarouselSlides(content.body);
          addToast(`Rendering ${slides.length} slides...`);
          for (let i = 0; i < slides.length; i++) {
            await renderAndDownloadPng(slides[i], `${slug}-carousel-slide-${i + 1}.png`);
          }
          addToast(`${slides.length} PNG slides downloaded`);
        } else {
          addToast('Rendering PNG...');
          await renderAndDownloadPng(content.body, `${slug}-${activeChannel}-${ts}.png`);
          addToast('PNG downloaded');
        }
      } catch (err: unknown) {
        addToast(err instanceof Error ? err.message : 'PNG render failed', 'error');
      } finally {
        setDownloadingPng(false);
      }
      return;
    }

    // Written channels — download as .txt
    const channelSpec = CHANNELS.find((c) => c.id === activeChannel);
    const ext = channelSpec?.outputType === 'markdown' ? 'md' : 'txt';
    const blob = new Blob([content.body], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-${activeChannel}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Sidebar navigation ────────────────────────────────────────────────────
  function handleSidebarClick(item: SidebarItem) {
    if (item.type === 'single') {
      setActiveGroup(item.channel);
      setActiveChannel(item.channel);
    } else {
      // Group: activate the group and default to first sub-channel
      setActiveGroup(item.label);
      setActiveChannel(item.subChannels[0].id);
    }
  }

  function handleSubChannelClick(ch: ContentChannel) {
    setActiveChannel(ch);
  }

  function groupIsActive(item: SidebarItem): boolean {
    if (item.type === 'single') return activeGroup === item.channel;
    return activeGroup === item.label;
  }

  function groupHasContent(item: SidebarItem): boolean {
    if (item.type === 'single') return !!topic?.content[item.channel];
    return item.subChannels.some((s) => !!topic?.content[s.id]);
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const activeChannelSpec = CHANNELS.find((c) => c.id === activeChannel);
  const activeContent = topic?.content[activeChannel];
  const isHtml = isPngChannel(activeChannel);
  const isGenerating = generatingChannel === activeChannel;
  const isCarousel = activeChannel === 'instagram_carousel';

  const carouselSlides = isCarousel && activeContent?.body && isCarouselBody(activeContent.body)
    ? parseCarouselSlides(activeContent.body)
    : null;

  // Active Instagram group's sub-channels
  const activeGroupItem = CHANNEL_SIDEBAR_ITEMS.find((i) =>
    i.type === 'group' ? activeGroup === i.label : false
  );
  const subChannels = activeGroupItem?.type === 'group' ? activeGroupItem.subChannels : null;

  const charCount = activeContent?.body?.length ?? 0;
  const charLimit = activeChannelSpec?.characterLimit;

  const exportLabel = isPngChannel(activeChannel)
    ? isCarousel && carouselSlides ? `↓ Download ${carouselSlides.length} PNGs` : '↓ Download PNG'
    : activeChannelSpec?.outputType === 'markdown' ? '↓ Download .md' : '↓ Download .txt';

  if (loading) {
    return (
      <div className="editor-shell">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px', color: 'var(--neutral-500)' }}>
          <span className="spinner spinner-dark" />Loading topic...
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="editor-shell">
        <div className="empty-state" style={{ marginTop: '80px' }}>
          <div className="empty-state-icon">🔍</div>
          <p className="empty-state-title">Topic not found</p>
          <Link href="/topics" className="btn btn-secondary" style={{ marginTop: '8px' }}>← Back to Topics</Link>
        </div>
      </div>
    );
  }

  const generatedCount = Object.values(topic.content).filter(Boolean).length;

  return (
    <>
      <div className="editor-shell">
        {/* Top bar */}
        <div className="editor-topbar">
          <div className="editor-topbar-left">
            <Link href="/topics" className="editor-back">← Topics</Link>
            <div style={{ width: 1, height: 20, background: 'var(--neutral-400)' }} />
            <input
              className="editor-title-input"
              value={topic.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="Topic title..."
            />
          </div>
          <div className="editor-topbar-right">
            {savingMeta && (
              <span style={{ fontSize: '12px', color: 'var(--neutral-500)' }}>
                <span className="spinner spinner-dark" style={{ width: 12, height: 12, marginRight: 4 }} />Saving...
              </span>
            )}
            {generatedCount > 0 && (
              <span style={{ fontSize: 12, color: 'var(--neutral-500)' }}>
                {generatedCount} channel{generatedCount !== 1 ? 's' : ''} generated
              </span>
            )}
          </div>
        </div>

        <div className="editor-body">
          {/* Left: Metadata + sidebar nav */}
          <aside className="editor-meta">
            <div className="editor-meta-section">
              <label className="editor-meta-label">Audience</label>
              <select className="editor-select" value={topic.audience} onChange={(e) => handleFieldChange('audience', e.target.value)}>
                {AUDIENCE_OPTIONS.map((a) => (
                  <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="editor-meta-section">
              <label className="editor-meta-label">Status</label>
              <select className="editor-select" value={topic.status} onChange={(e) => handleFieldChange('status', e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ').charAt(0).toUpperCase() + s.replace('_', ' ').slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="editor-meta-section">
              <label className="editor-meta-label">Angle / Hook</label>
              <textarea
                className="editor-meta-textarea"
                value={topic.angle}
                onChange={(e) => handleFieldChange('angle', e.target.value)}
                placeholder="What makes this topic timely and relevant?"
                rows={4}
              />
            </div>

            {/* Channel nav */}
            <div className="editor-meta-section">
              <label className="editor-meta-label">Channels</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {CHANNEL_SIDEBAR_ITEMS.map((item) => {
                  const active = groupIsActive(item);
                  const hasContent = groupHasContent(item);
                  return (
                    <div key={item.type === 'single' ? item.channel : item.label}>
                      <button
                        className={`btn btn-sm ${active ? 'btn-secondary' : 'btn-outline'}`}
                        style={{ justifyContent: 'flex-start', gap: 8, width: '100%', position: 'relative', paddingRight: hasContent ? 32 : undefined }}
                        onClick={() => handleSidebarClick(item)}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                        {hasContent && (
                          <span style={{ position: 'absolute', right: 10, width: 7, height: 7, borderRadius: '50%', background: 'var(--gold-600)' }} />
                        )}
                      </button>
                      {/* Instagram sub-tabs */}
                      {active && subChannels && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 4, paddingLeft: 8, flexWrap: 'wrap' }}>
                          {subChannels.map((sub) => {
                            const subHasContent = !!topic.content[sub.id];
                            return (
                              <button
                                key={sub.id}
                                className={`btn btn-sm ${activeChannel === sub.id ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ fontSize: 11, padding: '2px 8px', position: 'relative' }}
                                onClick={() => handleSubChannelClick(sub.id)}
                              >
                                {sub.label}
                                {subHasContent && (
                                  <span style={{ marginLeft: 4, width: 5, height: 5, borderRadius: '50%', background: 'var(--gold-400)', display: 'inline-block', verticalAlign: 'middle' }} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Source references */}
            {sourceRefs.length > 0 && (
              <div className="editor-meta-section">
                <label className="editor-meta-label">Source Intelligence</label>
                <div className="topic-source-panel">
                  <p className="topic-source-panel-title">{sourceRefs.length} source{sourceRefs.length > 1 ? 's' : ''} used</p>
                  {sourceRefs.map(ref => (
                    <div key={ref.id} className="topic-source-item">
                      <span className={`source-badge source-badge-${ref.source}`} style={{ marginBottom: 4, display: 'inline-block' }}>{ref.source}</span>
                      <p style={{ fontWeight: 500, marginBottom: 2, fontSize: 12 }}>{ref.title}</p>
                      {ref.excerpt && (
                        <p style={{ color: 'var(--neutral-600)', fontSize: 11, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {ref.excerpt}
                        </p>
                      )}
                      <a href={ref.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--blue-600)', textDecoration: 'none', marginTop: 2, display: 'inline-block' }}>
                        View source ↗
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ paddingTop: '8px', borderTop: '1px solid var(--neutral-200)' }}>
              <p style={{ fontSize: '11px', color: 'var(--neutral-500)', lineHeight: 1.5 }}>
                Updated {new Date(topic.updatedAt).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </aside>

          {/* Right: Channel content */}
          <div className="editor-channels">
            {/* Content header */}
            {activeChannelSpec && (
              <div className="channel-content-header">
                <div className="channel-content-info">
                  <div className="channel-content-name">
                    {activeChannelSpec.icon} {activeChannelSpec.label}
                    {activeContent?.editedAt && (
                      <span style={{ fontSize: '11px', color: 'var(--neutral-500)', fontWeight: 400 }}> · edited</span>
                    )}
                  </div>
                  <div className="channel-content-desc">{activeChannelSpec.description}</div>
                </div>
                <div className="channel-content-actions">
                  {charLimit && activeContent && (
                    <span className={`char-count ${charCount > charLimit ? 'over' : ''}`}>
                      {charCount.toLocaleString()} / {charLimit.toLocaleString()}
                    </span>
                  )}
                  {activeContent && !isHtml && (
                    <button className="btn btn-outline btn-sm" onClick={() => navigator.clipboard.writeText(activeContent.body).then(() => addToast('Copied'))}>
                      Copy
                    </button>
                  )}
                  {activeContent && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={handleExport}
                      disabled={downloadingPng}
                    >
                      {downloadingPng ? <><span className="spinner" /> Rendering...</> : exportLabel}
                    </button>
                  )}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleGenerateContent(activeChannel)}
                    disabled={generatingChannel !== null}
                  >
                    {isGenerating ? <><span className="spinner" />Generating...</> : activeContent ? '↺ Regenerate' : '✦ Generate'}
                  </button>
                </div>
              </div>
            )}

            {/* Content body */}
            {isGenerating ? (
              <div className="generating-overlay">
                <span className="spinner spinner-dark" style={{ width: 28, height: 28 }} />
                <p>Claude is creating your {activeChannelSpec?.label}...</p>
                <p style={{ fontSize: '12px' }}>This usually takes 10-20 seconds.</p>
              </div>
            ) : !activeContent ? (
              <div className="generating-overlay">
                <div style={{ fontSize: '40px', opacity: 0.4 }}>{activeChannelSpec?.icon}</div>
                <p style={{ color: 'var(--neutral-600)', fontWeight: 500 }}>No {activeChannelSpec?.label} content yet</p>
                <p style={{ fontSize: '13px', color: 'var(--neutral-500)', maxWidth: '300px', textAlign: 'center', lineHeight: 1.6 }}>
                  {activeChannelSpec?.description}
                </p>
                <button className="btn btn-primary" onClick={() => handleGenerateContent(activeChannel)} disabled={generatingChannel !== null}>
                  ✦ Generate {activeChannelSpec?.label}
                </button>
              </div>
            ) : isHtml ? (
              <VisualEditor
                key={`${activeChannel}-${activeContent.generatedAt}`}
                channel={activeChannel}
                body={activeContent.body}
                visualJson={activeContent.visualJson}
                onUpdate={(html, json) => handleVisualUpdate(activeChannel, html, json)}
              />
            ) : (
              <div className="channel-textarea-wrapper">
                <textarea
                  className="channel-textarea"
                  value={activeContent.body}
                  onChange={(e) => handleTextEdit(activeChannel, e.target.value)}
                  spellCheck
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
        ))}
      </div>
    </>
  );
}

// ── Visual Editor ──────────────────────────────────────────────────────────

function VisualEditor({
  channel,
  body,
  visualJson,
  onUpdate,
}: {
  channel: ContentChannel;
  body: string;
  visualJson?: string;
  onUpdate: (html: string, json: string) => void;
}) {
  const isCarousel = channel === 'instagram_carousel';
  const srcW = 1080;
  const previewSize = 360;
  const scale = previewSize / srcW;

  // ── State ────────────────────────────────────────────────────────────────

  const initialContent = (() => {
    if (!visualJson) return null;
    try { return JSON.parse(visualJson) as ImageContent | CarouselSlideContent[]; } catch { return null; }
  })();

  const [content, setContent] = useState<ImageContent | CarouselSlideContent[] | null>(initialContent);
  // contentRef always holds the latest value — avoids stale-closure bugs when
  // multiple fields are edited before React flushes the setState batch.
  const contentRef = useRef(initialContent);

  const initialSlides = isCarousel && isCarouselBody(body) ? parseCarouselSlides(body) : null;
  const [localSlides, setLocalSlides] = useState<string[] | null>(initialSlides);
  const [localHtml, setLocalHtml] = useState(body);
  const [slideIndex, setSlideIndex] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [htmlOpen, setHtmlOpen] = useState(false);
  const renderTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const previewHtml = isCarousel ? (localSlides?.[slideIndex] ?? '') : localHtml;
  // The raw HTML being shown in the accordion (current slide for carousel)
  const rawHtmlForAccordion = isCarousel
    ? (localSlides?.[slideIndex] ?? '')
    : localHtml;

  // ── Re-render pipeline ───────────────────────────────────────────────────

  async function rerender(updated: ImageContent | CarouselSlideContent[]) {
    setRendering(true);
    try {
      const res = await fetch('/api/render-visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, json: updated }),
      });
      const data = await res.json();
      if (!res.ok) return;
      const newJson = JSON.stringify(updated);
      if (isCarousel) {
        const slides = parseCarouselSlides(data.html);
        setLocalSlides(slides);
      } else {
        setLocalHtml(data.html);
      }
      onUpdate(data.html, newJson);
    } finally {
      setRendering(false);
    }
  }

  // Write to ref immediately (sync) so subsequent rapid edits see fresh data,
  // update state for controlled inputs, then debounce the API re-render.
  function applyUpdate(updated: ImageContent | CarouselSlideContent[]) {
    contentRef.current = updated;
    setContent(updated);
    if (renderTimeout.current) clearTimeout(renderTimeout.current);
    renderTimeout.current = setTimeout(() => {
      if (contentRef.current) rerender(contentRef.current);
    }, 600);
  }

  // ── Image field helpers (always read from ref, never from stale closure) ─

  function imgField<K extends keyof ImageContent>(field: K, value: ImageContent[K]) {
    const c = (contentRef.current as ImageContent) ?? ({} as ImageContent);
    applyUpdate({ ...c, [field]: value });
  }

  function statField(i: number, key: 'value' | 'label' | 'note', val: string) {
    const c = contentRef.current as ImageContent;
    const stats = [...(c.stats ?? [])];
    stats[i] = { ...stats[i], [key]: val };
    applyUpdate({ ...c, stats });
  }

  function addStat() {
    const c = contentRef.current as ImageContent;
    applyUpdate({ ...c, stats: [...(c.stats ?? []), { value: '', label: '' }] });
  }

  function removeStat(i: number) {
    const c = contentRef.current as ImageContent;
    applyUpdate({ ...c, stats: (c.stats ?? []).filter((_, idx) => idx !== i) });
  }

  function pointField(i: number, val: string) {
    const c = contentRef.current as ImageContent;
    const points = [...(c.points ?? [])];
    points[i] = val;
    applyUpdate({ ...c, points });
  }

  function addPoint() {
    const c = contentRef.current as ImageContent;
    applyUpdate({ ...c, points: [...(c.points ?? []), ''] });
  }

  function removePoint(i: number) {
    const c = contentRef.current as ImageContent;
    applyUpdate({ ...c, points: (c.points ?? []).filter((_, idx) => idx !== i) });
  }

  // ── Carousel field helpers ───────────────────────────────────────────────

  function slideField<K extends keyof CarouselSlideContent>(idx: number, key: K, val: CarouselSlideContent[K]) {
    const slides = [...(contentRef.current as CarouselSlideContent[])];
    slides[idx] = { ...slides[idx], [key]: val };
    applyUpdate(slides);
  }

  // ── HTML accordion: direct HTML editing bypasses the JSON/template system ─

  function handleRawHtmlChange(html: string) {
    if (isCarousel) {
      const updated = [...(localSlides ?? [])];
      updated[slideIndex] = html;
      setLocalSlides(updated);
      const packed = JSON.stringify(updated);
      onUpdate(packed, visualJson ?? '');
    } else {
      setLocalHtml(html);
      onUpdate(html, visualJson ?? '');
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const imgContent = !isCarousel ? (content as ImageContent | null) : null;
  const carouselContent = isCarousel ? (content as CarouselSlideContent[] | null) : null;
  const layout = imgContent?.layout;

  return (
    <div className="html-preview-wrapper">
      {/* ── Left: preview ── */}
      <div style={{ flexShrink: 0 }}>
        {isCarousel && localSlides && localSlides.length > 1 && (
          <div className="carousel-slide-tabs">
            {localSlides.map((_, i) => (
              <button
                key={i}
                className={`carousel-slide-tab${slideIndex === i ? ' active' : ''}`}
                onClick={() => setSlideIndex(i)}
              >
                {String(i + 1).padStart(2, '0')}
              </button>
            ))}
          </div>
        )}
        <div className="html-preview-frame" style={{ width: previewSize, height: previewSize, overflow: 'hidden', position: 'relative' }}>
          <div style={{ width: srcW, height: srcW, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
            <iframe
              srcDoc={previewHtml}
              style={{ width: srcW, height: srcW, border: 'none', display: 'block' }}
              sandbox="allow-scripts"
              title="Preview"
            />
          </div>
          {rendering && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.55)' }}>
              <span className="spinner spinner-dark" />
            </div>
          )}
        </div>
        <p style={{ fontSize: 11, color: 'var(--neutral-500)', marginTop: 8, textAlign: 'center' }}>
          {isCarousel
            ? `Slide ${slideIndex + 1} / ${localSlides?.length ?? '?'} · each exports as PNG`
            : '1080×1080 · exports as PNG'}
        </p>
      </div>

      {/* ── Right: fields + HTML accordion ── */}
      <div className="visual-fields-panel">

        {/* Structured fields — only when visualJson was saved */}
        {!content && (
          <div className="vf-no-json">
            <span style={{ fontSize: 28, opacity: 0.4 }}>✦</span>
            <p style={{ fontWeight: 500 }}>No structured fields yet</p>
            <p style={{ fontSize: 12, color: 'var(--neutral-500)' }}>Regenerate to enable field editing</p>
          </div>
        )}

        {content && isCarousel && carouselContent && (
          <CarouselSlideFields
            slides={carouselContent}
            slideIndex={slideIndex}
            rendering={rendering}
            onField={slideField}
          />
        )}

        {content && !isCarousel && imgContent && (
          <>
            <div className="visual-fields-header">
              <span className="visual-layout-badge">{layout}</span>
              {rendering && (
                <span className="visual-rendering-indicator">
                  <span className="spinner spinner-dark" style={{ width: 12, height: 12 }} />
                  Updating...
                </span>
              )}
            </div>

            <div className="vf-group">
              <label className="vf-label">Layout</label>
              <select className="vf-input" value={layout ?? ''} onChange={(e) => imgField('layout', e.target.value as ImageContent['layout'])}>
                <option value="gradient_news">Gradient News</option>
                <option value="stat_cards">Stat Cards</option>
                <option value="editorial_warm">Editorial Warm</option>
                <option value="textured_dark">Textured Dark</option>
                <option value="checklist">Checklist</option>
              </select>
            </div>

            {layout === 'editorial_warm' && (
              <div className="vf-group">
                <label className="vf-label">Source Label</label>
                <input className="vf-input" value={imgContent.sourceLabel ?? ''} onChange={(e) => imgField('sourceLabel', e.target.value)} placeholder="e.g. IRCC UPDATE" />
              </div>
            )}

            <div className="vf-group">
              <label className="vf-label">Tag</label>
              <input className="vf-input" value={imgContent.tag ?? ''} onChange={(e) => imgField('tag', e.target.value)} placeholder="e.g. Express Entry · Update" />
            </div>

            <div className="vf-group">
              <label className="vf-label">Headline</label>
              <textarea className="vf-input" rows={2} value={imgContent.headline ?? ''} onChange={(e) => imgField('headline', e.target.value)} placeholder="Main headline..." />
            </div>

            {layout === 'gradient_news' && (
              <div className="vf-group">
                <label className="vf-label">Subhead</label>
                <input className="vf-input" value={imgContent.subhead ?? ''} onChange={(e) => imgField('subhead', e.target.value)} placeholder="Follow-up line..." />
              </div>
            )}

            {layout !== 'checklist' && (
              <div className="vf-group">
                <label className="vf-label">Body</label>
                <textarea className="vf-input" rows={3} value={imgContent.body ?? ''} onChange={(e) => imgField('body', e.target.value)} placeholder="Supporting copy..." />
              </div>
            )}

            {(layout === 'stat_cards' || layout === 'textured_dark') && (
              <div className="vf-group">
                <label className="vf-label">Stats {layout === 'textured_dark' ? '(hero number)' : '(2–3 cards)'}</label>
                <div className="vf-stat-labels">
                  <span>Value</span><span>Label</span><span>Note (opt.)</span>
                </div>
                {(imgContent.stats ?? []).map((stat, i) => (
                  <div key={i} className="vf-stat-row">
                    <input className="vf-input" value={stat.value} onChange={(e) => statField(i, 'value', e.target.value)} placeholder="↑ 23%" />
                    <input className="vf-input" value={stat.label} onChange={(e) => statField(i, 'label', e.target.value)} placeholder="Approval rate" />
                    <input className="vf-input" value={stat.note ?? ''} onChange={(e) => statField(i, 'note', e.target.value)} placeholder="Q3 2025" />
                    {(imgContent.stats?.length ?? 0) > 1 && (
                      <button className="vf-remove-btn" onClick={() => removeStat(i)}>×</button>
                    )}
                  </div>
                ))}
                {layout === 'stat_cards' && (imgContent.stats?.length ?? 0) < 3 && (
                  <button className="vf-add-btn" onClick={addStat}>+ Add stat</button>
                )}
              </div>
            )}

            {layout === 'checklist' && (
              <div className="vf-group">
                <label className="vf-label">Checklist Points</label>
                <div className="vf-points-list">
                  {(imgContent.points ?? []).map((pt, i) => (
                    <div key={i} className="vf-point-row">
                      <input className="vf-input" value={pt} onChange={(e) => pointField(i, e.target.value)} placeholder={`Point ${i + 1}...`} />
                      <button className="vf-remove-btn" onClick={() => removePoint(i)}>×</button>
                    </div>
                  ))}
                  {(imgContent.points?.length ?? 0) < 4 && (
                    <button className="vf-add-btn" onClick={addPoint}>+ Add point</button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* HTML accordion — always available whenever there's HTML to show */}
        <HtmlAccordion
          html={rawHtmlForAccordion}
          open={htmlOpen}
          onToggle={() => setHtmlOpen(v => !v)}
          onChange={handleRawHtmlChange}
        />

      </div>
    </div>
  );
}

// ── HTML Accordion ─────────────────────────────────────────────────────────

function HtmlAccordion({
  html, open, onToggle, onChange,
}: {
  html: string;
  open: boolean;
  onToggle: () => void;
  onChange: (html: string) => void;
}) {
  return (
    <div style={{ marginTop: 'auto', paddingTop: 16 }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          background: 'none', border: 'none', borderTop: '1px solid var(--neutral-200)',
          paddingTop: 10, paddingBottom: open ? 8 : 0,
          cursor: 'pointer', color: 'var(--neutral-500)', fontSize: 11,
          fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>▶</span>
        Raw HTML
        <span style={{ marginLeft: 'auto', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>fine-tune &amp; tweak</span>
      </button>
      {open && (
        <textarea
          className="html-source-textarea"
          value={html}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          style={{ width: '100%', height: 220, marginTop: 4, resize: 'vertical' }}
        />
      )}
    </div>
  );
}

// ── Carousel Slide Fields ─────────────────────────────────────────────────

function CarouselSlideFields({
  slides,
  slideIndex,
  rendering,
  onField,
}: {
  slides: CarouselSlideContent[];
  slideIndex: number;
  rendering: boolean;
  onField: <K extends keyof CarouselSlideContent>(i: number, key: K, val: CarouselSlideContent[K]) => void;
}) {
  const slide = slides[slideIndex];
  if (!slide) return null;

  const typeLabel = slide.type === 'cover' ? 'Cover Slide'
    : slide.type === 'cta' ? 'CTA Slide'
    : `Content Slide ${slideIndex}`;

  return (
    <>
      <div className="visual-fields-header">
        <span className="visual-layout-badge">{typeLabel}</span>
        {rendering && (
          <span className="visual-rendering-indicator">
            <span className="spinner spinner-dark" style={{ width: 12, height: 12 }} />
            Updating...
          </span>
        )}
      </div>

      {slide.type === 'cover' && (
        <div className="vf-group">
          <label className="vf-label">Tag</label>
          <input className="vf-input" value={slide.tag ?? ''} onChange={(e) => onField(slideIndex, 'tag', e.target.value)} placeholder="e.g. Express Entry · 2025" />
        </div>
      )}

      <div className="vf-group">
        <label className="vf-label">Headline</label>
        <textarea className="vf-input" rows={2} value={slide.headline ?? ''} onChange={(e) => onField(slideIndex, 'headline', e.target.value)} placeholder="Slide headline..." />
      </div>

      {slide.type === 'content' && (
        <div className="vf-group">
          <label className="vf-label">Body</label>
          <textarea className="vf-input" rows={4} value={slide.body ?? ''} onChange={(e) => onField(slideIndex, 'body', e.target.value)} placeholder="Slide body copy..." />
        </div>
      )}

      {slide.type === 'cta' && (
        <div className="vf-group">
          <label className="vf-label">CTA Line</label>
          <input className="vf-input" value={slide.ctaLine ?? ''} onChange={(e) => onField(slideIndex, 'ctaLine', e.target.value)} placeholder="e.g. Follow @borderpass.ca" />
        </div>
      )}
    </>
  );
}
