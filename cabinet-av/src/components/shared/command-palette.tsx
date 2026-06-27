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

// Normalizează pentru căutare insensibilă la diacritice și majuscule
const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useAppStore();
  const [searchResults, setSearchResults] = useState<SearchResult>({ clients: [], cases: [] });
  const [query, setQuery] = useState('');

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

  // Golim căutarea la fiecare deschidere/închidere a paletei
  useEffect(() => {
    if (!commandPaletteOpen) {
      setQuery('');
      setSearchResults({ clients: [], cases: [] });
    }
  }, [commandPaletteOpen]);

  const handleSearch = async (value: string) => {
    setQuery(value);
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

  // Filtrăm paginile manual (cmdk are filtrarea internă dezactivată pentru ca
  // rezultatele server-side de clienți/dosare să nu fie eliminate la al doilea filtru).
  const q = normalize(query.trim());
  const filteredPages = q.length === 0 ? pages : pages.filter((p) => normalize(p.label).includes(q));

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} shouldFilter={false}>
      <CommandInput
        placeholder="Caută clienți, dosare, pagini..."
        value={query}
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

        {filteredPages.length > 0 && (
          <>
            {(searchResults.clients.length > 0 || searchResults.cases.length > 0) && <CommandSeparator />}
            <CommandGroup heading="Pagini">
              {filteredPages.map((page) => (
                <CommandItem
                  key={page.href}
                  value={page.label}
                  onSelect={() => runCommand(() => router.push(page.href))}
                >
                  <page.icon className="mr-2 h-4 w-4 text-slate-400" />
                  {page.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
