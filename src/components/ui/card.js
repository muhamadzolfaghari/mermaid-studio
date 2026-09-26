import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';

export const cardVariants = cva(
  'rounded-xl border bg-card text-card-foreground shadow transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'border-border/60 bg-surface/70 backdrop-blur-md',
        elevated: 'border-border bg-surface-2 shadow-lg shadow-black/40',
        interactive: 'border-border/60 bg-surface/60 hover:bg-surface-hover hover:border-primary/50 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5',
        ai: 'border-indigo-500/30 bg-gradient-to-br from-indigo-950/20 via-surface to-purple-950/20 shadow-md shadow-indigo-500/5',
        ghost: 'border-transparent bg-transparent shadow-none',
      },
      padding: {
        none: 'p-0',
        sm: 'p-3',
        default: 'p-5',
        lg: 'p-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default',
    },
  }
);

export const cardHeaderVariants = cva('flex flex-col space-y-1.5 pb-3');
export const cardTitleVariants = cva('font-semibold leading-none tracking-tight text-foreground text-sm');
export const cardDescriptionVariants = cva('text-xs text-muted-foreground leading-relaxed');
export const cardContentVariants = cva('pt-0 text-sm');
export const cardFooterVariants = cva('flex items-center pt-3 border-t border-border/40');

/**
 * Creates a structured Card DOM element using shadcn/ui conventions.
 *
 * @param {Object} options
 * @param {string} [options.variant='default']
 * @param {string} [options.padding='default']
 * @param {string} [options.className='']
 * @param {string} [options.title='']
 * @param {string} [options.description='']
 * @param {string|HTMLElement} [options.content='']
 * @param {string|HTMLElement} [options.footer='']
 * @returns {HTMLDivElement}
 */
export function createCard({
  variant = 'default',
  padding = 'default',
  className = '',
  title = '',
  description = '',
  content = '',
  footer = '',
} = {}) {
  const card = document.createElement('div');
  card.className = cn(cardVariants({ variant, padding }), className);

  if (title || description) {
    const header = document.createElement('div');
    header.className = cardHeaderVariants();

    if (title) {
      const h3 = document.createElement('h3');
      h3.className = cardTitleVariants();
      h3.textContent = title;
      header.appendChild(h3);
    }

    if (description) {
      const p = document.createElement('p');
      p.className = cardDescriptionVariants();
      p.textContent = description;
      header.appendChild(p);
    }

    card.appendChild(header);
  }

  if (content) {
    const body = document.createElement('div');
    body.className = cardContentVariants();
    if (typeof content === 'string') {
      body.innerHTML = content;
    } else {
      body.appendChild(content);
    }
    card.appendChild(body);
  }

  if (footer) {
    const foot = document.createElement('div');
    foot.className = cardFooterVariants();
    if (typeof footer === 'string') {
      foot.innerHTML = footer;
    } else {
      foot.appendChild(footer);
    }
    card.appendChild(foot);
  }

  return card;
}
