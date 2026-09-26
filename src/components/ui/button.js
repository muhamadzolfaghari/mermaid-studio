import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';

/**
 * Standard shadcn/ui Button Variants using Class Variance Authority (CVA).
 * Fully integrated with Tailwind CSS v4 design tokens and Mermaid Studio theme.
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow hover:bg-primary/90 hover:shadow-indigo-500/25',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-border bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground text-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 border border-border/50',
        ghost:
          'hover:bg-accent hover:text-accent-foreground text-muted-foreground hover:text-foreground',
        link:
          'text-primary underline-offset-4 hover:underline',
        ai:
          'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold shadow-md shadow-indigo-500/20 hover:opacity-95 hover:shadow-indigo-500/35 border-0',
        dock:
          'bg-surface-2 text-foreground/80 hover:text-foreground hover:bg-surface-hover border border-line-subtle rounded-lg',
      },
      size: {
        default: 'h-9 px-4 py-2 text-xs',
        xs: 'h-6 px-2 text-[11px] rounded',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-6 text-sm',
        icon: 'h-8 w-8 p-0 flex items-center justify-center',
        'icon-sm': 'h-7 w-7 p-0 flex items-center justify-center',
        'icon-lg': 'h-9 w-9 p-0 flex items-center justify-center',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

/**
 * Creates or enhances a DOM button element with shadcn/ui CVA classes.
 *
 * @param {Object} options
 * @param {string} [options.variant='default']
 * @param {string} [options.size='default']
 * @param {string} [options.className='']
 * @param {string|HTMLElement} [options.content='']
 * @param {string} [options.type='button']
 * @param {Function} [options.onClick]
 * @param {Object} [options.attributes={}]
 * @returns {HTMLButtonElement}
 */
export function createButton({
  variant = 'default',
  size = 'default',
  className = '',
  content = '',
  type = 'button',
  onClick = null,
  attributes = {},
} = {}) {
  const btn = document.createElement('button');
  btn.type = type;
  btn.className = cn(buttonVariants({ variant, size }), className);

  if (typeof content === 'string') {
    btn.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    btn.appendChild(content);
  }

  if (typeof onClick === 'function') {
    btn.addEventListener('click', onClick);
  }

  for (const [key, value] of Object.entries(attributes)) {
    btn.setAttribute(key, value);
  }

  return btn;
}
