export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { CasesListClient } from './cases-list';

export default async function DosarePage() {
  const cases = await prisma.case.findMany({
    include: {
      client: { select: { nume: true, prenume: true } },
      _count: {
        select: { documents: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <CasesListClient initialCases={cases} />
    </div>
  );
}