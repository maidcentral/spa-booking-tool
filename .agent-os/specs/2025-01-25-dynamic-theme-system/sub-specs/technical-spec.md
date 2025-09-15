# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-01-25-dynamic-theme-system/spec.md

> Created: 2025-08-25
> Version: 1.0.0

## Technical Requirements

### URL Parameter Structure
- Support three URL parameters: `primaryColor`, `foregroundColor`, `backgroundColor`
- Parameters should accept hex color codes in URL-encoded format (e.g., `%23FF0000` for #FF0000)
- Example iframe URL: `https://booking.maidcentral.com?primaryColor=%231E40AF&foregroundColor=%23FFFFFF&backgroundColor=%23F3F4F6`

### Color Validation
- Validate hex color format using regex pattern: `/^#[0-9A-Fa-f]{6}$/`
- Strip and normalize color values (handle both `#FFFFFF` and `FFFFFF` formats)
- Implement XSS prevention by sanitizing all input values
- Return default colors for any invalid or malformed inputs

### CSS Variable Implementation
- Define CSS custom properties at the root level for dynamic theming
- Map URL parameters to CSS variables:
  - `--primary-color`: Buttons, links, highlights, active states
  - `--foreground-color`: Card backgrounds, modal backgrounds
  - `--background-color`: Main page background
- Create derived colors for hover states and disabled states using CSS filters or opacity

### Component Updates Required
- Update all button components to use `var(--primary-color)` for background
- Update card components to use `var(--foreground-color)` for background
- Update root layout to use `var(--background-color)` for page background
- Ensure text contrast meets WCAG AA standards with dynamic color calculation
- Update focus states and selection highlights to use primary color

### Browser Compatibility
- Ensure CSS custom properties work in all modern browsers (Chrome, Firefox, Safari, Edge)
- Implement fallback mechanism for older browsers using inline styles if needed
- Test iframe parameter passing across different parent domain configurations

### Security Considerations
- Sanitize all URL parameters to prevent script injection
- Validate colors server-side if parameters are logged or stored
- Implement Content Security Policy headers appropriate for iframe embedding
- Ensure no sensitive data is exposed through URL parameters

### Performance Requirements
- Color parsing and application must complete within 50ms of page load
- No flash of unstyled content (FOUC) - apply theme before first paint
- Minimize CSS recalculation by applying theme once at initialization
- Cache parsed color values in memory during session

### Default Theme Values
- Primary Color: `#3B82F6` (Blue-500)
- Foreground Color: `#FFFFFF` (White)
- Background Color: `#F9FAFB` (Gray-50)

### Testing Requirements
- Unit tests for color validation and parsing functions
- Integration tests for theme application across all components
- Visual regression tests for different color combinations
- Cross-browser testing in iframe context
- Accessibility testing for color contrast ratios

## Approach

### Implementation Strategy
1. Create a `ThemeProvider` context component to manage theme state
2. Implement URL parameter parsing in the root layout component
3. Apply CSS custom properties using React's `useEffect` hook
4. Create utility functions for color validation and sanitization
5. Update existing components to use CSS variables instead of hardcoded colors

### File Structure
```
app/
├── contexts/
│   └── ThemeContext.tsx          # Theme provider and context
├── lib/
│   ├── colorUtils.ts             # Color validation and utilities
│   └── themeUtils.ts             # Theme application logic
├── components/
│   └── ThemeProvider.tsx         # Theme provider wrapper
└── layout.tsx                    # Root layout with theme initialization
```

### Implementation Order
1. Color validation and utility functions
2. Theme context and provider setup
3. URL parameter parsing and theme application
4. Component updates to use CSS variables
5. Testing and cross-browser validation

## External Dependencies

### Required Packages
- No additional npm packages required - implementation uses native browser APIs
- Optional: `color` package for advanced color manipulation if needed

### Browser APIs Used
- `URLSearchParams` for parameter parsing
- CSS Custom Properties (CSS Variables)
- `document.documentElement.style.setProperty()` for dynamic CSS updates

### Development Dependencies
- Testing utilities for color contrast validation
- Visual regression testing tools (e.g., Percy, Chromatic)
- Cross-browser testing setup