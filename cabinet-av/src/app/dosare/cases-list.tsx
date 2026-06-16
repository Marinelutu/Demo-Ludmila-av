'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, MoreHorizontal, FolderOpen } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type CaseData = any;

export function CasesListClient({ initialCases }: { initialCases: CaseData[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('toate');

  const getStatusVariant = (stare: string) => {
    switch (stare) {
      case 'deschis': return 'default';
      case 'in_curs': return 'default';
      case 'in_apel': return 'warning';
      case 'suspendat': return 'destructive';
      case 'finalizat': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusColor = (stare: string) => {
    switch (stare) {
      case 'deschis':
      case 'in_curs':
        return 'bg-emerald-500 hover:bg-emerald-600';
      case 'in_apel':
        return 'bg-amber-500 hover:bg-amber-600 text-white';
      case 'suspendat':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return '';
    }
  };

  const filteredCases = useMemo(() => {
    let result = [...initialCases];

    if (activeTab !== 'toate') {
      result = result.filter(c => c.stare === activeTab);
    }

    if (search.length > 1) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.numar.toLowerCase().includes(q) ||
          c.denumire.toLowerCase().includes(q) ||
          c.client.nume.toLowerCase().includes(q) ||
          c.client.prenume.toLowerCase().includes(q) ||
          c.instanta?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [initialCases, search, activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Dosare</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gestionați dosarele active și arhivele cabinetului. Total: {initialCases.length}
          </p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="mr-2 h-4 w-4" /> Dosar nou
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto overflow-x-auto">
          <TabsList>
            <TabsTrigger value="toate">Toate</TabsTrigger>
            <TabsTrigger value="deschis">Deschise</TabsTrigger>
            <TabsTrigger value="in_curs">În curs</TabsTrigger>
            <TabsTrigger value="in_apel">În apel</TabsTrigger>
            <TabsTrigger value="suspendat">Suspendate</TabsTrigger>
            <TabsTrigger value="finalizat">Finalizate</TabsTrigger>
            <TabsTrigger value="arhivat">Arhivate</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Caută nr, denumire, instanță..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Număr</TableHead>
              <TableHead>Denumire</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Instanță / Judecător</TableHead>
              <TableHead>Stare</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <EmptyState
                    icon={FolderOpen}
                    title="Niciun dosar găsit"
                    description={search ? `Nu am găsit rezultate pentru "${search}".` : "Nu există dosare în această categorie."}
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredCases.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  onClick={() => router.push(`/dosare/${c.id}`)}
                >
                  <TableCell>
                    <Badge variant="outline" className="bg-slate-50 font-mono text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      {c.numar}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900 dark:text-white max-w-[300px] truncate" title={c.denumire}>
                      {c.denumire}
                    </div>
                    <div className="text-xs text-slate-500 capitalize">{c.tip}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-slate-900 hover:text-indigo-600 hover:underline dark:text-slate-300 dark:hover:text-indigo-400" onClick={(e) => { e.stopPropagation(); router.push(`/clienti/${c.clientId}`); }}>
                      {c.client.prenume} {c.client.nume}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col max-w-[200px]">
                      <span className="text-sm text-slate-900 truncate dark:text-slate-300" title={c.instanta || ''}>{c.instanta || '-'}</span>
                      <span className="text-xs text-slate-500 truncate dark:text-slate-400" title={c.judecator || ''}>{c.judecator || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(c.stare) as any} className={getStatusColor(c.stare)}>
                      {c.stare.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/dosare/${c.id}`)}>
                          Vezi detalii
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Adaugă document
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
