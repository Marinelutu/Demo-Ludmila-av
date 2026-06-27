'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Printer, Download, Save, ArrowLeft, FolderInput, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { toast } from 'sonner';
import { DocumentLocationDialog } from '@/components/editor/document-location-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

interface DocumentToolbarProps {
  documentId: string;
  documentName: string;
  documentTip: string;
  clientId?: string | null;
  caseId?: string | null;
  clientName?: string;
  caseNumar?: string;
}

export function DocumentToolbar({ documentId, documentName, documentTip, clientId, caseId, clientName, caseNumar }: DocumentToolbarProps) {
  const router = useRouter();
  const [locationOpen, setLocationOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handlePDF = () => {
    const a = document.createElement('a');
    a.href = `/api/documents/${documentId}/pdf`;
    a.download = `${documentName}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success('PDF generat — se descarcă');
  };

  const handleSave = async () => {
    const event = new CustomEvent('document:save', { detail: { documentId } });
    window.dispatchEvent(event);
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/documents?id=${documentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Document șters');
      router.push('/documente');
    } catch {
      toast.error('Eroare la ștergerea documentului.');
    }
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
            {caseNumar ? <span>Dosar: {caseNumar}</span> : <span className="text-amber-600 dark:text-amber-400">Fără dosar</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Organizare: atașează la client/dosar (mai ales dacă nu e încă într-un dosar) */}
        <Button
          variant={caseNumar ? 'outline' : 'default'}
          size="sm"
          className={`h-8 gap-2 ${!caseNumar ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
          onClick={() => setLocationOpen(true)}
        >
          <FolderInput className="h-3.5 w-3.5" /> {caseNumar ? 'Mută' : 'Atașează la dosar'}
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-2" onClick={handlePrint}>
          <Printer className="h-3.5 w-3.5" /> Print
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-2" onClick={handlePDF}>
          <Download className="h-3.5 w-3.5" /> PDF
        </Button>
        <Button size="sm" className="h-8 gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={handleSave}>
          <Save className="h-3.5 w-3.5" /> Salvează
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setDeleteOpen(true)} aria-label="Șterge document">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <DocumentLocationDialog
        open={locationOpen}
        onOpenChange={setLocationOpen}
        documentId={documentId}
        currentClientId={clientId}
        currentCaseId={caseId}
        onSaved={() => router.refresh()}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Ștergi documentul?"
        description={`„${documentName}" va fi șters definitiv. Acțiunea nu poate fi anulată.`}
        confirmLabel="Șterge definitiv"
        onConfirm={handleDelete}
      />
    </div>
  );
}
