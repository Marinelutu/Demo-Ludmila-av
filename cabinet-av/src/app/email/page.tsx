export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { EmailClient } from './email-client';

export default async function EmailPage() {
  const emails = await prisma.email.findMany({
    include: {
      client: { select: { nume: true, prenume: true } },
    },
    orderBy: { data: 'desc' },
  });

  return (
    <div className="h-[calc(100vh-8rem)] flex animate-in fade-in duration-500">
      <EmailClient initialEmails={emails} />
    </div>
  );
}