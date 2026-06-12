import { NextRequest, NextResponse } from 'next/server';
import { getTopic } from '@/lib/storage';
import { channelLabel } from '@/lib/channels';
import { ContentChannel } from '@/lib/types';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const topic = await getTopic(id);
    if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const channels = Object.keys(topic.content) as ContentChannel[];
    if (channels.length === 0) {
      return NextResponse.json({ error: 'No content generated yet' }, { status: 400 });
    }

    // Build a comprehensive export document
    const lines: string[] = [
      `# BorderPass Content Export`,
      `**Topic:** ${topic.title}`,
      `**Angle:** ${topic.angle}`,
      `**Audience:** ${topic.audience}`,
      `**Status:** ${topic.status}`,
      `**Exported:** ${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })}`,
      '',
      '---',
      '',
    ];

    for (const channel of channels) {
      const content = topic.content[channel];
      if (!content) continue;

      lines.push(`## ${channelLabel(channel)}`);
      lines.push('');

      if (channel === 'static_image') {
        lines.push('*See HTML file for visual output*');
        lines.push('');
        lines.push('```html');
        lines.push(content.body);
        lines.push('```');
      } else {
        lines.push(content.body);
      }

      lines.push('');
      lines.push(`*Generated: ${new Date(content.generatedAt).toLocaleString()}*`);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    const exportText = lines.join('\n');
    const filename = `borderpass-${topic.title.slice(0, 40).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Date.now()}.md`;

    return new NextResponse(exportText, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('Export error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
