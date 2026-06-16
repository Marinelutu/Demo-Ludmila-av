'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  Users,
  FolderOpen,
  FileText,
  Mail,
  MessageCircle,
  Clock,
  Search,
  MessageSquare,
  Settings,
  LogOut,
  Scale,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/app-store';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/', label: 'Acasă', icon: Home },
  { href: '/clienti', label: 'Clienți', icon: Users },
  { href: '/dosare', label: 'Dosare', icon: FolderOpen },
  { href: '/documente', label: 'Documente', icon: FileText },
  { href: '/email', label: 'Email', icon: Mail, badgeKey: 'unreadEmails' as const },
  { href: '/conversatii', label: 'Conversații', icon: MessageCircle, badgeKey: 'unreadMessages' as const },
  { href: '/timp', label: 'Timp', icon: Clock },
  { href: '/cercetare', label: 'Cercetare', icon: Search },
  { href: '/chat', label: 'Chat AI', icon: MessageSquare },
  { href: '/setari', label: 'Setări', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { unreadEmails, unreadMessages } = useAppStore();

  const getBadgeCount = (key?: 'unreadEmails' | 'unreadMessages') => {
    if (key === 'unreadEmails') return unreadEmails;
    if (key === 'unreadMessages') return unreadMessages;
    return 0;
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      {/* Logo + Nume */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
          <Scale className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-900 dark:text-white">Cabinet Juridic</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Av. Ludmila Trofim</p>
        </div>
      </div>

      <Separator className="mx-4" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const badgeCount = getBadgeCount(item.badgeKey);

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white'
                )}
              >
                <item.icon
                  className={cn(
                    'h-[18px] w-[18px] flex-shrink-0 transition-colors',
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {badgeCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-5 min-w-[20px] justify-center rounded-full bg-indigo-100 px-1.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                  >
                    {badgeCount}
                  </Badge>
                )}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 h-8 w-[3px] rounded-r-full bg-indigo-600"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <Separator className="mx-4" />

      {/* Footer — User */}
      <div className="px-3 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-900">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-xs font-semibold text-white">
                  LT
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-900 dark:text-white">Ludmila Trofim</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Avocat</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Setări profil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Deconectare
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
