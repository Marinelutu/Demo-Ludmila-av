import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const now = new Date();
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [emails, deadlines, alerts, conversations] = await Promise.all([
    prisma.email.findMany({
      where: { status: 'nou' },
      orderBy: { data: 'desc' },
      take: 6,
      select: { id: true, subiect: true, expeditor: true, data: true },
    }),
    prisma.deadline.findMany({
      where: { status: 'activ', data: { gte: now, lte: in7days } },
      orderBy: { data: 'asc' },
      take: 5,
      select: { id: true, descriere: true, data: true, caseId: true, case: { select: { numar: true } } },
    }),
    prisma.legislativeAlert.findMany({
      where: { status: 'noua' },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, titlu: true, actNormativ: true, createdAt: true },
    }),
    prisma.conversation.findMany({
      where: { recentMessages: { not: '' } },
      orderBy: { lastActiveAt: 'desc' },
      take: 3,
      select: {
        id: true,
        platforma: true,
        lastActiveAt: true,
        client: { select: { prenume: true, nume: true } },
      },
    }),
  ]);

  return NextResponse.json({ emails, deadlines, alerts, conversations });
}
