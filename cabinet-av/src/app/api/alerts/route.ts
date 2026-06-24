import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyNewAlert } from '@/lib/telegram/notify';

const DEMO_ALERTS = [
  {
    titlu: 'Modificare Cod Civil — art. 1424 (rezilierea contractelor)',
    descriere: 'Termenele de notificare a rezilierii unilaterale au fost extinse de la 15 la 30 de zile.',
    actNormativ: 'Legea nr. 142/2026',
    articol: 'art. 1424',
  },
  {
    titlu: 'Cod de Procedură Penală — art. 89 (audierea martorilor)',
    descriere: 'Audierile pot fi efectuate online cu acordul ambelor părți; impact pe dosarele penale active.',
    actNormativ: 'Hotărârea Plenului CSJ nr. 7/2026',
    articol: 'art. 89',
  },
  {
    titlu: 'Codul Familiei — art. 78 (pensia alimentară)',
    descriere: 'Cuantumul minim al pensiei alimentare a fost indexat conform indicelui inflației 2026.',
    actNormativ: 'Legea nr. 178/2026',
    articol: 'art. 78',
  },
];

export async function GET() {
  const alerts = await prisma.legislativeAlert.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(alerts);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const data = body.titlu
      ? {
          titlu: body.titlu as string,
          descriere: (body.descriere as string) || '',
          actNormativ: (body.actNormativ as string) || 'Necunoscut',
          articol: (body.articol as string) || null,
        }
      : DEMO_ALERTS[Math.floor(Math.random() * DEMO_ALERTS.length)];

    const activeCases = await prisma.case.findMany({
      where: { stare: { notIn: ['arhivat', 'finalizat'] } },
      select: { id: true },
      take: 3,
    });
    const affectedCaseIds = activeCases.map(c => c.id);

    const alert = await prisma.legislativeAlert.create({
      data: {
        ...data,
        affectedCaseIds: JSON.stringify(affectedCaseIds),
      },
    });

    const sent = await notifyNewAlert({
      titlu: alert.titlu,
      descriere: alert.descriere,
      actNormativ: alert.actNormativ,
      dosareAfectate: affectedCaseIds.length,
    });

    return NextResponse.json({ alert, sent });
  } catch (error) {
    console.error('create-alert error:', error);
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
  }
}

// PATCH /api/alerts — marchează o alertă legislativă ca citită
export async function PATCH(request: NextRequest) {
  try {
    const { id, status } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID alertă lipsă' }, { status: 400 });
    }

    const alert = await prisma.legislativeAlert.update({
      where: { id },
      data: { status: status || 'citita' },
    });

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Update alert error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
