import { type ClassValue } from 'clsx';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) { 
  return twMerge(clsx(inputs)); 
}

export function money(cents:number, currency='USD'){ 
  return (Number(cents||0)/100).toLocaleString(undefined,{style:'currency',currency}); 
}
