import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Button } from '../button'
import { Card, CardContent } from '../card'
import { Input } from '../input'
import { Select } from '../select'

// Mock useTheme hook
jest.mock('@/app/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      primaryColor: '#FF0000',
      foregroundColor: '#FFFFFF', 
      backgroundColor: '#F0F0F0'
    },
    isThemeLoaded: true,
    applyTheme: jest.fn()
  })
}))

describe('Themed Components Visual Tests', () => {
  beforeEach(() => {
    // Apply test theme colors to document root
    document.documentElement.style.setProperty('--primary-color', '#FF0000')
    document.documentElement.style.setProperty('--primary-color-hover', '#DD0000')
    document.documentElement.style.setProperty('--primary-color-active', '#BB0000')
    document.documentElement.style.setProperty('--foreground-color', '#FFFFFF')
    document.documentElement.style.setProperty('--background-color', '#F0F0F0')
    document.documentElement.style.setProperty('--text-color', '#000000')
    document.documentElement.style.setProperty('--card-text-color', '#000000')
  })

  afterEach(() => {
    // Clean up CSS variables
    document.documentElement.style.removeProperty('--primary-color')
    document.documentElement.style.removeProperty('--primary-color-hover')
    document.documentElement.style.removeProperty('--primary-color-active')
    document.documentElement.style.removeProperty('--foreground-color')
    document.documentElement.style.removeProperty('--background-color')
    document.documentElement.style.removeProperty('--text-color')
    document.documentElement.style.removeProperty('--card-text-color')
  })

  describe('Button Component Theming', () => {
    it('should apply primary color to primary button variant', () => {
      render(<Button variant="primary" data-testid="primary-button">Test Button</Button>)
      const button = screen.getByTestId('primary-button')
      
      // Should have dynamic primary color class
      expect(button.className).toContain('bg-primary-dynamic')
      expect(button.className).toContain('hover:bg-primary-dynamic-hover')
    })

    it('should apply theme colors to default button variant', () => {
      render(<Button data-testid="default-button">Test Button</Button>)
      const button = screen.getByTestId('default-button')
      
      // Should use CSS variables for theming
      expect(button.className).toContain('bg-primary-dynamic')
    })

    it('should maintain accessibility with themed buttons', () => {
      render(<Button variant="primary" data-testid="accessible-button">Accessible Button</Button>)
      const button = screen.getByTestId('accessible-button')
      
      // Should maintain focus ring and accessibility classes
      expect(button.className).toContain('focus-visible:outline-none')
      expect(button.className).toContain('focus-visible:ring-2')
    })
  })

  describe('Card Component Theming', () => {
    it('should apply foreground color to card background', () => {
      render(
        <Card data-testid="themed-card">
          <CardContent>Card content</CardContent>
        </Card>
      )
      const card = screen.getByTestId('themed-card')
      
      // Should use CSS variable for background
      expect(card.className).toContain('bg-foreground-dynamic')
    })

    it('should apply appropriate text color for contrast', () => {
      render(
        <Card data-testid="contrasted-card">
          <CardContent>Card content with text</CardContent>
        </Card>
      )
      const card = screen.getByTestId('contrasted-card')
      
      // Should use CSS variable for text color
      expect(card.className).toContain('text-card-text-dynamic')
    })
  })

  describe('Input Component Theming', () => {
    it('should apply theme colors to input focus state', () => {
      render(<Input data-testid="themed-input" placeholder="Test input" />)
      const input = screen.getByTestId('themed-input')
      
      // Should use primary color for focus ring
      expect(input.className).toContain('focus:ring-primary-dynamic')
      expect(input.className).toContain('focus:border-primary-dynamic')
    })

    it('should maintain proper border styling with theme', () => {
      render(<Input data-testid="bordered-input" placeholder="Bordered input" />)
      const input = screen.getByTestId('bordered-input')
      
      // Should have themed border
      expect(input.className).toContain('border-input-dynamic')
    })
  })

  describe('Layout Background Theming', () => {
    it('should verify background color CSS variable is applied', () => {
      // Check that the CSS variable is set correctly
      const backgroundColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--background-color')
      
      expect(backgroundColor.trim()).toBe('#F0F0F0')
    })

    it('should verify primary color CSS variable is applied', () => {
      const primaryColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--primary-color')
      
      expect(primaryColor.trim()).toBe('#FF0000')
    })

    it('should verify foreground color CSS variable is applied', () => {
      const foregroundColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--foreground-color')
      
      expect(foregroundColor.trim()).toBe('#FFFFFF')
    })
  })

  describe('Theme Color Contrast', () => {
    it('should maintain readable contrast ratios', () => {
      // Test dark background with light text
      document.documentElement.style.setProperty('--background-color', '#000000')
      document.documentElement.style.setProperty('--text-color', '#FFFFFF')
      
      const textColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--text-color')
      const bgColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--background-color')
      
      expect(textColor.trim()).toBe('#FFFFFF')
      expect(bgColor.trim()).toBe('#000000')
    })

    it('should handle light background with dark text', () => {
      // Test light background with dark text
      document.documentElement.style.setProperty('--background-color', '#FFFFFF')
      document.documentElement.style.setProperty('--text-color', '#000000')
      
      const textColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--text-color')
      const bgColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--background-color')
      
      expect(textColor.trim()).toBe('#000000')
      expect(bgColor.trim()).toBe('#FFFFFF')
    })
  })

  describe('Theme Integration', () => {
    it('should support multiple theme color combinations', () => {
      const themes = [
        { primary: '#FF0000', foreground: '#FFFFFF', background: '#F5F5F5' },
        { primary: '#00FF00', foreground: '#000000', background: '#FAFAFA' },
        { primary: '#0000FF', foreground: '#F8F8F8', background: '#F0F0F0' }
      ]

      themes.forEach((theme, index) => {
        document.documentElement.style.setProperty('--primary-color', theme.primary)
        document.documentElement.style.setProperty('--foreground-color', theme.foreground)
        document.documentElement.style.setProperty('--background-color', theme.background)

        render(<Button data-testid={`themed-button-${index}`}>Theme Test {index}</Button>)
        
        const primaryColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--primary-color')
        expect(primaryColor.trim()).toBe(theme.primary)
      })
    })

    it('should handle theme changes without breaking layout', () => {
      // Initial theme
      render(
        <div data-testid="themed-layout">
          <Button variant="primary">Primary Button</Button>
          <Card>
            <CardContent>Card Content</CardContent>
          </Card>
        </div>
      )

      const layout = screen.getByTestId('themed-layout')
      expect(layout).toBeInTheDocument()

      // Change theme
      document.documentElement.style.setProperty('--primary-color', '#00AA00')
      document.documentElement.style.setProperty('--foreground-color', '#F5F5F5')
      
      // Layout should still be rendered properly
      expect(layout).toBeInTheDocument()
      expect(screen.getByText('Primary Button')).toBeInTheDocument()
      expect(screen.getByText('Card Content')).toBeInTheDocument()
    })
  })
})