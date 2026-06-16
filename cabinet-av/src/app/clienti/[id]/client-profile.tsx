'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit2, Folder, FileText, Mail, MessageSquare, Clock, Phone, FileSignature, FileKey, Activity, AlertTriangle, MessageCircle, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ClientProps = any; // Typing omitted for brevity in demo, normally use Prisma types

export function ClientProfileClient({ client }: { client: ClientProps }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('informatii');

  const getInitials = (nume: string, prenume: string) => {
    return `${prenume.charAt(0)}${nume.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-5">
          <Avatar className="h-20 w-20 border-2 border-white shadow-md dark:border-slate-900">
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white">
              {getInitials(client.nume, client.prenume)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {client.prenume} {client.nume}
              </h1>
              <Badge variant={client.status === 'activ' ? 'default' : 'secondary'} className={client.status === 'activ' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                {client.status === 'activ' ? 'Activ' : 'Arhivat'}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
              {client.idnp && (
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">IDNP:</span> {client.idnp}
                </div>
              )}
              {client.telefon && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {client.telefon}
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {client.email}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Edit2 className="h-4 w-4" /> Editează
          </Button>
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Folder className="h-4 w-4" /> Dosar Nou
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="h-12 w-full justify-start overflow-x-auto rounded-none border-b border-slate-200 bg-transparent p-0 dark:border-slate-800">
          <TabsTrigger value="informatii" className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 data-[state=active]:shadow-none dark:data-[state=active]:border-indigo-500 dark:data-[state=active]:text-indigo-400">
            Informații
          </TabsTrigger>
          <TabsTrigger value="dosare" className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 data-[state=active]:shadow-none dark:data-[state=active]:border-indigo-500 dark:data-[state=active]:text-indigo-400">
            Dosare ({client.cases.length})
          </TabsTrigger>
          <TabsTrigger value="documente" className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 data-[state=active]:shadow-none dark:data-[state=active]:border-indigo-500 dark:data-[state=active]:text-indigo-400">
            Documente ({client.documents.length})
          </TabsTrigger>
          <TabsTrigger value="email" className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 data-[state=active]:shadow-none dark:data-[state=active]:border-indigo-500 dark:data-[state=active]:text-indigo-400">
            Email
          </TabsTrigger>
          <TabsTrigger value="consultatii" className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 data-[state=active]:shadow-none dark:data-[state=active]:border-indigo-500 dark:data-[state=active]:text-indigo-400">
            Consultații
          </TabsTrigger>
          <TabsTrigger value="timp" className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 data-[state=active]:shadow-none dark:data-[state=active]:border-indigo-500 dark:data-[state=active]:text-indigo-400">
            Timp
          </TabsTrigger>
          <TabsTrigger value="contracte" className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 data-[state=active]:shadow-none dark:data-[state=active]:border-indigo-500 dark:data-[state=active]:text-indigo-400">
            Contracte
          </TabsTrigger>
          <TabsTrigger value="notite" className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 data-[state=active]:shadow-none dark:data-[state=active]:border-indigo-500 dark:data-[state=active]:text-indigo-400">
            Notițe
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="informatii" className="mt-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Date de contact și adrese</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500">Adresă de domiciliu</p>
                  <p className="text-base text-slate-900 dark:text-white">{client.adresa || 'Nesetată'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500">Data înregistrării</p>
                  <p className="text-base text-slate-900 dark:text-white">
                    {format(new Date(client.createdAt), 'd MMMM yyyy', { locale: ro })}
                  </p>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-sm font-medium text-slate-500">Note client</p>
                  <p className="text-base text-slate-900 dark:text-white">{client.note || 'Nu există note adiționale.'}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dosare" className="mt-0">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {client.cases.map((c: any) => (
                <Card key={c.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => router.push(`/dosare/${c.id}`)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Badge variant="outline" className="bg-slate-50">{c.numar}</Badge>
                      <Badge variant={c.stare === 'deschis' || c.stare === 'in_curs' ? 'default' : 'secondary'}>
                        {c.stare.replace('_', ' ')}
                      </Badge>
                    </div>
                    <CardTitle className="mt-2 text-base leading-tight">{c.denumire}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-slate-500">
                    <div className="flex items-center justify-between">
                      <span>Tip:</span>
                      <span className="font-medium text-slate-900 dark:text-white capitalize">{c.tip}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Instanță:</span>
                      <span className="font-medium text-slate-900 dark:text-white truncate max-w-[150px]" title={c.instanta || ''}>
                        {c.instanta || '-'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="documente" className="mt-0">
             {/* Va fi implementat in etapa 1.3 */}
             <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
               <FileText className="mx-auto h-8 w-8 text-slate-400" />
               <h3 className="mt-4 text-lg font-semibold">Documente</h3>
               <p className="text-sm text-slate-500">Lista de documente va apărea aici.</p>
             </div>
          </TabsContent>

          {/* Restul tab-urilor sunt placeholder pentru a bifa functionalitatea vizuala rapida */}
          <TabsContent value="email" className="mt-0">
            <p className="text-slate-500">Flux email-uri in constructie...</p>
          </TabsContent>
          <TabsContent value="consultatii" className="mt-0">
            <p className="text-slate-500">Transcript-uri consultatii in constructie...</p>
          </TabsContent>
          <TabsContent value="timp" className="mt-0">
             <p className="text-slate-500">Inregistrari timp in constructie...</p>
          </TabsContent>
          <TabsContent value="contracte" className="mt-0">
             <p className="text-slate-500">Contracte in constructie...</p>
          </TabsContent>
          <TabsContent value="notite" className="mt-0">
             <p className="text-slate-500">Notite in constructie...</p>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  );
}
