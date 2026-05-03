import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

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

const variantStyles: Record<Variant, { bg: string; border: string; ring: string; iconBg: string; titleColor: string }> = {
  info: {
    bg: 'bg-sky-500/5 dark:bg-sky-500/10',
    border: 'border-sky-500/30 dark:border-sky-400/30',
    ring: 'ring-sky-400/20',
    iconBg: 'bg-sky-500/15 text-sky-600 dark:text-sky-300',
    titleColor: 'text-sky-700 dark:text-sky-200',
  },
  warning: {
    bg: 'bg-amber-500/5 dark:bg-amber-500/10',
    border: 'border-amber-500/30 dark:border-amber-400/30',
    ring: 'ring-amber-400/20',
    iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
    titleColor: 'text-amber-700 dark:text-amber-200',
  },
  error: {
    bg: 'bg-red-500/5 dark:bg-red-500/10',
    border: 'border-red-500/30 dark:border-red-400/30',
    ring: 'ring-red-400/20',
    iconBg: 'bg-red-500/15 text-red-600 dark:text-red-300',
    titleColor: 'text-red-700 dark:text-red-200',
  },
  empty: {
    bg: 'bg-slate-100/50 dark:bg-slate-800/40',
    border: 'border-slate-300/60 dark:border-slate-700/60',
    ring: 'ring-slate-400/10',
    iconBg: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    titleColor: 'text-slate-700 dark:text-slate-200',
  },
  success: {
    bg: 'bg-emerald-500/5 dark:bg-emerald-500/10',
    border: 'border-emerald-500/30 dark:border-emerald-400/30',
    ring: 'ring-emerald-400/20',
    iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    titleColor: 'text-emerald-700 dark:text-emerald-200',
  },
};

const defaultIcons: Record<Variant, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '⚠️',
  empty: '∅',
  success: '✓',
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl border ${styles.border} ${styles.bg} backdrop-blur-sm ring-1 ${styles.ring} ${compact ? 'p-4' : 'p-6'}`}
    >
      <div className="flex gap-4 items-start">
        <div className={`flex-none flex items-center justify-center rounded-xl ${styles.iconBg} ${compact ? 'w-9 h-9 text-base' : 'w-11 h-11 text-lg'}`}>
          {icon ?? defaultIcons[variant]}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold ${compact ? 'text-sm' : 'text-base'} ${styles.titleColor}`}>{title}</h3>
          {message && (
            <p className={`mt-1 ${compact ? 'text-xs' : 'text-sm'} text-slate-700 dark:text-slate-300 leading-relaxed`}>
              {message}
            </p>
          )}
          {hint && (
            <p className={`mt-2 ${compact ? 'text-[11px]' : 'text-xs'} text-slate-500 dark:text-slate-400`}>{hint}</p>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-slate-300/60 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 transition"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
