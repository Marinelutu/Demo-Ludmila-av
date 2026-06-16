import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CaseProfileClient } from './case-profile';

export default async function CaseProfilePage({ params }: { params: { id: string } }) {
  const caseData = await prisma.case.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      documents: { orderBy: { createdAt: 'desc' } },
      deadlines: { orderBy: { data: 'asc' } },
      timeEntries: { orderBy: { startTime: 'desc' } },
    },
  });

  if (!caseData) {
    notFound();
  }

  // Check for legislative alerts affecting this case
  const alerts = await prisma.legislativeAlert.findMany({
    where: {
      affectedCaseIds: {
        contains: caseData.id,
      },
      status: 'noua',
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <CaseProfileClient caseData={caseData} alerts={alerts} />
    </div>
  );
}
