export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DocumentEditor } from '@/components/editor/document-editor';
import { DocumentToolbar } from '@/components/editor/document-toolbar';

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      client: true,
      case: true,
    },
  });

  if (!document) {
    notFound();
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      <DocumentToolbar
        documentId={document.id}
        documentName={document.nume}
        documentTip={document.tip}
        clientName={document.client?.prenume ?? undefined}
        caseNumar={document.case?.numar ?? undefined}
      />
      <div className="flex-1 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <DocumentEditor initialContent={document.htmlContent || document.textContent || '<p>Document gol.</p>'} documentId={document.id} />
      </div>
    </div>
  );
}