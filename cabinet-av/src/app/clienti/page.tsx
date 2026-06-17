export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { ClientListClient } from './client-list';

export default async function ClientiPage() {
  const clients = await prisma.client.findMany({
    include: {
      _count: {
        select: { cases: { where: { stare: { notIn: ['finalizat', 'arhivat'] } } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <ClientListClient initialClients={clients} />
    </div>
  );
}