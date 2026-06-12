import { NextRequest, NextResponse } from 'next/server';
import { getTopics, saveTopic } from '@/lib/storage';
import { Topic } from '@/lib/types';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const topics = await getTopics();
    return NextResponse.json({ topics });
  } catch (err) {
    console.error('Get topics error:', err);
    return NextResponse.json({ error: 'Failed to load topics' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const topic: Topic = {
      id: randomUUID(),
      title: body.title ?? 'Untitled Topic',
      angle: body.angle ?? '',
      audience: body.audience ?? 'general',
      sourceIds: body.sourceIds ?? [],
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      content: {},
    };
    await saveTopic(topic);
    return NextResponse.json({ topic }, { status: 201 });
  } catch (err) {
    console.error('Create topic error:', err);
    return NextResponse.json({ error: 'Failed to create topic' }, { status: 500 });
  }
}
