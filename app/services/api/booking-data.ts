/**
 * Read-side booking API calls.
 *
 * All endpoints return MaidCentral's standard envelope shape
 * `{ IsSuccess, Message, Result, InnerException, StatusCode }`. Each helper
 * unwraps `Result` (or throws) so callers can ignore the envelope.
 */

import { fetchMaidCentralAPI, parseAPIResponse } from './fetch-utils';
import { API_BASE_URL } from '@/app/lib/config/api-url';

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

export interface AvailabilityResponse {
  IsSuccess: boolean;
  Message: string;
  Result: string[];
  InnerException: string | null;
  StatusCode: number;
}

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
  // Fields returned from CalculatePrice responses (not the RateModifications list).
  Quantity?: number;
  IsRecurring?: boolean;
  CalculatedCost?: number;
  CalculatedHours?: number;
}

export interface RateModificationsResponse {
  IsSuccess: boolean;
  Message: string;
  Result: RateModification[];
  InnerException: string | null;
  StatusCode: number;
}

function authHeaders(token: string): HeadersInit {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

export class BookingDataService {
  async getScopeGroups(authToken: string): Promise<ScopeGroup[]> {
    if (!authToken) throw new Error('No authentication token provided');

    const response = await fetch(`${API_BASE_URL}/api/Lead/ScopeGroups`, {
      method: 'GET',
      headers: authHeaders(authToken),
      credentials: 'omit',
    });

    if (!response.ok) {
      throw new Error(`ScopeGroups API failed with status ${response.status}`);
    }

    const data = (await response.json()) as ScopeGroupsResponse;
    if (!data.IsSuccess) {
      throw new Error(`ScopeGroups API returned error: ${data.Message || 'unknown error'}`);
    }
    return data.Result;
  }

  async getQuestions(authToken: string, scopeIds: number[]): Promise<QuestionsResponse> {
    if (!authToken) throw new Error('No authentication token provided');
    if (!scopeIds || scopeIds.length === 0) throw new Error('No scope IDs provided');

    const scopeParams = scopeIds.map((id) => `scopeIds=${id}`).join('&');
    const response = await fetch(`${API_BASE_URL}/api/Lead/Questions?${scopeParams}`, {
      method: 'GET',
      headers: authHeaders(authToken),
      credentials: 'omit',
    });

    if (!response.ok) {
      throw new Error(`Questions API failed with status ${response.status}`);
    }

    const data = (await response.json()) as QuestionsResponse;
    if (!data.IsSuccess) {
      throw new Error(`Questions API returned error: ${data.Message || 'unknown error'}`);
    }
    return data;
  }

  async calculatePrice(
    authToken: string,
    request: PriceCalculationRequest
  ): Promise<PriceCalculationResponse> {
    if (!authToken) throw new Error('No authentication token provided');

    const response = await fetch(`${API_BASE_URL}/api/Lead/CalculatePrice`, {
      method: 'POST',
      headers: authHeaders(authToken),
      credentials: 'omit',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`CalculatePrice API failed with status ${response.status}`);
    }

    const data = (await response.json()) as PriceCalculationResponse;
    if (!data.IsSuccess) {
      throw new Error(`CalculatePrice API returned error: ${data.Message || 'unknown error'}`);
    }
    if (!Array.isArray(data.Result) || data.Result.length === 0) {
      throw new Error('CalculatePrice returned no results');
    }
    return data;
  }

  async getPostalCodes(authToken: string): Promise<PostalCodesResponse> {
    if (!authToken) throw new Error('No authentication token provided');

    const response = await fetch(`${API_BASE_URL}/api/Lead/PostalCodes`, {
      method: 'GET',
      headers: authHeaders(authToken),
      credentials: 'omit',
    });

    if (!response.ok) {
      throw new Error(`PostalCodes API failed with status ${response.status}`);
    }

    const data = (await response.json()) as PostalCodesResponse;
    if (!data.IsSuccess) {
      throw new Error(`PostalCodes API returned error: ${data.Message || 'unknown error'}`);
    }
    return data;
  }

  async getAvailability(
    authToken: string,
    scopeGroupId: number,
    hours: number,
    startDate: string,
    endDate: string
  ): Promise<AvailabilityResponse> {
    const params = new URLSearchParams({
      scopeGroupId: scopeGroupId.toString(),
      hours: hours.toString(),
      startDate,
      endDate,
    });
    const response = await fetchMaidCentralAPI(`/api/Lead/Availability?${params}`, authToken, {
      method: 'GET',
      timeout: 30000,
    });

    const data = await parseAPIResponse<AvailabilityResponse>(response, 'Availability');
    if (!data.IsSuccess) {
      throw new Error(`Availability API returned error: ${data.Message || 'unknown error'}`);
    }
    return data;
  }

  async getRateModifications(
    authToken: string,
    scopeGroupId: number
  ): Promise<RateModificationsResponse> {
    if (!authToken) throw new Error('No authentication token provided');

    const response = await fetch(
      `${API_BASE_URL}/api/Lead/RateModifications?scopeGroupId=${scopeGroupId}`,
      {
        method: 'GET',
        headers: authHeaders(authToken),
        credentials: 'omit',
      }
    );

    if (!response.ok) {
      throw new Error(`RateModifications API failed with status ${response.status}`);
    }

    const data = (await response.json()) as RateModificationsResponse;
    if (!data.IsSuccess) {
      throw new Error(`RateModifications API returned error: ${data.Message || 'unknown error'}`);
    }
    return data;
  }
}

export const bookingDataService = new BookingDataService();
