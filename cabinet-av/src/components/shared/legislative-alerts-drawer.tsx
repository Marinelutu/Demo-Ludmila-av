'use client';

import { useState } from 'react';
import { AlertTriangle, X, ChevronRight, FileText } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Alert {
  id: string;
  titlu: string;
  descriere: string;
  actNormativ: string;
  articol: string | null;
  affectedCaseIds: string;
  status: string;
}

export function LegislativeAlertsDrawer({ alerts }: { alerts: Alert[] }) {
  const [open, setOpen] = useState(false);

  if (alerts.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4 text-left transition-colors hover:bg-amber-100 dark:border-amber-900/30 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-500" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900 dark:text-amber-400">
              Atenție: {alerts.length} modificări legislative necesită atenția dvs.
            </h3>
            <div className="mt-1 space-y-1">
              {alerts.map(alert => (
                <p key={alert.id} className="text-sm text-amber-800 dark:text-amber-300">
                  <span className="font-medium">{alert.actNormativ}</span>: {alert.titlu}
                </p>
              ))}
            </div>
          </div>
          <ChevronRight className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
        </div>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Alerte Legislative
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6 overflow-y-auto">
            {alerts.map(alert => {
              const affectedIds: string[] = JSON.parse(alert.affectedCaseIds || '[]');
              return (
                <div key={alert.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Badge className="bg-amber-500 text-white text-xs">
                          {alert.actNormativ}
                        </Badge>
                        {alert.articol && (
                          <Badge variant="outline" className="border-amber-300 text-amber-700 text-xs dark:border-amber-700 dark:text-amber-400">
                            {alert.articol}
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                        {alert.titlu}
                      </h4>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {alert.descriere}
                      </p>
                    </div>
                  </div>

                  {affectedIds.length > 0 && (
                    <div className="mt-3 border-t border-amber-200/60 pt-3 dark:border-amber-900/30">
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {affectedIds.length} {affectedIds.length === 1 ? 'dosar afectat' : 'dosare afectate'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {affectedIds.map(id => (
                          <a
                            key={id}
                            href={`/dosare/${id}`}
                            onClick={() => setOpen(false)}
                            className="text-xs rounded-md bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 px-2 py-1 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                          >
                            Dosar →
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-amber-300 text-amber-700 hover:bg-amber-100 text-xs dark:border-amber-700 dark:text-amber-400"
                    >
                      Marchează citită
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
