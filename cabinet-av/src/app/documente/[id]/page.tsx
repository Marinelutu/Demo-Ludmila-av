import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DocumentEditor } from '@/components/editor/document-editor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Save, Printer } from 'lucide-react';
import Link from 'next/link';

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
      {/* Toolbar */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-4">
          <Link href="/documente">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-0.5">
            <h1 className="text-sm font-semibold text-slate-900 dark:text-white leading-none">
              {document.nume}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Badge variant="outline" className="text-[10px] h-4 px-1">{document.tip}</Badge>
              {document.client && <span>Client: {document.client.prenume}</span>}
              {document.case && <span>Dosar: {document.case.numar}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-2">
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-2">
            <Download className="h-3.5 w-3.5" /> PDF
          </Button>
          <Button size="sm" className="h-8 gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Save className="h-3.5 w-3.5" /> Salvează
          </Button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <DocumentEditor initialContent={document.htmlContent || document.textContent || '<p>Document gol.</p>'} documentId={document.id} />
      </div>
    </div>
  );
}
