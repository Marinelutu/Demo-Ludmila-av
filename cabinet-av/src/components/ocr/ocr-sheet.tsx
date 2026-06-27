'use client';

import { useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScanLine, Maximize2, Minimize2, GripVertical } from 'lucide-react';
import { OcrSplitView } from '@/components/ocr/ocr-split-view';

interface CaseOption { id: string; numar: string; denumire: string }

interface OcrSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  clientId?: string;
  cases?: CaseOption[];
  mode?: 'client' | 'chooser';
  onComplete?: (clientId?: string) => void;
}

export function OcrSheet({
  open, onOpenChange, title = 'OCR — Digitalizare document', clientId, cases, mode, onComplete,
}: OcrSheetProps) {
  // Lățimea panoului (în px) — reglabilă prin tragerea marginii din stânga.
  const [width, setWidth] = useState(1024);
  const [maximized, setMaximized] = useState(false);
  const draggingRef = useRef(false);

  // Panoul e ancorat în dreapta: marginea stângă la x = innerWidth - width.
  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const w = window.innerWidth - ev.clientX;
      setWidth(Math.min(window.innerWidth - 40, Math.max(420, w)));
    };
    const onUp = () => {
      draggingRef.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="p-0 flex flex-col max-w-none!"
        style={{ width: maximized ? '100vw' : `${width}px`, maxWidth: '100vw' }}
      >
        {/* Mâner de redimensionare pe marginea STÂNGĂ a panoului */}
        {!maximized && (
          <div
            onMouseDown={startDrag}
            className="group absolute left-0 top-0 z-30 flex h-full w-2 cursor-col-resize items-center justify-center bg-transparent hover:bg-indigo-400/30"
            title="Trage pentru a redimensiona panoul"
          >
            <div className="flex h-10 w-4 -translate-x-1 items-center justify-center rounded-full border border-slate-300 bg-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:border-slate-600 dark:bg-slate-900">
              <GripVertical className="h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        )}

        <SheetHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-indigo-600" />
              {title}
            </SheetTitle>
            <Button variant="ghost" size="sm" className="mr-8 gap-1.5 text-slate-500" onClick={() => setMaximized((v) => !v)}>
              {maximized ? <><Minimize2 className="h-4 w-4" /> Restrânge</> : <><Maximize2 className="h-4 w-4" /> Extinde</>}
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden p-6">
          <OcrSplitView clientId={clientId} cases={cases} mode={mode} onComplete={onComplete} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
