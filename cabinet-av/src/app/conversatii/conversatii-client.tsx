'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import {
  MessageCircle, Search, Send, Loader2, Sparkles, Play,
  CheckCircle, XCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface Message {
  role?: 'client' | 'avocat' | 'ai';
  from?: 'client' | 'avocat' | 'ai';
  text: string;
  timestamp?: string;
  time?: string;
}

function msgRole(m: Message): 'client' | 'avocat' {
  const r = m.role ?? m.from;
  return r === 'avocat' || r === 'ai' ? 'avocat' : 'client';
}

function msgTime(m: Message): string {
  return m.timestamp ?? m.time ?? new Date().toISOString();
}

interface Client {
  id: string;
  nume: string;
  prenume: string;
}

interface Conversation {
  id: string;
  clientId: string;
  client: Client;
  platforma: string;
  aiAuthorized: boolean;
  recentMessages: string;
  lastActiveAt: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  whatsapp: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  telegram: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  viber: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  messenger: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

const PLATFORM_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  viber: 'Viber',
  messenger: 'Messenger',
};

function safeDate(d: string | Date): Date {
  if (d instanceof Date) return d;
  return new Date(String(d).replace(' ', 'T'));
}

function initials(c: Client) {
  return `${c.prenume[0]}${c.nume[0]}`.toUpperCase();
}

function lastMessage(conv: Conversation): string {
  try {
    const msgs: Message[] = JSON.parse(conv.recentMessages || '[]');
    if (msgs.length === 0) return 'Niciun mesaj';
    return msgs[msgs.length - 1].text;
  } catch {
    return 'Niciun mesaj';
  }
}

export function ConversatiiClient({ initialConversations }: { initialConversations: Conversation[] }) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selected, setSelected] = useState<Conversation | null>(initialConversations[0] || null);
  const [messages, setMessages] = useState<Message[]>(() => {
    if (!initialConversations[0]) return [];
    try { return JSON.parse(initialConversations[0].recentMessages || '[]'); } catch { return []; }
  });
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [simulateText, setSimulateText] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const selectConversation = (conv: Conversation) => {
    setSelected(conv);
    try { setMessages(JSON.parse(conv.recentMessages || '[]')); } catch { setMessages([]); }
  };

  const handleAIToggle = async (conv: Conversation, value: boolean) => {
    setTogglingId(conv.id);
    try {
      const res = await fetch('/api/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: conv.id, aiAuthorized: value }),
      });
      if (!res.ok) throw new Error();
      const updated: Conversation = await res.json();
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, aiAuthorized: value } : c));
      if (selected?.id === conv.id) setSelected(prev => prev ? { ...prev, aiAuthorized: value } : null);
      toast.success(value ? `AI activat pentru ${conv.client.prenume}` : `AI dezactivat pentru ${conv.client.prenume}`);
    } catch {
      toast.error('Eroare la actualizare');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSimulate = async () => {
    if (!selected || !simulateText.trim()) return;
    setSimulating(true);
    try {
      const res = await fetch('/api/conversations/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selected.id, clientMessage: simulateText }),
      });
      if (!res.ok) throw new Error();
      const { messages: updatedMessages, aiResponse } = await res.json();
      setMessages(updatedMessages);
      setConversations(prev => prev.map(c =>
        c.id === selected.id
          ? { ...c, recentMessages: JSON.stringify(updatedMessages), lastActiveAt: new Date().toISOString() }
          : c
      ));
      setSimulateText('');
      setSimulateOpen(false);

      if (aiResponse) {
        toast.success('Răspuns AI generat + notificare Telegram trimisă', { icon: '🤖' });
      } else if (selected.aiAuthorized) {
        toast.info('Mesaj simulat — AI nu a putut genera răspuns (verificați cheia API)');
      } else {
        toast.info('Mesaj simulat — notificare trimisă avocatei (AI dezactivat)');
      }
    } catch {
      toast.error('Eroare la simulare');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 animate-in fade-in duration-500">
      {/* Sidebar */}
      <div className="flex w-80 flex-col border-r border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input placeholder="Caută conversație..." className="pl-9 bg-slate-50 dark:bg-slate-900" />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`flex items-start gap-3 p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 border-b border-slate-100 dark:border-slate-800/60 ${
                  selected?.id === conv.id ? 'bg-slate-50 dark:bg-slate-900 border-l-2 border-l-indigo-600' : 'border-l-2 border-l-transparent'
                }`}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-xs font-bold text-white">
                    {initials(conv.client)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                      {conv.client.prenume} {conv.client.nume}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {format(safeDate(conv.lastActiveAt), 'dd MMM', { locale: ro })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Badge className={`text-[10px] px-1.5 py-0 ${PLATFORM_COLORS[conv.platforma] || ''}`}>
                      {PLATFORM_LABELS[conv.platforma] || conv.platforma}
                    </Badge>
                    {conv.aiAuthorized ? (
                      <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <Sparkles className="mr-0.5 h-2.5 w-2.5" /> AI ON
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        AI OFF
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {lastMessage(conv)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Panel */}
      {selected ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-xs font-bold text-white">
                  {initials(selected.client)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm text-slate-900 dark:text-white">
                  {selected.client.prenume} {selected.client.nume}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {PLATFORM_LABELS[selected.platforma] || selected.platforma}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* AI Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">AI autorizat</span>
                <Switch
                  checked={selected.aiAuthorized}
                  disabled={togglingId === selected.id}
                  onCheckedChange={val => handleAIToggle(selected, val)}
                />
                {selected.aiAuthorized ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-slate-400" />
                )}
              </div>

              {/* Simulate button */}
              <Button
                size="sm"
                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setSimulateOpen(true)}
              >
                <Play className="h-4 w-4" /> Simulează mesaj
              </Button>
            </div>
          </div>

          {/* AI Status Banner */}
          {selected.aiAuthorized && (
            <div className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50/50 px-4 py-2 dark:border-emerald-900/20 dark:bg-emerald-950/10">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs text-emerald-700 dark:text-emerald-400">
                Răspunsurile automate AI sunt activate pentru acest client. Claude va răspunde în locul avocatei.
              </span>
            </div>
          )}

          {/* Message History */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-2xl mx-auto">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <MessageCircle className="h-12 w-12 mb-3 opacity-20" />
                  <p className="text-sm">Nu există mesaje în această conversație.</p>
                  <p className="text-xs mt-1">Folosiți butonul &quot;Simulează mesaj&quot; pentru a testa fluxul.</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const role = msgRole(msg);
                  const ts = msgTime(msg);
                  return (
                  <div
                    key={i}
                    className={`flex gap-2 ${role === 'avocat' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <Avatar className="h-7 w-7 shrink-0 mt-1">
                      <AvatarFallback className={`text-[10px] font-bold text-white ${
                        role === 'client'
                          ? 'bg-gradient-to-br from-indigo-400 to-purple-500'
                          : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                      }`}>
                        {role === 'client' ? initials(selected.client) : 'LT'}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[70%] ${role === 'avocat' ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        role === 'avocat'
                          ? 'bg-indigo-600 text-white rounded-tr-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-sm'
                      }`}>
                        {msg.text}
                        {role === 'avocat' && (
                          <Sparkles className="inline-block ml-1 h-3 w-3 opacity-60" />
                        )}
                      </div>
                      <span className="mt-1 text-[10px] text-slate-400">
                        {format(safeDate(ts), 'HH:mm dd MMM', { locale: ro })}
                      </span>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900/50">
          <div className="text-center text-slate-500">
            <MessageCircle className="mx-auto mb-4 h-12 w-12 opacity-20" />
            <p>Selectați o conversație pentru a vedea istoricul</p>
          </div>
        </div>
      )}

      {/* Simulate Modal */}
      <Dialog open={simulateOpen} onOpenChange={setSimulateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-indigo-600" />
              Simulează mesaj de la client
            </DialogTitle>
            <DialogDescription>
              {selected?.client.prenume} {selected?.client.nume} ({selected && PLATFORM_LABELS[selected.platforma]})
              {selected?.aiAuthorized
                ? ' — AI va genera un răspuns automat'
                : ' — veți primi o notificare (AI dezactivat)'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <Textarea
              placeholder={`Scrieți mesajul primit de la ${selected?.client.prenume}...`}
              value={simulateText}
              onChange={e => setSimulateText(e.target.value)}
              rows={4}
              className="resize-none"
              disabled={simulating}
            />

            {selected?.aiAuthorized && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-3 text-xs text-emerald-700 dark:text-emerald-400">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>Claude va genera un răspuns automat și va trimite notificare Telegram.</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSimulateOpen(false)} disabled={simulating}>
                Anulează
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                onClick={handleSimulate}
                disabled={!simulateText.trim() || simulating}
              >
                {simulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {simulating ? 'Se procesează...' : 'Trimite'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
