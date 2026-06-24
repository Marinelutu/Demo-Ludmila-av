import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function getHourlyRate(): Promise<number> {
  const s = await prisma.appSettings.findUnique({ where: { id: 1 } });
  return s?.hourlyRate ?? 800;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');
  const TARIF_ORAR = await getHourlyRate();

  const entries = await prisma.timeEntry.findMany({
    where: clientId ? { clientId } : {},
    include: {
      client: { select: { nume: true, prenume: true } },
      case: { select: { numar: true, denumire: true } },
    },
    orderBy: { startTime: 'desc' },
  });

  const rows = [
    ['Data', 'Client', 'Dosar', 'Categorie', 'Descriere', 'Durată (h)', 'Onorariu (lei)'],
    ...entries.map(e => {
      const hours = (e.durata || 0) / 3600;
      return [
        new Date(e.startTime).toLocaleDateString('ro-RO'),
        e.client ? `${e.client.prenume} ${e.client.nume}` : '-',
        e.case ? `${e.case.numar} — ${e.case.denumire}` : '-',
        e.categorie,
        e.descriere || '',
        hours.toFixed(2),
        (hours * TARIF_ORAR).toFixed(2),
      ];
    }),
  ];

  const totalHours = entries.reduce((s, e) => s + (e.durata || 0), 0) / 3600;
  rows.push(['', '', '', '', 'TOTAL', totalHours.toFixed(2), (totalHours * TARIF_ORAR).toFixed(2)]);

  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="raport-timp-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
