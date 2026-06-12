import { NextRequest, NextResponse } from 'next/server';
import { ContentChannel } from '@/lib/types';
import { LOGO_LIGHT_SVG, LOGO_DARK_SVG } from '@/lib/logos.server';
import {
  renderImage,
  renderCarouselCover,
  renderCarouselContent,
  renderCarouselCTA,
  ImageContent,
  CarouselSlideContent,
} from '@/lib/image-templates';

export async function POST(req: NextRequest) {
  try {
    const { channel, json }: { channel: ContentChannel; json: unknown } = await req.json();

    if (!channel || !json) {
      return NextResponse.json({ error: 'channel and json are required' }, { status: 400 });
    }

    if (channel === 'instagram_carousel') {
      const slides = json as CarouselSlideContent[];
      if (!Array.isArray(slides)) {
        return NextResponse.json({ error: 'Expected array for carousel' }, { status: 400 });
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
          htmlSlides.push(
            renderCarouselContent(slide, contentIndex, contentIndex % 2 === 0, LOGO_LIGHT_SVG, LOGO_DARK_SVG)
          );
        }
      }
      return NextResponse.json({ html: JSON.stringify(htmlSlides) });
    }

    // Single image
    const html = renderImage(json as ImageContent, LOGO_LIGHT_SVG, LOGO_DARK_SVG);
    return NextResponse.json({ html });
  } catch (err) {
    console.error('render-visual error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Render failed' },
      { status: 500 }
    );
  }
}
