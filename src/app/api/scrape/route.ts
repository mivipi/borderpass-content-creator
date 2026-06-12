import { NextResponse } from 'next/server';
import { scrapeAllSources } from '@/lib/scraper';
import { saveScrapedItems, getScrapedItems, getLastScrapedAt } from '@/lib/storage';

export async function POST() {
  try {
    const items = await scrapeAllSources();
    const { added } = await saveScrapedItems(items);
    const allItems = await getScrapedItems();
    return NextResponse.json({
      success: true,
      added,
      total: allItems.length,
      items: allItems,
      lastScrapedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Scrape error:', err);
    return NextResponse.json({ error: 'Scrape failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const [items, lastScrapedAt] = await Promise.all([getScrapedItems(), getLastScrapedAt()]);
    return NextResponse.json({ items, lastScrapedAt });
  } catch (err) {
    console.error('Get scrape error:', err);
    return NextResponse.json({ error: 'Failed to load scraped items' }, { status: 500 });
  }
}
