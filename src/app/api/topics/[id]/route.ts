import { NextRequest, NextResponse } from 'next/server';
import { getTopic, saveTopic, deleteTopic } from '@/lib/storage';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const topic = await getTopic(id);
    if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ topic });
  } catch (err) {
    console.error('Get topic error:', err);
    return NextResponse.json({ error: 'Failed to load topic' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const existing = await getTopic(id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const updated = {
      ...existing,
      ...body,
      id, // prevent ID override
      updatedAt: new Date().toISOString(),
    };
    await saveTopic(updated);
    return NextResponse.json({ topic: updated });
  } catch (err) {
    console.error('Update topic error:', err);
    return NextResponse.json({ error: 'Failed to update topic' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteTopic(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete topic error:', err);
    return NextResponse.json({ error: 'Failed to delete topic' }, { status: 500 });
  }
}
