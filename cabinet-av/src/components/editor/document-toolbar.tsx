'use client';

import { Printer, Download, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { toast } from 'sonner';

interface DocumentToolbarProps {
  documentId: string;
  documentName: string;
  documentTip: string;
  clientName?: string;
  caseNumar?: string;
}

export function DocumentToolbar({ documentId, documentName, documentTip, clientName, caseNumar }: DocumentToolbarProps) {
  const handlePrint = () => {
    window.print();
  };

  const handlePDF = () => {
    // CSS @media print handled — triggers browser Save as PDF dialog
    const originalTitle = document.title;
    document.title = documentName;
    window.print();
    document.title = originalTitle;
    toast.info('Selectați "Salvare ca PDF" în dialogul de imprimare');
  };

  const handleSave = async () => {
    // Trigger save via custom event picked up by DocumentEditor
    const event = new CustomEvent('document:save', { detail: { documentId } });
    window.dispatchEvent(event);
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950 print:hidden">
      <div className="flex items-center gap-4">
        <Link href="/documente">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
        <div className="space-y-0.5">
          <h1 className="text-sm font-semibold text-slate-900 dark:text-white leading-none">{documentName}</h1>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Badge variant="outline" className="text-[10px] h-4 px-1">{documentTip}</Badge>
            {clientName && <span>Client: {clientName}</span>}
            {caseNumar && <span>Dosar: {caseNumar}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-8 gap-2" onClick={handlePrint}>
          <Printer className="h-3.5 w-3.5" /> Print
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-2" onClick={handlePDF}>
          <Download className="h-3.5 w-3.5" /> PDF
        </Button>
        <Button size="sm" className="h-8 gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={handleSave}>
          <Save className="h-3.5 w-3.5" /> Salvează
        </Button>
      </div>
    </div>
  );
}
