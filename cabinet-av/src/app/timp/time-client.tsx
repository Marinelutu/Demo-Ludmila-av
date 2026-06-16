'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Square, Filter, Download, Plus, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store/app-store';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { toast } from 'sonner';

const TARIF_ORAR = 800; // lei/h

interface TimeEntry {
  id: string;
  startTime: string;
  durata: number | null;
  descriere: string | null;
  categorie: string;
  automatic: boolean;
  client: { prenume: string; nume: string } | null;
  case: { numar: string; denumire: string } | null;
}

function formatDuration(seconds: number) {
  if (!seconds) return '0:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function TimeClient({
  initialEntries,
}: {
  initialEntries: TimeEntry[];
  clients?: unknown[];
  cases?: unknown[];
}) {
  const { activeTimer, startTimer, stopTimer } = useAppStore();
  const [filter, setFilter] = useState('');
  const [elapsed, setElapsed] = useState(activeTimer.elapsed);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (activeTimer.isRunning) {
      const start = Date.now() - (activeTimer.elapsed * 1000);
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setElapsed(activeTimer.elapsed);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeTimer.isRunning, activeTimer.elapsed]);

  const filtered = initialEntries.filter(e => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      e.client?.prenume.toLowerCase().includes(q) ||
      e.client?.nume.toLowerCase().includes(q) ||
      e.case?.numar.toLowerCase().includes(q) ||
      e.descriere?.toLowerCase().includes(q)
    );
  });

  const totalSeconds = initialEntries.reduce((s, e) => s + (e.durata || 0), 0);
  const totalHours = totalSeconds / 3600;
  const totalOnorariu = totalHours * TARIF_ORAR;

  // Per-client totals
  const clientTotals = initialEntries.reduce<Record<string, { name: string; seconds: number }>>((acc, e) => {
    if (!e.client) return acc;
    const key = `${e.client.prenume} ${e.client.nume}`;
    if (!acc[key]) acc[key] = { name: key, seconds: 0 };
    acc[key].seconds += e.durata || 0;
    return acc;
  }, {});

  const handleExport = () => {
    window.open('/api/export/time', '_blank');
    toast.success('Raport CSV descărcat');
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
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Exportă CSV
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="mr-2 h-4 w-4" /> Adaugă Manual
          </Button>
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
                {formatDuration(elapsed)}
              </div>
              <p className="text-sm font-medium text-slate-500">
                {activeTimer.isRunning ? 'Timer activ' : 'Timer oprit'}
              </p>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center justify-end">
            <div className="flex-1 w-full max-w-[200px]">
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total ore înregistrate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalHours.toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Onorariu estimat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {totalOnorariu.toLocaleString('ro-RO')} lei
            </div>
            <p className="text-xs text-slate-400 mt-1">la {TARIF_ORAR} lei/h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" /> Per client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.values(clientTotals).map(c => (
                <div key={c.name} className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 dark:text-slate-400 truncate">{c.name}</span>
                  <span className="font-medium text-slate-900 dark:text-white ml-2 shrink-0">
                    {(c.seconds / 3600).toFixed(1)}h — {((c.seconds / 3600) * TARIF_ORAR).toLocaleString('ro-RO')} lei
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Filtrează după client, dosar..."
          className="max-w-xs"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
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
              <TableHead>Onorariu</TableHead>
              <TableHead className="text-right">Durată</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((entry) => {
              const hours = (entry.durata || 0) / 3600;
              const onorariu = hours * TARIF_ORAR;
              return (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="font-medium">{format(new Date(entry.startTime), 'dd MMM yyyy', { locale: ro })}</div>
                    <div className="text-xs text-slate-500">{entry.descriere || 'Fără descriere'}</div>
                    {entry.automatic && <Badge variant="secondary" className="mt-1 text-[10px]">Auto</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{entry.client ? `${entry.client.prenume} ${entry.client.nume}` : '—'}</div>
                    <div className="text-xs text-slate-500">{entry.case ? entry.case.numar : '—'}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{entry.categorie}</Badge></TableCell>
                  <TableCell>
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">
                      {onorariu > 0 ? `${onorariu.toLocaleString('ro-RO')} lei` : '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">{formatDuration(entry.durata || 0)}</TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                  Niciun rezultat pentru filtrul curent.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
