'use client';

import { useState } from 'react';
import { Search, Sparkles, Scale, BookOpen, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CercetarePage() {
  const [query, setQuery] = useState('');

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8 animate-in fade-in duration-500">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
          <Scale className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Cercetare Juridică AI
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          Căutați prin legislația Republicii Moldova, jurisprudență și doctrina juridică. 
          Asistentul AI va sintetiza răspunsurile și va oferi referințe exacte.
        </p>
      </div>

      <div className="flex justify-center">
        <Tabs defaultValue="toate" className="w-[400px]">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="toate">Toate</TabsTrigger>
            <TabsTrigger value="legislatie">Legislație</TabsTrigger>
            <TabsTrigger value="practica">Practică</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="border-indigo-100 shadow-md dark:border-indigo-900/30">
        <CardContent className="p-2">
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-6 w-6 text-indigo-300 dark:text-indigo-600" />
            <Input 
              className="h-16 border-0 bg-transparent pl-14 text-lg focus-visible:ring-0 shadow-none" 
              placeholder="Ex: Care este termenul de prescripție pentru acțiunile în revendicare?" 
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <Button size="lg" className="mr-2 h-12 bg-indigo-600 hover:bg-indigo-700">
              <Sparkles className="mr-2 h-5 w-5" /> Cercetează
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-5 w-5 text-slate-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Căutări Recente</h3>
            </div>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li className="cursor-pointer hover:text-indigo-600">Condițiile de validitate ale contractului de donație</li>
              <li className="cursor-pointer hover:text-indigo-600">Răspunderea civilă delictuală - prejudiciu moral</li>
              <li className="cursor-pointer hover:text-indigo-600">Procedura de divorț în instanță cu copii minori</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="h-5 w-5 text-slate-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Subiecte Frecvente</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200">Dreptul Familiei</Badge>
              <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200">Succesiuni</Badge>
              <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200">Drept Societar</Badge>
              <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200">Codul Muncii</Badge>
              <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200">Contencios Administrativ</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
