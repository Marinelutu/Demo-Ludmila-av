'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface ClientOpt { id: string; nume: string; prenume: string }
interface CaseOpt { id: string; numar: string; denumire: string }

interface DocumentLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  currentClientId?: string | null;
  currentCaseId?: string | null;
  onSaved?: () => void;
}

export function DocumentLocationDialog({
  open, onOpenChange, documentId, currentClientId, currentCaseId, onSaved,
}: DocumentLocationDialogProps) {
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [cases, setCases] = useState<CaseOpt[]>([]);
  const [clientId, setClientId] = useState<string>(currentClientId || 'none');
  const [caseId, setCaseId] = useState<string>(currentCaseId || 'none');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setClientId(currentClientId || 'none');
    setCaseId(currentCaseId || 'none');
    fetch('/api/clients')
      .then((r) => r.json())
      .then((d) => setClients(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [open, currentClientId, currentCaseId]);

  useEffect(() => {
    if (!clientId || clientId === 'none') { setCases([]); return; }
    fetch(`/api/cases?clientId=${clientId}`)
      .then((r) => r.json())
      .then((d) => setCases(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [clientId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: documentId,
          clientId: clientId !== 'none' ? clientId : null,
          // dosarul are sens doar dacă e ales un client
          caseId: clientId !== 'none' && caseId !== 'none' ? caseId : null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Document organizat');
      onOpenChange(false);
      onSaved?.();
    } catch {
      toast.error('Eroare la organizarea documentului.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Organizează documentul</DialogTitle>
          <DialogDescription>Atașează documentul la un client și, opțional, la un dosar.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={(v) => { setClientId(v ?? 'none'); setCaseId('none'); }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Selectează client..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Fără client</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.prenume} {c.nume}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Dosar (opțional)</Label>
            <Select value={caseId} onValueChange={(v) => setCaseId(v ?? 'none')} disabled={clientId === 'none'}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={clientId === 'none' ? 'Selectează mai întâi clientul' : 'Selectează dosar...'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Fără dosar</SelectItem>
                {cases.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.numar} — {c.denumire}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Anulează</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
            {saving ? 'Se salvează...' : 'Salvează'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
