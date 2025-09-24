/**
 * CardConnect Configuration
 * Environment-specific settings for CardConnect Hosted iFrame Tokenizer
 */

import { getCardConnectCSS } from './cardconnect-styles'

export interface CardConnectConfig {
  environment: 'uat' | 'production'
  iframeUrl: string
  merchantId?: string
  description: string
}

// Environment detection
const isProduction = process.env.NODE_ENV === 'production'
const forceUAT = process.env.NEXT_PUBLIC_CARDCONNECT_FORCE_UAT === 'true'

// Determine environment
const getEnvironment = (): 'uat' | 'production' => {
  if (forceUAT) return 'uat'
  return isProduction ? 'production' : 'uat'
}

// Detect mobile device for responsive layout
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

// URL parameters for multi-field layout
const getTokenizerParams = (options?: { mobile?: boolean; useCSS?: boolean }) => {
  const params: Record<string, string> = {
    useexpiry: 'true',        // Adds expiry date fields
    useexpiryfield: 'true',   // Enables separate expiry field
    usecvv: 'true',           // Adds CVV field
    formatinput: 'true',      // Formats card number with spaces
    cardinputmaxlength: '19', // Allows for formatted card numbers with spaces
    cardnumbernumericonly: 'true', // Restricts to numeric input
    invalidcreditcardevent: 'true', // Triggers events for invalid card numbers
    invalidcvvevent: 'true',  // Triggers events for invalid CVV
    invalidexpiryevent: 'true', // Triggers events for invalid expiry
    orientation: 'vertical', // Use vertical layout
    usemonthnames: 'false',   // Use numeric months for cleaner layout
    invalidinputevent: 'true', // Triggers events for invalid input
    enhancedresponse: 'true', // Provides enhanced response data
    autofocus: 'true',        // Focus on card number field
    // Placeholders only - let CardConnect handle labels
    placeholder: '1234 1234 1234 1234',  // Card number placeholder with spaces
    placeholdercvv: '123',
    placeholdermonth: 'MM',
    placeholderyear: 'YYYY'
  }

  // Only add CSS parameter if requested
  if (options?.useCSS !== false) {
    params.css = getCardConnectCSS()
  }

  // URLSearchParams encodes spaces as + which shows in placeholders
  // We need to replace + with %20 for proper space rendering
  const queryString = new URLSearchParams(params).toString()
  return queryString.replace(/\+/g, '%20')
}

// Default params for server-side rendering
const defaultParams = getTokenizerParams({ mobile: false })

// Configuration by environment
const configs: Record<'uat' | 'production', CardConnectConfig> = {
  uat: {
    environment: 'uat',
    iframeUrl: `https://fts-uat.cardconnect.com/itoke/ajax-tokenizer.html?${defaultParams}`,
    description: 'UAT Environment - Use test cards only'
  },
  production: {
    environment: 'production',
    iframeUrl: `https://fts.cardconnect.com/itoke/ajax-tokenizer.html?${defaultParams}`,
    description: 'Production Environment - Real transactions'
  }
}

// Export current configuration
export const cardConnectConfig: CardConnectConfig = configs[getEnvironment()]

// Test card information for UAT environment
export const testCards = {
  visa: {
    number: '4111111111111111',
    expiry: '12/25',
    cvv: '123',
    description: 'Visa Test Card'
  },
  mastercard: {
    number: '5555555555554444',
    expiry: '12/25',
    cvv: '123',
    description: 'Mastercard Test Card'
  },
  amex: {
    number: '378282246310005',
    expiry: '12/25',
    cvv: '1234',
    description: 'American Express Test Card'
  }
}

// Utility functions
export const isUATEnvironment = () => cardConnectConfig.environment === 'uat'
export const isProductionEnvironment = () => cardConnectConfig.environment === 'production'
export const getIframeUrl = () => cardConnectConfig.iframeUrl
export const getEnvironmentDescription = () => cardConnectConfig.description

// Dynamic URL builder for responsive layouts
export const buildTokenizerUrl = (options?: { mobile?: boolean; useCSS?: boolean }) => {
  const baseUrl = isUATEnvironment()
    ? 'https://fts-uat.cardconnect.com/itoke/ajax-tokenizer.html'
    : 'https://fts.cardconnect.com/itoke/ajax-tokenizer.html'
  const params = getTokenizerParams(options)
  return `${baseUrl}?${params}`
}

// Export CSS utility
export { getCardConnectCSS }