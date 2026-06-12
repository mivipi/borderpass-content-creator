import https from 'https';
import http from 'http';
import { createHash } from 'crypto';
import { ScrapedItem, SourceType } from './types';

function makeId(source: SourceType, url: string): string {
  // Use a proper hash to avoid collisions between URLs sharing a common prefix
  return `${source}-${createHash('sha1').update(url).digest('base64').slice(0, 16)}`;
}

function createItem(
  source: SourceType,
  sourceName: string,
  title: string,
  url: string,
  excerpt: string
): ScrapedItem {
  return {
    id: makeId(source, url),
    source,
    sourceName,
    title: title.replace(/\s+/g, ' ').trim(),
    url,
    excerpt: excerpt.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 500),
    scrapedAt: new Date().toISOString(),
  };
}

// Use native http/https to avoid undici timeout issues with certain government sites
function nativeFetch(url: string, ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'): Promise<string | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 15000);
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': ua, Accept: 'text/html,application/json,*/*' } }, (res) => {
      // Follow redirects (up to 3)
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        clearTimeout(timeout);
        nativeFetch(res.headers.location, ua).then(resolve);
        return;
      }
      if (!res.statusCode || res.statusCode >= 400) { clearTimeout(timeout); resolve(null); return; }
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => { clearTimeout(timeout); resolve(Buffer.concat(chunks).toString('utf-8')); });
      res.on('error', () => { clearTimeout(timeout); resolve(null); });
    });
    req.on('error', () => { clearTimeout(timeout); resolve(null); });
  });
}

async function safeFetch(url: string, ua?: string): Promise<string | null> {
  return nativeFetch(url, ua);
}

// fetch() (undici/HTTP2) works better for Reddit; nativeFetch for canada.ca
async function safeJsonFetch(url: string): Promise<unknown> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BorderPass-ContentBot/1.0 (+https://borderpass.ca)', Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── IRCC Notices ───────────────────────────────────────────────────────────
async function scrapeIRCCNotices(): Promise<ScrapedItem[]> {
  const html = await safeFetch(
    'https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html'
  );
  if (!html) return [];

  const items: ScrapedItem[] = [];
  // Match links to actual notice pages (contain year like 2024/2025/2026)
  const linkPattern = /href="(\/en\/immigration[^"]+(?:202[3-9]|notice)[^"]*\.html)"[^>]*>\s*([^<]{10,180})/gi;
  let m: RegExpExecArray | null;

  while ((m = linkPattern.exec(html)) !== null && items.length < 8) {
    const url = `https://www.canada.ca${m[1]}`;
    const title = m[2].replace(/<[^>]+>/g, '').trim();
    if (title.length > 10 && !title.toLowerCase().includes('breadcrumb')) {
      items.push(createItem('ircc', 'IRCC Notices', title, url, ''));
    }
  }

  return items;
}

// ── IRCC News Releases ─────────────────────────────────────────────────────
async function scrapeIRCCNewsReleases(): Promise<ScrapedItem[]> {
  const html = await safeFetch(
    'https://www.canada.ca/en/immigration-refugees-citizenship/news/releases.html'
  );
  if (!html) return [];

  const items: ScrapedItem[] = [];
  const linkPattern = /href="(\/en\/immigration[^"]+\.html)"[^>]*>\s*([^<]{15,200})/gi;
  let m: RegExpExecArray | null;

  while ((m = linkPattern.exec(html)) !== null && items.length < 8) {
    const url = `https://www.canada.ca${m[1]}`;
    const title = m[2].replace(/<[^>]+>/g, '').trim();
    if (
      title.length > 15 &&
      !url.includes('/news/releases.html') &&
      !url.includes('/news/notices.html')
    ) {
      items.push(createItem('ircc', 'IRCC News Release', title, url, ''));
    }
  }

  return items;
}

// ── CIC News ───────────────────────────────────────────────────────────────
async function scrapeCICNews(): Promise<ScrapedItem[]> {
  const html = await safeFetch('https://www.cicnews.com/');
  if (!html) return [];

  const items: ScrapedItem[] = [];
  const seen = new Set<string>();
  // Match article URLs + their immediate link text (ending at next tag or quote)
  const pattern = /href="(https:\/\/www\.cicnews\.com\/\d{4}\/\d{2}\/[^"]+)"[^>]*>\s*([^<"]{8,150})/gi;
  let m: RegExpExecArray | null;

  while ((m = pattern.exec(html)) !== null && items.length < 8) {
    const url = m[1].trim();
    const title = m[2].trim();
    if (seen.has(url)) continue;
    if (title.length < 10 || title.startsWith('http')) continue;
    seen.add(url);
    items.push(createItem('news', 'CIC News', title, url, ''));
  }

  return items;
}

// ── Reddit ─────────────────────────────────────────────────────────────────
async function scrapeReddit(subreddit: string): Promise<ScrapedItem[]> {
  const json = await safeJsonFetch(
    `https://www.reddit.com/r/${subreddit}/hot.json?limit=25`
  );

  if (!json || typeof json !== 'object') return [];
  const data = (json as Record<string, unknown>).data as Record<string, unknown> | undefined;
  const children = (data?.children as Array<{ data: Record<string, unknown> }>) ?? [];

  return children
    .filter((p) => !p.data.stickied)
    .slice(0, 8)
    .map((p) =>
      createItem(
        'reddit',
        `r/${subreddit}`,
        String(p.data.title ?? ''),
        `https://reddit.com${p.data.permalink}`,
        String(p.data.selftext ?? '').slice(0, 400)
      )
    )
    .filter((i) => i.title.length > 5);
}

// ── Linear Briefcase (user FAQ themes) ────────────────────────────────────
// Fetches [KD Request] and support-labelled Briefcase tickets, then uses Claude
// to cluster them into recurring user question themes. Each theme becomes a
// ScrapedItem so content can be created to address real user pain points.
const LINEAR_BRIEFCASE_PROJECT_ID = 'cc64f2e9-4b59-4a0b-8ef8-0a31bfa92a9b';

interface LinearIssue {
  identifier: string;
  title: string;
  description?: string;
  url: string;
}

async function fetchLinearBriefcaseTickets(): Promise<LinearIssue[]> {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) return [];

  const query = `
    query BriefcaseFAQs($projectId: String!) {
      issues(
        filter: {
          project: { id: { eq: $projectId } }
          or: [
            { title: { containsIgnoreCase: "kd request" } }
            { labels: { name: { in: ["support", "FAQ"] } } }
          ]
        }
        orderBy: updatedAt
        first: 50
      ) {
        nodes {
          identifier
          title
          description
          url
        }
      }
    }
  `;

  try {
    const res = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: apiKey },
      body: JSON.stringify({ query, variables: { projectId: LINEAR_BRIEFCASE_PROJECT_ID } }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: { issues?: { nodes?: LinearIssue[] } };
    };
    return json.data?.issues?.nodes ?? [];
  } catch {
    return [];
  }
}

interface FAQTheme {
  theme: string;
  summary: string;
  ticketIds: string[];
}

async function categorizeTicketsWithClaude(tickets: LinearIssue[]): Promise<FAQTheme[]> {
  if (tickets.length === 0) return [];

  const { getAnthropicClient } = await import('./claude');

  const ticketList = tickets
    .map((t) => {
      const cleanTitle = t.title.replace(/^\[\s*[^\]]+\]\s*/i, '').trim();
      const cleanDesc = (t.description ?? '')
        .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 300);
      return `[${t.identifier}] ${cleanTitle}${cleanDesc ? ': ' + cleanDesc : ''}`;
    })
    .join('\n');

  const prompt = `You are analyzing BorderPass Briefcase support tickets to identify recurring user questions and pain points that should be addressed with educational content.

Here are the tickets:
${ticketList}

Group these into 3-7 recurring themes that represent common user questions or problems. For each theme:
- Give it a clear, specific title (the question or problem users keep having)
- Write a 1-2 sentence summary explaining what users are confused about or struggling with
- List the ticket IDs that belong to this theme

Return JSON only, no explanation:
[
  {
    "theme": "Theme title as a user question or pain point",
    "summary": "What users are confused about or struggling with, and why this matters",
    "ticketIds": ["DEV-123", "DEV-456"]
  }
]`;

  try {
    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    return JSON.parse(jsonMatch[0]) as FAQTheme[];
  } catch {
    return [];
  }
}

async function scrapeLinearBriefcase(): Promise<ScrapedItem[]> {
  const tickets = await fetchLinearBriefcaseTickets();
  if (tickets.length === 0) return [];

  const themes = await categorizeTicketsWithClaude(tickets);

  // Build a map from ticketId → url for linking back to a representative ticket
  const urlMap = new Map(tickets.map((t) => [t.identifier, t.url]));

  return themes.map((theme) => {
    const representativeUrl = urlMap.get(theme.ticketIds[0]) ?? 'https://linear.app/borderpass';
    return createItem('linear', 'BorderPass User FAQs', theme.theme, representativeUrl, theme.summary);
  });
}

// ── ImmigrationDirect / Moving2Canada ────────────────────────────────────
async function scrapeMoving2Canada(): Promise<ScrapedItem[]> {
  const html = await safeFetch('https://moving2canada.com/immigration-news/');
  if (!html) return [];

  const items: ScrapedItem[] = [];
  const seen = new Set<string>();
  const pattern = /href="(https:\/\/moving2canada\.com\/[^"]+)"[^>]*>\s*([^<]{10,150})</gi;
  let m: RegExpExecArray | null;

  while ((m = pattern.exec(html)) !== null && items.length < 5) {
    const url = m[1].trim();
    const title = m[2].trim();
    if (seen.has(url) || !url.includes('moving2canada.com')) continue;
    if (title.length < 10 || title.startsWith('http')) continue;
    seen.add(url);
    items.push(createItem('competitor', 'Moving2Canada', title, url, ''));
  }

  return items;
}

// ── CanadaVisa.com ────────────────────────────────────────────────────────
async function scrapeCanadaVisaCom(): Promise<ScrapedItem[]> {
  const html = await safeFetch('https://www.canadavisa.com/canada-immigration-news.html');
  if (!html) return [];

  const items: ScrapedItem[] = [];
  const seen = new Set<string>();
  const pattern = /href="(https:\/\/www\.canadavisa\.com\/[^"]+\.html)"[^>]*>\s*([^<]{10,150})</gi;
  let m: RegExpExecArray | null;

  while ((m = pattern.exec(html)) !== null && items.length < 6) {
    const url = m[1].trim();
    const title = m[2].trim();
    if (seen.has(url)) continue;
    if (title.length < 10 || url.includes('canada-immigration-news.html')) continue;
    seen.add(url);
    items.push(createItem('competitor', 'CanadaVisa.com', title, url, ''));
  }

  return items;
}

export async function scrapeAllSources(): Promise<ScrapedItem[]> {
  const results = await Promise.allSettled([
    scrapeIRCCNotices(),
    scrapeIRCCNewsReleases(),
    scrapeReddit('ImmigrationCanada'),
    scrapeReddit('canadavisa'),
    scrapeCICNews(),
    scrapeMoving2Canada(),
    scrapeCanadaVisaCom(),
    scrapeLinearBriefcase(),
  ]);

  const all: ScrapedItem[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }

  // Deduplicate by id
  const seen = new Set<string>();
  return all.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
