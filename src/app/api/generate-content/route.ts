import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, BRAND_SYSTEM_PROMPT } from '@/lib/claude';
import { getTopic, saveTopic, getScrapedItems } from '@/lib/storage';
import { ContentChannel, Topic } from '@/lib/types';
import { getChannel, isVisualChannel } from '@/lib/channels';
import { LOGO_LIGHT_SVG, LOGO_DARK_SVG } from '@/lib/logos.server';
import {
  renderImage,
  renderCarouselCover,
  renderCarouselContent,
  renderCarouselCTA,
  ImageContent,
  CarouselSlideContent,
} from '@/lib/image-templates';

// ── Parse Claude's JSON response ───────────────────────────────────────────
function parseJson<T>(raw: string): T | null {
  try {
    // Strip markdown fences if present
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(clean) as T;
  } catch {
    // Try extracting a JSON object/array from the middle of text
    const objMatch = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (objMatch) {
      try { return JSON.parse(objMatch[1]) as T; } catch { /* fall through */ }
    }
    return null;
  }
}

// ── Render visual content through rigid templates ──────────────────────────
function renderVisualHtml(channel: ContentChannel, raw: string): string {
  if (channel === 'instagram_carousel') {
    const slides = parseJson<CarouselSlideContent[]>(raw);
    if (!slides || !Array.isArray(slides)) {
      throw new Error('Carousel: Claude did not return a valid JSON array of slides.');
    }
    const htmlSlides: string[] = [];
    let contentIndex = 0;
    for (const slide of slides) {
      if (slide.type === 'cover') {
        htmlSlides.push(renderCarouselCover(slide, LOGO_LIGHT_SVG));
      } else if (slide.type === 'cta') {
        htmlSlides.push(renderCarouselCTA(slide, LOGO_LIGHT_SVG));
      } else {
        contentIndex++;
        const isEven = contentIndex % 2 === 0;
        htmlSlides.push(renderCarouselContent(slide, contentIndex, isEven, LOGO_LIGHT_SVG, LOGO_DARK_SVG));
      }
    }
    return JSON.stringify(htmlSlides);
  }

  // Single image (instagram_image, static_image)
  const content = parseJson<ImageContent>(raw);
  if (!content) {
    throw new Error('Image: Claude did not return valid JSON content.');
  }
  return renderImage(content, LOGO_LIGHT_SVG, LOGO_DARK_SVG);
}

// ── Generate text/markdown channel ────────────────────────────────────────
async function generateTextContent(
  topic: Topic,
  channel: ContentChannel,
  sourceContext: string
): Promise<string> {
  const channelSpec = getChannel(channel);
  if (!channelSpec) throw new Error(`Unknown channel: ${channel}`);

  const userPrompt = channelSpec.prompt(topic.title, topic.angle, topic.audience, sourceContext);

  const message = await getAnthropicClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: BRAND_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  return message.content[0].type === 'text' ? message.content[0].text.trim() : '';
}

// ── Generate visual channel (JSON → template) ─────────────────────────────
async function generateVisualContent(
  topic: Topic,
  channel: ContentChannel,
  sourceContext: string
): Promise<{ html: string; json: string }> {
  const channelSpec = getChannel(channel);
  if (!channelSpec) throw new Error(`Unknown channel: ${channel}`);

  const userPrompt = channelSpec.prompt(topic.title, topic.angle, topic.audience, sourceContext);

  const message = await getAnthropicClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: 'You are a content strategist. Always respond with valid JSON only — no explanation, no markdown fences.',
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
  const html = renderVisualHtml(channel, raw);
  // parseJson strips markdown fences — re-serialise so visualJson is always
  // clean, parseable JSON with no backtick wrappers.
  const parsed = parseJson<unknown>(raw);
  const json = parsed ? JSON.stringify(parsed) : raw;
  return { html, json };
}

// ── Main handler ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topicId, channel }: { topicId: string; channel: ContentChannel } = body;

    if (!topicId || !channel) {
      return NextResponse.json({ error: 'topicId and channel are required' }, { status: 400 });
    }

    const topic = await getTopic(topicId);
    if (!topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    if (!getChannel(channel)) return NextResponse.json({ error: 'Unknown channel' }, { status: 400 });

    const allItems = await getScrapedItems();
    const sourceItems = allItems.filter((i) => topic.sourceIds.includes(i.id));
    const sourceContext =
      sourceItems.length > 0
        ? sourceItems.map((i) => `[${i.sourceName}] ${i.title}: ${i.excerpt}`).join('\n\n')
        : 'No specific source context — use BorderPass general immigration knowledge.';

    const now = new Date().toISOString();

    if (isVisualChannel(channel)) {
      const { html, json } = await generateVisualContent(topic, channel, sourceContext);
      topic.content[channel] = { channel, body: html, visualJson: json, generatedAt: now };
    } else {
      const body = await generateTextContent(topic, channel, sourceContext);
      topic.content[channel] = { channel, body, generatedAt: now };
    }
    topic.updatedAt = now;
    await saveTopic(topic);

    return NextResponse.json({ content: topic.content[channel], autoGenerated: [], topic });
  } catch (err) {
    console.error('Generate content error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate content' },
      { status: 500 }
    );
  }
}
