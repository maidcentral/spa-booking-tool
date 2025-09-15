# Component Architecture Specification

This is the component architecture specification for the spec detailed in @.agent-os/specs/2025-08-27-dynamic-form-integration/spec.md

> Created: 2025-08-27
> Version: 1.0.0

## Component Hierarchy

### Core Components

**BookingWizard** (`/app/components/booking/BookingWizard.tsx`)
- Main container component for multi-step booking flow
- Manages overall state and step navigation
- Handles form data persistence across steps
- Coordinates with API services for data loading

**ServiceSelector** (`/app/components/booking/ServiceSelector.tsx`)
- Grid/list display of available services from API
- Service filtering and search functionality
- Integration with pricing updates on selection
- Loading states for service data fetching

**DynamicForm** (`/app/components/booking/DynamicForm.tsx`)
- Renders form fields based on API question schema
- Handles dynamic validation rules from API
- Real-time form state management
- Integration with pricing calculator

**PricingDisplay** (`/app/components/booking/PricingDisplay.tsx`)
- Real-time pricing updates with loading indicators
- Price breakdown visualization
- Discount and tax calculations display
- Responsive pricing summary component

### Form Field Components

**FormField** (`/app/components/forms/FormField.tsx`)
- Base wrapper for all form field types
- Consistent styling and error handling
- Label, help text, and validation display
- Accessibility attributes and ARIA support

**TextField** (`/app/components/forms/TextField.tsx`)
- Text input with validation
- Support for different input types (text, email, number)
- Real-time validation feedback
- Integration with form state management

**SelectField** (`/app/components/forms/SelectField.tsx`)
- Dropdown selection with search capability
- Support for API-driven option lists
- Multi-select functionality when required
- Loading states for dynamic options

**CheckboxGroup** (`/app/components/forms/CheckboxGroup.tsx`)
- Multi-option checkbox selections
- Dynamic option rendering from API
- Validation for required minimum selections
- Grid or list layout options

## Component Props and State

### BookingWizard Props
```typescript
interface BookingWizardProps {
  onComplete: (bookingData: BookingData) => void;
  initialData?: Partial<BookingData>;
  className?: string;
}

interface BookingWizardState {
  currentStep: number;
  formData: BookingData;
  services: Service[];
  questions: Question[];
  pricing: PricingResponse | null;
  loading: boolean;
  error: string | null;
}
```

### DynamicForm Props
```typescript
interface DynamicFormProps {
  questions: Question[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  onValidationChange: (isValid: boolean) => void;
  loading?: boolean;
}
```

### PricingDisplay Props
```typescript
interface PricingDisplayProps {
  pricing: PricingResponse | null;
  loading: boolean;
  error?: string;
  compact?: boolean;
}
```

## State Management Strategy

**Local Component State**: Use React useState for component-specific UI state
**Form State**: React Hook Form for form data and validation
**API State**: Custom hooks with React Query or SWR for server state
**Global State**: React Context for shared booking flow state

## Styling and Responsive Design

**Tailwind CSS Classes**: Utility-first approach with component-specific styles
**Responsive Breakpoints**: Mobile-first design with sm, md, lg, xl breakpoints  
**Accessibility**: WCAG 2.1 AA compliance with proper ARIA attributes
**Loading States**: Skeleton loaders and spinner components for API calls