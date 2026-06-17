'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Plus, Sparkles, Scale, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';

type Mode = 'lege' | 'strategie';
type Role = 'user' | 'assistant';

interface Message {
  id: string;
  role: Role;
  content: string;
  loading?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

const STARTER_CONV: Conversation = {
  id: 'demo-1',
  title: 'Analiză contract vânzare-cumpărare',
  messages: [
    { id: 'm1', role: 'user', content: 'Te rog să identifici clauzele abuzive dintr-un contract de vânzare-cumpărare pentru cumpărător.' },
    {
      id: 'm2',
      role: 'assistant',
      content: `Am identificat principalele riscuri dintr-un contract tipic de vânzare-cumpărare din perspectiva cumpărătorului:

**1. Clauza de penalități asimetrice (Clauza 4.2)**
Penalitățile pentru cumpărător (0.5%/zi) sunt de 5× mai mari decât cele pentru vânzător (0.1%/zi). Conform art. 666 Cod Civil RM, clauzele care creează un dezechilibru semnificativ pot fi declarate abuzive.

**2. Transferul prematur al riscurilor (Clauza 7.1)**
Riscul pieirii fortuite trece la semnare, nu la predare. Art. 753 CC RM prevede că riscul trece la cumpărător la predarea efectivă a bunului.

**3. Clauza jurisdicțională restrictivă (Clauza 9.3)**
Litigiile exclusiv la instanța sediului vânzătorului dezavantajează cumpărătorul. Conform Legii nr. 105/2003, art. 36, cumpărătorul are dreptul la instanța domiciliului său.

Dorești să generez un draft cu modificările propuse?`,
    },
  ],
  createdAt: new Date(),
};

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([STARTER_CONV]);
  const [activeId, setActiveId] = useState('demo-1');
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('lege');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeConv = conversations.find((c) => c.id === activeId)!;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConv?.messages]);

  const systemPrompts: Record<Mode, string> = {
    lege: `Ești asistentul juridic intern al cabinetului. Răspunzi STRICT din baza de cunoștințe locală: legislația Republicii Moldova și jurisprudența indexată.
- Citezi articole exacte cu număr
- Dacă nu ai informație certă, spui clar că nu ai date suficiente
- Nu inventezi articole, nu inventezi hotărâri
- Răspunzi în română cu terminologie juridică moldovenească`,
    strategie: `Ești consultant strategic juridic pentru un avocat din Republica Moldova. Aduci perspective largi: practică comparată internațională, doctrină, abordări strategice.
- Folosești cunoștințe generale și exemple din practică comparată
- Marchezi clar ce e specific Moldova vs ce e exemplu internațional
- Răspunzi în română
- Nu dai sfaturi finale — propui opțiuni și argumente pro/contra`,
  };

  const handleSend = async () => {
    if (!input.trim() || streaming) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    const loadingMsg: Message = { id: `loading-${Date.now()}`, role: 'assistant', content: '', loading: true };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, messages: [...c.messages, userMsg, loadingMsg] }
          : c
      )
    );
    setInput('');
    setStreaming(true);

    try {
      const currentMessages = [...activeConv.messages, userMsg];
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages.map((m) => ({ role: m.role, content: m.content })),
          systemPrompt: systemPrompts[mode],
          context: `Mod activ: ${mode === 'lege' ? 'Mod Lege (legislație RM)' : 'Mod Strategie (perspectivă largă)'}`,
        }),
      });

      if (!response.ok || !response.body) throw new Error('Răspuns invalid');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              assistantText += parsed.text;
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === activeId
                    ? {
                        ...c,
                        messages: c.messages.map((m) =>
                          m.loading ? { ...m, content: assistantText, loading: false } : m
                        ),
                      }
                    : c
                )
              );
            }
          } catch {}
        }
      }

      // Finalize — remove loading flag
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.loading ? { ...m, content: assistantText, loading: false } : m
                ),
              }
            : c
        )
      );
    } catch {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                messages: c.messages.filter((m) => !m.loading),
              }
            : c
        )
      );
    } finally {
      setStreaming(false);
    }
  };

  const handleNewConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: 'Conversație nouă',
      messages: [],
      createdAt: new Date(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 animate-in fade-in duration-500">
      {/* Sidebar */}
      <div className="w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h2 className="font-semibold text-slate-900 dark:text-white">Conversații</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNewConversation}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Mode toggle */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex rounded-lg bg-slate-200 p-0.5 dark:bg-slate-800">
            <button
              onClick={() => setMode('lege')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                mode === 'lege'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Scale className="h-3 w-3" /> Mod Lege
            </button>
            <button
              onClick={() => setMode('strategie')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                mode === 'strategie'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Globe className="h-3 w-3" /> Strategie
            </button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveId(conv.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                  conv.id === activeId
                    ? 'bg-white shadow-sm border border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <p className={`text-sm font-medium truncate ${conv.id === activeId ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                  {conv.title}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {conv.messages.length} mesaje
                </p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{activeConv?.title || 'Conversație nouă'}</h3>
            <Badge
              variant="secondary"
              className={mode === 'lege'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              }
            >
              {mode === 'lege' ? <><Scale className="mr-1 h-3 w-3" />Mod Lege</> : <><Globe className="mr-1 h-3 w-3" />Mod Strategie</>}
            </Badge>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {activeConv?.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 mb-4">
                  <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Cum pot ajuta?</h3>
                <p className="mt-2 text-sm text-slate-500 max-w-sm">
                  {mode === 'lege'
                    ? 'Mod Lege: răspuns bazat strict pe legislația Republicii Moldova.'
                    : 'Mod Strategie: perspectivă largă, practică comparată, opțiuni strategice.'}
                </p>
              </div>
            )}

            {activeConv?.messages.map((msg) => (
              <div key={msg.id} className="flex gap-4">
                <Avatar className="h-8 w-8 mt-1 shrink-0">
                  {msg.role === 'user' ? (
                    <AvatarFallback className="bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 space-y-2 min-w-0">
                  <p className={`text-sm font-semibold ${msg.role === 'user' ? 'text-slate-900 dark:text-white' : 'text-indigo-700 dark:text-indigo-400'}`}>
                    {msg.role === 'user' ? 'Ludmila' : 'Asistent AI'}
                  </p>
                  {msg.loading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ) : (
                    <div className="prose prose-slate dark:prose-invert text-sm max-w-none prose-p:my-1 prose-headings:mt-3 prose-headings:mb-1 prose-li:my-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <div className="max-w-3xl mx-auto relative flex items-end gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 focus-within:ring-2 ring-indigo-500/20 transition-all">
            <Textarea
              ref={textareaRef}
              placeholder={`Scrie un mesaj... (${mode === 'lege' ? 'Mod Lege' : 'Mod Strategie'})`}
              className="min-h-[44px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 px-2 py-3"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={streaming}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              className="shrink-0 rounded-full h-10 w-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {streaming ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-center mt-2 text-[10px] text-slate-400">
            Enter pentru a trimite • Shift+Enter pentru rând nou
          </p>
        </div>
      </div>
    </div>
  );
}
