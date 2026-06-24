'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { FileText, Scale, FileCheck, Users, ArrowRight, ArrowLeft, Sparkles, Check } from 'lucide-react';

const DOC_TYPES = [
  { id: 'cerere_chemare', label: 'Cerere de chemare în judecată', icon: Scale },
  { id: 'contract_asistenta', label: 'Contract de asistență juridică', icon: FileCheck },
  { id: 'cerere_divort', label: 'Cerere de divorț', icon: Users },
  { id: 'cerere_pensie', label: 'Cerere pensie alimentară', icon: FileText },
  { id: 'apel', label: 'Apel', icon: Scale },
  { id: 'recurs', label: 'Recurs', icon: Scale },
  { id: 'alt', label: 'Alt document', icon: FileText },
];

interface Client {
  id: string;
  nume: string;
  prenume: string;
  idnp?: string;
  adresa?: string;
}

interface Case {
  id: string;
  numar: string;
  denumire: string;
  instanta?: string;
  judecator?: string;
}

interface GenerateDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateDocumentModal({ open, onOpenChange }: GenerateDocumentModalProps) {
  const router = useRouter();
  const previewRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedCase, setSelectedCase] = useState('');
  const [descriere, setDescriere] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      fetch('/api/clients')
        .then((r) => r.json())
        .then((data) => setClients(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (!selectedClient) { setCases([]); setSelectedCase(''); return; }
    fetch(`/api/cases?clientId=${selectedClient}`)
      .then((r) => r.json())
      .then((data) => setCases(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [selectedClient]);

  const handleReset = () => {
    setStep(1);
    setSelectedType('');
    setSelectedClient('');
    setSelectedCase('');
    setDescriere('');
    setGeneratedHtml('');
    setDone(false);
    setGenerating(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGeneratedHtml('');
    setDone(false);

    const client = clients.find((c) => c.id === selectedClient);
    const caseItem = cases.find((c) => c.id === selectedCase);
    const tipLabel = DOC_TYPES.find((t) => t.id === selectedType)?.label || selectedType;

    try {
      const response = await fetch('/api/ai/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tip: tipLabel,
          clientDetails: client,
          caseDetails: caseItem,
          descriere,
        }),
      });

      if (!response.ok || !response.body) throw new Error('Răspuns invalid');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') { setDone(true); continue; }
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              setGeneratedHtml((prev) => prev + parsed.text);
            }
          } catch {}
        }
      }
      setDone(true);
    } catch (err) {
      toast.error('Generare eșuată. Verificați cheia API.');
      setGenerating(false);
      return;
    }

    setGenerating(false);
  };

  const handleSaveAndOpen = async () => {
    const client = clients.find((c) => c.id === selectedClient);
    const tipLabel = DOC_TYPES.find((t) => t.id === selectedType)?.label || selectedType;

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: `${tipLabel}${client ? ` — ${client.prenume} ${client.nume}` : ''}`,
          tip: selectedType,
          categorie: 'generat',
          clientId: selectedClient || null,
          caseId: selectedCase || null,
          htmlContent: generatedHtml,
        }),
      });

      if (!res.ok) throw new Error();
      const doc = await res.json();
      onOpenChange(false);
      handleReset();
      router.push(`/documente/${doc.id}`);
    } catch {
      toast.error('Eroare la salvare');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) handleReset(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <DialogTitle className="text-lg">Generare Document AI</DialogTitle>
          </div>

          {/* Steps indicator */}
          {step < 4 && (
            <div className="mt-4 flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    s < step ? 'bg-indigo-600 text-white' : s === step ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                  }`}>
                    {s < step ? <Check className="h-3 w-3" /> : s}
                  </div>
                  <span className={`text-xs ${s === step ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                    {s === 1 ? 'Tip document' : s === 2 ? 'Client & dosar' : 'Descriere'}
                  </span>
                  {s < 3 && <div className="mx-1 h-px w-8 bg-slate-200 dark:bg-slate-700" />}
                </div>
              ))}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* STEP 1: Document type */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {DOC_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`flex flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/20 ${
                      selectedType === type.id
                        ? 'border-indigo-600 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/30'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${selectedType === type.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium leading-tight text-slate-900 dark:text-white">{type.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP 2: Client & Case */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Client</label>
                <Select value={selectedClient} onValueChange={(v) => setSelectedClient(v ?? '')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selectează client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.prenume} {c.nume}
                        {c.idnp && <span className="ml-2 text-slate-400 text-xs">{c.idnp}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Dosar (opțional)</label>
                <Select value={selectedCase} onValueChange={(v) => setSelectedCase(v ?? '')} disabled={!selectedClient}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={selectedClient ? 'Selectează dosar...' : 'Selectează mai întâi clientul'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Fără dosar</SelectItem>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.numar} — {c.denumire}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* STEP 3: Description */}
          {step === 3 && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Context suplimentar (opțional)
              </label>
              <Textarea
                placeholder="Descrie situația, cerințe speciale, detalii relevante pentru document..."
                className="min-h-[140px] resize-none"
                value={descriere}
                onChange={(e) => setDescriere(e.target.value)}
              />
              <p className="text-xs text-slate-400">
                Cu cât mai mult context, cu atât documentul generat va fi mai precis. Zonele incerte vor fi marcate cu galben pentru confirmare.
              </p>

              <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-900/20 dark:border-amber-800">
                <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                  Rezumat generare:
                </p>
                <div className="mt-1 space-y-1 text-xs text-amber-700 dark:text-amber-400">
                  <div>📄 {DOC_TYPES.find((t) => t.id === selectedType)?.label}</div>
                  {selectedClient && <div>👤 {clients.find((c) => c.id === selectedClient)?.prenume} {clients.find((c) => c.id === selectedClient)?.nume}</div>}
                  {selectedCase && selectedCase !== 'none' && <div>📁 {cases.find((c) => c.id === selectedCase)?.numar}</div>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Generation preview */}
          {step === 4 && (
            <div className="space-y-4">
              {generating && !generatedHtml && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-indigo-600">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    <span>AI generează documentul...</span>
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              )}

              {generatedHtml && (
                <div className="space-y-3">
                  {!done && (
                    <div className="flex items-center gap-2 text-sm text-indigo-600">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      <span>Generare în curs...</span>
                    </div>
                  )}
                  {done && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <Check className="mr-1 h-3 w-3" /> Document generat
                      </Badge>
                      <span className="text-xs text-slate-500">Zonele galbene necesită confirmare în editor</span>
                    </div>
                  )}
                  <div
                    ref={previewRef}
                    className="legal-document max-h-[400px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-8 max-w-none dark:border-slate-700 dark:bg-slate-950"
                    dangerouslySetInnerHTML={{ __html: generatedHtml }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <Button
            variant="ghost"
            onClick={() => step > 1 && step < 4 ? setStep((s) => s - 1) : onOpenChange(false)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 1 ? 'Anulează' : 'Înapoi'}
          </Button>

          {step < 3 && (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && !selectedType}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              Continuă <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          {step === 3 && (
            <Button
              onClick={() => { setStep(4); handleGenerate(); }}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              <Sparkles className="h-4 w-4" /> Generează
            </Button>
          )}

          {step === 4 && done && (
            <Button onClick={handleSaveAndOpen} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <FileText className="h-4 w-4" /> Deschide în editor
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
