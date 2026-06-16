import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { CommandPalette } from '@/components/shared/command-palette';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Cabinet Juridic | Av. Ludmila Trofim',
  description: 'Sistem de management pentru cabinet de avocatură',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className="h-full antialiased">
      <body className={`${inter.className} flex h-full bg-slate-50 dark:bg-slate-900`}>
        <TooltipProvider delayDuration={300}>
          <Sidebar />
          <div className="flex w-full flex-col pl-64">
            <Topbar />
            <main className="flex-1 overflow-auto p-6">{children}</main>
          </div>
          <CommandPalette />
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
