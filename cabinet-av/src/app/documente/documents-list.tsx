'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, FileText, Grid, List, MoreHorizontal, Upload, ScanLine, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardFooter } from '@/components/ui/card';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { GenerateDocumentModal } from '@/components/editor/generate-document-modal';
import { OcrSheet } from '@/components/ocr/ocr-sheet';

export function DocumentsListClient({ initialDocuments }: { initialDocuments: Record<string, unknown>[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);

  const handleDeleteDoc = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/documents?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Document șters');
      router.refresh();
    } catch {
      toast.error('Eroare la ștergerea documentului.');
    }
  };

  const downloadPdf = (doc: Record<string, unknown>) => {
    const a = document.createElement('a');
    a.href = `/api/documents/${doc.id}/pdf`;
    a.download = `${String(doc.nume)}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const filteredDocs = useMemo(() => {
    if (search.length < 2) return initialDocuments;
    const q = search.toLowerCase();
    return initialDocuments.filter((d) =>
      String(d.nume).toLowerCase().includes(q) ||
      (d.textContent && String(d.textContent).toLowerCase().includes(q)) ||
      (d.client && `${(d.client as Record<string, string>).prenume} ${(d.client as Record<string, string>).nume}`.toLowerCase().includes(q))
    );
  }, [initialDocuments, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Documente</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gestionați documentele, contractele și probele.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setOcrOpen(true)}>
            <ScanLine className="h-4 w-4" /> OCR Digitalizare
          </Button>
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" /> Încarcă fișier
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2" onClick={() => setGenerateOpen(true)}>
            <Plus className="h-4 w-4" /> Generează Document AI
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Caută în numele și conținutul documentelor..."
            className="pl-10 py-6 text-base"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg dark:bg-slate-800">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className={`h-8 w-8 ${viewMode === 'list' ? 'bg-white shadow-sm dark:bg-slate-700' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className={`h-8 w-8 ${viewMode === 'grid' ? 'bg-white shadow-sm dark:bg-slate-700' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {filteredDocs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="h-64 flex items-center justify-center">
            <EmptyState
              icon={FileText}
              title="Niciun document găsit"
              description={search ? `Nu am găsit rezultate pentru "${search}".` : 'Generați primul document cu AI sau încărcați un fișier.'}
            />
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nume Document</TableHead>
                <TableHead>Client / Dosar</TableHead>
                <TableHead>Categorie</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.map((doc) => (
                <TableRow
                  key={String(doc.id)}
                  className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  onClick={() => router.push(`/documente/${doc.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-500 dark:bg-slate-800">
                        <FileText className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white">{String(doc.nume)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-300">
                        {doc.client ? `${(doc.client as Record<string, string>).prenume} ${(doc.client as Record<string, string>).nume}` : '-'}
                      </span>
                      <span className="text-xs text-slate-500 truncate max-w-[200px]">
                        {doc.case ? String((doc.case as Record<string, string>).numar) : '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize bg-slate-50 dark:bg-slate-900">
                      {String(doc.categorie || doc.tip)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {format(new Date(String(doc.createdAt)), 'dd MMM yyyy', { locale: ro })}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/documente/${doc.id}`)}>Deschide</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadPdf(doc)}>
                          <Download className="mr-2 h-4 w-4" /> Descarcă PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(doc)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Șterge
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredDocs.map((doc) => (
            <Card
              key={String(doc.id)}
              className="cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all dark:hover:border-indigo-700 overflow-hidden"
              onClick={() => router.push(`/documente/${doc.id}`)}
            >
              <div className="aspect-[3/4] w-full bg-slate-100 relative dark:bg-slate-800 flex flex-col">
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="text-[10px] bg-white/80 backdrop-blur-sm dark:bg-slate-950/80">
                    {String(doc.tip)}
                  </Badge>
                </div>
                <div className="absolute top-2 left-2" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button variant="ghost" size="icon" className="h-7 w-7 bg-white/80 backdrop-blur-sm dark:bg-slate-950/80">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => router.push(`/documente/${doc.id}`)}>Deschide</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => downloadPdf(doc)}>
                        <Download className="mr-2 h-4 w-4" /> Descarcă PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(doc)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Șterge
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex-1 p-4 overflow-hidden">
                  <div className="w-full h-2 bg-slate-200 rounded mb-2 dark:bg-slate-700" />
                  <div className="w-3/4 h-2 bg-slate-200 rounded mb-4 dark:bg-slate-700" />
                  <div className="space-y-1.5 opacity-60">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className={`h-1.5 bg-slate-200 rounded dark:bg-slate-700 ${i % 3 === 2 ? 'w-5/6' : 'w-full'}`} />
                    ))}
                  </div>
                </div>
              </div>
              <CardFooter className="p-3 border-t bg-white dark:bg-slate-950 flex flex-col items-start gap-1">
                <p className="text-sm font-medium text-slate-900 truncate w-full dark:text-white">
                  {String(doc.nume)}
                </p>
                <div className="flex items-center justify-between w-full text-xs text-slate-500">
                  <span className="truncate">
                    {doc.client ? (doc.client as Record<string, string>).prenume : 'Nespecificat'}
                  </span>
                  <span>{format(new Date(String(doc.createdAt)), 'dd.MM')}</span>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Generate Document Modal */}
      <GenerateDocumentModal open={generateOpen} onOpenChange={setGenerateOpen} />

      {/* OCR Sheet */}
      <OcrSheet
        open={ocrOpen}
        onOpenChange={setOcrOpen}
        mode="chooser"
        onComplete={(clientId) => {
          setOcrOpen(false);
          if (clientId) router.push(`/clienti/${clientId}`);
          else router.refresh();
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Ștergi documentul?"
        description={`„${String(deleteTarget?.nume ?? '')}" va fi șters definitiv. Acțiunea nu poate fi anulată.`}
        confirmLabel="Șterge definitiv"
        onConfirm={handleDeleteDoc}
      />
    </div>
  );
}
