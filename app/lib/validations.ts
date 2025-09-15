import { z } from "zod"

// Service Selection Validation
export const serviceSelectionSchema = z.object({
  serviceType: z.string().min(1, "Please select a service type"),
  serviceCategory: z.string().min(1, "Please select a service category"),
  pricingParameters: z.object({
    size: z.string().optional(),
    rooms: z.number().min(1).optional(),
    duration: z.number().min(30).optional(),
  }).optional(),
})

// Location & Schedule Validation
export const locationScheduleSchema = z.object({
  zipCode: z.string()
    .min(5, "Zip code must be at least 5 digits")
    .max(10, "Zip code must be no more than 10 characters")
    .regex(/^\d{5}(-\d{4})?$/, "Please enter a valid zip code"),
  selectedDate: z.date({
    message: "Please select a service date",
  }),
  selectedTime: z.string().min(1, "Please select a time slot"),
})

// Customization Validation
export const customizationSchema = z.object({
  extras: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    quantity: z.number().min(1).default(1),
    selected: z.boolean().default(false),
  })).default([]),
  frequency: z.object({
    type: z.enum(["one-time", "weekly", "bi-weekly", "monthly"]),
    multiplier: z.number().default(1),
  }),
  customFields: z.record(z.string(), z.any()).default({}),
})

// Customer Details Validation
export const customerDetailsSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^[\+]?[\d\s\(\)\-]{10,}$/, "Please enter a valid phone number"),
  address: z.object({
    street: z.string().min(5, "Street address is required"),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    zipCode: z.string()
      .regex(/^\d{5}(-\d{4})?$/, "Please enter a valid zip code"),
  }),
  specialInstructions: z.string().optional(),
})

// Payment Validation
export const paymentSchema = z.object({
  paymentMethod: z.enum(["card", "paypal", "bank"]),
  billingAddress: z.object({
    sameAsService: z.boolean().default(true),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
  }),
  cardDetails: z.object({
    cardNumber: z.string().optional(),
    expiryDate: z.string().optional(),
    cvv: z.string().optional(),
    cardholderName: z.string().optional(),
  }).optional(),
})

// Complete Booking Validation
export const completeBookingSchema = z.object({
  serviceSelection: serviceSelectionSchema,
  locationSchedule: locationScheduleSchema,
  customization: customizationSchema,
  customerDetails: customerDetailsSchema,
  payment: paymentSchema,
})

// Type definitions
export type ServiceSelection = z.infer<typeof serviceSelectionSchema>
export type LocationSchedule = z.infer<typeof locationScheduleSchema>
export type Customization = z.infer<typeof customizationSchema>
export type CustomerDetails = z.infer<typeof customerDetailsSchema>
export type Payment = z.infer<typeof paymentSchema>
export type CompleteBooking = z.infer<typeof completeBookingSchema>

// Mock data validation schemas
export const mockServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  basePrice: z.number(),
  duration: z.number(),
  category: z.string(),
  icon: z.string(),
  image: z.string().optional(),
  pricingFactors: z.array(z.object({
    name: z.string(),
    type: z.enum(["select", "number", "checkbox"]),
    options: z.array(z.object({
      label: z.string(),
      value: z.string(),
      priceModifier: z.number(),
    })).optional(),
    pricePerUnit: z.number().optional(),
  })).default([]),
})

export const mockExtraSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  category: z.string(),
  maxQuantity: z.number().default(10),
  isPopular: z.boolean().default(false),
})

export type MockService = z.infer<typeof mockServiceSchema>
export type MockExtra = z.infer<typeof mockExtraSchema>