export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { TimeClient } from './time-client';

export default async function TimpPage() {
  const [entries, clients, cases, settings] = await Promise.all([
    prisma.timeEntry.findMany({
      include: {
        client: { select: { nume: true, prenume: true } },
        case: { select: { numar: true, denumire: true } },
      },
      orderBy: { startTime: 'desc' },
    }),
    prisma.client.findMany({
      where: { status: 'activ' },
      select: { id: true, nume: true, prenume: true },
    }),
    prisma.case.findMany({
      where: { stare: { notIn: ['arhivat', 'finalizat'] } },
      select: { id: true, numar: true, denumire: true, clientId: true },
    }),
    prisma.appSettings.findUnique({ where: { id: 1 } }),
  ]);

  const hourlyRate = settings?.hourlyRate ?? 800;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <TimeClient initialEntries={entries} clients={clients} cases={cases} hourlyRate={hourlyRate} />
    </div>
  );
}