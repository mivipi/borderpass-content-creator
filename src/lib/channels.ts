import { ContentChannel } from './types';

export interface ChannelSpec {
  id: ContentChannel;
  label: string;
  icon: string;
  color: string;
  description: string;
  characterLimit?: number;
  outputType: 'text' | 'html' | 'markdown';
  aspectRatio?: '1:1' | '9:16';
  prompt: (topic: string, angle: string, audience: string, context: string) => string;
}

// ── Sidebar structure ──────────────────────────────────────────────────────
// Instagram and YouTube are grouped with sub-channel selectors.
export type SidebarItem =
  | { type: 'single'; channel: ContentChannel; label: string; icon: string }
  | { type: 'group'; label: string; icon: string; subChannels: { id: ContentChannel; label: string }[] };

export const CHANNEL_SIDEBAR_ITEMS: SidebarItem[] = [
  { type: 'single', channel: 'linkedin',      label: 'LinkedIn',      icon: '💼' },
  { type: 'single', channel: 'blog',          label: 'Blog Post',     icon: '📝' },
  { type: 'single', channel: 'email',         label: 'Email',         icon: '📧' },
  {
    type: 'group', label: 'Instagram', icon: '📸',
    subChannels: [
      { id: 'instagram',          label: 'Caption' },
      { id: 'instagram_image',    label: 'Image' },
      { id: 'instagram_carousel', label: 'Carousel' },
      { id: 'instagram_reel',     label: 'Reel' },
    ],
  },
  { type: 'single', channel: 'tiktok',        label: 'TikTok',        icon: '🎵' },
  { type: 'single', channel: 'youtube',       label: 'YouTube',       icon: '▶️' },
  { type: 'single', channel: 'youtube_short', label: 'YouTube Short', icon: '⚡' },
  { type: 'single', channel: 'static_image',  label: 'Static Image',  icon: '🖼️' },
];

// ── Logo injection note ────────────────────────────────────────────────────
// The actual SVG is injected server-side after generation.
// The prompt just tells Claude to write the placeholder comment.
const LOGO_BLOCK = (_logoNote?: string) =>
  `LOGO: Write exactly <!-- BP_LOGO_LIGHT --> on its own line at the bottom of the card body (inside the 1080×1080 container). The real SVG logo will be injected automatically. Do NOT draw, approximate, or use text/emoji as a logo.`;

// ── Visual base styles ─────────────────────────────────────────────────────
const VISUAL_BASE_STYLES = `
MANDATORY FONT IMPORT — include exactly this at the top of <style>:
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400&family=Outfit:wght@300;400;500;600;700&display=swap');

MANDATORY CSS VARIABLES — include in :root {}:
--font-display: 'Crimson Pro', Georgia, serif;
--font-body: 'Outfit', system-ui, sans-serif;
--blue-900: #10273D; --blue-800: #1B3E5F; --blue-600: #466381; --blue-400: #7A99B8; --blue-100: #E0E8F0;
--gold-900: #5A4424; --gold-800: #826741; --gold-600: #B68D54; --gold-400: #CCB38E; --gold-100: #F4EDE2;
--white: #FEFBF6; --black: #151414; --neutral-700: #504D49; --neutral-200: #F0EEEA;

FONT SIZE RULES — non-negotiable:
- Primary headline: 96px minimum (font-family: var(--font-display))
- Secondary headline / stat: 64px minimum
- Body/supporting text: 36px minimum
- Caption / small label: 28px minimum

SHAPE RULES:
- Cards/panels: border-radius 28px
- Tags/badges: border-radius 999px
- No sharp corners anywhere
`.trim();

// ── Channel specs ──────────────────────────────────────────────────────────
export const CHANNELS: ChannelSpec[] = [
  // Written channels
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: '💼',
    color: '#0077B5',
    description: 'Professional post · ~1,200 chars',
    characterLimit: 1300,
    outputType: 'text',
    prompt: (topic, angle, audience, context) => `Write a LinkedIn post for BorderPass about: "${topic}"
Angle: ${angle}
Primary audience: ${audience}
Source context: ${context}

Requirements:
- 900-1,200 characters
- Lead with a specific insight, stat, or fact (not a generic opener)
- 2-3 short paragraphs
- End with a question or clear CTA
- 3-5 relevant hashtags on the last line
- Professional, insight-driven tone
- No em-dashes`,
  },
  {
    id: 'blog',
    label: 'Blog Post',
    icon: '📝',
    color: '#466381',
    description: 'Long-form article · 800-1,200 words',
    outputType: 'markdown',
    prompt: (topic, angle, audience, context) => `Write a blog post for the BorderPass website about: "${topic}"
Angle: ${angle}
Primary audience: ${audience}
Source context: ${context}

Requirements:
- 800-1,200 words
- H1 title, 3-4 H2 subheadings
- Strong intro: state the problem and what the reader will learn
- Body: specific facts, policy details, actionable guidance
- Clear conclusion with next steps
- Optimize for Canadian immigration search terms
- No em-dashes
- Output in Markdown`,
  },
  {
    id: 'email',
    label: 'Email Newsletter',
    icon: '📧',
    color: '#826741',
    description: 'Newsletter email · 300-500 words',
    outputType: 'text',
    prompt: (topic, angle, audience, context) => `Write a newsletter email for BorderPass subscribers about: "${topic}"
Angle: ${angle}
Primary audience: ${audience}
Source context: ${context}

Format exactly like this:
SUBJECT: [subject line here]
PREVIEW: [preview text, 90 chars max]

[Email body: warm greeting, 2-3 paragraphs of value, one clear CTA button text in brackets like [Read More], sign-off]

Requirements:
- 300-500 words for body
- Conversational but precise
- No em-dashes`,
  },
  {
    id: 'instagram',
    label: 'Instagram Caption',
    icon: '📸',
    color: '#E1306C',
    description: 'Caption · visual-first',
    characterLimit: 2200,
    outputType: 'text',
    prompt: (topic, angle, audience, context) => `Write an Instagram caption for BorderPass about: "${topic}"
Angle: ${angle}
Primary audience: ${audience}
Source context: ${context}

Requirements:
- First line: hook (bold stat, surprising fact, or direct question — not "Are you..." openers)
- 3-4 short paragraphs (2-3 sentences each)
- Line breaks between paragraphs
- CTA near the end (e.g. "Link in bio to check your eligibility.")
- End with exactly 4 hashtags on a separate line. Choose hashtags that would perform best specifically for THIS topic: 1-2 broad Canadian immigration hashtags (e.g. #CanadaImmigration, #ExpressEntry, #MoveToCanada, #RCIC, #ImmigrationCanada, #CanadaPR) AND 1-2 topic-specific hashtags tied to the exact program, policy, or theme in this post
- Warm, human tone
- Under 300 words for the caption body
- No em-dashes`,
  },
  {
    id: 'instagram_reel',
    label: 'Instagram Reel',
    icon: '🎬',
    color: '#833AB4',
    description: 'Vertical video script · 15-60 sec',
    outputType: 'text',
    prompt: (topic, angle, audience, context) => `Write an Instagram Reel script for BorderPass about: "${topic}"
Angle: ${angle}
Primary audience: ${audience}
Source context: ${context}

Format:
[HOOK] (0-3 sec — first words must grab the scroll. Specific, provocative, or surprising)
[BODY] (punchy facts or steps, 3-5 beats, fast pace)
[CTA] (follow, link in bio, save this)

Requirements:
- 15-60 seconds when read aloud (roughly 40-150 words)
- Vertical format (9:16) — keep visuals simple, text-on-screen heavy
- Include [ON-SCREEN TEXT: ...] cues for key lines
- Include [VISUAL: ...] cues for b-roll or graphics suggestions
- Energetic, direct, human — not corporate
- No em-dashes`,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: '🎵',
    color: '#010101',
    description: 'Video script · 60-90 seconds',
    outputType: 'text',
    prompt: (topic, angle, audience, context) => `Write a TikTok video script for BorderPass about: "${topic}"
Angle: ${angle}
Primary audience: ${audience}
Source context: ${context}

Format:
[HOOK] (3-5 seconds — grab attention immediately, specific fact or provocative statement)
[BODY] (main content, fast-paced, 3-5 key points)
[CTA] (follow for more immigration tips, link in bio)

Requirements:
- 60-90 seconds when read aloud (roughly 150-225 words)
- Conversational, energetic, direct
- Include [ON-SCREEN TEXT: ...] notes where key text should appear
- Include [VISUAL: ...] notes for suggested b-roll or graphics
- Target: international students aged 18-30
- No em-dashes`,
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: '▶️',
    color: '#FF0000',
    description: 'Video script + SEO description · 5-10 min',
    outputType: 'markdown',
    prompt: (topic, angle, audience, context) => `Write a YouTube video script and description for BorderPass about: "${topic}"
Angle: ${angle}
Primary audience: ${audience}
Source context: ${context}

Format:
## VIDEO SCRIPT

[INTRO] (30-45 sec: hook + what viewer will learn + why it matters now)

[SECTION 1: Title Here]
[Content...]

[SECTION 2: Title Here]
[Content...]

[SECTION 3: Title Here]
[Content...]

[OUTRO] (subscribe CTA, link in description, next video teaser)

---
## VIDEO DESCRIPTION (for YouTube)
[150-200 words, SEO-optimized]

TIMESTAMPS:
0:00 - Intro
[add timestamps]

TAGS: [10 YouTube tags separated by commas]

Requirements:
- Script: 750-1,500 words (5-10 min at 150 wpm)
- Educational, authoritative, approachable
- No em-dashes
- Output in Markdown`,
  },
  {
    id: 'youtube_short',
    label: 'YouTube Short',
    icon: '⚡',
    color: '#FF0000',
    description: 'Vertical short · 60 sec max',
    outputType: 'text',
    prompt: (topic, angle, audience, context) => `Write a YouTube Short script for BorderPass about: "${topic}"
Angle: ${angle}
Primary audience: ${audience}
Source context: ${context}

Format:
[HOOK] (0-3 sec — must work as the thumbnail title too)
[BODY] (fast, punchy, 3-4 key facts or steps)
[LOOP/CTA] (end with something that makes people replay or subscribe)

Requirements:
- Maximum 60 seconds when read aloud (roughly 150 words)
- Vertical 9:16 format — text on screen is critical
- Include [ON-SCREEN TEXT: ...] for every key stat or step
- Include [VISUAL: ...] for b-roll suggestions
- Also write a TITLE (max 100 chars) and DESCRIPTION (max 200 chars) for the Short
- No em-dashes`,
  },

  // Visual channels — Claude returns JSON content, server renders into rigid templates
  {
    id: 'static_image',
    label: 'Static Image',
    icon: '🖼️',
    color: '#1B3E5F',
    description: 'Branded 1080×1080 card · exports as PNG',
    outputType: 'html',
    aspectRatio: '1:1',
    prompt: (topic, angle, audience, context) => `You are writing content for a branded BorderPass social image card about: "${topic}"
Angle: ${angle}
Audience: ${audience}
Context: ${context}

Choose the best layout and write punchy, impactful copy. Return ONLY valid JSON — no explanation, no markdown fences.

JSON schema:
{
  "layout": "gradient_news" | "stat_cards" | "editorial_warm" | "textured_dark" | "checklist",
  "tag": "short label e.g. 'Express Entry · Update' (max 5 words)",
  "sourceLabel": "publication-style uppercase label e.g. 'IRCC UPDATE' (only for editorial_warm)",
  "headline": "4-8 word punchy headline — specific, direct, no filler",
  "subhead": "one short follow-up line (optional, gradient_news only)",
  "body": "1-2 sentence supporting insight (optional)",
  "stats": [
    { "value": "↑ 23%", "label": "approval rate", "note": "Q3 2025 vs Q3 2024" }
  ],
  "points": ["point 1", "point 2", "point 3"]
}

Layout guide:
- gradient_news: dark blue gradient, large headline, optional body — best for policy news
- stat_cards: dark gradient + frosted glass stat row at bottom — best when you have 2-3 key numbers
- editorial_warm: warm cream/gold, publication feel — best for evergreen or advisory content
- textured_dark: dark textured bg, huge accent stat — best for a single shocking number
- checklist: dark gradient + frosted glass bullet list — best for "X things to know" topics

Rules:
- stats[] is used by stat_cards (2-3 items) and textured_dark (1 item as hero number)
- points[] is only for checklist (3-4 items, keep each under 10 words)
- subhead is only for gradient_news
- sourceLabel is only for editorial_warm
- Write copy that is direct, specific, and attention-grabbing. No filler.`,
  },
  {
    id: 'instagram_image',
    label: 'Instagram Image',
    icon: '📸',
    color: '#E1306C',
    description: 'Branded 1080×1080 · exports as PNG',
    outputType: 'html',
    aspectRatio: '1:1',
    prompt: (topic, angle, audience, context) => `You are writing content for a branded BorderPass Instagram image post about: "${topic}"
Angle: ${angle}
Audience: ${audience}
Context: ${context}

Choose the most thumb-stopping layout and write sharp, punchy copy. Return ONLY valid JSON — no explanation, no markdown fences.

JSON schema:
{
  "layout": "gradient_news" | "stat_cards" | "editorial_warm" | "textured_dark" | "checklist",
  "tag": "short label e.g. 'Immigration Alert' (max 4 words)",
  "sourceLabel": "publication-style uppercase label e.g. 'IRCC NOTICE' (only for editorial_warm)",
  "headline": "4-7 word hook — surprising, specific, direct",
  "subhead": "one punchy follow-up line (optional, gradient_news only)",
  "body": "1-2 sentence hook that makes them want to read the caption (optional)",
  "stats": [
    { "value": "472", "label": "CRS cut-off", "note": "dropped 15 points" }
  ],
  "points": ["point 1", "point 2", "point 3"]
}

Layout guide:
- stat_cards: use when there are 2-3 compelling numbers (fees, scores, quotas, timelines)
- textured_dark: use when there is ONE shocking number to hero — put it in stats[0]
- checklist: use for "X things to know" topics (3-4 points, each under 10 words)
- gradient_news: strong news headline, optional body — no stat needed
- editorial_warm: softer, tips-based or evergreen content

Rules:
- stats[] is used by stat_cards (2-3 items) and textured_dark (1 hero item)
- points[] is only for checklist (3-4 items)
- subhead is only for gradient_news; sourceLabel only for editorial_warm
- Be specific. Avoid corporate language. Write like a knowledgeable friend.`,
  },
  {
    id: 'instagram_carousel',
    label: 'IG Carousel',
    icon: '🎠',
    color: '#E1306C',
    description: '5-7 slides · each exports as a separate PNG',
    outputType: 'html',
    aspectRatio: '1:1',
    prompt: (topic, angle, audience, context) => `You are writing content for a branded BorderPass Instagram carousel about: "${topic}"
Angle: ${angle}
Audience: ${audience}
Context: ${context}

Write a 5-slide carousel. Return ONLY a valid JSON array — no explanation, no markdown fences.

JSON schema (array of slide objects):
[
  {
    "type": "cover",
    "tag": "short topic label e.g. 'Express Entry · 2025'",
    "headline": "Hook headline — why should they swipe? (5-8 words, surprising or direct)"
  },
  {
    "type": "content",
    "headline": "Key point headline (4-6 words)",
    "body": "2-3 sentences. ONE specific point. Be concrete and useful — no fluff."
  },
  {
    "type": "content",
    "headline": "...",
    "body": "..."
  },
  {
    "type": "content",
    "headline": "...",
    "body": "..."
  },
  {
    "type": "cta",
    "headline": "Save this — you'll need it",
    "ctaLine": "Follow @borderpass.ca for weekly immigration updates"
  }
]

Rules:
- Cover: make someone stop scrolling. Use a specific number, deadline, or surprising fact in the headline.
- Content slides: ONE point each. Facts, timelines, dollar amounts — be specific. No corporate language.
- CTA slide: ask them to save, follow, or visit the link in bio.
- 5 slides total: 1 cover + 3 content + 1 CTA. No more, no less.
- Write for Canadian immigrants — friendly, knowledgeable friend tone, not a government brochure.`,
  },
];

export function getChannel(id: ContentChannel): ChannelSpec | undefined {
  return CHANNELS.find((c) => c.id === id);
}

export function channelLabel(id: ContentChannel): string {
  return getChannel(id)?.label ?? id;
}

export const VISUAL_CHANNELS: ContentChannel[] = [
  'static_image',
  'instagram_image',
  'instagram_carousel',
];

export function isVisualChannel(id: ContentChannel): boolean {
  return VISUAL_CHANNELS.includes(id);
}

export function isPngChannel(id: ContentChannel): boolean {
  return VISUAL_CHANNELS.includes(id);
}
