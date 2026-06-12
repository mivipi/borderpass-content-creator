import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(req: NextRequest) {
  try {
    const { html, width = 1080, height = 1080 } = await req.json();
    if (!html) return NextResponse.json({ error: 'html is required' }, { status: 400 });

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait a moment for any CSS animations to settle
    await new Promise((r) => setTimeout(r, 500));

    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width, height },
    });

    await browser.close();

    return new NextResponse(Buffer.from(screenshot), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="borderpass-visual.png"',
      },
    });
  } catch (err: unknown) {
    console.error('[render-png]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Render failed' },
      { status: 500 }
    );
  }
}
