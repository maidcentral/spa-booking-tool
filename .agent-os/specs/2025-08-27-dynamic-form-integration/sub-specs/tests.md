# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-08-27-dynamic-form-integration/spec.md

> Created: 2025-08-27
> Version: 1.0.0

## Test Coverage

### Unit Tests (Jest + React Testing Library)

**API Service Tests** (`__tests__/services/api-client.test.ts`)
- HTTP request/response handling
- Error handling and retry logic
- Response data transformation
- Request timeout and cancellation
- Mock API responses with MSW

**Component Tests**
- `__tests__/components/booking/BookingWizard.test.tsx`
  - Step navigation and state management
  - Form data persistence across steps
  - API integration with loading states
  - Error boundary handling

- `__tests__/components/booking/ServiceSelector.test.tsx`
  - Service rendering from API data
  - Selection handling and state updates
  - Loading and error states
  - Filtering and search functionality

- `__tests__/components/booking/DynamicForm.test.tsx`
  - Dynamic field rendering based on API schema
  - Form validation and error display
  - Real-time value updates
  - Accessibility attributes

- `__tests__/components/booking/PricingDisplay.test.tsx`
  - Pricing calculation display
  - Loading states and error handling
  - Price breakdown rendering
  - Responsive layout testing

**Custom Hook Tests**
- `__tests__/hooks/useServices.test.ts`
- `__tests__/hooks/usePricing.test.ts`
- `__tests__/hooks/useBookingFlow.test.ts`

### Integration Tests

**API Integration Tests** (`__tests__/integration/api-integration.test.ts`)
- End-to-end API call flows
- Error handling across service boundaries
- Data consistency between endpoints
- Timeout and retry behavior

**Form Flow Tests** (`__tests__/integration/booking-flow.test.ts`)
- Complete booking flow from start to finish
- Step transitions with API data loading
- Form validation across multiple steps
- Pricing updates throughout the flow

### Component Integration Tests

**Booking Wizard Integration** (`__tests__/integration/booking-wizard.test.tsx`)
- Service selection to form generation
- Form completion to pricing calculation
- Step navigation with API dependencies
- Error recovery and user feedback

## Mocking Requirements

### API Mocking (MSW)

**Service Endpoint Mocks**
```typescript
// __tests__/__mocks__/api-handlers.ts
export const handlers = [
  rest.get('/api/services', (req, res, ctx) => {
    return res(ctx.json(mockServices));
  }),
  rest.get('/api/questions/:serviceId', (req, res, ctx) => {
    return res(ctx.json(mockQuestions));
  }),
  rest.post('/api/pricing/calculate', (req, res, ctx) => {
    return res(ctx.json(mockPricingResponse));
  })
];
```

**Error Scenarios**
- Network failures and timeout handling
- 400/404/500 HTTP error responses
- Malformed API response data
- Rate limiting and retry scenarios

### Test Data Factories

**Mock Data Generation**
```typescript
// __tests__/factories/service-factory.ts
export const createMockService = (overrides?: Partial<Service>): Service => ({
  id: 'service-1',
  name: 'House Cleaning',
  description: 'Complete house cleaning service',
  basePrice: 120,
  category: 'residential',
  ...overrides
});

// __tests__/factories/question-factory.ts
export const createMockQuestion = (overrides?: Partial<Question>): Question => ({
  id: 'question-1',
  type: 'select',
  label: 'How many bedrooms?',
  required: true,
  options: ['1', '2', '3', '4+'],
  ...overrides
});
```

### Performance Testing

**Component Rendering Performance**
- Large form rendering with 50+ dynamic fields
- Service list with 100+ services
- Real-time pricing calculation performance
- Memory leak detection in form state management

**API Call Optimization**
- Debounced pricing calculation requests
- Request deduplication for repeated calls
- Caching strategy effectiveness
- Loading state transition performance