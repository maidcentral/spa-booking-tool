import { ServiceType, ServiceCategory, Extra, FrequencyOption, TimeSlot, AvailableDate, CustomField } from "@/app/types/booking"

// Mock Service Types (simplified to 4 main services)
export const mockServiceTypes: ServiceType[] = [
  {
    id: "regular-cleaning",
    name: "Regular House Cleaning",
    description: "Weekly, bi-weekly, or monthly cleaning service",
    basePrice: 120,
    duration: 120,
    category: "residential",
    icon: "🏠",
    isPopular: true,
  },
  {
    id: "deep-cleaning",
    name: "Deep Cleaning",
    description: "Comprehensive one-time deep clean",
    basePrice: 200,
    duration: 240,
    category: "residential",
    icon: "✨",
  },
  {
    id: "move-in-out",
    name: "Move In/Out Cleaning",
    description: "Thorough cleaning for moving",
    basePrice: 180,
    duration: 180,
    category: "residential",
    icon: "📦",
  },
  {
    id: "office-cleaning",
    name: "Office Cleaning",
    description: "Regular office maintenance cleaning",
    basePrice: 150,
    duration: 90,
    category: "commercial",
    icon: "🏢",
  },
]

// Mock Service Categories (kept for backwards compatibility)
export const mockServiceCategories: ServiceCategory[] = [
  {
    id: "all-services",
    name: "All Services",
    description: "Choose from our available cleaning services",
    serviceTypes: mockServiceTypes
  }
]

// Mock Extras
export const mockExtras: Extra[] = [
  {
    id: "inside-oven",
    name: "Inside Oven Cleaning",
    description: "Deep cleaning inside your oven",
    price: 25,
    category: "kitchen",
    maxQuantity: 3,
    isPopular: true,
    icon: "🔥",
  },
  {
    id: "inside-fridge",
    name: "Inside Refrigerator Cleaning",
    description: "Complete refrigerator interior cleaning",
    price: 20,
    category: "kitchen",
    maxQuantity: 2,
    isPopular: false,
    icon: "❄️",
  },
  {
    id: "inside-cabinets",
    name: "Inside Cabinet Cleaning",
    description: "Cleaning inside kitchen cabinets",
    price: 35,
    category: "kitchen",
    maxQuantity: 1,
    isPopular: false,
    icon: "🗄️",
  },
  {
    id: "window-cleaning",
    name: "Interior Window Cleaning",
    description: "Cleaning interior windows and sills",
    price: 30,
    category: "windows",
    maxQuantity: 1,
    isPopular: true,
    icon: "🪟",
  },
  {
    id: "basement-cleaning",
    name: "Basement Cleaning",
    description: "Deep cleaning of basement area",
    price: 45,
    category: "additional-rooms",
    maxQuantity: 1,
    isPopular: false,
    icon: "🏠",
  },
  {
    id: "garage-cleaning",
    name: "Garage Cleaning",
    description: "Comprehensive garage cleaning",
    price: 40,
    category: "additional-rooms",
    maxQuantity: 1,
    isPopular: false,
    icon: "🚗",
  },
  {
    id: "green-products",
    name: "Eco-Friendly Products",
    description: "Use only eco-friendly cleaning products",
    price: 15,
    category: "products",
    maxQuantity: 1,
    isPopular: true,
    icon: "🌱",
  },
]

// Mock Frequency Options
export const mockFrequencyOptions: FrequencyOption[] = [
  {
    id: "one-time",
    name: "One Time",
    description: "Single cleaning service",
    type: "one-time",
    multiplier: 1,
  },
  {
    id: "weekly",
    name: "Weekly",
    description: "Every week",
    type: "weekly",
    multiplier: 1,
    discount: 0.1, // 10% discount
  },
  {
    id: "bi-weekly",
    name: "Bi-Weekly",
    description: "Every 2 weeks",
    type: "bi-weekly",
    multiplier: 1,
    discount: 0.05, // 5% discount
  },
  {
    id: "monthly",
    name: "Monthly",
    description: "Once a month",
    type: "monthly",
    multiplier: 1,
  },
]

// Mock Time Slots
export const mockTimeSlots: TimeSlot[] = [
  { id: "8-00", time: "8:00 AM", available: true },
  { id: "8-30", time: "8:30 AM", available: true },
  { id: "9-00", time: "9:00 AM", available: true },
  { id: "9-30", time: "9:30 AM", available: false },
  { id: "10-00", time: "10:00 AM", available: true },
  { id: "10-30", time: "10:30 AM", available: true },
  { id: "11-00", time: "11:00 AM", available: true },
  { id: "11-30", time: "11:30 AM", available: true },
  { id: "12-00", time: "12:00 PM", available: true },
  { id: "12-30", time: "12:30 PM", available: false },
  { id: "13-00", time: "1:00 PM", available: true },
  { id: "13-30", time: "1:30 PM", available: true },
  { id: "14-00", time: "2:00 PM", available: true },
  { id: "14-30", time: "2:30 PM", available: true },
  { id: "15-00", time: "3:00 PM", available: true },
  { id: "15-30", time: "3:30 PM", available: false },
  { id: "16-00", time: "4:00 PM", available: true },
  { id: "16-30", time: "4:30 PM", available: true },
  { id: "17-00", time: "5:00 PM", available: true },
]

// Generate Available Dates (next 30 days)
export const generateMockAvailableDates = (): AvailableDate[] => {
  const dates: AvailableDate[] = []
  const today = new Date()
  
  for (let i = 1; i <= 30; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    
    // Skip Sundays (day 0)
    if (date.getDay() === 0) continue
    
    // Randomly make some dates less available
    const availableSlots = mockTimeSlots.map(slot => ({
      ...slot,
      available: slot.available && Math.random() > 0.3 // 70% chance of being available
    }))
    
    dates.push({
      date,
      timeSlots: availableSlots
    })
  }
  
  return dates
}

// Mock Custom Fields
export const mockCustomFields: CustomField[] = [
  {
    id: "pet-info",
    label: "Do you have pets?",
    type: "select",
    required: false,
    options: ["No pets", "1 dog", "2+ dogs", "1 cat", "2+ cats", "Other pets"],
    helpText: "This helps our team prepare appropriately"
  },
  {
    id: "access-instructions",
    label: "Access Instructions",
    type: "textarea",
    required: false,
    placeholder: "How should our team access your home? (key location, gate code, etc.)",
    helpText: "Include any special instructions for accessing your property"
  },
  {
    id: "allergies",
    label: "Allergies or Sensitivities",
    type: "textarea",
    required: false,
    placeholder: "Any allergies to cleaning products or other sensitivities?",
    helpText: "We'll make sure to use appropriate products"
  },
  {
    id: "priority-areas",
    label: "Priority Areas",
    type: "checkbox",
    required: false,
    options: ["Kitchen", "Bathrooms", "Living Room", "Bedrooms", "Basement", "Upstairs"],
    helpText: "Areas that need extra attention"
  },
]

// Mock Service Areas (ZIP codes)
export const mockServiceAreas = [
  "10001", "10002", "10003", "10004", "10005", // Manhattan
  "11201", "11205", "11215", "11217", "11231", // Brooklyn
  "11101", "11102", "11103", "11104", "11105", // Queens
  "10451", "10452", "10453", "10454", "10455", // Bronx
  "07030", "07031", "07032", "07033", "07034", // New Jersey
]

// Check if ZIP code is in service area
export const isZipCodeServiceable = (zipCode: string): boolean => {
  return mockServiceAreas.includes(zipCode)
}