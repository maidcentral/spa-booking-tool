import { validateHexColor, parseThemeFromURL, getThemeColors } from './useTheme'

describe('useTheme', () => {
  describe('validateHexColor', () => {
    it('should validate correct hex colors with hash', () => {
      expect(validateHexColor('#FFFFFF')).toBe(true)
      expect(validateHexColor('#000000')).toBe(true)
      expect(validateHexColor('#FF5733')).toBe(true)
      expect(validateHexColor('#1E40AF')).toBe(true)
      expect(validateHexColor('#abc123')).toBe(true)
    })

    it('should validate correct hex colors without hash', () => {
      expect(validateHexColor('FFFFFF')).toBe(true)
      expect(validateHexColor('000000')).toBe(true)
      expect(validateHexColor('FF5733')).toBe(true)
      expect(validateHexColor('1E40AF')).toBe(true)
      expect(validateHexColor('abc123')).toBe(true)
    })

    it('should reject invalid hex colors', () => {
      expect(validateHexColor('#GGGGGG')).toBe(false)
      expect(validateHexColor('#FFF')).toBe(false) // Only 6-digit hex
      expect(validateHexColor('rgb(255,255,255)')).toBe(false)
      expect(validateHexColor('white')).toBe(false)
      expect(validateHexColor('#FFFFFF00')).toBe(false) // No 8-digit hex
      expect(validateHexColor('')).toBe(false)
      expect(validateHexColor('123')).toBe(false)
      expect(validateHexColor('#12345')).toBe(false)
    })

    it('should reject potential XSS attempts', () => {
      expect(validateHexColor('<script>alert("xss")</script>')).toBe(false)
      expect(validateHexColor('javascript:void(0)')).toBe(false)
      expect(validateHexColor('"><img src=x onerror=alert(1)>')).toBe(false)
      expect(validateHexColor('#FFFFFF;background:url(evil.js)')).toBe(false)
    })
  })

  describe('parseThemeFromURL', () => {
    const mockLocation = (search: string) => {
      Object.defineProperty(window, 'location', {
        value: { search },
        writable: true
      })
    }

    it('should parse valid theme colors from URL parameters', () => {
      mockLocation('?primaryColor=%231E40AF&foregroundColor=%23FFFFFF&backgroundColor=%23F3F4F6')
      const theme = parseThemeFromURL()
      
      expect(theme.primaryColor).toBe('#1E40AF')
      expect(theme.foregroundColor).toBe('#FFFFFF')
      expect(theme.backgroundColor).toBe('#F3F4F6')
    })

    it('should handle URL parameters without hash prefix', () => {
      mockLocation('?primaryColor=1E40AF&foregroundColor=FFFFFF&backgroundColor=F3F4F6')
      const theme = parseThemeFromURL()
      
      expect(theme.primaryColor).toBe('#1E40AF')
      expect(theme.foregroundColor).toBe('#FFFFFF')
      expect(theme.backgroundColor).toBe('#F3F4F6')
    })

    it('should return null for missing parameters', () => {
      mockLocation('?primaryColor=%231E40AF')
      const theme = parseThemeFromURL()
      
      expect(theme.primaryColor).toBe('#1E40AF')
      expect(theme.foregroundColor).toBeNull()
      expect(theme.backgroundColor).toBeNull()
    })

    it('should return null for invalid colors', () => {
      mockLocation('?primaryColor=invalid&foregroundColor=%23GGG&backgroundColor=<script>')
      const theme = parseThemeFromURL()
      
      expect(theme.primaryColor).toBeNull()
      expect(theme.foregroundColor).toBeNull()
      expect(theme.backgroundColor).toBeNull()
    })

    it('should handle empty URL parameters', () => {
      mockLocation('')
      const theme = parseThemeFromURL()
      
      expect(theme.primaryColor).toBeNull()
      expect(theme.foregroundColor).toBeNull()
      expect(theme.backgroundColor).toBeNull()
    })

    it('should handle mixed valid and invalid parameters', () => {
      mockLocation('?primaryColor=%23FF5733&foregroundColor=invalid&backgroundColor=%23000000')
      const theme = parseThemeFromURL()
      
      expect(theme.primaryColor).toBe('#FF5733')
      expect(theme.foregroundColor).toBeNull()
      expect(theme.backgroundColor).toBe('#000000')
    })
  })

  describe('getThemeColors', () => {
    const defaultTheme = {
      primaryColor: '#3B82F6',
      foregroundColor: '#FFFFFF',
      backgroundColor: '#F9FAFB'
    }

    it('should return parsed colors when all are valid', () => {
      const parsedTheme = {
        primaryColor: '#FF0000',
        foregroundColor: '#00FF00',
        backgroundColor: '#0000FF'
      }
      
      const result = getThemeColors(parsedTheme)
      expect(result).toEqual(parsedTheme)
    })

    it('should use defaults for null values', () => {
      const parsedTheme = {
        primaryColor: null,
        foregroundColor: '#00FF00',
        backgroundColor: null
      }
      
      const result = getThemeColors(parsedTheme)
      expect(result).toEqual({
        primaryColor: defaultTheme.primaryColor,
        foregroundColor: '#00FF00',
        backgroundColor: defaultTheme.backgroundColor
      })
    })

    it('should return all defaults when all values are null', () => {
      const parsedTheme = {
        primaryColor: null,
        foregroundColor: null,
        backgroundColor: null
      }
      
      const result = getThemeColors(parsedTheme)
      expect(result).toEqual(defaultTheme)
    })

    it('should handle mixed valid and null values correctly', () => {
      const parsedTheme = {
        primaryColor: '#123456',
        foregroundColor: null,
        backgroundColor: '#ABCDEF'
      }
      
      const result = getThemeColors(parsedTheme)
      expect(result).toEqual({
        primaryColor: '#123456',
        foregroundColor: defaultTheme.foregroundColor,
        backgroundColor: '#ABCDEF'
      })
    })
  })
})