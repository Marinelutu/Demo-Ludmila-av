'use client';

import { useState } from 'react';
import { Send, Bot, User, Paperclip, MoreHorizontal, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function ChatPage() {
  const [input, setInput] = useState('');

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 animate-in fade-in duration-500">
      {/* Sidebar - Chat History */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h2 className="font-semibold text-slate-900 dark:text-white">Conversații</h2>
          <Button variant="ghost" size="icon"><PlusIcon className="h-4 w-4" /></Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            <button className="w-full text-left p-3 rounded-lg bg-white shadow-sm border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <p className="font-medium text-sm text-slate-900 dark:text-white truncate">Analiză contract vânzare-cumpărare</p>
              <p className="text-xs text-slate-500 mt-1">Azi, 10:45</p>
            </button>
            <button className="w-full text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <p className="font-medium text-sm text-slate-700 dark:text-slate-300 truncate">Redactare cerere de chemare în judecată</p>
              <p className="text-xs text-slate-500 mt-1">Ieri</p>
            </button>
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-slate-900 dark:text-white">Analiză contract vânzare-cumpărare</h3>
            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">Claude 3.5 Sonnet</Badge>
          </div>
          <Button variant="ghost" size="icon"><MoreHorizontal className="h-5 w-5 text-slate-500" /></Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex gap-4">
              <Avatar className="h-8 w-8 mt-1">
                <AvatarFallback className="bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"><User className="h-4 w-4" /></AvatarFallback>
              </Avatar>
              <div className="space-y-2 flex-1">
                <p className="font-medium text-sm text-slate-900 dark:text-white">Ludmila</p>
                <div className="prose prose-slate dark:prose-invert text-sm max-w-none">
                  <p>Te rog să analizezi contractul atașat și să identifici clauzele abuzive sau riscurile majore pentru clientul meu (cumpărătorul).</p>
                  <div className="flex items-center gap-2 mt-2 p-2 rounded border border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-800 w-fit">
                    <Paperclip className="h-4 w-4 text-slate-500" />
                    <span className="text-xs font-medium">contract_draft_v2.pdf</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Avatar className="h-8 w-8 mt-1 border border-indigo-100 shadow-sm dark:border-indigo-900">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white"><Bot className="h-4 w-4" /></AvatarFallback>
              </Avatar>
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Asistent AI
                  </p>
                </div>
                <div className="prose prose-slate dark:prose-invert text-sm max-w-none">
                  <p>Am analizat contractul de vânzare-cumpărare atașat. Iată principalele riscuri și potențiale clauze abuzive identificate, din perspectiva cumpărătorului:</p>
                  <ol>
                    <li><strong>Clauza 4.2 (Penalități de întârziere):</strong> Penalitățile stabilite în sarcina cumpărătorului sunt de 0.5% pe zi, în timp ce pentru vânzător sunt limitate la 0.1%. Această disproporție poate fi considerată abuzivă.</li>
                    <li><strong>Clauza 7.1 (Transmiterea riscurilor):</strong> Riscul pieirii fortuite trece la cumpărător la data semnării, nu la predarea efectivă a bunului. Recomand modificarea pentru a lega transferul riscurilor de recepția bunului.</li>
                    <li><strong>Clauza 9.3 (Jurisdicție):</strong> Soluționarea litigiilor este exclusiv în instanța de la sediul vânzătorului, ceea ce dezavantajează cumpărătorul.</li>
                  </ol>
                  <p>Dorești să generez un draft cu modificările propuse pentru aceste clauze?</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 bg-white dark:bg-slate-950">
          <div className="max-w-3xl mx-auto relative flex items-end gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 focus-within:ring-2 ring-indigo-500/20 transition-all">
            <Button variant="ghost" size="icon" className="shrink-0 rounded-full h-10 w-10 text-slate-500 hover:text-indigo-600">
              <Paperclip className="h-5 w-5" />
            </Button>
            <Textarea 
              placeholder="Scrie un mesaj asistentului..." 
              className="min-h-[44px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 px-2 py-3"
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
            />
            <Button size="icon" className="shrink-0 rounded-full h-10 w-10 bg-indigo-600 hover:bg-indigo-700">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-center mt-2">
            <span className="text-[10px] text-slate-400">AI-ul poate face greșeli. Verificați informațiile importante.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlusIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
