'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
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
  User,
  File,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';

const pages = [
  { label: 'Acasă', href: '/', icon: Home },
  { label: 'Clienți', href: '/clienti', icon: Users },
  { label: 'Dosare', href: '/dosare', icon: FolderOpen },
  { label: 'Documente', href: '/documente', icon: FileText },
  { label: 'Email', href: '/email', icon: Mail },
  { label: 'Conversații', href: '/conversatii', icon: MessageCircle },
  { label: 'Timp', href: '/timp', icon: Clock },
  { label: 'Cercetare', href: '/cercetare', icon: Search },
  { label: 'Chat AI', href: '/chat', icon: MessageSquare },
  { label: 'Setări', href: '/setari', icon: Settings },
];

interface SearchResult {
  clients: Array<{ id: string; nume: string; prenume: string }>;
  cases: Array<{ id: string; numar: string; denumire: string }>;
}

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useAppStore();
  const [searchResults, setSearchResults] = useState<SearchResult>({ clients: [], cases: [] });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const handleSearch = async (value: string) => {
    if (value.length < 2) {
      setSearchResults({ clients: [], cases: [] });
      return;
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch {
      // Silently ignore search errors
    }
  };

  const runCommand = (command: () => void) => {
    setCommandPaletteOpen(false);
    command();
  };

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput
        placeholder="Caută clienți, dosare, pagini..."
        onValueChange={handleSearch}
      />
      <CommandList>
        <CommandEmpty>Niciun rezultat găsit.</CommandEmpty>

        {searchResults.clients.length > 0 && (
          <CommandGroup heading="Clienți">
            {searchResults.clients.map((client) => (
              <CommandItem
                key={client.id}
                onSelect={() => runCommand(() => router.push(`/clienti/${client.id}`))}
              >
                <User className="mr-2 h-4 w-4 text-slate-400" />
                {client.prenume} {client.nume}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {searchResults.cases.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Dosare">
              {searchResults.cases.map((c) => (
                <CommandItem
                  key={c.id}
                  onSelect={() => runCommand(() => router.push(`/dosare/${c.id}`))}
                >
                  <File className="mr-2 h-4 w-4 text-slate-400" />
                  {c.numar} — {c.denumire}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Pagini">
          {pages.map((page) => (
            <CommandItem
              key={page.href}
              onSelect={() => runCommand(() => router.push(page.href))}
            >
              <page.icon className="mr-2 h-4 w-4 text-slate-400" />
              {page.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
