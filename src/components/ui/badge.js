import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';

/**
 * Standard shadcn/ui Badge Variants using Class Variance Authority (CVA).
 */
export const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline:
          'border-border text-foreground',
        success:
          'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
        warning:
          'border-amber-500/30 bg-amber-500/10 text-amber-400',
        ai:
          'border-indigo-500/40 bg-indigo-500/15 text-indigo-300 shadow-sm shadow-indigo-500/10',
      },
      size: {
        default: 'text-xs px-2.5 py-0.5',
        sm: 'text-[10px] px-2 py-0.2',
        lg: 'text-sm px-3 py-1',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

/**
 * Creates a Badge DOM element with shadcn/ui CVA styling.
 *
 * @param {Object} options
 * @param {string} [options.variant='default']
 * @param {string} [options.size='default']
 * @param {string} [options.className='']
 * @param {string} [options.text='']
 * @returns {HTMLSpanElement}
 */
export function createBadge({
  variant = 'default',
  size = 'default',
  className = '',
  text = '',
} = {}) {
  const badge = document.createElement('span');
  badge.className = cn(badgeVariants({ variant, size }), className);
  badge.textContent = text;
  return badge;
}
