import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:focus:ring-slate-700',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900',
        secondary: 'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100',
        outline: 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200',
        success: 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
