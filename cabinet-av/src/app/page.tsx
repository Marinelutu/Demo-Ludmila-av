export const dynamic = 'force-dynamic';

import { getMottoZilnic } from '@/data/motto';
import { prisma } from '@/lib/prisma';
import { StatCard } from '@/components/shared/stat-card';
import { LegislativeAlertsDrawer } from '@/components/shared/legislative-alerts-drawer';
import { HomeOcrButton } from '@/components/ocr/home-ocr-button';
import { Mail, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { ro } from 'date-fns/locale';

export default async function DashboardPage() {
  const motto = getMottoZilnic();
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Fetch stats
  const [
    activeCasesCount,
    activeClientsCount,
    upcomingDeadlines,
    recentEmails,
    activeAlerts,
    thisWeekTimeEntries
  ] = await Promise.all([
    prisma.case.count({ where: { stare: { notIn: ['finalizat', 'arhivat'] } } }),
    prisma.client.count({ where: { status: 'activ' } }),
    prisma.deadline.findMany({
      where: {
        status: 'activ',
        data: {
          gte: now,
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // next 30 days
        }
      },
      orderBy: { data: 'asc' },
      take: 5,
      include: { case: true }
    }),
    prisma.email.findMany({
      where: { status: 'nou' },
      orderBy: { data: 'desc' },
      take: 5,
      include: { client: true }
    }),
    prisma.legislativeAlert.findMany({
      where: { status: 'noua' }
    }),
    prisma.timeEntry.findMany({
      where: {
        startTime: {
          gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    })
  ]);

  const deadlinesNext7Days = upcomingDeadlines.filter(d => d.data <= sevenDaysFromNow).length;
  
  const totalSecondsThisWeek = thisWeekTimeEntries.reduce((acc, entry) => acc + (entry.durata || 0), 0);
  const totalHoursThisWeek = (totalSecondsThisWeek / 3600).toFixed(1);
  const targetHours = 40;
  const progressHours = Math.min((Number(totalHoursThisWeek) / targetHours) * 100, 100);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Motto + acțiune rapidă OCR */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 rounded-xl border border-indigo-100 bg-indigo-50/50 px-6 py-4 dark:border-indigo-900/30 dark:bg-indigo-950/20">
          <p className="text-sm font-medium italic text-indigo-800 dark:text-indigo-300">
            &quot;{motto.text}&quot;
          </p>
          <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">— {motto.autor}</p>
        </div>
        <HomeOcrButton />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Dosare Active"
          value={activeCasesCount}
          iconName="folder"
          delta={2}
          deltaLabel="vs luna trecută"
          href="/dosare"
        />
        <StatCard
          title="Clienți Activi"
          value={activeClientsCount}
          iconName="users"
          delta={1}
          deltaLabel="vs luna trecută"
          href="/clienti"
        />
        <StatCard
          title="Ore (7 zile)"
          value={`${totalHoursThisWeek}h`}
          iconName="clock"
          progress={Math.round(progressHours)}
          progressLabel="din 40h target"
          href="/timp"
        />
        <StatCard
          title="Termene (7 zile)"
          value={deadlinesNext7Days}
          iconName="alert"
          variant={deadlinesNext7Days > 3 ? 'warning' : 'default'}
          href="/dosare"
        />
      </div>

      {/* Alerte legislative */}
      {activeAlerts.length > 0 && (
        <LegislativeAlertsDrawer alerts={activeAlerts} />
      )}

      {/* 2 Columns: Termene & Emailuri */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Termene apropiate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Termene apropiate</CardTitle>
            <Link href="/dosare" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
              Vezi toate
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-4">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-slate-500">Nu există termene în următoarele 30 de zile.</p>
              ) : (
                upcomingDeadlines.map((deadline) => {
                  const daysLeft = differenceInDays(deadline.data, now);
                  const isUrgent = daysLeft <= 3;
                  
                  return (
                    <Link
                      key={deadline.id}
                      href={`/dosare/${deadline.caseId}`}
                      className="flex items-start gap-4 rounded-lg border border-transparent p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isUrgent ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none text-slate-900 dark:text-white">
                          {deadline.descriere}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {deadline.case.numar} — {deadline.case.denumire}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={isUrgent ? 'destructive' : 'secondary'}>
                          În {daysLeft} zile
                        </Badge>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {format(deadline.data, 'dd MMM', { locale: ro })}
                        </p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Emailuri noi */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Emailuri noi ({recentEmails.length})</CardTitle>
            <Link href="/email" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
              Deschide inbox
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-4">
              {recentEmails.length === 0 ? (
                <p className="text-sm text-slate-500">Nu aveți emailuri noi.</p>
              ) : (
                recentEmails.map((email) => (
                  <Link
                    key={email.id}
                    href={`/email?id=${email.id}`}
                    className="flex items-start gap-4 rounded-lg border border-transparent p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {email.client ? `${email.client.prenume} ${email.client.nume}` : email.expeditor}
                        </p>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {format(email.data, 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {email.subiect}
                      </p>
                      {email.aiSummary && (
                        <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">AI: </span>
                          {email.aiSummary}
                        </p>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}