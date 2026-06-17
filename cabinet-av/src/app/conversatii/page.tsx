export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { ConversatiiClient } from './conversatii-client';

export default async function ConversatiiPage() {
  const conversations = await prisma.conversation.findMany({
    include: { client: { select: { id: true, nume: true, prenume: true } } },
    orderBy: { lastActiveAt: 'desc' },
  });

  return (
    <div className="h-[calc(100vh-8rem)] flex">
      <ConversatiiClient initialConversations={conversations} />
    </div>
  );
}