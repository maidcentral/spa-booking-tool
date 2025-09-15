// Tailwind CSS plugin for dynamic theme integration

const plugin = require('tailwindcss/plugin')

/**
 * Plugin to add theme CSS custom properties to Tailwind's color palette
 */
const themePlugin = plugin(function({ addUtilities, addComponents, theme }) {
  // Add utility classes for theme colors
  const themeUtilities = {
    '.theme-fg': {
      color: 'var(--theme-foreground)'
    },
    '.theme-bg': {
      backgroundColor: 'var(--theme-background)'
    },
    '.theme-primary': {
      color: 'var(--theme-primary)'
    },
    '.theme-primary-bg': {
      backgroundColor: 'var(--theme-primary)'
    },
    '.theme-contrast': {
      color: 'var(--theme-contrast)'
    },
    '.theme-contrast-bg': {
      backgroundColor: 'var(--theme-contrast)'
    },
    '.theme-text': {
      color: 'var(--theme-text)'
    },
    '.theme-border': {
      borderColor: 'var(--theme-border)'
    },
    '.theme-border-t': {
      borderTopColor: 'var(--theme-border)'
    },
    '.theme-border-b': {
      borderBottomColor: 'var(--theme-border)'
    },
    '.theme-border-l': {
      borderLeftColor: 'var(--theme-border)'
    },
    '.theme-border-r': {
      borderRightColor: 'var(--theme-border)'
    }
  }

  // Add responsive variants
  const responsiveThemeUtilities = {}
  const breakpoints = ['sm', 'md', 'lg', 'xl', '2xl']
  
  breakpoints.forEach(breakpoint => {
    Object.entries(themeUtilities).forEach(([className, styles]) => {
      responsiveThemeUtilities[`@media (min-width: ${theme(`screens.${breakpoint}`)}) { .${breakpoint}\\:${className.substring(1)}`] = styles
    })
  })

  addUtilities({
    ...themeUtilities,
    ...responsiveThemeUtilities
  })

  // Add component classes for common patterns
  const themeComponents = {
    '.theme-card': {
      backgroundColor: 'var(--theme-background)',
      borderColor: 'var(--theme-border)',
      color: 'var(--theme-text)'
    },
    '.theme-button': {
      backgroundColor: 'var(--theme-foreground)',
      color: 'var(--theme-contrast)',
      borderColor: 'var(--theme-border)',
      '&:hover': {
        opacity: '0.9'
      },
      '&:focus': {
        outline: '2px solid var(--theme-foreground)',
        outlineOffset: '2px'
      }
    },
    '.theme-input': {
      backgroundColor: 'var(--theme-background)',
      borderColor: 'var(--theme-border)',
      color: 'var(--theme-text)',
      '&:focus': {
        borderColor: 'var(--theme-foreground)',
        boxShadow: '0 0 0 1px var(--theme-foreground)'
      }
    }
  }

  addComponents(themeComponents)
})

/**
 * Configuration object for extending Tailwind's default theme
 */
const themeExtension = {
  colors: {
    // Add theme colors to the color palette
    theme: {
      foreground: 'var(--theme-foreground)',
      background: 'var(--theme-background)',
      primary: 'var(--theme-primary)',
      contrast: 'var(--theme-contrast)',
      text: 'var(--theme-text)',
      border: 'var(--theme-border)'
    }
  }
}

/**
 * Complete Tailwind configuration for theme integration
 */
const tailwindThemeConfig = {
  theme: {
    extend: themeExtension
  },
  plugins: [themePlugin]
}

module.exports = {
  themePlugin,
  themeExtension,
  tailwindThemeConfig
}