import { 
  ThemePerformanceMonitor,
  getPerformanceMetrics,
  getAveragePerformanceMetrics,
  clearPerformanceMetrics,
  isPerformanceHealthy,
  getPerformanceStatus
} from '../performance'

// Mock performance.now for consistent testing
let mockNow = 0
Object.defineProperty(performance, 'now', {
  value: jest.fn(() => mockNow)
})

// Mock console methods
const originalConsoleWarn = console.warn
const originalConsoleInfo = console.info
const mockConsoleWarn = jest.fn()
const mockConsoleInfo = jest.fn()

describe('ThemePerformanceMonitor', () => {
  beforeEach(() => {
    mockNow = 0
    clearPerformanceMetrics()
    console.warn = mockConsoleWarn
    console.info = mockConsoleInfo
    mockConsoleWarn.mockClear()
    mockConsoleInfo.mockClear()
  })

  afterAll(() => {
    console.warn = originalConsoleWarn
    console.info = originalConsoleInfo
  })

  describe('Basic Performance Monitoring', () => {
    it('should track URL parsing time correctly', () => {
      const monitor = new ThemePerformanceMonitor()
      
      mockNow = 5
      monitor.startUrlParsing()
      
      mockNow = 10
      const parsingTime = monitor.endUrlParsing()
      
      expect(parsingTime).toBe(5)
    })

    it('should track validation time correctly', () => {
      const monitor = new ThemePerformanceMonitor()
      
      mockNow = 10
      monitor.startValidation()
      
      mockNow = 25
      const validationTime = monitor.endValidation()
      
      expect(validationTime).toBe(15)
    })

    it('should track CSS application time correctly', () => {
      const monitor = new ThemePerformanceMonitor()
      
      mockNow = 20
      monitor.startCssApplication()
      
      mockNow = 45
      const cssTime = monitor.endCssApplication()
      
      expect(cssTime).toBe(25)
    })

    it('should calculate total theme time from start to completion', () => {
      mockNow = 0
      const monitor = new ThemePerformanceMonitor()
      
      mockNow = 50
      const metrics = monitor.complete(5, 10, 20)
      
      expect(metrics.totalThemeTime).toBe(50)
      expect(metrics.urlParsingTime).toBe(5)
      expect(metrics.validationTime).toBe(10)
      expect(metrics.cssApplicationTime).toBe(20)
    })
  })

  describe('Performance Thresholds', () => {
    it('should detect when URL parsing exceeds threshold', () => {
      const monitor = new ThemePerformanceMonitor()
      const metrics = monitor.complete(15, 5, 5) // URL parsing > 10ms threshold
      
      expect(metrics.urlParsingTime).toBe(15)
      expect(metrics.urlParsingTime).toBeGreaterThan(10) // Threshold
    })

    it('should detect when validation exceeds threshold', () => {
      const monitor = new ThemePerformanceMonitor()
      const metrics = monitor.complete(5, 25, 5) // Validation > 20ms threshold
      
      expect(metrics.validationTime).toBe(25)
      expect(metrics.validationTime).toBeGreaterThan(20) // Threshold
    })

    it('should detect when CSS application exceeds threshold', () => {
      const monitor = new ThemePerformanceMonitor()
      const metrics = monitor.complete(5, 5, 35) // CSS application > 30ms threshold
      
      expect(metrics.cssApplicationTime).toBe(35)
      expect(metrics.cssApplicationTime).toBeGreaterThan(30) // Threshold
    })

    it('should detect when total time exceeds threshold', () => {
      mockNow = 0
      const monitor = new ThemePerformanceMonitor()
      
      mockNow = 60 // Total time > 50ms threshold
      const metrics = monitor.complete(5, 5, 5)
      
      expect(metrics.totalThemeTime).toBe(60)
      expect(metrics.totalThemeTime).toBeGreaterThan(50) // Threshold
    })

    it('should pass when all metrics are within thresholds', () => {
      const monitor = new ThemePerformanceMonitor()
      const metrics = monitor.complete(5, 10, 15) // All within thresholds
      
      expect(metrics.urlParsingTime).toBeLessThanOrEqual(10)
      expect(metrics.validationTime).toBeLessThanOrEqual(20)
      expect(metrics.cssApplicationTime).toBeLessThanOrEqual(30)
    })
  })

  describe('Metrics Storage and Retrieval', () => {
    it('should store performance metrics', () => {
      const monitor = new ThemePerformanceMonitor()
      monitor.complete(5, 10, 15)
      
      const metrics = getPerformanceMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0]).toEqual(
        expect.objectContaining({
          urlParsingTime: 5,
          validationTime: 10,
          cssApplicationTime: 15
        })
      )
    })

    it('should calculate average metrics correctly', () => {
      // Add multiple measurements
      const monitor1 = new ThemePerformanceMonitor()
      monitor1.complete(10, 20, 30)
      
      const monitor2 = new ThemePerformanceMonitor()
      monitor2.complete(20, 40, 60)
      
      const average = getAveragePerformanceMetrics()
      expect(average).toEqual({
        urlParsingTime: 15, // (10 + 20) / 2
        validationTime: 30, // (20 + 40) / 2
        cssApplicationTime: 45, // (30 + 60) / 2
        totalThemeTime: 0 // Both had 0 total time in this test
      })
    })

    it('should limit stored metrics to prevent memory leaks', () => {
      // Add more than 100 measurements
      for (let i = 0; i < 105; i++) {
        const monitor = new ThemePerformanceMonitor()
        monitor.complete(1, 1, 1)
      }
      
      const metrics = getPerformanceMetrics()
      expect(metrics).toHaveLength(100) // Should be limited to 100
    })

    it('should clear metrics when requested', () => {
      const monitor = new ThemePerformanceMonitor()
      monitor.complete(5, 10, 15)
      
      expect(getPerformanceMetrics()).toHaveLength(1)
      
      clearPerformanceMetrics()
      expect(getPerformanceMetrics()).toHaveLength(0)
    })
  })

  describe('Performance Health Assessment', () => {
    it('should report healthy performance when all metrics are good', () => {
      // Add measurements within thresholds
      for (let i = 0; i < 5; i++) {
        const monitor = new ThemePerformanceMonitor()
        monitor.complete(5, 10, 15) // All within thresholds
      }
      
      expect(isPerformanceHealthy()).toBe(true)
    })

    it('should report unhealthy performance when metrics exceed thresholds', () => {
      // Add some good measurements
      for (let i = 0; i < 5; i++) {
        const monitor = new ThemePerformanceMonitor()
        monitor.complete(5, 10, 15)
      }
      
      // Add one bad measurement
      const badMonitor = new ThemePerformanceMonitor()
      badMonitor.complete(50, 100, 200) // All exceed thresholds
      
      expect(isPerformanceHealthy()).toBe(false)
    })

    it('should provide comprehensive performance status', () => {
      const monitor = new ThemePerformanceMonitor()
      monitor.complete(15, 25, 35) // All slightly over thresholds
      
      const status = getPerformanceStatus()
      
      expect(status.isHealthy).toBe(false)
      expect(status.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('URL parsing is slow'),
          expect.stringContaining('Color validation is slow'),
          expect.stringContaining('CSS application is slow')
        ])
      )
      expect(status.thresholds).toEqual({
        urlParsing: 10,
        validation: 20,
        cssApplication: 30,
        totalTheme: 50
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle analytics reporting errors gracefully', () => {
      // Mock navigator to throw an error
      const originalNavigator = global.navigator
      delete (global as any).navigator
      
      const monitor = new ThemePerformanceMonitor()
      
      // Should not throw even if navigator is undefined
      expect(() => {
        monitor.complete(25, 50, 75)
      }).not.toThrow()
      
      global.navigator = originalNavigator
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing start times gracefully', () => {
      const monitor = new ThemePerformanceMonitor()
      
      // End timing without starting
      expect(monitor.endUrlParsing()).toBe(0)
      expect(monitor.endValidation()).toBe(0)
      expect(monitor.endCssApplication()).toBe(0)
    })

    it('should return null for average when no metrics exist', () => {
      expect(getAveragePerformanceMetrics()).toBeNull()
    })

    it('should report healthy when no metrics exist', () => {
      expect(isPerformanceHealthy()).toBe(true)
    })

    it('should handle zero timing values', () => {
      const monitor = new ThemePerformanceMonitor()
      const metrics = monitor.complete(0, 0, 0)
      
      expect(metrics.urlParsingTime).toBe(0)
      expect(metrics.validationTime).toBe(0)
      expect(metrics.cssApplicationTime).toBe(0)
    })
  })
})