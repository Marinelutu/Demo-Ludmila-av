import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ClientProfileClient } from './client-profile';

export default async function ClientProfilePage({ params }: { params: { id: string } }) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      cases: { orderBy: { createdAt: 'desc' } },
      documents: { orderBy: { createdAt: 'desc' } },
      emails: { orderBy: { data: 'desc' }, take: 20 },
      consultations: { orderBy: { createdAt: 'desc' } },
      timeEntries: { orderBy: { startTime: 'desc' } },
      contracts: { orderBy: { data: 'desc' } },
      notes: { orderBy: { createdAt: 'desc' } },
      conversations: { orderBy: { lastActiveAt: 'desc' } },
    },
  });

  if (!client) {
    notFound();
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <ClientProfileClient client={client} />
    </div>
  );
}
