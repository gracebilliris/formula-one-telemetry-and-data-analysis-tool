import { motion } from 'framer-motion';
import type { ComponentType, ReactNode } from 'react';
import {
  AlertTriangle,
  CircleAlert,
  CheckCircle2,
  Info,
  Inbox,
} from 'lucide-react';

type Variant = 'info' | 'warning' | 'error' | 'empty' | 'success';

interface StatusCardProps {
  variant?: Variant;
  icon?: ReactNode;
  title: string;
  message?: ReactNode;
  hint?: ReactNode;
  action?: { label: string; onClick: () => void };
  compact?: boolean;
}

const variantStyles: Record<Variant, { bg: string; border: string; iconBg: string; titleColor: string; accent: string }> = {
  info: {
    bg: 'bg-sky-50/80 dark:bg-sky-500/[0.08]',
    border: 'border-sky-200/80 dark:border-sky-400/20',
    iconBg: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
    titleColor: 'text-sky-900 dark:text-sky-100',
    accent: 'from-sky-400 to-sky-600',
  },
  warning: {
    bg: 'bg-amber-50/80 dark:bg-amber-500/[0.08]',
    border: 'border-amber-200/80 dark:border-amber-400/20',
    iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    titleColor: 'text-amber-900 dark:text-amber-100',
    accent: 'from-amber-400 to-amber-600',
  },
  error: {
    bg: 'bg-red-50/80 dark:bg-red-500/[0.08]',
    border: 'border-red-200/80 dark:border-red-400/20',
    iconBg: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300',
    titleColor: 'text-red-900 dark:text-red-100',
    accent: 'from-red-400 to-red-600',
  },
  empty: {
    bg: 'bg-slate-50/80 dark:bg-white/[0.03]',
    border: 'border-slate-200/80 dark:border-white/5',
    iconBg: 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400',
    titleColor: 'text-slate-800 dark:text-slate-100',
    accent: 'from-slate-300 to-slate-400',
  },
  success: {
    bg: 'bg-emerald-50/80 dark:bg-emerald-500/[0.08]',
    border: 'border-emerald-200/80 dark:border-emerald-400/20',
    iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    titleColor: 'text-emerald-900 dark:text-emerald-100',
    accent: 'from-emerald-400 to-emerald-600',
  },
};

const defaultIcons: Record<Variant, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  info: Info,
  warning: AlertTriangle,
  error: CircleAlert,
  empty: Inbox,
  success: CheckCircle2,
};

export const StatusCard = ({
  variant = 'info',
  icon,
  title,
  message,
  hint,
  action,
  compact = false,
}: StatusCardProps) => {
  const styles = variantStyles[variant];
  const Icon = defaultIcons[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl border ${styles.border} ${styles.bg} backdrop-blur-sm ${compact ? 'p-4' : 'p-5'}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${styles.accent} opacity-90`} aria-hidden />
      <div className="flex gap-4 items-start pl-2">
        <div className={`flex-none flex items-center justify-center rounded-xl ${styles.iconBg} ${compact ? 'w-9 h-9' : 'w-10 h-10'}`}>
          {icon ?? <Icon className={compact ? 'w-4 h-4' : 'w-5 h-5'} strokeWidth={2.25} />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold tracking-tight ${compact ? 'text-sm' : 'text-base'} ${styles.titleColor}`}>{title}</h3>
          {message && (
            <p className={`mt-1 ${compact ? 'text-xs' : 'text-sm'} text-slate-700 dark:text-slate-300 leading-relaxed`}>
              {message}
            </p>
          )}
          {hint && (
            <p className={`mt-2 ${compact ? 'text-[11px]' : 'text-xs'} text-slate-500 dark:text-slate-400 leading-relaxed`}>{hint}</p>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.10] transition"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
