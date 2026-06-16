'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Edit2, FileText, Scale, Calendar, Plus, AlertTriangle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export function CaseProfileClient({ caseData, alerts }: { caseData: Record<string, unknown>, alerts: Record<string, unknown>[] }) {
  const now = new Date();

  const getStatusVariant = (stare: string) => {
    switch (stare) {
      case 'deschis': return 'default';
      case 'in_curs': return 'default';
      case 'in_apel': return 'warning';
      case 'suspendat': return 'destructive';
      case 'finalizat': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusColor = (stare: string) => {
    switch (stare) {
      case 'deschis':
      case 'in_curs':
        return 'bg-emerald-500 hover:bg-emerald-600';
      case 'in_apel':
        return 'bg-amber-500 hover:bg-amber-600 text-white';
      case 'suspendat':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {caseData.denumire}
            </h1>
            <Badge variant={getStatusVariant(caseData.stare as string) as "default" | "secondary" | "destructive" | "outline"} className={getStatusColor(caseData.stare as string)}>
              {caseData.stare.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Număr:</span> 
              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded dark:bg-slate-800">{caseData.numar}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Client:</span> 
              <Link href={`/clienti/${caseData.clientId}`} className="text-indigo-600 hover:underline dark:text-indigo-400 font-medium">
                {caseData.client.prenume} {caseData.client.nume}
              </Link>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Instanță:</span> 
              {caseData.instanta || '-'}
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" className="gap-2">
            <Edit2 className="h-4 w-4" /> Editează
          </Button>
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <FileText className="h-4 w-4" /> Generează Document
          </Button>
        </div>
      </div>

      {/* Alerte Legislative */}
      {alerts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-500" />
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-400">
                Atenție: {alerts.length} modificări legislative afectează acest dosar
              </h3>
              <div className="mt-2 space-y-2">
                {alerts.map(alert => (
                  <div key={alert.id} className="text-sm text-amber-800 dark:text-amber-300">
                    <span className="font-medium">{alert.actNormativ} ({alert.articol})</span>: {alert.titlu}
                    <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-400/80">{alert.descriere}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Info Bar */}
      <Card className="bg-slate-50 border-none shadow-none dark:bg-slate-900/50">
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-5 gap-4 divide-x divide-slate-200 dark:divide-slate-800">
          <div className="px-4 first:pl-0 space-y-1">
            <p className="text-xs font-medium text-slate-500">Tip dosar</p>
            <p className="text-sm font-semibold capitalize text-slate-900 dark:text-white">{caseData.tip}</p>
          </div>
          <div className="px-4 space-y-1">
            <p className="text-xs font-medium text-slate-500">Judecător</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate" title={caseData.judecator}>{caseData.judecator || '-'}</p>
          </div>
          <div className="px-4 space-y-1">
            <p className="text-xs font-medium text-slate-500">Sumă litigiu</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{caseData.sumaLitigiu ? `${caseData.sumaLitigiu.toLocaleString()} MDL` : '-'}</p>
          </div>
          <div className="px-4 space-y-1">
            <p className="text-xs font-medium text-slate-500">Data deschiderii</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{format(new Date(caseData.createdAt), 'dd.MM.yyyy')}</p>
          </div>
          <div className="px-4 space-y-1">
            <p className="text-xs font-medium text-slate-500">Documente</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{caseData.documents.length}</p>
          </div>
        </CardContent>
      </Card>

      {/* Layout 2 coloane */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Stânga: Arbore documente + Timeline (2 col) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Documente recente</CardTitle>
              <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Vezi toate</Button>
            </CardHeader>
            <CardContent>
              {caseData.documents.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">Nu există documente în acest dosar.</p>
              ) : (
                <div className="space-y-3">
                  {Array.isArray(caseData.documents) && caseData.documents.slice(0, 5).map((doc: Record<string, unknown>) => (
                    <div key={doc.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer" onClick={() => {/* Navigation to doc */}}>
                      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-500 dark:bg-slate-800">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white leading-none">{doc.nume}</p>
                        <p className="text-xs text-slate-500">{format(new Date(doc.createdAt), 'dd MMM yyyy, HH:mm', { locale: ro })} • {doc.tip}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Descriere și Fapte Cheie</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {caseData.descriere || 'Nicio descriere adăugată.'}
              </p>
              {caseData.articole && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Articole relevante</h4>
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(caseData.articole).map((art: string, i: number) => (
                      <Badge key={i} variant="outline" className="bg-slate-50 dark:bg-slate-900">{art}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dreapta: Termene + Quick Actions (1 col) */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-500" /> Termene
              </CardTitle>
            </CardHeader>
            <CardContent>
              {caseData.deadlines.length === 0 ? (
                <p className="text-sm text-slate-500">Niciun termen adăugat.</p>
              ) : (
                <div className="space-y-4">
                  {Array.isArray(caseData.deadlines) && caseData.deadlines.map((deadline: Record<string, unknown>) => {
                    const daysLeft = differenceInDays(new Date(deadline.data), now);
                    const isPast = daysLeft < 0;
                    const isUrgent = daysLeft >= 0 && daysLeft <= 5;
                    
                    return (
                      <div key={deadline.id} className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-800 pb-1">
                        <div className={`absolute -left-[5px] top-1.5 h-2 w-2 rounded-full ${isPast ? 'bg-slate-400' : isUrgent ? 'bg-red-500' : 'bg-indigo-500'}`} />
                        <p className={`text-sm font-medium ${isPast ? 'text-slate-500 line-through' : 'text-slate-900 dark:text-white'}`}>
                          {deadline.descriere}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500 font-medium">{format(new Date(deadline.data), 'dd MMMM yyyy', { locale: ro })}</span>
                          {!isPast && (
                            <Badge variant={isUrgent ? 'destructive' : 'secondary'} className="text-[10px] h-4 px-1">
                              {daysLeft === 0 ? 'Azi' : `În ${daysLeft} zile`}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button variant="outline" className="w-full mt-4" size="sm">
                <Plus className="mr-2 h-3 w-3" /> Adaugă termen
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-500" /> Acțiuni Rapide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start text-left" variant="outline">
                <FileText className="mr-2 h-4 w-4 text-indigo-600" /> Crează Document AI
              </Button>
              <Button className="w-full justify-start text-left" variant="outline">
                <Clock className="mr-2 h-4 w-4 text-emerald-600" /> Înregistrează Timp
              </Button>
              <Button className="w-full justify-start text-left" variant="outline">
                <Edit2 className="mr-2 h-4 w-4 text-amber-600" /> Adaugă Notiță
              </Button>
              <Button className="w-full justify-start text-left" variant="outline">
                <Scale className="mr-2 h-4 w-4 text-blue-600" /> Cercetare AI
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
