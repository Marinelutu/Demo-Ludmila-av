import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const conversations = await prisma.conversation.findMany({
    include: { client: { select: { id: true, nume: true, prenume: true } } },
    orderBy: { lastActiveAt: 'desc' },
  });
  return NextResponse.json(conversations);
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, aiAuthorized } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const updated = await prisma.conversation.update({
      where: { id },
      data: { aiAuthorized },
      include: { client: { select: { id: true, nume: true, prenume: true } } },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
  }
}
