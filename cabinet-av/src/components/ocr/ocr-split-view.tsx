'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, CheckCircle, AlertTriangle, ZoomIn, ZoomOut, Check, FileText, RefreshCw, ScanLine, X, UserPlus, Users } from 'lucide-react';

interface OcrField {
  nume_camp: string;
  valoare: string;
  confidence: number;
  locatie?: string;
}

interface OcrResult {
  tip_document: string;
  campuri_identificate: OcrField[];
  textul_complet: string;
  parse_error?: boolean;
}

interface CaseOption { id: string; numar: string; denumire: string }
interface ClientOption { id: string; nume: string; prenume: string }
type NewClient = { nume: string; prenume: string; idnp: string; telefon: string; email: string; adresa: string };

interface OcrSplitViewProps {
  clientId?: string;
  // Dosarele clientului — dacă există, oferim atașarea documentului OCR la un dosar.
  cases?: CaseOption[];
  // 'chooser' (ex. de pe pagina principală): la salvare alegi clientul existent
  // sau creezi unul nou din datele extrase.
  mode?: 'client' | 'chooser';
  // Dacă e furnizat, primește câmpurile confirmate în loc de salvarea implicită.
  onSave?: (fields: Record<string, string>) => void;
  // Apelat după o salvare reușită; primește id-ul clientului dacă e relevant.
  onComplete?: (clientId?: string) => void;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Mapează câmpurile OCR la câmpurile unui client (best-effort).
function ocrFieldsToClient(fields: Record<string, string>): NewClient {
  const out: NewClient = { nume: '', prenume: '', idnp: '', telefon: '', email: '', adresa: '' };
  for (const [k, v] of Object.entries(fields)) {
    const val = (v || '').trim();
    if (!val) continue;
    const key = norm(k);
    if (key.includes('idnp') || key.includes('idno') || key.includes('cod personal')) out.idnp = val.replace(/\D/g, '');
    else if (key.includes('prenume')) out.prenume = val;
    else if (key.includes('telefon') || key === 'tel') out.telefon = val;
    else if (key.includes('email') || key.includes('e-mail') || key.includes('mail')) out.email = val;
    else if (key.includes('adres') || key.includes('domicili')) out.adresa = val;
    else if (key.includes('nume complet') || key.includes('numele complet')) {
      const parts = val.split(/\s+/);
      if (!out.nume) out.nume = parts[0] || '';
      if (!out.prenume) out.prenume = parts.slice(1).join(' ');
    } else if (key === 'nume' || key === 'numele' || key.includes('nume de familie')) out.nume = val;
  }
  return out;
}

// Transformă textul extras în paragrafe HTML (păstrează structura pe rânduri,
// nu un singur bloc de „text aruncat").
function textToHtml(text: string): string {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return '';
  return lines.map((l) => `<p>${escapeHtml(l)}</p>`).join('\n');
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function OcrSplitView({ clientId, cases = [], mode = 'client', onSave, onComplete }: OcrSplitViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [editedText, setEditedText] = useState('');
  const [zoom, setZoom] = useState(100);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('none');

  // Cronometru pentru starea de procesare (ca utilizatorul să vadă progresul).
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  // Mod 'chooser' (pagina principală): alege destinația documentului scanat.
  const [destMode, setDestMode] = useState<'existing' | 'new'>('new');
  const [destClientId, setDestClientId] = useState<string>('');
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [newClient, setNewClient] = useState<NewClient>({ nume: '', prenume: '', idnp: '', telefon: '', email: '', adresa: '' });

  useEffect(() => {
    if (mode !== 'chooser') return;
    fetch('/api/clients').then((r) => r.json()).then((d) => setClientOptions(Array.isArray(d) ? d : [])).catch(() => {});
  }, [mode]);

  // Lățimea panoului din stânga (imaginea), ca procent — reglabilă prin tragere.
  const [leftPct, setLeftPct] = useState(55);
  const draggingRef = useRef(false);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(80, Math.max(20, pct)));
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Pas 1: selectarea fișierului — doar pregătim previzualizarea, NU procesăm automat.
  const selectFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fișierul depășește 10MB.');
      return;
    }
    const pdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    setImageUrl(URL.createObjectURL(file));
    setIsPdf(pdf);
    setSelectedFile(file);
    setResult(null);
    setError(null);
    setEditedFields({});
    setEditedText('');
    setZoom(100);
  };

  // Pas 2: procesarea OCR, declanșată explicit de utilizator
  const runOcr = async () => {
    if (!selectedFile) return;
    const pdf = isPdf;
    setResult(null);
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/ai/ocr', { method: 'POST', body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (res.status === 500 && body?.error?.toLowerCase?.().includes('api key')) {
          throw new Error('Cheia Anthropic (Claude) API nu este configurată pe server.');
        }
        throw new Error(
          pdf
            ? 'Procesarea PDF a eșuat. Încercați din nou sau un screenshot (JPG/PNG) al paginii.'
            : 'Procesare OCR eșuată. Încercați din nou sau alt fișier.'
        );
      }

      const data: OcrResult = await res.json();
      setResult(data);

      const initial: Record<string, string> = {};
      (data.campuri_identificate || []).forEach((f) => { initial[f.nume_camp] = f.valoare; });
      setEditedFields(initial);
      setEditedText(data.textul_complet || '');
      if (mode === 'chooser') {
        const mapped = ocrFieldsToClient(initial);
        setNewClient(mapped);
        // dacă avem măcar un nume, propunem crearea unui client nou
        setDestMode(mapped.nume || mapped.prenume || mapped.idnp ? 'new' : 'existing');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'OCR eșuat.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) selectFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) selectFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragActive) setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const resetView = () => {
    setImageUrl(null);
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setEditedFields({});
    setEditedText('');
    setSelectedCaseId('none');
    setIsPdf(false);
  };

  const getConfidenceInfo = (confidence: number) => {
    if (confidence >= 0.9) return { color: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle, label: `${Math.round(confidence * 100)}%` };
    if (confidence >= 0.75) return { color: 'text-amber-600 dark:text-amber-400', icon: AlertTriangle, label: `${Math.round(confidence * 100)}%` };
    return { color: 'text-red-500 dark:text-red-400', icon: AlertTriangle, label: `${Math.round(confidence * 100)}%` };
  };

  // Salvează documentul OCR la un client (+ dosar opțional)
  const saveDocument = async (targetClientId: string, targetCaseId?: string | null) => {
    const tip = result!.tip_document && result!.tip_document !== 'alt' ? result!.tip_document : 'document';
    const originalImage = selectedFile ? await fileToDataUrl(selectedFile) : null;
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nume: `Scanare OCR — ${tip}`,
        tip,
        categorie: 'ocr',
        clientId: targetClientId,
        caseId: targetCaseId || null,
        textContent: editedText || result!.textul_complet,
        htmlContent: textToHtml(editedText || result!.textul_complet),
        ocrFields: JSON.stringify(editedFields),
        originalImage,
      }),
    });
    if (!res.ok) throw new Error();
  };

  // Pas 3: confirmarea & salvarea datelor extrase
  const handleSave = async () => {
    if (!result) return;

    // Cale custom (ex. completarea unui formular din afară)
    if (onSave) {
      onSave(editedFields);
      toast.success('Date confirmate');
      onComplete?.();
      return;
    }

    // Mod 'chooser' (pagina principală): client nou sau existent
    if (mode === 'chooser') {
      setSaving(true);
      try {
        let targetClientId = destClientId;
        if (destMode === 'new') {
          if (newClient.nume.trim().length < 2 || newClient.prenume.trim().length < 2) {
            toast.error('Numele și prenumele clientului sunt obligatorii (min. 2 caractere).');
            setSaving(false);
            return;
          }
          const cRes = await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nume: newClient.nume.trim(),
              prenume: newClient.prenume.trim(),
              idnp: /^\d{13}$/.test(newClient.idnp) ? newClient.idnp : '',
              telefon: newClient.telefon,
              email: newClient.email.includes('@') ? newClient.email : '',
              adresa: newClient.adresa,
            }),
          });
          if (!cRes.ok) throw new Error('client');
          targetClientId = (await cRes.json()).id;
        } else if (!targetClientId) {
          toast.error('Selectați un client.');
          setSaving(false);
          return;
        }
        await saveDocument(targetClientId);
        toast.success(destMode === 'new' ? 'Client creat și document salvat' : 'Document salvat la client');
        resetView();
        onComplete?.(targetClientId);
      } catch {
        toast.error('Eroare la salvare.');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!clientId) {
      toast.success('Date confirmate');
      onComplete?.();
      return;
    }

    setSaving(true);
    try {
      await saveDocument(clientId, selectedCaseId !== 'none' ? selectedCaseId : null);
      toast.success(
        selectedCaseId !== 'none'
          ? 'Document salvat și atașat la dosar'
          : 'Document salvat la profilul clientului'
      );
      resetView();
      onComplete?.();
    } catch {
      toast.error('Eroare la salvarea documentului.');
    } finally {
      setSaving(false);
    }
  };

  const fields = result?.campuri_identificate ?? [];
  const canSave = !!result && (fields.length > 0 || editedText.trim().length > 0);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Upload zone */}
      {!imageUrl && !loading && (
        <div
          className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-900/30'
              : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/30 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-600'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40">
            <Upload className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900 dark:text-white">
              {dragActive ? 'Eliberați fișierul aici' : 'Trage un fișier aici sau click pentru a selecta'}
            </p>
            <p className="mt-1 text-sm text-slate-500">Acceptă: JPG, PNG, HEIC, PDF • Max 10MB</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Procesare OCR cu Claude AI... <span className="font-mono text-indigo-600">{elapsed}s</span>
          </p>
          <p className="max-w-xs text-center text-xs text-slate-400">
            {isPdf
              ? 'Extragem textul și câmpurile. Documentele scanate (poze) pot dura mai mult.'
              : 'Analizăm imaginea și extragem câmpurile.'}
          </p>
          <div className="w-48">
            <Progress value={null} className="h-1.5 animate-pulse" />
          </div>
        </div>
      )}

      {/* Split view */}
      {imageUrl && !loading && (
        <div ref={splitRef} className="flex flex-1 gap-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          {/* Left: Image */}
          <div className="flex flex-col overflow-hidden" style={{ width: `${leftPct}%` }}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Document original</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(50, z - 25))}>
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-slate-500 w-10 text-center">{zoom}%</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(300, z + 25))}>
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setZoom(100)}>
                  Resetează
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetView}>
                  Alt fișier
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900 p-4">
              {isPdf ? (
                <iframe
                  src={imageUrl}
                  title="Document PDF"
                  className="h-full w-full rounded border border-slate-200 bg-white dark:border-slate-700"
                  style={{ minHeight: 480 }}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={imageUrl}
                  alt="Document original"
                  style={{ width: `${zoom}%`, transformOrigin: 'top left' }}
                  className="rounded shadow-sm mx-auto block"
                />
              )}
            </div>
          </div>

          {/* Divider — tragere pentru a redimensiona panourile */}
          <div
            onMouseDown={startDrag}
            className="group relative w-1.5 shrink-0 cursor-col-resize bg-slate-200 transition-colors hover:bg-indigo-400 dark:bg-slate-800 dark:hover:bg-indigo-500"
            title="Trage pentru a redimensiona"
          >
            <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
            <div className="absolute top-1/2 left-1/2 flex h-8 w-3 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-900">
              <div className="h-3 w-0.5 rounded bg-slate-400" />
            </div>
          </div>

          {/* Right: Fields */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {result ? 'Rezultat extragere' : 'Pregătit pentru procesare'}
                </span>
                {result?.tip_document && (
                  <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs">
                    {result.tip_document.toUpperCase()}
                  </Badge>
                )}
              </div>
              {result && fields.length > 0 && (
                <span className="text-xs text-slate-400">{fields.length} câmpuri</span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Confirmare ÎNAINTE de procesare */}
              {!result && !error && (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                    <ScanLine className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Document pregătit</p>
                    <p className="mt-1 max-w-xs text-xs text-slate-500">
                      Verificați documentul din stânga (zoom +/−). Procesarea OCR pornește doar după confirmarea dvs.
                    </p>
                    {selectedFile && (
                      <p className="mt-2 text-[11px] text-slate-400 truncate max-w-[240px] mx-auto">{selectedFile.name}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={resetView}>Alt fișier</Button>
                    <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700" onClick={runOcr}>
                      <ScanLine className="h-3.5 w-3.5" /> Procesează documentul
                    </Button>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">OCR nu a putut fi finalizat</p>
                    <p className="mt-1 max-w-xs text-xs text-slate-500">{error}</p>
                  </div>
                  <div className="flex gap-2">
                    {selectedFile && (
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={runOcr}>
                        <RefreshCw className="h-3.5 w-3.5" /> Reîncearcă
                      </Button>
                    )}
                    <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700" onClick={resetView}>
                      <FileText className="h-3.5 w-3.5" /> Alt fișier
                    </Button>
                  </div>
                </div>
              )}

              {/* Rezultat: câmpuri (dacă există) + textul extras (mereu) */}
              {result && (
                <div className="space-y-5">
                  {fields.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Câmpuri detectate</p>
                      {fields.map((field) => {
                        const conf = getConfidenceInfo(field.confidence);
                        const ConfIcon = conf.icon;
                        const needsReview = field.confidence < 0.8;
                        return (
                          <div key={field.nume_camp} className={`space-y-1.5 rounded-lg p-3 transition-colors ${needsReview ? 'bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' : 'bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700'}`}>
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{field.nume_camp}</label>
                              <div className={`flex items-center gap-1 ${conf.color}`}>
                                <ConfIcon className="h-3 w-3" />
                                <span className="text-xs font-medium">{conf.label}</span>
                              </div>
                            </div>
                            <Input
                              value={editedFields[field.nume_camp] ?? field.valoare}
                              onChange={(e) => setEditedFields((prev) => ({ ...prev, [field.nume_camp]: e.target.value }))}
                              className={`h-8 text-sm ${needsReview ? 'border-amber-300 focus-visible:ring-amber-400 dark:border-amber-700' : ''}`}
                            />
                            {field.locatie && <p className="text-[10px] text-slate-400">📍 {field.locatie}</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Textul complet — întotdeauna disponibil și editabil */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Text extras (editabil)</p>
                    <Textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="min-h-[260px] text-sm leading-relaxed"
                      placeholder="Textul extras din document..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Pas 3: confirmare salvare / renunțare — DUPĂ procesare */}
            {result && (
              <div className="space-y-3 border-t border-slate-200 p-4 dark:border-slate-800">
                {/* Mod 'chooser' (pagina principală): destinația documentului */}
                {mode === 'chooser' && (
                  <div className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={destMode === 'new' ? 'default' : 'outline'}
                        size="sm"
                        className={destMode === 'new' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                        onClick={() => setDestMode('new')}
                      >
                        <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Client nou
                      </Button>
                      <Button
                        type="button"
                        variant={destMode === 'existing' ? 'default' : 'outline'}
                        size="sm"
                        className={destMode === 'existing' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                        onClick={() => setDestMode('existing')}
                      >
                        <Users className="mr-1.5 h-3.5 w-3.5" /> Client existent
                      </Button>
                    </div>

                    {destMode === 'new' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Nume *" value={newClient.nume} onChange={(e) => setNewClient((f) => ({ ...f, nume: e.target.value }))} className="h-8 text-sm" />
                        <Input placeholder="Prenume *" value={newClient.prenume} onChange={(e) => setNewClient((f) => ({ ...f, prenume: e.target.value }))} className="h-8 text-sm" />
                        <Input placeholder="IDNP" value={newClient.idnp} onChange={(e) => setNewClient((f) => ({ ...f, idnp: e.target.value }))} className="h-8 text-sm" />
                        <Input placeholder="Telefon" value={newClient.telefon} onChange={(e) => setNewClient((f) => ({ ...f, telefon: e.target.value }))} className="h-8 text-sm" />
                        <Input placeholder="Email" value={newClient.email} onChange={(e) => setNewClient((f) => ({ ...f, email: e.target.value }))} className="h-8 text-sm" />
                        <Input placeholder="Adresă" value={newClient.adresa} onChange={(e) => setNewClient((f) => ({ ...f, adresa: e.target.value }))} className="h-8 text-sm" />
                      </div>
                    ) : (
                      <Select value={destClientId} onValueChange={(v) => setDestClientId(v ?? '')}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Selectează clientul..." /></SelectTrigger>
                        <SelectContent>
                          {clientOptions.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.prenume} {c.nume}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {mode === 'client' && cases.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Atașează la dosar (opțional)</label>
                    <Select value={selectedCaseId} onValueChange={(v) => setSelectedCaseId(v ?? 'none')}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Doar la profilul clientului</SelectItem>
                        {cases.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.numar} — {c.denumire}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="gap-2" disabled={saving} onClick={resetView}>
                    <X className="h-4 w-4" /> Renunță
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || !canSave}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2"
                  >
                    <Check className="h-4 w-4" />
                    {saving
                      ? 'Se salvează...'
                      : onSave
                        ? 'Confirmă datele'
                        : mode === 'chooser'
                          ? (destMode === 'new' ? 'Creează client și salvează' : 'Salvează la client')
                          : clientId
                            ? 'Confirmă și salvează'
                            : 'Confirmă datele'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
