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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Search, Plus, MoreHorizontal, ArrowUpDown, Users } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const clientSchema = z.object({
  nume: z.string().min(2, 'Numele trebuie să aibă minim 2 caractere'),
  prenume: z.string().min(2, 'Prenumele trebuie să aibă minim 2 caractere'),
  idnp: z.string().regex(/^\d{13}$/, 'IDNP trebuie să aibă exact 13 cifre').optional().or(z.literal('')),
  telefon: z.string().optional().or(z.literal('')),
  email: z.string().email('Email invalid').optional().or(z.literal('')),
  // Adresă structurată — câmpuri separate pentru claritate
  strada: z.string().optional().or(z.literal('')),
  numar: z.string().optional().or(z.literal('')),
  oras: z.string().optional().or(z.literal('')),
  codPostal: z.string().optional().or(z.literal('')),
  note: z.string().optional().or(z.literal('')),
});

type ClientFormValues = z.infer<typeof clientSchema>;

// Compune câmpurile de adresă într-un singur string lizibil
function buildAdresa(v: ClientFormValues): string {
  const linieStrada = [
    v.strada?.trim(),
    v.numar?.trim() ? `nr. ${v.numar.trim()}` : '',
  ].filter(Boolean).join(', ');
  const linieOras = [
    v.codPostal?.trim(),
    v.oras?.trim(),
  ].filter(Boolean).join(' ');
  return [linieStrada, linieOras].filter(Boolean).join(', ');
}

type ClientData = {
  id: string;
  nume: string;
  prenume: string;
  idnp: string | null;
  telefon: string | null;
  email: string | null;
  status: string;
  _count: { cases: number };
};

interface ClientListProps {
  initialClients: ClientData[];
}

export function ClientListClient({ initialClients }: ClientListProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('toti');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortField, setSortField] = useState<keyof ClientData>('nume');
  const [sortAsc, setSortAsc] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
  });

  const onSubmit = async (data: ClientFormValues) => {
    try {
      const payload = {
        nume: data.nume,
        prenume: data.prenume,
        idnp: data.idnp,
        telefon: data.telefon,
        email: data.email,
        adresa: buildAdresa(data),
        note: data.note,
      };
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to create client');

      const newClient = await res.json();
      toast.success('Client adăugat cu succes!');
      setIsModalOpen(false);
      reset();
      router.push(`/clienti/${newClient.id}`);
    } catch (error) {
      toast.error('A apărut o eroare la salvarea clientului.');
    }
  };

  const handleSort = (field: keyof ClientData) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filteredClients = useMemo(() => {
    let result = [...initialClients];

    // Filter by tab
    if (activeTab === 'activi') result = result.filter((c) => c.status === 'activ');
    if (activeTab === 'arhivati') result = result.filter((c) => c.status === 'arhivat');
    if (activeTab === 'cu_dosare') result = result.filter((c) => c._count.cases > 0);

    // Filter by search
    if (search.length > 1) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.nume.toLowerCase().includes(q) ||
          c.prenume.toLowerCase().includes(q) ||
          c.idnp?.includes(q) ||
          c.telefon?.includes(q) ||
          c.email?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === bVal) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      const compareResult = aVal < bVal ? -1 : 1;
      return sortAsc ? compareResult : -compareResult;
    });

    return result;
  }, [initialClients, search, activeTab, sortField, sortAsc]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Clienți</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gestionați clienții cabinetului și adăugați persoane noi. Total: {initialClients.length}
          </p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger className="bg-indigo-600 hover:bg-indigo-700 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-9 px-4 py-2 text-white shadow-xs">
            <Plus className="mr-2 h-4 w-4" /> Client nou
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Adăugare client nou</DialogTitle>
              <DialogDescription>
                Introduceți datele clientului. Puteți edita aceste informații ulterior.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nume">Nume <span className="text-red-500">*</span></Label>
                  <Input id="nume" {...register('nume')} placeholder="Popescu" />
                  {errors.nume && <p className="text-xs text-red-500">{errors.nume.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prenume">Prenume <span className="text-red-500">*</span></Label>
                  <Input id="prenume" {...register('prenume')} placeholder="Ion" />
                  {errors.prenume && <p className="text-xs text-red-500">{errors.prenume.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="idnp">IDNP</Label>
                  <Input id="idnp" {...register('idnp')} placeholder="2000000000000" />
                  {errors.idnp && <p className="text-xs text-red-500">{errors.idnp.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefon">Telefon</Label>
                  <Input id="telefon" {...register('telefon')} placeholder="+373 69 000 000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} placeholder="ion.popescu@exemplu.md" />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>
              <div className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <Label className="text-sm font-semibold">Adresă</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="strada" className="text-xs text-slate-500">Stradă</Label>
                    <Input id="strada" {...register('strada')} placeholder="str. Mihai Eminescu" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="numar" className="text-xs text-slate-500">Număr</Label>
                    <Input id="numar" {...register('numar')} placeholder="23A" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="oras" className="text-xs text-slate-500">Oraș / Localitate</Label>
                    <Input id="oras" {...register('oras')} placeholder="Chișinău" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="codPostal" className="text-xs text-slate-500">Cod poștal</Label>
                    <Input id="codPostal" {...register('codPostal')} placeholder="MD-2001" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Anulează
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                  {isSubmitting ? 'Se salvează...' : 'Adaugă client'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList>
            <TabsTrigger value="toti">Toți</TabsTrigger>
            <TabsTrigger value="activi">Activi</TabsTrigger>
            <TabsTrigger value="arhivati">Arhivați</TabsTrigger>
            <TabsTrigger value="cu_dosare">Cu dosare deschise</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Caută după nume, IDNP, telefon..."
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
              <TableHead className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900" onClick={() => handleSort('nume')}>
                <div className="flex items-center gap-1">Nume {sortField === 'nume' && <ArrowUpDown className="h-3 w-3" />}</div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900" onClick={() => handleSort('idnp')}>
                <div className="flex items-center gap-1">IDNP {sortField === 'idnp' && <ArrowUpDown className="h-3 w-3" />}</div>
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Dosare active</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <EmptyState
                    icon={Users}
                    title="Niciun client găsit"
                    description={search ? `Nu am găsit rezultate pentru "${search}".` : "Nu există clienți în această categorie."}
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  onClick={() => router.push(`/clienti/${client.id}`)}
                >
                  <TableCell>
                    <div className="font-medium text-slate-900 dark:text-white">
                      {client.prenume} {client.nume}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">{client.idnp || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-900 dark:text-white">{client.telefon || '-'}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{client.email || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {client._count.cases > 0 ? (
                      <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                        {client._count.cases} dosare
                      </Badge>
                    ) : (
                      <span className="text-sm text-slate-500">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={client.status === 'activ' ? 'default' : 'secondary'} className={client.status === 'activ' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                      {client.status === 'activ' ? 'Activ' : 'Arhivat'}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/clienti/${client.id}`)}>
                          Vezi profil
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Adaugă dosar
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
