import { http, HttpResponse } from 'msw';
import type {
  ScopeGroup,
  Scope,
  Question,
  RateModification,
  PostalCode,
  AvailabilitySlot,
  PriceCalculationResponse,
  Lead,
  Quote,
  BookQuoteResponse,
  BillingTerm
} from '@/app/types/api';

// Mock data
const mockScopeGroups: ScopeGroup[] = [
  {
    id: '1',
    name: 'Residential Cleaning',
    description: 'Professional home cleaning services',
    isActive: true
  },
  {
    id: '2',
    name: 'Commercial Cleaning',
    description: 'Office and commercial space cleaning',
    isActive: true
  },
  {
    id: '3',
    name: 'Move In/Out Cleaning',
    description: 'Deep cleaning for moving',
    isActive: true
  }
];

const mockScopes: Record<string, Scope[]> = {
  '1': [
    {
      id: '1-1',
      scopeGroupId: '1',
      name: 'Standard Clean',
      description: 'Regular maintenance cleaning',
      basePrice: 100,
      isActive: true
    },
    {
      id: '1-2',
      scopeGroupId: '1',
      name: 'Deep Clean',
      description: 'Thorough deep cleaning service',
      basePrice: 150,
      isActive: true
    },
    {
      id: '1-3',
      scopeGroupId: '1',
      name: 'Express Clean',
      description: 'Quick touch-up cleaning',
      basePrice: 75,
      isActive: true
    }
  ],
  '2': [
    {
      id: '2-1',
      scopeGroupId: '2',
      name: 'Office Cleaning',
      description: 'Regular office maintenance',
      basePrice: 200,
      isActive: true
    },
    {
      id: '2-2',
      scopeGroupId: '2',
      name: 'Retail Space Cleaning',
      description: 'Retail store cleaning',
      basePrice: 175,
      isActive: true
    }
  ],
  '3': [
    {
      id: '3-1',
      scopeGroupId: '3',
      name: 'Move In Clean',
      description: 'Pre-move deep cleaning',
      basePrice: 250,
      isActive: true
    },
    {
      id: '3-2',
      scopeGroupId: '3',
      name: 'Move Out Clean',
      description: 'Post-move deep cleaning',
      basePrice: 250,
      isActive: true
    }
  ]
};

const mockQuestions: Record<string, Question[]> = {
  '1-1': [
    {
      id: 'q1',
      scopeId: '1-1',
      questionText: 'Number of bedrooms',
      questionType: 'number',
      isRequired: true,
      validationRules: [
        { type: 'min', value: 1, message: 'Minimum 1 bedroom' },
        { type: 'max', value: 10, message: 'Maximum 10 bedrooms' }
      ],
      order: 1
    },
    {
      id: 'q2',
      scopeId: '1-1',
      questionText: 'Number of bathrooms',
      questionType: 'number',
      isRequired: true,
      validationRules: [
        { type: 'min', value: 1, message: 'Minimum 1 bathroom' },
        { type: 'max', value: 10, message: 'Maximum 10 bathrooms' }
      ],
      order: 2
    },
    {
      id: 'q3',
      scopeId: '1-1',
      questionText: 'Square footage',
      questionType: 'select',
      isRequired: false,
      options: [
        { id: 'opt1', value: '<1000', label: 'Under 1000 sq ft', priceModifier: 0 },
        { id: 'opt2', value: '1000-2000', label: '1000-2000 sq ft', priceModifier: 20 },
        { id: 'opt3', value: '2000-3000', label: '2000-3000 sq ft', priceModifier: 40 },
        { id: 'opt4', value: '>3000', label: 'Over 3000 sq ft', priceModifier: 60 }
      ],
      order: 3
    },
    {
      id: 'q4',
      scopeId: '1-1',
      questionText: 'Do you have pets?',
      questionType: 'boolean',
      isRequired: false,
      order: 4
    },
    {
      id: 'q5',
      scopeId: '1-1',
      questionText: 'Preferred cleaning products',
      questionType: 'select',
      isRequired: false,
      options: [
        { id: 'prod1', value: 'standard', label: 'Standard products', priceModifier: 0 },
        { id: 'prod2', value: 'eco', label: 'Eco-friendly products', priceModifier: 15 },
        { id: 'prod3', value: 'client', label: 'Client provides products', priceModifier: -10 }
      ],
      order: 5
    }
  ]
};

const mockRateModifications: Record<string, RateModification[]> = {
  '1-1': [
    {
      id: 'mod1',
      scopeId: '1-1',
      name: 'Inside Oven Cleaning',
      description: 'Deep clean inside of oven',
      priceModifier: 25,
      modificationType: 'fixed',
      category: 'Kitchen'
    },
    {
      id: 'mod2',
      scopeId: '1-1',
      name: 'Inside Refrigerator Cleaning',
      description: 'Clean and organize refrigerator',
      priceModifier: 20,
      modificationType: 'fixed',
      category: 'Kitchen'
    },
    {
      id: 'mod3',
      scopeId: '1-1',
      name: 'Window Cleaning',
      description: 'Interior window cleaning',
      priceModifier: 30,
      modificationType: 'fixed',
      category: 'General'
    },
    {
      id: 'mod4',
      scopeId: '1-1',
      name: 'Laundry Service',
      description: 'Wash, dry, and fold laundry',
      priceModifier: 35,
      modificationType: 'fixed',
      category: 'Laundry'
    },
    {
      id: 'mod5',
      scopeId: '1-1',
      name: 'Priority Service',
      description: 'Same-day or next-day service',
      priceModifier: 20,
      modificationType: 'percentage',
      category: 'Service'
    }
  ]
};

const mockPostalCodes: PostalCode[] = [
  { code: '10001', city: 'New York', state: 'NY', country: 'USA', isServiceable: true },
  { code: '10002', city: 'New York', state: 'NY', country: 'USA', isServiceable: true },
  { code: '10003', city: 'New York', state: 'NY', country: 'USA', isServiceable: true },
  { code: '90210', city: 'Beverly Hills', state: 'CA', country: 'USA', isServiceable: true },
  { code: '60601', city: 'Chicago', state: 'IL', country: 'USA', isServiceable: true },
  { code: '33101', city: 'Miami', state: 'FL', country: 'USA', isServiceable: false }
];

const mockBillingTerms: BillingTerm[] = [
  {
    id: 'bt1',
    name: 'Pay Now',
    description: 'Immediate payment required',
    paymentSchedule: 'immediate'
  },
  {
    id: 'bt2',
    name: 'Net 30',
    description: 'Payment due within 30 days',
    paymentSchedule: 'net30'
  },
  {
    id: 'bt3',
    name: 'Net 60',
    description: 'Payment due within 60 days',
    paymentSchedule: 'net60'
  }
];

// MSW request handlers
export const handlers = [
  // GET /api/Lead/ScopeGroups
  http.get('/api/Lead/ScopeGroups', () => {
    return HttpResponse.json(mockScopeGroups);
  }),

  // GET /api/Lead/Scopes
  http.get('/api/Lead/Scopes', ({ request }) => {
    const url = new URL(request.url);
    const scopeGroupId = url.searchParams.get('scopeGroupId');
    
    if (!scopeGroupId || !mockScopes[scopeGroupId]) {
      return HttpResponse.json([], { status: 404 });
    }

    return HttpResponse.json(mockScopes[scopeGroupId]);
  }),

  // GET /api/Lead/Questions
  http.get('/api/Lead/Questions', ({ request }) => {
    const url = new URL(request.url);
    const scopeIds = url.searchParams.get('scopeIds')?.split(',') || [];
    
    const questions: Question[] = [];
    scopeIds.forEach(scopeId => {
      if (mockQuestions[scopeId]) {
        questions.push(...mockQuestions[scopeId]);
      }
    });

    return HttpResponse.json(questions);
  }),

  // GET /api/Lead/RateModifications
  http.get('/api/Lead/RateModifications', ({ request }) => {
    const url = new URL(request.url);
    const scopeId = url.searchParams.get('scopeId');
    
    if (!scopeId || !mockRateModifications[scopeId]) {
      return HttpResponse.json([]);
    }

    return HttpResponse.json(mockRateModifications[scopeId]);
  }),

  // GET /api/Lead/PostalCodes
  http.get('/api/Lead/PostalCodes', ({ request }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    
    const postalCode = mockPostalCodes.filter(pc => pc.code === code);
    return HttpResponse.json(postalCode);
  }),

  // GET /api/Lead/Availability
  http.get('/api/Lead/Availability', ({ request }) => {
    const url = new URL(request.url);
    const hours = parseInt(url.searchParams.get('hours') || '2');
    
    // Generate mock availability slots for the next 7 days
    const slots: AvailabilitySlot[] = [];
    const today = new Date();
    
    for (let day = 1; day <= 7; day++) {
      const date = new Date(today);
      date.setDate(today.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];
      
      // Morning slots
      slots.push({
        date: dateStr,
        startTime: '08:00',
        endTime: `${8 + hours}:00`,
        isAvailable: Math.random() > 0.3
      });
      
      slots.push({
        date: dateStr,
        startTime: '10:00',
        endTime: `${10 + hours}:00`,
        isAvailable: Math.random() > 0.3
      });
      
      // Afternoon slots
      slots.push({
        date: dateStr,
        startTime: '14:00',
        endTime: `${14 + hours}:00`,
        isAvailable: Math.random() > 0.3
      });
      
      slots.push({
        date: dateStr,
        startTime: '16:00',
        endTime: `${16 + hours}:00`,
        isAvailable: Math.random() > 0.3
      });
    }

    return HttpResponse.json(slots);
  }),

  // POST /api/Lead/CalculatePrice
  http.post('/api/Lead/CalculatePrice', async ({ request }) => {
    const body = await request.json() as any;
    
    // Mock price calculation
    let basePrice = 100;
    let modifiersTotal = 0;
    
    // Add price based on answers (e.g., bedrooms and bathrooms)
    if (body.answers?.bedrooms) {
      basePrice += (body.answers.bedrooms - 1) * 25;
    }
    if (body.answers?.bathrooms) {
      basePrice += (body.answers.bathrooms - 1) * 20;
    }
    
    // Add rate modifications
    if (body.rateModificationIds?.length) {
      modifiersTotal = body.rateModificationIds.length * 20;
    }
    
    const subtotal = basePrice + modifiersTotal;
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + tax;
    
    const response: PriceCalculationResponse = {
      basePrice,
      modifiersTotal,
      subtotal,
      tax,
      total,
      breakdown: [
        { description: 'Base Service', amount: basePrice, type: 'base' },
        ...(modifiersTotal > 0 
          ? [{ description: 'Add-ons', amount: modifiersTotal, type: 'modifier' as const }]
          : []),
        { description: 'Tax (8%)', amount: tax, type: 'tax' }
      ]
    };

    return HttpResponse.json(response);
  }),

  // GET /api/Lead/BillingTerms
  http.get('/api/Lead/BillingTerms', () => {
    return HttpResponse.json(mockBillingTerms);
  }),

  // POST /api/Lead/CreateOrUpdate
  http.post('/api/Lead/CreateOrUpdate', async ({ request }) => {
    const body = await request.json() as Lead;
    
    // Return the lead with a generated ID
    const response: Lead = {
      ...body,
      id: body.id || `lead_${Date.now()}`
    };

    return HttpResponse.json(response);
  }),

  // POST /api/Lead/CreateOrUpdateQuote
  http.post('/api/Lead/CreateOrUpdateQuote', async ({ request }) => {
    const body = await request.json() as Quote;
    
    // Return the quote with a generated ID
    const response: Quote = {
      ...body,
      id: body.id || `quote_${Date.now()}`,
      status: body.status || 'draft',
      expiresAt: body.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    return HttpResponse.json(response);
  }),

  // POST /api/Lead/BookQuote
  http.post('/api/Lead/BookQuote', async ({ request }) => {
    const body = await request.json() as any;
    
    // Mock successful booking
    const response: BookQuoteResponse = {
      bookingId: `booking_${Date.now()}`,
      confirmationNumber: `MC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      status: 'confirmed',
      message: 'Booking confirmed successfully'
    };

    // Simulate occasional failures for testing
    if (Math.random() < 0.1) {
      response.status = 'failed';
      response.message = 'Payment processing failed. Please try again.';
    }

    return HttpResponse.json(response);
  })
];

// Browser-side handler setup
export const setupMocks = () => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const { setupWorker } = require('msw/browser');
    const worker = setupWorker(...handlers);
    return worker.start({
      onUnhandledRequest: 'bypass'
    });
  }
};