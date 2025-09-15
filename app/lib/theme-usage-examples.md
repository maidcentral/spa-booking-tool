# Dynamic Theme CSS Custom Properties Usage Guide

This guide shows how to use the dynamic theme system's CSS custom properties with various styling approaches.

## CSS Custom Properties Available

The system provides these CSS custom properties:
- `--theme-foreground` - Primary brand color from URL parameter
- `--theme-background` - Page background color
- `--theme-primary` - Primary color (fallback/accent)
- `--theme-contrast` - Contrasting color to foreground (automatically calculated)
- `--theme-text` - Text color that contrasts with foreground
- `--theme-border` - Border color that contrasts with foreground

## Usage Methods

### 1. Tailwind Arbitrary Values (Recommended)

```tsx
// Background colors
<div className="bg-[var(--theme-foreground)]">
  Foreground background
</div>

// Text colors
<p className="text-[var(--theme-contrast)]">
  Contrasting text
</p>

// Border colors
<div className="border border-[var(--theme-border)]">
  Dynamic border
</div>

// Multiple properties
<button className="
  bg-[var(--theme-foreground)] 
  text-[var(--theme-contrast)] 
  border-[var(--theme-border)]
  hover:bg-[var(--theme-contrast)]
  hover:text-[var(--theme-foreground)]
">
  Dynamic button
</button>
```

### 2. Using the useThemeCssVars Hook

```tsx
import { useThemeCssVars } from '@/app/contexts/ThemeContext'

function MyComponent() {
  const cssVars = useThemeCssVars()
  
  return (
    <div className={`bg-[${cssVars.foreground}] text-[${cssVars.contrast}]`}>
      Using hook for dynamic classes
    </div>
  )
}
```

### 3. Inline Styles

```tsx
import { useTheme } from '@/app/contexts/ThemeContext'

function MyComponent() {
  const theme = useTheme()
  
  return (
    <div style={theme.cssVars}>
      <div style={{ 
        backgroundColor: 'var(--theme-foreground)',
        color: 'var(--theme-contrast)',
        borderColor: 'var(--theme-border)'
      }}>
        Inline styled element
      </div>
    </div>
  )
}
```

### 4. Custom CSS Classes

```css
/* In your CSS file */
.pricing-display {
  background-color: var(--theme-foreground);
  color: var(--theme-contrast);
  border: 2px solid var(--theme-border);
}

.service-selection-button {
  border: 2px solid var(--theme-border);
  color: var(--theme-text);
  background-color: transparent;
}

.service-selection-button:hover {
  background-color: var(--theme-foreground);
  color: var(--theme-contrast);
}

.service-selection-button.selected {
  background-color: var(--theme-foreground);
  color: var(--theme-contrast);
  border-color: var(--theme-foreground);
}

.form-input {
  border-color: var(--theme-border);
  background-color: var(--theme-background);
  color: var(--theme-text);
}

.form-input:focus {
  border-color: var(--theme-foreground);
  box-shadow: 0 0 0 1px var(--theme-foreground);
}
```

### 5. Using Theme Plugin Classes (if configured)

```tsx
// Using the custom Tailwind plugin classes
<div className="theme-card">
  Card with theme colors
</div>

<button className="theme-button">
  Button with theme colors
</button>

<input className="theme-input" />
```

## Component Examples

### Service Selection Button
```tsx
<button className={`
  p-4 rounded-lg border-2 transition-all
  ${selected 
    ? 'bg-[var(--theme-foreground)] text-[var(--theme-contrast)] border-[var(--theme-foreground)]'
    : 'bg-transparent text-[var(--theme-text)] border-[var(--theme-border)] hover:border-[var(--theme-foreground)]'
  }
`}>
  {service.name}
</button>
```

### Price Display
```tsx
<div className="
  bg-[var(--theme-foreground)] 
  text-[var(--theme-contrast)] 
  p-6 rounded-lg
  border border-[var(--theme-border)]
">
  <div className="text-lg font-bold">
    Total: {formatCurrency(total)}
  </div>
</div>
```

### Form Input
```tsx
<input className="
  w-full p-3 rounded-lg
  bg-[var(--theme-background)]
  text-[var(--theme-text)]
  border border-[var(--theme-border)]
  focus:border-[var(--theme-foreground)]
  focus:ring-2 focus:ring-[var(--theme-foreground)]/20
  transition-colors
" />
```

### Card Component
```tsx
<div className="
  bg-[var(--theme-background)]
  border border-[var(--theme-border)]
  rounded-lg p-6 shadow-sm
">
  <h3 className="text-[var(--theme-text)] font-semibold mb-2">
    Card Title
  </h3>
  <p className="text-[var(--theme-text)]/70">
    Card content
  </p>
</div>
```

## Best Practices

1. **Use Tailwind Arbitrary Values** - They provide the best developer experience with IntelliSense
2. **Consistent Naming** - Always use the full CSS variable names for clarity
3. **Fallbacks** - CSS custom properties automatically fall back to inherited values
4. **Performance** - The properties are injected once and update efficiently
5. **Testing** - Test with both light and dark foreground colors to ensure contrast works

## URL Parameter Format

```
?foreground=3b82f6&background=f8fafc&primary=10b981

Examples:
- Light foreground: ?foreground=3b82f6 (blue)
- Dark foreground: ?foreground=1f2937 (dark gray)  
- Custom background: ?foreground=ef4444&background=fef2f2 (red theme)
```

The system automatically calculates appropriate contrast colors, so you only need to specify the main colors.