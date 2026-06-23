'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Bell, Mail, Calendar, AlertTriangle, MessageCircle, Loader2 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface NotifEmail { id: string; subiect: string; expeditor: string; data: string }
interface NotifDeadline { id: string; descriere: string; data: string; caseId: string; case: { numar: string } }
interface NotifAlert { id: string; titlu: string; actNormativ: string; createdAt: string }
interface NotifConversation { id: string; platforma: string; lastActiveAt: string; client: { prenume: string; nume: string } }

interface NotifData {
  emails: NotifEmail[];
  deadlines: NotifDeadline[];
  alerts: NotifAlert[];
  conversations: NotifConversation[];
}

type NotifItem =
  | { kind: 'email'; data: NotifEmail }
  | { kind: 'deadline'; data: NotifDeadline }
  | { kind: 'alert'; data: NotifAlert }
  | { kind: 'conversation'; data: NotifConversation };

function sortDate(item: NotifItem): number {
  switch (item.kind) {
    case 'email': return new Date(item.data.data).getTime();
    case 'deadline': return new Date(item.data.data).getTime();
    case 'alert': return new Date(item.data.createdAt).getTime();
    case 'conversation': return new Date(item.data.lastActiveAt).getTime();
  }
}

export function NotificationsPopover() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifs, setNotifs] = useState<NotifData | null>(null);

  useEffect(() => {
    if (!open || notifs) return;
    setLoading(true);
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => setNotifs(d))
      .finally(() => setLoading(false));
  }, [open, notifs]);

  const total = notifs
    ? notifs.emails.length + notifs.deadlines.length + notifs.alerts.length + notifs.conversations.length
    : 0;

  const items: NotifItem[] = notifs
    ? [
        ...notifs.emails.map(d => ({ kind: 'email' as const, data: d })),
        ...notifs.deadlines.map(d => ({ kind: 'deadline' as const, data: d })),
        ...notifs.alerts.map(d => ({ kind: 'alert' as const, data: d })),
        ...notifs.conversations.map(d => ({ kind: 'conversation' as const, data: d })),
      ].sort((a, b) => sortDate(b) - sortDate(a))
    : [];

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'relative')}>
        <Bell className="h-[18px] w-[18px] text-slate-600 dark:text-slate-400" />
        {total > 0 && (
          <Badge className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {total}
          </Badge>
        )}
        {!notifs && (
          <Badge className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            3
          </Badge>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-96 p-0 shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-white">Notificări</h3>
          {total > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {total} noi
            </span>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[420px] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              Nicio notificare nouă.
            </div>
          )}

          {!loading && items.map((item, i) => {
            if (item.kind === 'email') {
              const e = item.data;
              return (
                <button
                  key={`email-${e.id}`}
                  onClick={() => go('/email')}
                  className="flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/40 last:border-0"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{e.subiect}</p>
                    <p className="truncate text-xs text-slate-500">{e.expeditor}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {formatDistanceToNow(new Date(e.data), { addSuffix: true, locale: ro })}
                    </p>
                  </div>
                  <span className="mt-1 shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">Email</span>
                </button>
              );
            }

            if (item.kind === 'deadline') {
              const d = item.data;
              const daysLeft = Math.ceil((new Date(d.data).getTime() - Date.now()) / 86400000);
              const urgent = daysLeft <= 3;
              return (
                <button
                  key={`dl-${d.id}`}
                  onClick={() => go(`/dosare/${d.caseId}`)}
                  className="flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/40 last:border-0"
                >
                  <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', urgent ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400')}>
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{d.descriere}</p>
                    <p className="text-xs text-slate-500">Dosar {d.case.numar}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      În {daysLeft} {daysLeft === 1 ? 'zi' : 'zile'}
                    </p>
                  </div>
                  <span className={cn('mt-1 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold', urgent ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400')}>
                    Termen
                  </span>
                </button>
              );
            }

            if (item.kind === 'alert') {
              const a = item.data;
              return (
                <button
                  key={`al-${a.id}`}
                  onClick={() => go('/')}
                  className="flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/40 last:border-0"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{a.titlu}</p>
                    <p className="text-xs text-slate-500">{a.actNormativ}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true, locale: ro })}
                    </p>
                  </div>
                  <span className="mt-1 shrink-0 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">Alertă</span>
                </button>
              );
            }

            if (item.kind === 'conversation') {
              const c = item.data;
              return (
                <button
                  key={`conv-${c.id}`}
                  onClick={() => go('/conversatii')}
                  className="flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/40 last:border-0"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {c.client.prenume} {c.client.nume}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">{c.platforma}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {formatDistanceToNow(new Date(c.lastActiveAt), { addSuffix: true, locale: ro })}
                    </p>
                  </div>
                  <span className="mt-1 shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">Mesaj</span>
                </button>
              );
            }

            return null;
          })}
        </div>

        {/* Footer */}
        {!loading && items.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
            <button
              onClick={() => go('/email')}
              className="w-full text-center text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              Vezi toate emailurile →
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
