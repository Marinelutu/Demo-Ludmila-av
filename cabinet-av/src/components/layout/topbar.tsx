'use client';

import { usePathname } from 'next/navigation';
import { Bell, Bot, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore } from '@/store/app-store';

const pageTitles: Record<string, string> = {
  '/': 'Acasă',
  '/clienti': 'Clienți',
  '/dosare': 'Dosare',
  '/documente': 'Documente',
  '/email': 'Email',
  '/conversatii': 'Conversații',
  '/timp': 'Evidența timpului',
  '/cercetare': 'Cercetare juridică',
  '/chat': 'Chat AI',
  '/setari': 'Setări',
};

export function Topbar() {
  const pathname = usePathname();
  const { setCommandPaletteOpen } = useAppStore();

  const title =
    pageTitles[pathname] ||
    Object.entries(pageTitles).find(([key]) => key !== '/' && pathname.startsWith(key))?.[1] ||
    'Cabinet Juridic';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
      {/* Left — Page title */}
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>

      {/* Center — Search */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm text-slate-500 transition-all hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800"
      >
        <Search className="h-4 w-4" />
        <span>Caută...</span>
        <kbd className="ml-6 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800">
          ⌘K
        </kbd>
      </button>

      {/* Right — Actions */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-[18px] w-[18px] text-slate-600 dark:text-slate-400" />
              <Badge className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                3
              </Badge>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notificări</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bot className="h-[18px] w-[18px] text-slate-600 dark:text-slate-400" />
              <span className="absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Telegram conectat</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
