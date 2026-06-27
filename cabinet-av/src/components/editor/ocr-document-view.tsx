'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DocumentEditor } from '@/components/editor/document-editor';
import { Image as ImageIcon, FileText, ArrowLeft, ZoomIn, ZoomOut } from 'lucide-react';

interface OcrDocumentViewProps {
  documentId: string;
  originalImage: string; // data URL (imagine sau PDF)
  htmlContent: string;
  fields: Record<string, string>;
}

export function OcrDocumentView({ documentId, originalImage, htmlContent, fields }: OcrDocumentViewProps) {
  const [showText, setShowText] = useState(false);
  const [zoom, setZoom] = useState(100);
  const isPdf = originalImage.startsWith('data:application/pdf');
  const fieldEntries = Object.entries(fields).filter(([, v]) => v?.trim());

  // Vizualizarea textului extras — editor complet (salvare/print/PDF din bara de sus)
  if (showText) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-950 print:hidden">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => setShowText(false)}>
            <ArrowLeft className="h-4 w-4" /> Înapoi la imagine
          </Button>
          <Badge variant="outline" className="text-xs">Text extras — editabil</Badge>
        </div>
        <div className="flex-1 overflow-hidden">
          <DocumentEditor initialContent={htmlContent || '<p>Fără text extras.</p>'} documentId={documentId} />
        </div>
      </div>
    );
  }

  // Vizualizarea imaginii originale (implicit)
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <ImageIcon className="h-4 w-4 text-indigo-600" /> Imagine originală (document scanat)
        </div>
        <div className="flex items-center gap-1">
          {!isPdf && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(50, z - 25))}>
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="w-10 text-center text-xs text-slate-500">{zoom}%</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(300, z + 25))}>
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <Button size="sm" className="ml-2 gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={() => setShowText(true)}>
            <FileText className="h-3.5 w-3.5" /> Editează text extras
          </Button>
        </div>
      </div>

      {fieldEntries.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
          {fieldEntries.map(([k, v]) => (
            <span key={k} className="rounded-md bg-white px-2 py-1 text-xs text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
              <span className="font-semibold text-slate-500">{k}:</span> {v}
            </span>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto bg-slate-100 p-6 dark:bg-slate-900">
        {isPdf ? (
          <iframe src={originalImage} title="Document original" className="h-full w-full rounded border border-slate-200 bg-white dark:border-slate-700" style={{ minHeight: 600 }} />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={originalImage} alt="Document scanat" style={{ width: `${zoom}%`, transformOrigin: 'top center' }} className="mx-auto block rounded shadow-sm" />
        )}
      </div>
    </div>
  );
}
