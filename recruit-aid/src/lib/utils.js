import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Utility function to conditionally join class names
export function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
} 