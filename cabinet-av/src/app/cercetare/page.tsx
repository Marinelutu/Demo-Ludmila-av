'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Search, Sparkles, Scale, BookOpen, Clock, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

const TAB_PROMPTS: Record<string, string> = {
  toate: `Ești un expert juridic specializat în dreptul Republicii Moldova.
Răspunde detaliat la întrebările juridice, citând legi specifice din RM (Codul Civil, Codul Penal, Codul Muncii etc.), decizii ale Curții Supreme de Justiție și practică judiciară relevantă.
Structurează răspunsul cu: 1) Cadrul legal aplicabil 2) Interpretare și aplicare 3) Exemple din practică 4) Concluzii.
Folosește terminologia juridică română din Republica Moldova.`,

  legislatie: `Ești un expert în legislația Republicii Moldova.
Răspunde EXCLUSIV pe baza actelor normative în vigoare: Constituție, coduri, legi, hotărâri de Guvern, regulamente.
Citează articolele exacte, numerele legilor și datele de adoptare/modificare.
Menționează orice modificări recente sau proiecte de lege relevante.`,

  practica: `Ești un expert în practica judiciară din Republica Moldova.
Răspunde axat pe jurisprudența Curții Supreme de Justiție, Curții de Apel și instanțelor de fond.
Citează decizii relevante (număr dosar, instanță, dată), tendințe jurisprudențiale și poziții doctrinare.
Evidențiază divergențele de practică și orientarea dominantă.`,
};

const RECENT_SEARCHES = [
  'Condițiile de validitate ale contractului de donație',
  'Răspunderea civilă delictuală - prejudiciu moral',
  'Procedura de divorț în instanță cu copii minori',
];

const FREQUENT_TOPICS = [
  'Dreptul Familiei',
  'Succesiuni',
  'Drept Societar',
  'Codul Muncii',
  'Contencios Administrativ',
  'Drept Penal',
  'Procedură Civilă',
];

export default function CercetarePage() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('toate');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery ?? query;
    if (!q.trim()) return;

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    setResult('');
    setError('');

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          messages: [{ role: 'user', content: q }],
          systemPrompt: TAB_PROMPTS[tab] || TAB_PROMPTS.toate,
        }),
      });

      if (!res.ok) throw new Error('Eroare la server');

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
          try {
            const { text } = JSON.parse(payload);
            if (text) setResult(prev => prev + text);
          } catch {
            // ignore malformed chunks
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        setError('A apărut o eroare. Verificați că cheia API Anthropic este configurată.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleRecentClick = (text: string) => {
    setQuery(text);
    handleSearch(text);
  };

  const handleTopicClick = (topic: string) => {
    const q = `Explică principalele aspecte ale ${topic} în dreptul Republicii Moldova`;
    setQuery(q);
    handleSearch(q);
  };

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
        <Tabs value={tab} onValueChange={setTab} className="w-[400px]">
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
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <Button
              size="lg"
              className="mr-2 h-12 bg-indigo-600 hover:bg-indigo-700"
              onClick={() => handleSearch()}
              disabled={isLoading || !query.trim()}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-5 w-5" />
              )}
              Cercetează
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Streaming Result */}
      {(result || isLoading) && (
        <Card className="border-indigo-100 shadow-md dark:border-indigo-900/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-indigo-700 dark:text-indigo-400">
              <Sparkles className="h-4 w-4" />
              Răspuns AI
              {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-slate max-w-none dark:prose-invert text-sm leading-relaxed whitespace-pre-wrap">
              {result || '...'}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      )}

      {!result && !isLoading && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-5 w-5 text-slate-400" />
                <h3 className="font-semibold text-slate-900 dark:text-white">Căutări Recente</h3>
              </div>
              <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                {RECENT_SEARCHES.map((s) => (
                  <li
                    key={s}
                    className="cursor-pointer hover:text-indigo-600 transition-colors"
                    onClick={() => handleRecentClick(s)}
                  >
                    {s}
                  </li>
                ))}
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
                {FREQUENT_TOPICS.map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => handleTopicClick(t)}
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
