import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility for formatting currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

// Utility for formatting dates
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

// Utility for generating time slots
export function generateTimeSlots(
  startHour: number = 8,
  endHour: number = 18,
  intervalMinutes: number = 30
): string[] {
  const slots: string[] = []
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const time = new Date()
      time.setHours(hour, minute, 0, 0)
      
      const timeString = time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      
      slots.push(timeString)
    }
  }
  
  return slots
}

// Utility for calculating booking total
export function calculateBookingTotal(
  basePrice: number,
  extras: Array<{ price: number; quantity?: number }> = [],
  frequency: { multiplier: number } = { multiplier: 1 },
  taxRate: number = 0.08
): {
  subtotal: number
  extrasTotal: number
  frequencyTotal: number
  taxAmount: number
  total: number
} {
  const extrasTotal = extras.reduce(
    (sum, extra) => sum + (extra.price * (extra.quantity || 1)),
    0
  )
  
  const subtotal = basePrice + extrasTotal
  const frequencyTotal = subtotal * frequency.multiplier
  const taxAmount = frequencyTotal * taxRate
  const total = frequencyTotal + taxAmount
  
  return {
    subtotal,
    extrasTotal,
    frequencyTotal,
    taxAmount,
    total,
  }
}

// Utility for debouncing form inputs
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Utility for smooth scrolling to element
export function scrollToElement(elementId: string, offset: number = 100): void {
  const element = document.getElementById(elementId)
  if (element) {
    const elementPosition = element.getBoundingClientRect().top
    const offsetPosition = elementPosition + window.pageYOffset - offset
    
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    })
  }
}

// Utility for validating zip codes
export function isValidZipCode(zipCode: string): boolean {
  const zipRegex = /^\d{5}(-\d{4})?$/
  return zipRegex.test(zipCode)
}

// Utility for validating email addresses
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Utility for validating phone numbers
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^[\+]?[\d\s\(\)\-]{10,}$/
  return phoneRegex.test(phone)
}