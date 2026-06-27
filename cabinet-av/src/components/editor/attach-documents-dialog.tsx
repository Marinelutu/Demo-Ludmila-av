'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';

interface DocItem { id: string; nume: string; tip: string; categorie?: string | null }

interface AttachDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  caseId: string;
  onAttached: () => void;
}

export function AttachDocumentsDialog({ open, onOpenChange, clientId, caseId, onAttached }: AttachDocumentsDialogProps) {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setLoading(true);
    fetch(`/api/documents?clientId=${clientId}&excludeCaseId=${caseId}`)
      .then((r) => r.json())
      .then((data) => setDocs(Array.isArray(data) ? data : []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [open, clientId, caseId]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAttach = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await Promise.all(
        [...selected].map((id) =>
          fetch('/api/documents', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, caseId }),
          })
        )
      );
      toast.success(`${selected.size} document(e) atașate la dosar`);
      onOpenChange(false);
      onAttached();
    } catch {
      toast.error('Eroare la atașarea documentelor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Adaugă documente existente</DialogTitle>
          <DialogDescription>
            Selectați documente ale clientului pentru a le atașa la acest dosar.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[360px] space-y-1 overflow-y-auto py-2">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Se încarcă...</p>
          ) : docs.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Nu există alte documente ale clientului de atașat.
            </p>
          ) : (
            docs.map((doc) => (
              <label
                key={doc.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
              >
                <Checkbox checked={selected.has(doc.id)} onCheckedChange={() => toggle(doc.id)} />
                <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 dark:bg-slate-800">
                  <FileText className="h-4 w-4 text-slate-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{doc.nume}</p>
                  <p className="text-xs text-slate-500">{doc.categorie || doc.tip}</p>
                </div>
              </label>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Anulează</Button>
          <Button disabled={saving || selected.size === 0} onClick={handleAttach} className="bg-indigo-600 hover:bg-indigo-700">
            {saving ? 'Se atașează...' : `Atașează (${selected.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
