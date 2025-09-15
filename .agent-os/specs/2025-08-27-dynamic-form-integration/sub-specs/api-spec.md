# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-27-dynamic-form-integration/spec.md

> Created: 2025-08-27
> Version: 1.0.0

## Endpoints

### Services Endpoint
**GET `/api/services`**
- **Purpose**: Retrieve available cleaning services
- **Response**: Array of service objects with id, name, description, base_price
- **Usage**: Populate service selection interface

### Dynamic Questions Endpoint
**GET `/api/questions/{serviceId}`**
- **Purpose**: Get dynamic form questions for specific service
- **Parameters**: serviceId (path parameter)
- **Response**: Array of question objects with type, label, options, validation rules
- **Usage**: Build dynamic form fields based on selected service

### Pricing Calculation Endpoint
**POST `/api/pricing/calculate`**
- **Purpose**: Calculate real-time pricing based on selections
- **Request Body**: Service ID, form answers, location data
- **Response**: Price breakdown object with subtotal, taxes, total, discounts
- **Usage**: Update pricing display as user makes selections

### Availability Endpoint
**GET `/api/availability`**
- **Purpose**: Check service availability for date/time selection
- **Query Parameters**: serviceId, date, location
- **Response**: Available time slots and scheduling constraints
- **Usage**: Enable/disable booking options based on availability

## Controllers

### API Client Service
```typescript
interface ApiClient {
  getServices(): Promise<Service[]>;
  getQuestions(serviceId: string): Promise<Question[]>;
  calculatePricing(request: PricingRequest): Promise<PricingResponse>;
  getAvailability(params: AvailabilityParams): Promise<AvailabilityResponse>;
}
```

### Request/Response Types
```typescript
interface Service {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  category: string;
}

interface Question {
  id: string;
  type: 'text' | 'select' | 'checkbox' | 'radio' | 'number';
  label: string;
  required: boolean;
  options?: string[];
  validation?: ValidationRules;
}

interface PricingRequest {
  serviceId: string;
  answers: Record<string, any>;
  location?: LocationData;
}

interface PricingResponse {
  subtotal: number;
  taxes: number;
  total: number;
  discounts: Discount[];
  breakdown: PriceBreakdown[];
}
```

### Error Handling
- Standardized error response format
- HTTP status code handling (400, 401, 403, 404, 500)
- Retry logic for transient failures
- User-friendly error messages