import { validateHexColor, parseThemeFromURL } from '../useTheme'

describe('Theme Security Tests', () => {
  describe('XSS Prevention', () => {
    it('should reject script injection attempts in color values', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox("xss")',
        'javascript:void(0)',
        'data:application/javascript,alert(1)',
        '\x3cscript\x3ealert(1)\x3c/script\x3e', // Encoded script tags
        '%3Cscript%3Ealert(1)%3C/script%3E', // URL encoded script
        'FF0000"><script>alert(1)</script>',
        'FF0000;background:url(javascript:alert(1))',
        'expression(alert("xss"))', // CSS expression
        'url("javascript:alert(1)")', // CSS url with javascript
        '\\0000003Cscript\\0000003Ealert(1)\\0000003C/script\\0000003E' // Null byte injection
      ]

      maliciousInputs.forEach(input => {
        expect(validateHexColor(input)).toBe(false)
      })
    })

    it('should reject HTML injection attempts', () => {
      const htmlInjectionInputs = [
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        '<iframe src=javascript:alert(1)>',
        '<object data=javascript:alert(1)>',
        '<embed src=javascript:alert(1)>',
        '<link rel=stylesheet href=javascript:alert(1)>',
        '<style>@import url(javascript:alert(1))</style>',
        '"><img src=x onerror=alert(1)>',
        '\'>"><img src=x onerror=alert(1)>',
        'FF0000<img src=x onerror=alert(1)>',
        'FF0000" onmouseover="alert(1)"',
        'FF0000\' onclick=\'alert(1)\'',
        '/**/alert(1)/**/',
        '<!--<script>alert(1)</script>-->'
      ]

      htmlInjectionInputs.forEach(input => {
        expect(validateHexColor(input)).toBe(false)
      })
    })

    it('should reject CSS injection attempts', () => {
      const cssInjectionInputs = [
        'FF0000; background: url(data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+)',
        'FF0000; background-image: url(javascript:alert(1))',
        'FF0000; -moz-binding: url(data:text/xml;base64,<script>)',
        'FF0000} body{background:url(javascript:alert(1))',
        'FF0000/**/;/**/background:/**/url(javascript:alert(1))',
        'FF0000\\22 onmouseover=\\22alert(1)\\22',
        'FF0000\\\\22 onmouseover=\\\\22alert(1)\\\\22',
        'FF0000\\"onmouseover=\\"alert(1)\\"',
        'FF0000;@import url(javascript:alert(1))',
        'FF0000; content: url(data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+)'
      ]

      cssInjectionInputs.forEach(input => {
        expect(validateHexColor(input)).toBe(false)
      })
    })

    it('should reject URL parameter manipulation attempts', () => {
      // Mock location for URL parameter tests
      const mockLocation = (search: string) => {
        Object.defineProperty(window, 'location', {
          value: { search },
          writable: true
        })
      }

      const maliciousURLs = [
        '?primaryColor=%3Cscript%3Ealert(1)%3C/script%3E',
        '?primaryColor=javascript:alert(1)',
        '?primaryColor=data:text/html,<script>alert(1)</script>',
        '?primaryColor=FF0000%22%20onmouseover=%22alert(1)%22',
        '?primaryColor=FF0000;background:url(evil.js)',
        '?primaryColor=FF0000&amp;background=red&amp;onclick=alert(1)',
        '?primaryColor=FF0000"><img src=x onerror=alert(1)>',
        '?primaryColor=FF0000\';DROP TABLE users;--',
        '?primaryColor=${alert(1)}',
        '?primaryColor={{constructor.constructor("alert(1)")()}}'
      ]

      maliciousURLs.forEach(url => {
        mockLocation(url)
        const theme = parseThemeFromURL()
        expect(theme.primaryColor).toBeNull()
        expect(theme.foregroundColor).toBeNull()
        expect(theme.backgroundColor).toBeNull()
      })
    })

    it('should handle null and undefined values safely', () => {
      expect(validateHexColor(null as any)).toBe(false)
      expect(validateHexColor(undefined as any)).toBe(false)
      expect(validateHexColor('')).toBe(false)
      expect(validateHexColor('   ')).toBe(false) // Whitespace only
      expect(validateHexColor('\0')).toBe(false) // Null byte
      expect(validateHexColor('\n')).toBe(false) // Newline
      expect(validateHexColor('\t')).toBe(false) // Tab
      expect(validateHexColor('\r')).toBe(false) // Carriage return
    })

    it('should reject extremely long strings (potential DoS)', () => {
      const longString = 'A'.repeat(10000) // Very long string
      expect(validateHexColor(longString)).toBe(false)
      
      const longHexLike = '1'.repeat(1000) // Long numeric string
      expect(validateHexColor(longHexLike)).toBe(false)
    })

    it('should reject unicode and special character injections', () => {
      const unicodeInjections = [
        'FF0000\u0000\u0001', // Null bytes and control chars
        'FF0000\uFEFF', // Byte order mark
        'FF0000\u200B', // Zero width space
        'FF0000\u00A0', // Non-breaking space
        'FF0000\u2028', // Line separator
        'FF0000\u2029', // Paragraph separator
        'FF0000\uFFFD', // Replacement character
        'FF0000\uD800', // High surrogate (invalid)
        'FF0000\uDFFF', // Low surrogate (invalid)
        '\uD83D\uDE08FF0000', // Emoji mixed with hex
        'FF0000\u0300\u0301\u0302' // Combining diacritical marks
      ]

      unicodeInjections.forEach(input => {
        expect(validateHexColor(input)).toBe(false)
      })
    })
  })

  describe('Input Sanitization', () => {
    it('should handle standard hex colors correctly after sanitization', () => {
      // These should pass validation
      const validHexColors = [
        'FFFFFF',
        '000000',
        'FF0000',
        '00FF00',
        '0000FF',
        'ABC123',
        'def456',
        '123ABC',
        '789DEF'
      ]

      validHexColors.forEach(color => {
        expect(validateHexColor(color)).toBe(true)
        expect(validateHexColor(`#${color}`)).toBe(true)
      })
    })

    it('should normalize and validate hex colors with hash prefix', () => {
      const colorsWithHash = [
        '#FFFFFF',
        '#000000',
        '#FF5733',
        '#1E40AF',
        '#abc123'
      ]

      colorsWithHash.forEach(color => {
        expect(validateHexColor(color)).toBe(true)
      })
    })

    it('should reject colors with invalid characters mixed in', () => {
      const invalidMixedColors = [
        'FF00G0', // Invalid hex character G
        'FF00ZZ', // Invalid hex character Z
        'FF00!0', // Special character
        'FF00@0', // Special character
        'FF00#0', // Hash in middle
        'FF 0000', // Space in middle
        'FF-0000', // Dash in middle
        'FF.0000', // Dot in middle
        'FF,0000', // Comma in middle
        'FF;0000', // Semicolon in middle
        'FF:0000', // Colon in middle
        'FF/0000', // Slash in middle
        'FF\\0000' // Backslash in middle
      ]

      invalidMixedColors.forEach(color => {
        expect(validateHexColor(color)).toBe(false)
      })
    })

    it('should reject colors with wrong length', () => {
      const wrongLengthColors = [
        'FF', // Too short
        'FFF', // 3 chars (should be 6)
        'FFFF', // 4 chars
        'FFFFF', // 5 chars
        'FFFFFFF', // 7 chars
        'FFFFFFFF', // 8 chars (RGBA not supported)
        'FFFFFFFFF', // 9 chars
        'FF00FF00FF' // 10 chars
      ]

      wrongLengthColors.forEach(color => {
        expect(validateHexColor(color)).toBe(false)
      })
    })
  })

  describe('Performance and Resource Protection', () => {
    it('should process validation quickly even with complex inputs', () => {
      const complexInputs = [
        'FF0000' + '<script>'.repeat(100),
        'A'.repeat(1000) + 'FF0000',
        'FF0000' + '/*comment*/'.repeat(50),
        'javascript:' + 'alert(1);'.repeat(100)
      ]

      complexInputs.forEach(input => {
        const startTime = performance.now()
        const result = validateHexColor(input)
        const endTime = performance.now()
        
        expect(result).toBe(false)
        expect(endTime - startTime).toBeLessThan(100) // Should complete in <100ms
      })
    })

    it('should prevent regex DoS attacks', () => {
      // Test against potential ReDoS (Regular Expression Denial of Service)
      const regexDoSInputs = [
        'A' + 'A?'.repeat(1000) + 'A',
        '(' + '()'.repeat(1000) + ')',
        '[' + '[]'.repeat(1000) + ']',
        '{' + '{}'.repeat(1000) + '}',
        '*' + '**'.repeat(1000) + '*',
        '+' + '++'.repeat(1000) + '+',
        '?' + '??'.repeat(1000) + '?'
      ]

      regexDoSInputs.forEach(input => {
        const startTime = performance.now()
        const result = validateHexColor(input)
        const endTime = performance.now()
        
        expect(result).toBe(false)
        expect(endTime - startTime).toBeLessThan(50) // Should complete very quickly
      })
    })
  })
})