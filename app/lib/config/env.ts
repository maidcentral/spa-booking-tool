/**
 * Environment configuration utility
 * Provides type-safe access to environment variables with proper defaults
 */

import { API_BASE_URL } from './api-url';

export interface EnvConfig {
  /**
   * Determines the layout mode for the booking flow
   * true: Multi-step wizard with "Continue" buttons
   * false: Single-page continuous scroll layout
   * @default true
   */
  multiStepLayout: boolean;
  
  /**
   * Base URL for API calls
   */
  apiBaseUrl: string;
  
  /**
   * Whether API mocking is enabled
   */
  apiMockingEnabled: boolean;
  
  /**
   * Optional partner ID for tracking
   */
  partnerId?: string;
}

/**
 * Parse boolean environment variable
 * Returns true for 'true', '1', 'yes', 'on' (case-insensitive)
 * Returns false for 'false', '0', 'no', 'off' (case-insensitive)
 * Returns defaultValue for undefined or empty string
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  
  const normalizedValue = value.toLowerCase().trim();
  
  // Explicitly check for false values
  if (normalizedValue === 'false' || normalizedValue === '0' || 
      normalizedValue === 'no' || normalizedValue === 'off') {
    return false;
  }
  
  // For backward compatibility, treat any other value as true
  // This ensures existing configurations continue to work
  return true;
}

/**
 * Get the complete environment configuration
 * This function provides centralized access to all environment variables
 */
export function getEnvConfig(): EnvConfig {
  return {
    multiStepLayout: parseBoolean(
      process.env.NEXT_PUBLIC_MULTI_STEP_LAYOUT,
      false // Single-page is the default; set NEXT_PUBLIC_MULTI_STEP_LAYOUT=true for the wizard.
    ),
    apiBaseUrl: API_BASE_URL,
    apiMockingEnabled: parseBoolean(
      process.env.NEXT_PUBLIC_API_MOCKING_ENABLED,
      false
    ),
    partnerId: process.env.NEXT_PUBLIC_PARTNER_ID,
  };
}

/**
 * Convenience function to check if multi-step layout is enabled
 * @returns true if multi-step layout is enabled, false for single-page layout
 */
export function isMultiStepLayout(): boolean {
  return getEnvConfig().multiStepLayout;
}

/**
 * Convenience function to check if single-page layout is enabled
 * @returns true if single-page layout is enabled, false for multi-step layout
 */
export function isSinglePageLayout(): boolean {
  return !getEnvConfig().multiStepLayout;
}

/**
 * Get the layout mode as a string for debugging/logging
 * @returns 'multi-step' or 'single-page'
 */
export function getLayoutMode(): 'multi-step' | 'single-page' {
  return isMultiStepLayout() ? 'multi-step' : 'single-page';
}

// Export a singleton instance for consistent configuration access
export const envConfig = getEnvConfig();