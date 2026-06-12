import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, BRAND_SYSTEM_PROMPT } from '@/lib/claude';
import { saveTopic, getScrapedItems } from '@/lib/storage';
import { ScrapedItem, Topic, Audience } from '@/lib/types';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const itemIds: string[] = body.itemIds ?? [];

    const allItems = await getScrapedItems();
    const items: ScrapedItem[] =
      itemIds.length > 0 ? allItems.filter((i) => itemIds.includes(i.id)) : allItems.slice(0, 20);

    if (items.length === 0) {
      return NextResponse.json({ error: 'No scraped items to generate topics from' }, { status: 400 });
    }

    const itemSummary = items
      .map((i, idx) => `${idx + 1}. [${i.sourceName}] ${i.title}\n   ${i.excerpt.slice(0, 200)}`)
      .join('\n\n');

    const message = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: BRAND_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Based on these recent immigration news items and social conversations, generate 5 content topic ideas for BorderPass.

SCRAPED SOURCES:
${itemSummary}

For each topic, output EXACTLY this JSON format (return a JSON array, nothing else):
[
  {
    "title": "Topic headline (8-12 words, engaging, specific)",
    "angle": "The specific angle or hook: what makes this timely and valuable for BorderPass to address? (2-3 sentences)",
    "audience": "one of: students | employers | agents | investors | general",
    "sourceIndexes": [1, 3]
  }
]

Generate topics that:
- Address real questions or concerns from the scraped content
- Connect IRCC policy changes to practical impact on BorderPass users
- Offer BorderPass's expert perspective on immigration trends
- Vary across audiences (mix student, employer, agent topics)
- Are timely and newsworthy, not evergreen fluff

Return ONLY the JSON array. No explanation before or after.`,
        },
      ],
    });

    const rawText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    let topicIdeas: Array<{
      title: string;
      angle: string;
      audience: Audience;
      sourceIndexes: number[];
    }> = [];

    try {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        topicIdeas = JSON.parse(jsonMatch[0]);
      }
    } catch {
      return NextResponse.json({ error: 'Failed to parse topic ideas from AI' }, { status: 500 });
    }

    const topics: Topic[] = [];
    for (const idea of topicIdeas) {
      const sourceIds = (idea.sourceIndexes ?? [])
        .map((idx: number) => items[idx - 1]?.id)
        .filter(Boolean);

      const topic: Topic = {
        id: randomUUID(),
        title: idea.title,
        angle: idea.angle,
        audience: idea.audience ?? 'general',
        sourceIds,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        content: {},
      };
      await saveTopic(topic);
      topics.push(topic);
    }

    return NextResponse.json({ topics, count: topics.length });
  } catch (err) {
    console.error('Generate topics error:', err);
    return NextResponse.json({ error: 'Failed to generate topics' }, { status: 500 });
  }
}
