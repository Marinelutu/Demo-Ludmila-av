'use client';

import { useState } from 'react';
import { Sparkles, Loader2, User, Calendar, ChevronRight, Lightbulb, ListChecks, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface Analysis {
  rezumat: string;
  client_potrivit_id: string | null;
  sfaturi_juridice: string[];
  urmatori_pasi: string[];
  termen_extras: string | null;
  termen_descriere: string | null;
  tip_document: string;
  confidence: 'high' | 'medium' | 'low';
}

interface DocumentAIPanelProps {
  documentId: string;
  initialOcrFields?: string | null;
  initialOcrStatus?: string | null;
  initialClientName?: string | null;
}

function parseAnalysis(ocrFields: string | null | undefined): Analysis | null {
  if (!ocrFields) return null;
  try {
    return JSON.parse(ocrFields);
  } catch {
    return null;
  }
}

export function DocumentAIPanel({
  documentId,
  initialOcrFields,
  initialOcrStatus,
  initialClientName,
}: DocumentAIPanelProps) {
  const [loading, setLoading] = useState(false);
  const [ocrFields, setOcrFields] = useState(initialOcrFields);
  const [ocrStatus, setOcrStatus] = useState(initialOcrStatus);
  const [clientName, setClientName] = useState(initialClientName);
  const [error, setError] = useState<string | null>(null);

  const analysis = parseAnalysis(ocrFields);
  const isProcessed = ocrStatus === 'ai_processed' && !!analysis;

  const handleProcess = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/process-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Eroare la procesare');
      }
      const data = await res.json();
      setOcrFields(data.ocrFields);
      setOcrStatus(data.ocrStatus);
      if (data.client) {
        setClientName(`${data.client.prenume} ${data.client.nume}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare necunoscută');
    } finally {
      setLoading(false);
    }
  };

  if (!isProcessed) {
    return (
      <div className="w-72 shrink-0 flex flex-col rounded-lg border border-dashed border-indigo-200 bg-indigo-50/40 p-5 dark:border-indigo-800/40 dark:bg-indigo-950/10">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">Analiză AI</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
          Procesați documentul cu AI pentru a extrage: client asociat, sfaturi juridice, pași următori și termene.
        </p>
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mb-3 bg-red-50 dark:bg-red-950/20 rounded p-2">
            {error}
          </p>
        )}
        <Button
          size="sm"
          className="gap-2 bg-indigo-600 hover:bg-indigo-700 w-full"
          onClick={handleProcess}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading ? 'Se procesează...' : 'Procesează cu AI'}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-72 shrink-0 flex flex-col gap-3 overflow-y-auto rounded-lg border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-800/40 dark:bg-indigo-950/10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Analiză AI</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-slate-400 hover:text-slate-600"
          onClick={handleProcess}
          disabled={loading}
          title="Re-procesează"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Type + confidence */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="capitalize text-[11px] bg-white dark:bg-slate-900">
          {analysis.tip_document}
        </Badge>
        <Badge
          variant="outline"
          className={`text-[11px] ${
            analysis.confidence === 'high'
              ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20'
              : analysis.confidence === 'medium'
              ? 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/20'
              : 'border-slate-300 text-slate-600'
          }`}
        >
          {analysis.confidence === 'high' ? 'Certitudine mare' : analysis.confidence === 'medium' ? 'Certitudine medie' : 'Certitudine mică'}
        </Badge>
      </div>

      {/* Summary */}
      <div className="rounded-lg bg-white/70 dark:bg-slate-900/40 p-3 border border-indigo-100 dark:border-indigo-900/30">
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{analysis.rezumat}</p>
      </div>

      {/* Client */}
      {clientName && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 px-3 py-2">
          <User className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Client identificat</p>
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{clientName}</p>
          </div>
        </div>
      )}

      {/* Deadline */}
      {analysis.termen_extras && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 px-3 py-2">
          <Calendar className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Termen extras</p>
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
              {format(new Date(analysis.termen_extras), 'dd MMMM yyyy', { locale: ro })}
            </p>
            {analysis.termen_descriere && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{analysis.termen_descriere}</p>
            )}
          </div>
        </div>
      )}

      {/* Legal advice */}
      {analysis.sfaturi_juridice?.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Sfaturi juridice</p>
          </div>
          <ul className="space-y-1.5">
            {analysis.sfaturi_juridice.map((sfat, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                <ChevronRight className="h-3 w-3 shrink-0 mt-0.5 text-indigo-400" />
                {sfat}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next steps */}
      {analysis.urmatori_pasi?.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <ListChecks className="h-3.5 w-3.5 text-indigo-500" />
            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Pași următori</p>
          </div>
          <ol className="space-y-1.5">
            {analysis.urmatori_pasi.map((pas, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                <span className="shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 text-[9px] font-bold mt-0.5">
                  {i + 1}
                </span>
                {pas}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
