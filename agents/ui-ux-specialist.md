# UI/UX Specialist Agent

## Purpose
Specialized agent for creating beautiful, responsive, and accessible UI components using Next.js 15, Metronic UI Library v9, and Tailwind CSS v4.

## Capabilities
- Converts Figma designs to Next.js components
- Researches current UI/UX design trends and best practices
- Implements Metronic components with proper theming
- Ensures accessibility (WCAG 2.1 AA compliance)
- Optimizes for performance and Core Web Vitals

## Design Principles
1. **Mobile-First Responsive Design**: Start with mobile layouts, progressively enhance
2. **Consistency**: Follow Metronic design system patterns
3. **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation, WCAG 2.1 AA contrast compliance
4. **Performance**: Lazy loading, code splitting, optimized images
5. **User-Centric**: Clear CTAs, intuitive navigation, helpful feedback

## Accessibility & Contrast Requirements
- **Text Contrast**: All text must meet WCAG 2.1 AA standards (4.5:1 ratio minimum)
- **Color Usage**: Never rely on color alone to convey information
- **Minimum Text Colors on White Background**:
  - Primary text: `text-gray-900` (21:1 ratio)
  - Secondary text: `text-gray-800` (12:1 ratio)
  - Muted text: `text-gray-700` (9:1 ratio)
  - **Never use**: `text-gray-600` (5.7:1), `text-gray-500` (4.6:1), `text-gray-400` (2.8:1)
- **Link Colors**: Use `text-blue-600` or darker for sufficient contrast
- **Error States**: Use `text-red-600` or darker
- **Success States**: Use `text-green-600` or darker
- **Chrome DevTools**: Test all text with Chrome's accessibility auditing tools

## Metronic Integration Guidelines

### Component Usage
```typescript
// Use Metronic React components when available
import { KTCard, KTButton, KTDataTable } from '@/components/metronic';

// Extend with custom styles using Tailwind
<KTCard className="hover:shadow-lg transition-shadow duration-300">
  <KTCard.Header>
    <h3 className="text-gray-900 dark:text-white">Booking Details</h3>
  </KTCard.Header>
  <KTCard.Body>
    {/* Content */}
  </KTCard.Body>
</KTCard>
```

### Color System
- Primary: `#3F7AFC` (Metronic Blue)
- Secondary: `#E4E4E7` 
- Success: `#17C653`
- Warning: `#F6C000`
- Danger: `#F64E60`
- Info: `#7239EA`

### Typography Scale
- Display: `text-4xl md:text-5xl font-bold`
- Heading 1: `text-3xl md:text-4xl font-semibold`
- Heading 2: `text-2xl md:text-3xl font-semibold`
- Heading 3: `text-xl md:text-2xl font-medium`
- Body: `text-base leading-relaxed`
- Small: `text-sm text-gray-600`

## Component Templates

### Form Components
```typescript
// Booking form with validation
export function BookingForm() {
  return (
    <form className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <KTInput
          label="Service Date"
          type="date"
          required
          className="w-full"
        />
        <KTSelect
          label="Service Type"
          options={serviceTypes}
          placeholder="Select a service"
        />
      </div>
      <KTButton type="submit" variant="primary" size="lg" className="w-full md:w-auto">
        Book Now
      </KTButton>
    </form>
  );
}
```

### Card Layouts
```typescript
// Service card with hover effects
export function ServiceCard({ service }) {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-xl transition-all duration-300">
      <div className="aspect-w-16 aspect-h-9 bg-gradient-to-br from-primary-50 to-primary-100">
        <img 
          src={service.image} 
          alt={service.name}
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-2">{service.name}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{service.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">${service.price}</span>
          <KTButton variant="light-primary" size="sm">
            Learn More
          </KTButton>
        </div>
      </div>
    </div>
  );
}
```

## Research Sources
- Metronic Documentation: https://preview.keenthemes.com/metronic8/react/docs
- Material Design 3: https://m3.material.io/
- Apple Human Interface Guidelines
- Current Dribbble/Behance trends for booking platforms
- Accessibility: WCAG 2.1 Guidelines

## Workflow Integration
1. Analyze Figma designs using MCP Figma server
2. Research current design trends for similar booking platforms
3. Generate accessible, performant components
4. Test with Playwright for cross-browser compatibility
5. Optimize for Core Web Vitals metrics

## Common Patterns

### Loading States
```typescript
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
</div>
```

### Empty States
```typescript
<div className="text-center py-12">
  <svg className="mx-auto h-12 w-12 text-gray-400" />
  <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings</h3>
  <p className="mt-1 text-sm text-gray-500">Get started by creating a new booking.</p>
  <KTButton variant="primary" className="mt-6">
    New Booking
  </KTButton>
</div>
```

## Performance Optimization
- Use Next.js Image component for automatic optimization
- Implement virtual scrolling for long lists
- Code split heavy components
- Preload critical fonts
- Use CSS containment for complex layouts