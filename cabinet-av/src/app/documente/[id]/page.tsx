export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DocumentEditor } from '@/components/editor/document-editor';
import { DocumentToolbar } from '@/components/editor/document-toolbar';
import { OcrDocumentView } from '@/components/editor/ocr-document-view';

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

  const isOcr = document.categorie === 'ocr' && !!document.originalImage;
  let ocrFields: Record<string, string> = {};
  if (isOcr && document.ocrFields) {
    try { ocrFields = JSON.parse(document.ocrFields); } catch { ocrFields = {}; }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      <DocumentToolbar
        documentId={document.id}
        documentName={document.nume}
        documentTip={document.tip}
        clientId={document.clientId ?? undefined}
        caseId={document.caseId ?? undefined}
        clientName={document.client ? `${document.client.prenume} ${document.client.nume}` : undefined}
        caseNumar={document.case?.numar ?? undefined}
      />
      <div className="flex-1 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {isOcr ? (
          <OcrDocumentView
            documentId={document.id}
            originalImage={document.originalImage as string}
            htmlContent={document.htmlContent || (document.textContent ? `<p>${document.textContent}</p>` : '')}
            fields={ocrFields}
          />
        ) : (
          <DocumentEditor initialContent={document.htmlContent || document.textContent || '<p>Document gol.</p>'} documentId={document.id} />
        )}
      </div>
    </div>
  );
}