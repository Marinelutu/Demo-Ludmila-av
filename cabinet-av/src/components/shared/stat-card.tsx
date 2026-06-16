'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import {
  FolderOpen, Users, Clock, AlertTriangle, Mail, Calendar,
  FileText, Scale, CheckCircle, TrendingUp, TrendingDown,
} from 'lucide-react';
import { motion } from 'framer-motion';

const ICONS = {
  folder: FolderOpen,
  users: Users,
  clock: Clock,
  alert: AlertTriangle,
  mail: Mail,
  calendar: Calendar,
  file: FileText,
  scale: Scale,
  check: CheckCircle,
} as const;

type IconName = keyof typeof ICONS;

interface StatCardProps {
  title: string;
  value: string | number;
  iconName?: IconName;
  delta?: number;
  deltaLabel?: string;
  progress?: number;
  progressLabel?: string;
  variant?: 'default' | 'warning' | 'danger';
}

export function StatCard({
  title,
  value,
  iconName,
  delta,
  deltaLabel,
  progress,
  progressLabel,
  variant = 'default',
}: StatCardProps) {
  const isPositiveDelta = delta !== undefined && delta >= 0;
  const Icon = iconName ? ICONS[iconName] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden border-slate-200 transition-shadow hover:shadow-md dark:border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
              <p
                className={cn(
                  'text-3xl font-bold tracking-tight',
                  variant === 'warning'
                    ? 'text-amber-600 dark:text-amber-400'
                    : variant === 'danger'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-900 dark:text-white'
                )}
              >
                {value}
              </p>
            </div>
            {Icon && (
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl',
                  variant === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950/30'
                    : variant === 'danger'
                      ? 'bg-red-50 dark:bg-red-950/30'
                      : 'bg-indigo-50 dark:bg-indigo-950/30'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5',
                    variant === 'warning'
                      ? 'text-amber-600 dark:text-amber-400'
                      : variant === 'danger'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-indigo-600 dark:text-indigo-400'
                  )}
                />
              </div>
            )}
          </div>

          {delta !== undefined && (
            <div className="mt-3 flex items-center gap-1.5">
              {isPositiveDelta ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              )}
              <span
                className={cn(
                  'text-xs font-semibold',
                  isPositiveDelta ? 'text-emerald-600' : 'text-red-500'
                )}
              >
                {isPositiveDelta ? '+' : ''}
                {delta}
              </span>
              {deltaLabel && (
                <span className="text-xs text-slate-500 dark:text-slate-400">{deltaLabel}</span>
              )}
            </div>
          )}

          {progress !== undefined && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">{progressLabel}</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{progress}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={cn(
                    'h-full rounded-full',
                    progress > 100
                      ? 'bg-emerald-500'
                      : progress > 75
                        ? 'bg-indigo-500'
                        : 'bg-amber-500'
                  )}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
