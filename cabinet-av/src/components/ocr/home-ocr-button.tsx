'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScanLine } from 'lucide-react';
import { OcrSheet } from '@/components/ocr/ocr-sheet';

export function HomeOcrButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <ScanLine className="h-4 w-4 text-indigo-600" /> Scanează document (OCR)
      </Button>

      <OcrSheet
        open={open}
        onOpenChange={setOpen}
        title="OCR — Scanare document"
        mode="chooser"
        onComplete={(clientId) => {
          setOpen(false);
          if (clientId) router.push(`/clienti/${clientId}`);
          else router.refresh();
        }}
      />
    </>
  );
}
