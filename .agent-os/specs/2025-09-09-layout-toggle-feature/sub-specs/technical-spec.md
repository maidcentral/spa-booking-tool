# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-09-09-layout-toggle-feature/spec.md

> Created: 2025-09-09
> Version: 1.0.0

## Technical Requirements

### Environment Configuration
- Add `MULTI_STEP_LAYOUT` boolean environment variable to `.env` and `.env.example`
- Implement type-safe environment variable reading using Next.js built-in env support
- Ensure variable is read at build time for optimal performance
- Default to `true` if variable is undefined to maintain backward compatibility

### Component Architecture
- Create new `SinglePageBookingFlow` component that mirrors `MultiStepBookingFlow` functionality
- Implement a `BookingLayoutProvider` context to manage layout-specific behavior
- Use conditional rendering at the root booking component level based on env variable
- Maintain all existing component props and interfaces for consistency

### Single-Page Layout Implementation
- Render all booking steps as sequential sections within a single scrollable container
- Implement section dividers using Tailwind CSS border utilities (e.g., `border-t border-gray-200`)
- Maintain viewport scroll position during validation and price updates
- Use React Hook Form's mode: 'onChange' for real-time validation
- Implement debounced price calculation updates (300ms delay) to optimize performance

### State Management
- Preserve all existing form state management logic
- Ensure form data persists correctly across both layout modes
- Maintain session storage for form persistence on page refresh
- Keep all existing validation rules and error handling

### Styling Consistency
- Apply identical Tailwind CSS classes to both layout components
- Maintain all existing spacing, typography, and color schemes
- Ensure responsive breakpoints work identically in both layouts
- Section spacing in single-page: `py-8` between sections, `mt-12` for major section breaks

### Performance Optimization
- Implement React.memo() for section components to prevent unnecessary re-renders
- Use useMemo() for expensive calculations (price updates, availability checks)
- Lazy load form sections below the fold in single-page layout
- Optimize validation triggers to prevent excessive API calls
- Implement virtual scrolling if form sections exceed 10 components

### API Integration
- Maintain exact same API call patterns for both layouts
- Ensure all endpoints are called with identical parameters
- Preserve existing error handling and retry logic
- Keep loading states consistent across layouts

## UI/UX Specifications

### Visual Design
- No changes to existing fonts (current font stack maintained)
- No changes to color palette or theme variables
- No changes to button styles, input fields, or interactive elements
- Maintain all existing animations and transitions

### Section Dividers (Single-Page Layout)
- Horizontal rule style: 1px solid border using existing gray-200 color
- Spacing: 32px padding top and bottom of each divider
- Optional section headers can be made sticky during scroll
- Maintain visual hierarchy with existing heading sizes

### Form Behavior
- Multi-step: Current behavior unchanged - validation on "Continue" click
- Single-page: Validation on field blur with 300ms debounce
- Error messages display immediately below fields in both layouts
- Price updates trigger on valid field changes with optimization

### Responsive Design
- Both layouts must work identically on all breakpoints (mobile, tablet, desktop)
- Single-page layout should not require horizontal scrolling on any device
- Maintain existing responsive utilities and breakpoint logic