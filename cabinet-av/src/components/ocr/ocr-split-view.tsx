'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, CheckCircle, AlertTriangle, ZoomIn, ZoomOut, Check, FileText, RefreshCw } from 'lucide-react';

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

interface OcrSplitViewProps {
  clientId?: string;
  onSave?: (fields: Record<string, string>) => void;
}

export function OcrSplitView({ clientId, onSave }: OcrSplitViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [zoom, setZoom] = useState(100);
  const [dragActive, setDragActive] = useState(false);
  const [lastFile, setLastFile] = useState<File | null>(null);

  const processFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fișierul depășește 10MB.');
      return;
    }
    const pdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    setImageUrl(URL.createObjectURL(file));
    setIsPdf(pdf);
    setLastFile(file);
    setResult(null);
    setError(null);
    setEditedFields({});
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/ai/ocr', { method: 'POST', body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (res.status === 500 && body?.error?.includes('API key')) {
          throw new Error('Cheia Gemini API nu este configurată pe server.');
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'OCR eșuat.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
    // reset, ca selectarea aceluiași fișier să declanșeze din nou onChange
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
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
    setResult(null);
    setError(null);
    setIsPdf(false);
  };

  const getConfidenceInfo = (confidence: number) => {
    if (confidence >= 0.9) return { color: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle, label: `${Math.round(confidence * 100)}%` };
    if (confidence >= 0.75) return { color: 'text-amber-600 dark:text-amber-400', icon: AlertTriangle, label: `${Math.round(confidence * 100)}%` };
    return { color: 'text-red-500 dark:text-red-400', icon: AlertTriangle, label: `${Math.round(confidence * 100)}%` };
  };

  const handleSave = () => {
    if (onSave) {
      onSave(editedFields);
      toast.success('Date salvate la profilul clientului');
    } else {
      toast.success('Date confirmate');
    }
  };

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
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Procesare OCR cu Gemini AI...</p>
          <div className="w-48">
            <Progress value={null} className="h-1.5 animate-pulse" />
          </div>
        </div>
      )}

      {/* Split view */}
      {imageUrl && !loading && (
        <div className="flex flex-1 gap-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          {/* Left: Image */}
          <div className="flex w-1/2 flex-col border-r border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Document original</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(50, z - 25))}>
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-slate-500 w-10 text-center">{zoom}%</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(200, z + 25))}>
                  <ZoomIn className="h-3.5 w-3.5" />
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

          {/* Right: Fields */}
          <div className="flex w-1/2 flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Câmpuri detectate</span>
                {result?.tip_document && (
                  <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs">
                    {result.tip_document.toUpperCase()}
                  </Badge>
                )}
              </div>
              {result && (
                <span className="text-xs text-slate-400">{result.campuri_identificate.length} câmpuri</span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!result && error && (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">OCR nu a putut fi finalizat</p>
                    <p className="mt-1 max-w-xs text-xs text-slate-500">{error}</p>
                  </div>
                  <div className="flex gap-2">
                    {lastFile && (
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => processFile(lastFile)}>
                        <RefreshCw className="h-3.5 w-3.5" /> Reîncearcă
                      </Button>
                    )}
                    <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700" onClick={resetView}>
                      <FileText className="h-3.5 w-3.5" /> Alt fișier
                    </Button>
                  </div>
                </div>
              )}

              {!result && !error && (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-400">
                  <FileText className="h-8 w-8" />
                  <p className="text-sm">Câmpurile detectate vor apărea aici.</p>
                </div>
              )}

              {result && result.parse_error && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:bg-amber-900/20 dark:border-amber-800">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Text extras (fără structurare):</p>
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-400 whitespace-pre-wrap">{result.textul_complet}</p>
                </div>
              )}

              {result && !result.parse_error && (
                <div className="space-y-4">
                  {result.campuri_identificate.map((field) => {
                    const conf = getConfidenceInfo(field.confidence);
                    const ConfIcon = conf.icon;
                    const needsReview = field.confidence < 0.8;
                    return (
                      <div key={field.nume_camp} className={`space-y-1.5 rounded-lg p-3 transition-colors ${needsReview ? 'bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' : 'bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700'}`}>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {field.nume_camp}
                          </label>
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
                        {field.locatie && (
                          <p className="text-[10px] text-slate-400">📍 {field.locatie}</p>
                        )}
                      </div>
                    );
                  })}

                  {result.campuri_identificate.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-8">Nu s-au detectat câmpuri structurate.</p>
                  )}
                </div>
              )}
            </div>

            {result && !result.parse_error && (
              <div className="border-t border-slate-200 p-4 dark:border-slate-800">
                <Button onClick={handleSave} className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2">
                  <Check className="h-4 w-4" />
                  {clientId ? 'Confirmă și salvează la profil client' : 'Confirmă datele'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
