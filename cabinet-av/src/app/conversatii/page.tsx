'use client';

import { MessageCircle, Phone, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/empty-state';

export default function ConversatiiPage() {
  return (
    <div className="flex h-[calc(100vh-8rem)] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 animate-in fade-in duration-500">
      {/* Sidebar List */}
      <div className="flex w-80 flex-col border-r border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input placeholder="Caută conversație..." className="pl-9 bg-slate-50 dark:bg-slate-900" />
          </div>
        </div>
        <div className="flex-1 flex flex-col p-4 space-y-2">
            <div className="w-full text-center py-8">
               <p className="text-sm text-slate-500">Integrarea cu Telegram/WhatsApp va fi activată în faza următoare.</p>
            </div>
        </div>
      </div>

      {/* Preview Pane */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900/50">
        <div className="text-center text-slate-500">
          <MessageCircle className="mx-auto mb-4 h-12 w-12 opacity-20" />
          <p>Selectați o conversație pentru a vedea istoricul</p>
        </div>
      </div>
    </div>
  );
}
