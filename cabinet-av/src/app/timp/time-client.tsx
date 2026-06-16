'use client';

import { useState } from 'react';
import { Play, Square, Filter, Download, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppStore } from '@/store/app-store';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

export function TimeClient({ initialEntries, clients, cases }: { initialEntries: any[], clients: any[], cases: any[] }) {
  const { activeTimer, startTimer, stopTimer } = useAppStore();
  const [filter, setFilter] = useState('');

  const formatDuration = (seconds: number) => {
    if (!seconds) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Evidența Timpului</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Înregistrați și gestionați timpul alocat pe clienți și dosare.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Exportă Raport</Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700"><Plus className="mr-2 h-4 w-4" /> Adaugă Manual</Button>
        </div>
      </div>

      {/* Timer Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-4">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full ${activeTimer.isRunning ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 animate-pulse' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
              <Clock className="h-8 w-8" />
            </div>
            <div>
              <div className="text-4xl font-mono font-bold tracking-tight text-slate-900 dark:text-white">
                {formatDuration(activeTimer.elapsed)}
              </div>
              <p className="text-sm font-medium text-slate-500">
                {activeTimer.isRunning ? 'Timer activ' : 'Timer oprit'}
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center justify-end">
             <div className="flex-1 w-full max-w-[200px]">
                {/* Selectors for Client, Case, Category placeholder */}
                <Input placeholder="Descriere activitate..." disabled={activeTimer.isRunning} />
             </div>
             {activeTimer.isRunning ? (
               <Button size="lg" variant="destructive" onClick={stopTimer} className="gap-2 w-full md:w-auto h-12 px-8">
                 <Square className="h-5 w-5 fill-current" /> Oprește
               </Button>
             ) : (
               <Button size="lg" onClick={() => startTimer()} className="gap-2 bg-emerald-600 hover:bg-emerald-700 w-full md:w-auto h-12 px-8">
                 <Play className="h-5 w-5 fill-current" /> Pornește
               </Button>
             )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
         <Input placeholder="Filtrează după client, dosar..." className="max-w-xs" />
         <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dată / Activitate</TableHead>
              <TableHead>Client / Dosar</TableHead>
              <TableHead>Categorie</TableHead>
              <TableHead>Facturabil</TableHead>
              <TableHead className="text-right">Durată</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <div className="font-medium">{format(new Date(entry.startTime), 'dd MMM yyyy', { locale: ro })}</div>
                  <div className="text-xs text-slate-500">{entry.descriere || 'Fără descriere'}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{entry.client ? `${entry.client.prenume} ${entry.client.nume}` : '-'}</div>
                  <div className="text-xs text-slate-500">{entry.case ? entry.case.numar : '-'}</div>
                </TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{entry.categorie}</Badge></TableCell>
                <TableCell>{entry.facturabil ? <Badge className="bg-emerald-500">Da</Badge> : <Badge variant="secondary">Nu</Badge>}</TableCell>
                <TableCell className="text-right font-mono font-medium">{formatDuration(entry.durata)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
