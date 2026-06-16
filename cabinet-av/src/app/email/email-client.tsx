'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Mail, Search, Paperclip, Reply, Forward, Archive, CheckCircle2, Sparkles, AlertTriangle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

type EmailRecord = Record<string, unknown>;

export function EmailClient({ initialEmails }: { initialEmails: EmailRecord[] }) {
  const [emails, setEmails] = useState<EmailRecord[]>(initialEmails);
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(initialEmails[0] || null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleProcessAI = async (emailId: string) => {
    setProcessingId(emailId);
    try {
      const res = await fetch('/api/ai/process-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId }),
      });

      if (!res.ok) throw new Error('Eroare la procesare');

      const updated = await res.json();

      setEmails(prev => prev.map(e => e.id === emailId ? { ...e, ...updated } : e));
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(prev => prev ? { ...prev, ...updated } : null);
      }
    } catch (err) {
      console.error('AI processing error:', err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="flex w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      {/* Sidebar List */}
      <div className="flex w-80 flex-col border-r border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input placeholder="Caută email..." className="pl-9 bg-slate-50 dark:bg-slate-900" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {emails.map((email) => (
              <button
                key={email.id as string}
                onClick={() => setSelectedEmail(email)}
                className={`flex flex-col items-start gap-1 p-4 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 ${
                  selectedEmail?.id === email.id ? 'bg-slate-50 dark:bg-slate-900 border-l-2 border-indigo-600' : 'border-l-2 border-transparent'
                } ${email.status === 'nou' ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="truncate">{(email.expeditor as string).split('@')[0]}</span>
                  <span className="text-xs whitespace-nowrap">{format(new Date(email.data as string), 'dd MMM', { locale: ro })}</span>
                </div>
                <span className="truncate font-medium w-full">{email.subiect as string}</span>
                <span className="line-clamp-2 text-xs opacity-70 w-full">{email.continut as string}</span>
                <div className="flex gap-2 mt-2 w-full">
                  <Badge variant="outline" className={`text-[10px] ${email.sursa === 'justice_md' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400' : ''}`}>
                    {email.sursa as string}
                  </Badge>
                  {email.aiSummary && (
                    <Badge variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                      <Sparkles className="mr-1 h-3 w-3" /> AI
                    </Badge>
                  )}
                  {email.status === 'urgent' && (
                    <Badge variant="destructive" className="text-[10px]">
                      Urgent
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Preview Pane */}
      {selectedEmail ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Email Header */}
          <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" title="Răspunde">
                <Reply className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="Redirecționează">
                <Forward className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Button variant="ghost" size="icon" title="Arhivează">
                <Archive className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400"
                onClick={() => handleProcessAI(selectedEmail.id as string)}
                disabled={processingId === selectedEmail.id}
              >
                {processingId === selectedEmail.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {selectedEmail.aiSummary ? 'Re-procesează AI' : 'Procesează cu AI'}
              </Button>
              {selectedEmail.status === 'nou' && (
                <Button size="sm" variant="secondary" className="gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Marchează procesat
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1 p-6">
            <div className="mx-auto max-w-3xl space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedEmail.subiect as string}</h2>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      <Mail className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {selectedEmail.expeditor as string}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Către: {selectedEmail.destinatar as string}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-500">
                    {format(new Date(selectedEmail.data as string), 'dd MMMM yyyy, HH:mm', { locale: ro })}
                  </span>
                </div>
              </div>

              {/* AI Summary Panel */}
              {selectedEmail.aiSummary && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm dark:border-indigo-900/30 dark:bg-indigo-950/20">
                  <div className="flex items-center gap-2 mb-2 text-indigo-700 dark:text-indigo-400 font-semibold">
                    <Sparkles className="h-4 w-4" /> Rezumat AI
                  </div>
                  <p className="text-sm text-indigo-900 dark:text-indigo-200 leading-relaxed">
                    {selectedEmail.aiSummary as string}
                  </p>
                  {selectedEmail.aiAction && (
                    <div className="mt-3 flex items-start gap-2 bg-white/60 dark:bg-slate-950/50 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Acțiune sugerată</span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">{selectedEmail.aiAction as string}</span>
                      </div>
                    </div>
                  )}
                  {selectedEmail.client && (
                    <div className="mt-3 text-xs flex items-center gap-2">
                      <span className="text-indigo-600/70 dark:text-indigo-400/70">Client asociat automat:</span>
                      <Badge variant="outline" className="bg-white dark:bg-slate-900 border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300">
                        {(selectedEmail.client as Record<string, string>).prenume} {(selectedEmail.client as Record<string, string>).nume}
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              {selectedEmail.hasAttachments && (
                <div className="flex items-center gap-2 border-y border-slate-100 py-3 dark:border-slate-800">
                  <Paperclip className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium">Atașamente ({JSON.parse(selectedEmail.attachments as string || '[]').length})</span>
                  <div className="flex gap-2 ml-4">
                    {JSON.parse(selectedEmail.attachments as string || '[]').map((att: string, i: number) => (
                      <Badge key={i} variant="secondary" className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700">
                        {att}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="prose prose-slate max-w-none dark:prose-invert text-sm">
                <p className="whitespace-pre-wrap">{selectedEmail.continut as string}</p>
              </div>
            </div>
          </ScrollArea>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900/50">
          <div className="text-center text-slate-500">
            <Mail className="mx-auto mb-4 h-12 w-12 opacity-20" />
            <p>Selectați un email pentru a-l citi</p>
          </div>
        </div>
      )}
    </div>
  );
}
