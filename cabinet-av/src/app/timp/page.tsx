import { prisma } from '@/lib/prisma';
import { TimeClient } from './time-client';

export default async function TimpPage() {
  const entries = await prisma.timeEntry.findMany({
    include: {
      client: { select: { nume: true, prenume: true } },
      case: { select: { numar: true, denumire: true } },
    },
    orderBy: { startTime: 'desc' },
  });

  const clients = await prisma.client.findMany({
    where: { status: 'activ' },
    select: { id: true, nume: true, prenume: true }
  });

  const cases = await prisma.case.findMany({
    where: { stare: { notIn: ['arhivat', 'finalizat'] } },
    select: { id: true, numar: true, denumire: true, clientId: true }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <TimeClient initialEntries={entries} clients={clients} cases={cases} />
    </div>
  );
}
