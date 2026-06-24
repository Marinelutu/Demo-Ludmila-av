import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyDeadlines } from '@/lib/telegram/notify';

export async function POST() {
  try {
    const now = new Date();
    const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcoming = await prisma.deadline.findMany({
      where: {
        status: 'activ',
        data: { gte: now, lte: horizon },
      },
      include: { case: { select: { numar: true, denumire: true } } },
      orderBy: { data: 'asc' },
    });

    const toNotify = upcoming.filter(d => {
      const days = (d.data.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
      if (days <= 1 && !d.reminderSent1) return true;
      if (days <= 7 && !d.reminderSent3) return true;
      return false;
    });

    if (toNotify.length === 0) {
      return NextResponse.json({ checked: upcoming.length, notified: 0 });
    }

    const items = toNotify.map(d => {
      const days = Math.max(0, Math.ceil((d.data.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
      return {
        titlu: d.descriere || `${d.tip} dosar ${d.case.numar}`,
        dataIso: d.data.toISOString(),
        zileRamase: days,
        dosarNumar: d.case.numar,
      };
    });

    const sent = await notifyDeadlines(items);

    await Promise.all(
      toNotify.map(d => {
        const days = (d.data.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
        const updates: { reminderSent1?: boolean; reminderSent3?: boolean } = { reminderSent3: true };
        if (days <= 1) updates.reminderSent1 = true;
        return prisma.deadline.update({ where: { id: d.id }, data: updates });
      })
    );

    return NextResponse.json({ checked: upcoming.length, notified: toNotify.length, sent });
  } catch (error) {
    console.error('check-deadlines error:', error);
    return NextResponse.json({ error: 'Failed to check deadlines' }, { status: 500 });
  }
}
