/**
 * Currency utility functions for handling cents-based amounts
 */

/**
 * Convert cents to dollar amount for display
 */
export function centsToDisplay(cents: number | null | undefined): string {
  if (!cents && cents !== 0) return "$0.00";
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Convert dollar amount to cents for API calls
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Format cents as currency without the dollar sign
 */
export function centsToNumber(cents: number | null | undefined): number {
  if (!cents && cents !== 0) return 0;
  return cents / 100;
}

/**
 * Parse user input (string) to cents, handling common input formats
 */
export function parseInputToCents(input: string): number | null {
  // Remove any non-digit and non-decimal characters
  const cleanInput = input.replace(/[^0-9.]/g, '');
  
  // Parse as float
  const dollars = parseFloat(cleanInput);
  
  if (isNaN(dollars)) return null;
  
  return Math.round(dollars * 100);
}