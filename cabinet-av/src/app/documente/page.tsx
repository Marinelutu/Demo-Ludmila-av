export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { DocumentsListClient } from './documents-list';

export default async function DocumentePage() {
  const documents = await prisma.document.findMany({
    include: {
      client: { select: { nume: true, prenume: true } },
      case: { select: { numar: true, denumire: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <DocumentsListClient initialDocuments={documents} />
    </div>
  );
}