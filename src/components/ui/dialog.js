import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';

export const dialogOverlayVariants = cva(
  'fixed inset-0 z-50 bg-black/75 backdrop-blur-sm transition-opacity duration-200 flex items-center justify-center p-4'
);

export const dialogContentVariants = cva(
  'relative w-full max-w-lg rounded-xl border border-border bg-surface-2 p-6 shadow-2xl transition-all duration-200 text-foreground animate-in fade-in-0 zoom-in-95',
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        default: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-[95vw] h-[90vh]',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

export const dialogHeaderVariants = cva('flex flex-col space-y-1.5 text-left mb-4');
export const dialogTitleVariants = cva('text-base font-semibold leading-none tracking-tight text-foreground');
export const dialogDescriptionVariants = cva('text-xs text-muted-foreground mt-1');
export const dialogFooterVariants = cva('flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border/50');
