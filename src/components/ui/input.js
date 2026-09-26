import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';

/**
 * Standard shadcn/ui Input Variants using Class Variance Authority (CVA).
 */
export const inputVariants = cva(
  'flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-surface/50 border-border focus-visible:border-primary',
        subtle: 'bg-surface-2 border-line focus-visible:bg-surface-3',
        ghost: 'border-transparent bg-transparent hover:bg-surface-2/60 focus:bg-surface-2',
        mono: 'font-mono text-xs bg-surface-2 border-border',
      },
      inputSize: {
        default: 'h-9 px-3 py-1 text-sm',
        sm: 'h-7 px-2.5 py-0.5 text-xs rounded',
        lg: 'h-11 px-4 py-2 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'default',
    },
  }
);

/**
 * Creates an Input DOM element with shadcn/ui CVA styling.
 *
 * @param {Object} options
 * @param {string} [options.variant='default']
 * @param {string} [options.inputSize='default']
 * @param {string} [options.className='']
 * @param {string} [options.type='text']
 * @param {string} [options.placeholder='']
 * @param {string} [options.value='']
 * @param {Function} [options.onInput]
 * @param {Object} [options.attributes={}]
 * @returns {HTMLInputElement}
 */
export function createInput({
  variant = 'default',
  inputSize = 'default',
  className = '',
  type = 'text',
  placeholder = '',
  value = '',
  onInput = null,
  attributes = {},
} = {}) {
  const input = document.createElement('input');
  input.type = type;
  input.className = cn(inputVariants({ variant, inputSize }), className);
  input.placeholder = placeholder;
  input.value = value;

  if (typeof onInput === 'function') {
    input.addEventListener('input', onInput);
  }

  for (const [key, val] of Object.entries(attributes)) {
    input.setAttribute(key, val);
  }

  return input;
}
