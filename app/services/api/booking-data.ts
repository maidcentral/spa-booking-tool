/**
 * Service for fetching real booking data from MaidCentral API
 * Replaces mock data with real API calls
 */

import { fetchMaidCentralAPI, parseAPIResponse } from './fetch-utils';

// Real API response interfaces
export interface Frequency {
  FrequencyId: string;
  Name: string;
}

export interface Scope {
  ScopeId: number;
  Name: string;
  IsRequired: boolean;
  Frequencies: Frequency[];
}

export interface ScopeGroup {
  ScopeGroupId: number;
  Name: string;
  Scopes: Scope[];
  MarketingText?: string | null;
}

export interface ScopeGroupsResponse {
  Result: ScopeGroup[];
  Message: string | null;
  InnerException: string | null;
  IsSuccess: boolean;
}

// Price calculation API interfaces
export interface PriceCalculationRequest {
  ScopeGroupId: number;
  ScopesOfWork: ScopeOfWork[];
  Questions: Question[];
}

export interface ScopeOfWork {
  ScopeOfWorkId: number;
  FrequencyId: string;
  RateModifications?: RateModificationRequest[];
}

export interface RateModificationRequest {
  Quantity: number;
  RateModificationId: number;
  IsRecurring?: boolean;
  RateModificationFrequencyId?: number;
}

export interface Question {
  QuestionId: number;
  Answer: string;
}

export interface PriceCalculationResponse {
  IsSuccess: boolean;
  Message: string | null;
  Result: PriceCalculationResult[];
  InnerException: string | null;
  StatusCode: number;
}

export interface PriceCalculationResult {
  ScopeOfWorkId: number;
  ScopeName?: string;
  Frequencies: FrequencyPricing[];
}

export interface FrequencyPricing {
  IsBooked: boolean;
  IsInterested: boolean;
  FrequencyId: string;
  FrequencyName: string;
  MinimumCost: number;
  AdjustedBaseCost: number;
  CalculatedBaseCost: number;
  TotalBaseHours: number;
  TotalRecurringCost: number;
  TotalFirstJobCost: number;
  TotalRecurringHours: number;
  TotalFirstJobHours: number;
  RateModifications: RateModification[];
  PriceCalculation: string;
}

export interface RateModification {
  Quantity: number;
  RateModificationId: number;
  IsRecurring: boolean;
  Name: string;
  CalculatedCost: number;
  CalculatedHours: number;
}

// Questions API interfaces
export interface QuestionsResponse {
  IsSuccess: boolean;
  Message: string;
  Result: QuestionData[];
  InnerException: string | null;
  StatusCode: number;
}

export interface QuestionData {
  ScopeId: number;
  QuestionId: number;
  IsRequired: boolean;
  QuestionText: string;
  Answers: AnswerOption[];
  HelpText: string | null;
  Icon: string | null;
  Color: string | null;
  QuestionStepType: string;
  QuestionType: string;
  TextValue: string | null;
  PricingAdjustmentDescription: string;
  SortOrder: number;
}

export interface AnswerOption {
  AnswerId: number;
  AnswerText: string;
  Icon: string | null;
  Color: string | null;
  HelpText: string | null;
  SortOrder: number;
}

// Postal Codes API interfaces
export interface PostalCodeResult {
  PostalCode: string;
  ZoneName: string;
  ZoneId: number;
}

export interface PostalCodesResponse {
  IsSuccess: boolean;
  Message: string;
  Result: PostalCodeResult[];
  InnerException: string | null;
  StatusCode: number;
}

// Availability API interfaces
export interface AvailabilityResponse {
  IsSuccess: boolean;
  Message: string;
  Result: string[]; // Array of ISO date strings
  InnerException: string | null;
  StatusCode: number;
}

// Rate Modifications API interfaces
export interface RateModification {
  RateModificationId: number;
  Name: string;
  Description: string;
  RateModificationType: string;
  IsPercentage: boolean;
  IsRequired: boolean;
  ScopeId: number;
  Cost: number;
  CostDisplay: string;
  CostCalcType: number;
  CostCalcDescription: string;
}

export interface RateModificationsResponse {
  IsSuccess: boolean;
  Message: string;
  Result: RateModification[];
  InnerException: string | null;
  StatusCode: number;
}

// Internal booking service interface
export interface BookingService {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  icon: string;
  isActive: boolean;
  category: string;
  scopes?: Scope[]; // Include scopes for detailed service options
}

export interface BookingExtra {
  id: string;
  name: string;
  price: number;
  description?: string;
}

export interface FrequencyOption {
  id: string;
  name: string;
  description?: string;
  type: string;
  multiplier: number;
  discount?: number;
}

export class BookingDataService {
  /**
   * Fetch scope groups from API
   */
  async getScopeGroups(authToken: string): Promise<ScopeGroup[]> {
    try {
      
      if (!authToken) {
        throw new Error('No authentication token provided');
      }
      
      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      const endpoint = 'https://mccleaners.maidcentral.net/api/Lead/ScopeGroups';
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
        credentials: 'omit'
      });
      
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ScopeGroups API failed with status ${response.status}`);
      }

      const data: ScopeGroupsResponse = await response.json();

      if (!data.IsSuccess) {
        throw new Error(`API returned error: ${data.Message || 'Unknown error'}`);
      }
      
      if (!Array.isArray(data.Result)) {
        throw new Error('Invalid response format: expected Result to be array of scope groups');
      }
      
      return data.Result;
      
    } catch (error: any) {
      throw new Error(`Failed to load scope groups: ${error.message}`);
    }
  }

  /**
   * Fetch available services from scope groups using direct API call with authentication token
   * (Legacy method - kept for backward compatibility)
   */
  async getServices(authToken: string): Promise<BookingService[]> {
    try {
      
      if (!authToken) {
        throw new Error('No authentication token provided');
      }
      
      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Use only the production MaidCentral endpoint
      const endpoint = 'https://mccleaners.maidcentral.net/api/Lead/ScopeGroups';
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
        credentials: 'omit' // Don't send cookies that might interfere
      });
      
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ScopeGroups API failed with status ${response.status}`);
      }
      
      const data: ScopeGroupsResponse = await response.json();
      
      // Check if the API call was successful
      if (!data.IsSuccess) {
        throw new Error(`API returned error: ${data.Message || 'Unknown error'}`);
      }
      
      if (!Array.isArray(data.Result)) {
        throw new Error('Invalid response format: expected Result to be array of scope groups');
      }
      
      // Map scope groups to booking services
      const services: BookingService[] = data.Result.map((scopeGroup: ScopeGroup, index: number) => ({
        id: scopeGroup.ScopeGroupId.toString(),
        name: scopeGroup.Name,
        description: `Professional ${scopeGroup.Name.toLowerCase()} service`,
        basePrice: this.getServiceBasePrice(scopeGroup.Name), // Temporary until we have pricing API
        icon: this.getServiceIcon(scopeGroup.Name, index),
        isActive: true, // All returned scope groups are considered active
        category: 'cleaning',
        scopes: scopeGroup.Scopes // Include scopes for detailed service options
      }));
      
      return services;
      
    } catch (error: any) {
      throw new Error(`Failed to load services: ${error.message}`);
    }
  }

  /**
   * Get extras/add-ons for a service
   * TODO: Replace with real API call once rate modifications endpoint is confirmed
   */
  async getExtras(serviceId: string): Promise<BookingExtra[]> {
    // TODO: Call real rate modifications API when endpoint is available
    
    // Temporary mock data matching the existing Extra interface
    return [
      {
        id: "inside-oven",
        name: "Inside Oven Cleaning",
        price: 25,
        description: "Deep cleaning inside your oven",
      },
      {
        id: "inside-fridge", 
        name: "Inside Refrigerator Cleaning",
        price: 20,
        description: "Complete refrigerator interior cleaning",
      },
      {
        id: "inside-cabinets",
        name: "Inside Cabinet Cleaning", 
        price: 35,
        description: "Cleaning inside kitchen cabinets",
      },
      {
        id: "window-cleaning",
        name: "Interior Window Cleaning",
        price: 30, 
        description: "Cleaning interior windows and sills",
      },
      {
        id: "basement-cleaning",
        name: "Basement Cleaning",
        price: 45,
        description: "Deep cleaning of basement area",
      },
      {
        id: "garage-cleaning", 
        name: "Garage Cleaning",
        price: 40,
        description: "Comprehensive garage cleaning",
      },
      {
        id: "green-products",
        name: "Eco-Friendly Products",
        price: 15,
        description: "Use only eco-friendly cleaning products",
      },
    ];
  }

  /**
   * Get frequency options for booking based on already-loaded services data
   * Extracts frequency options from all scopes across all service types
   */
  getFrequencyOptionsFromServices(services: BookingService[]): FrequencyOption[] {
    try {
      
      const frequencyMap = new Map<string, FrequencyOption>();
      
      // Extract all unique frequencies from all scopes
      services.forEach(service => {
        if (service.scopes) {
          service.scopes.forEach(scope => {
            scope.Frequencies.forEach(frequency => {
              if (!frequencyMap.has(frequency.FrequencyId)) {
                frequencyMap.set(frequency.FrequencyId, {
                  id: frequency.FrequencyId,
                  name: frequency.Name,
                  description: `${frequency.Name} service`,
                  type: this.mapFrequencyType(frequency.FrequencyId),
                  multiplier: 1,
                  discount: this.getFrequencyDiscount(frequency.FrequencyId)
                });
              }
            });
          });
        }
      });
      
      const frequencyOptions = Array.from(frequencyMap.values());
      return frequencyOptions;
      
    } catch (error: any) {
      // Fallback to basic options if extraction fails
      return [
        {
          id: "S",
          name: "Single",
          description: "One-time service",
          type: "one-time",
          multiplier: 1,
        }
      ];
    }
  }

  /**
   * Map MaidCentral frequency IDs to internal frequency types
   */
  private mapFrequencyType(frequencyId: string): string {
    switch (frequencyId) {
      case 'S': return 'one-time';
      case 'E1': return 'weekly';
      case 'E2': return 'bi-weekly';
      case 'E4': return 'monthly';
      default: return 'custom';
    }
  }

  /**
   * Get discount percentage for frequency types (temporary business logic)
   */
  private getFrequencyDiscount(frequencyId: string): number | undefined {
    switch (frequencyId) {
      case 'E1': return 0.15; // 15% discount for weekly
      case 'E2': return 0.10; // 10% discount for bi-weekly
      case 'E4': return 0.05;  // 5% discount for monthly
      default: return undefined; // No discount for one-time
    }
  }

  /**
   * Calculate pricing for a service selection
   * TODO: Replace with real API call once endpoint is confirmed  
   */
  async calculatePricing(serviceId: string, options: any): Promise<any> {
    // TODO: Call real pricing calculation API
    return null;
  }

  /**
   * Create a booking/lead
   * TODO: Replace with real API call once endpoint is confirmed
   */
  async createBooking(bookingData: any): Promise<any> {
    // TODO: Call real lead creation API
    throw new Error('Booking creation not yet implemented - API endpoint needed');
  }

  /**
   * Temporary method to assign base prices based on service name keywords
   * TODO: Remove once real pricing API is integrated
   */
  private getServiceBasePrice(serviceName: string): number {
    const name = serviceName.toLowerCase();
    
    // High-end services
    if (name.includes('move') || name.includes('construction') || name.includes('post-construction')) return 250;
    if (name.includes('deep') || name.includes('intensive') || name.includes('detail')) return 200;
    
    // Commercial services
    if (name.includes('commercial') || name.includes('office') || name.includes('business')) return 180;
    
    // Specialty services
    if (name.includes('carpet') || name.includes('upholstery')) return 160;
    if (name.includes('window') || name.includes('pressure wash')) return 140;
    
    // Regular residential services
    if (name.includes('regular') || name.includes('standard') || name.includes('maintenance')) return 120;
    if (name.includes('residential') || name.includes('home') || name.includes('house')) return 130;
    
    // Default for any other service types
    return 150;
  }

  /**
   * Temporary method to assign icons based on service name keywords
   * TODO: Remove once we have proper service icons from API
   */
  private getServiceIcon(serviceName: string, index: number): string {
    const name = serviceName.toLowerCase();
    
    // Service-specific icons
    if (name.includes('residential') || name.includes('home') || name.includes('house')) return '🏠';
    if (name.includes('commercial') || name.includes('office') || name.includes('business')) return '🏢';
    if (name.includes('deep') || name.includes('intensive') || name.includes('detail')) return '🧹';
    if (name.includes('move') || name.includes('construction') || name.includes('post-construction')) return '🔨';
    if (name.includes('window') || name.includes('glass')) return '🪟';
    if (name.includes('carpet') || name.includes('upholstery') || name.includes('fabric')) return '🛏️';
    if (name.includes('pressure') || name.includes('exterior')) return '💧';
    if (name.includes('maintenance') || name.includes('regular') || name.includes('standard')) return '✨';
    
    // Fallback icons - cycle through a variety for unknown service types
    const icons = ['🏠', '🧹', '✨', '🪟', '🛏️', '🏢', '🔨', '🧽', '💧', '🧽', '🛁', '🧴'];
    return icons[index % icons.length];
  }

  /**
   * Get questions for specific scopes
   */
  async getQuestions(authToken: string, scopeIds: number[]): Promise<QuestionsResponse> {
    try {
      
      if (!authToken) {
        throw new Error('No authentication token provided');
      }

      if (!scopeIds || scopeIds.length === 0) {
        throw new Error('No scope IDs provided');
      }
      
      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Build query string with multiple scopeIds parameters
      const scopeParams = scopeIds.map(id => `scopeIds=${id}`).join('&');
      const endpoint = `https://mccleaners.maidcentral.net/api/Lead/Questions?${scopeParams}`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
        credentials: 'omit'
      });
      
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Questions API failed with status ${response.status}`);
      }
      
      const data: QuestionsResponse = await response.json();
      
      if (!data.IsSuccess) {
        throw new Error(`API returned error: ${data.Message || 'Unknown questions error'}`);
      }
      
      return data;
      
    } catch (error: any) {
      throw new Error(`Failed to fetch questions: ${error.message}`);
    }
  }

  /**
   * Calculate pricing using MaidCentral API
   */
  async calculatePrice(authToken: string, request: PriceCalculationRequest): Promise<PriceCalculationResponse> {
    try {
      
      if (!authToken) {
        throw new Error('No authentication token provided');
      }
      
      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      const endpoint = 'https://mccleaners.maidcentral.net/api/Lead/CalculatePrice';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        credentials: 'omit',
        body: JSON.stringify(request)
      });
      
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Price calculation API failed with status ${response.status}`);
      }
      
      const data: PriceCalculationResponse = await response.json();
      
      if (!data.IsSuccess) {
        throw new Error(`API returned error: ${data.Message || 'Unknown pricing error'}`);
      }
      
      if (!Array.isArray(data.Result) || data.Result.length === 0) {
        throw new Error('Invalid pricing response: no results returned');
      }
      
      return data;
      
    } catch (error: any) {
      throw new Error(`Failed to calculate price: ${error.message}`);
    }
  }

  /**
   * Get available postal codes and their zones
   */
  async getPostalCodes(authToken: string): Promise<PostalCodesResponse> {
    try {
      
      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json'
      };
      
      const endpoint = 'https://mccleaners.maidcentral.net/api/Lead/PostalCodes';
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
        credentials: 'omit'
      });
      
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Postal codes API failed with status ${response.status}`);
      }
      
      const data: PostalCodesResponse = await response.json();
      
      if (!data.IsSuccess) {
        throw new Error(`API returned error: ${data.Message || 'Unknown postal codes error'}`);
      }
      
      return data;
      
    } catch (error: any) {
      throw new Error(`Failed to fetch postal codes: ${error.message}`);
    }
  }

  /**
   * Get availability for a scope group within a date range
   */
  async getAvailability(
    authToken: string,
    scopeGroupId: number,
    hours: number,
    startDate: string,
    endDate: string
  ): Promise<AvailabilityResponse> {

    try {
      const params = new URLSearchParams({
        scopeGroupId: scopeGroupId.toString(),
        hours: hours.toString(),
        startDate,
        endDate
      });
      const endpoint = `/api/Lead/Availability?${params.toString()}`;

      const response = await fetchMaidCentralAPI(endpoint, authToken, {
        method: 'GET',
        timeout: 30000 // Increased timeout to 30 seconds
      });

      const data = await parseAPIResponse<AvailabilityResponse>(response, 'Availability');

      if (!data.IsSuccess) {
        throw new Error(`API returned error: ${data.Message || 'Unknown availability error'}`);
      }

      return data;

    } catch (error: any) {
      throw new Error(`Failed to fetch availability: ${error.message}`);
    }
  }

  /**
   * Get rate modifications (add-ons) for a specific scope group
   */
  async getRateModifications(authToken: string, scopeGroupId: number): Promise<RateModificationsResponse> {
    try {
      
      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json'
      };
      
      const endpoint = `https://mccleaners.maidcentral.net/api/Lead/RateModifications?scopeGroupId=${scopeGroupId}`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
        credentials: 'omit'
      });
      
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Rate modifications API failed with status ${response.status}`);
      }
      
      const data: RateModificationsResponse = await response.json();
      
      if (!data.IsSuccess) {
        throw new Error(`API returned error: ${data.Message || 'Unknown rate modifications error'}`);
      }
      
      return data;
      
    } catch (error: any) {
      throw new Error(`Failed to fetch rate modifications: ${error.message}`);
    }
  }
}

// Export singleton instance
export const bookingDataService = new BookingDataService();