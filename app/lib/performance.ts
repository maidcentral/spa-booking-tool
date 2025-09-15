/**
 * Performance monitoring utilities for theme initialization
 */

interface ThemePerformanceMetrics {
  urlParsingTime: number
  validationTime: number
  cssApplicationTime: number
  totalThemeTime: number
  firstPaintTime?: number
  timestamp: number
}

interface PerformanceThresholds {
  urlParsing: number // Max time for URL parsing (ms)
  validation: number // Max time for color validation (ms) 
  cssApplication: number // Max time for CSS application (ms)
  totalTheme: number // Max total theme initialization time (ms)
}

// Performance thresholds based on technical requirements
const PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  urlParsing: 10, // URL parsing should be very fast
  validation: 20, // Color validation should be quick
  cssApplication: 30, // CSS application should be fast
  totalTheme: 50 // Total theme init should be under 50ms
}

// Store performance metrics
const performanceMetrics: ThemePerformanceMetrics[] = []

export class ThemePerformanceMonitor {
  private startTime: number
  private parseStartTime?: number
  private validateStartTime?: number
  private cssStartTime?: number
  
  constructor() {
    this.startTime = performance.now()
  }

  /**
   * Mark the start of URL parameter parsing
   */
  startUrlParsing(): void {
    this.parseStartTime = performance.now()
  }

  /**
   * Mark the end of URL parameter parsing
   */
  endUrlParsing(): number {
    if (!this.parseStartTime) return 0
    return performance.now() - this.parseStartTime
  }

  /**
   * Mark the start of color validation
   */
  startValidation(): void {
    this.validateStartTime = performance.now()
  }

  /**
   * Mark the end of color validation
   */
  endValidation(): number {
    if (!this.validateStartTime) return 0
    return performance.now() - this.validateStartTime
  }

  /**
   * Mark the start of CSS application
   */
  startCssApplication(): void {
    this.cssStartTime = performance.now()
  }

  /**
   * Mark the end of CSS application
   */
  endCssApplication(): number {
    if (!this.cssStartTime) return 0
    return performance.now() - this.cssStartTime
  }

  /**
   * Complete monitoring and return metrics
   */
  complete(urlParsingTime: number, validationTime: number, cssApplicationTime: number): ThemePerformanceMetrics {
    const totalTime = performance.now() - this.startTime
    
    const metrics: ThemePerformanceMetrics = {
      urlParsingTime,
      validationTime,
      cssApplicationTime,
      totalThemeTime: totalTime,
      firstPaintTime: this.getFirstPaintTime(),
      timestamp: Date.now()
    }

    // Store metrics
    performanceMetrics.push(metrics)

    // Keep only last 100 measurements to prevent memory leaks
    if (performanceMetrics.length > 100) {
      performanceMetrics.shift()
    }

    // Log performance warnings
    this.checkPerformanceThresholds(metrics)

    return metrics
  }

  /**
   * Get first paint time if available
   */
  private getFirstPaintTime(): number | undefined {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const paintEntries = performance.getEntriesByType('paint')
      const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')
      return firstPaint?.startTime
    }
    return undefined
  }

  /**
   * Check performance against thresholds and log warnings
   */
  private checkPerformanceThresholds(metrics: ThemePerformanceMetrics): void {
    const warnings: string[] = []

    if (metrics.urlParsingTime > PERFORMANCE_THRESHOLDS.urlParsing) {
      warnings.push(`URL parsing took ${metrics.urlParsingTime.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.urlParsing}ms)`)
    }

    if (metrics.validationTime > PERFORMANCE_THRESHOLDS.validation) {
      warnings.push(`Color validation took ${metrics.validationTime.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.validation}ms)`)
    }

    if (metrics.cssApplicationTime > PERFORMANCE_THRESHOLDS.cssApplication) {
      warnings.push(`CSS application took ${metrics.cssApplicationTime.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.cssApplication}ms)`)
    }

    if (metrics.totalThemeTime > PERFORMANCE_THRESHOLDS.totalTheme) {
      warnings.push(`Total theme initialization took ${metrics.totalThemeTime.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.totalTheme}ms)`)
    }

    // Log warnings in development
    if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
    }

    // Report to analytics in production (if available)
    if (warnings.length > 0 && process.env.NODE_ENV === 'production') {
      this.reportPerformanceIssues(metrics, warnings)
    }
  }

  /**
   * Report performance issues to analytics
   */
  private reportPerformanceIssues(metrics: ThemePerformanceMetrics, warnings: string[]): void {
    try {
      // You could integrate with analytics services here
      // Performance metrics available but not logged to console
    } catch (error) {
      // Silently fail - don't break the user experience
    }
  }
}

/**
 * Get recent performance metrics
 */
export function getPerformanceMetrics(): ThemePerformanceMetrics[] {
  return [...performanceMetrics]
}

/**
 * Get average performance metrics
 */
export function getAveragePerformanceMetrics(): Partial<ThemePerformanceMetrics> | null {
  if (performanceMetrics.length === 0) return null

  const avg = performanceMetrics.reduce(
    (acc, metrics) => ({
      urlParsingTime: acc.urlParsingTime + metrics.urlParsingTime,
      validationTime: acc.validationTime + metrics.validationTime,
      cssApplicationTime: acc.cssApplicationTime + metrics.cssApplicationTime,
      totalThemeTime: acc.totalThemeTime + metrics.totalThemeTime,
    }),
    { urlParsingTime: 0, validationTime: 0, cssApplicationTime: 0, totalThemeTime: 0 }
  )

  const count = performanceMetrics.length
  return {
    urlParsingTime: avg.urlParsingTime / count,
    validationTime: avg.validationTime / count,
    cssApplicationTime: avg.cssApplicationTime / count,
    totalThemeTime: avg.totalThemeTime / count,
  }
}

/**
 * Clear performance metrics (useful for testing)
 */
export function clearPerformanceMetrics(): void {
  performanceMetrics.length = 0
}

/**
 * Check if current performance is within acceptable thresholds
 */
export function isPerformanceHealthy(): boolean {
  if (performanceMetrics.length === 0) return true

  const recent = performanceMetrics.slice(-10) // Check last 10 measurements
  return recent.every(metrics => 
    metrics.urlParsingTime <= PERFORMANCE_THRESHOLDS.urlParsing &&
    metrics.validationTime <= PERFORMANCE_THRESHOLDS.validation &&
    metrics.cssApplicationTime <= PERFORMANCE_THRESHOLDS.cssApplication &&
    metrics.totalThemeTime <= PERFORMANCE_THRESHOLDS.totalTheme
  )
}

/**
 * Get performance status with human-readable information
 */
export function getPerformanceStatus(): {
  isHealthy: boolean
  metrics: Partial<ThemePerformanceMetrics> | null
  thresholds: PerformanceThresholds
  warnings: string[]
} {
  const isHealthy = isPerformanceHealthy()
  const metrics = getAveragePerformanceMetrics()
  const warnings: string[] = []

  if (metrics) {
    if (metrics.urlParsingTime! > PERFORMANCE_THRESHOLDS.urlParsing) {
      warnings.push(`URL parsing is slow (${metrics.urlParsingTime!.toFixed(2)}ms)`)
    }
    if (metrics.validationTime! > PERFORMANCE_THRESHOLDS.validation) {
      warnings.push(`Color validation is slow (${metrics.validationTime!.toFixed(2)}ms)`)
    }
    if (metrics.cssApplicationTime! > PERFORMANCE_THRESHOLDS.cssApplication) {
      warnings.push(`CSS application is slow (${metrics.cssApplicationTime!.toFixed(2)}ms)`)
    }
    if (metrics.totalThemeTime! > PERFORMANCE_THRESHOLDS.totalTheme) {
      warnings.push(`Overall theme initialization is slow (${metrics.totalThemeTime!.toFixed(2)}ms)`)
    }
  }

  return {
    isHealthy,
    metrics,
    thresholds: PERFORMANCE_THRESHOLDS,
    warnings
  }
}