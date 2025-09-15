'use client';

import { useState, useEffect, useRef } from 'react';
import { bookingDataService, type BookingService, type BookingExtra, type FrequencyOption, type ScopeGroup } from '@/app/services/api/booking-data';

interface UseBookingDataResult {
  services: BookingService[];
  scopeGroups: ScopeGroup[];
  extras: BookingExtra[];
  frequencyOptions: FrequencyOption[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Track in-flight requests to prevent duplicates
const inFlightRequests = new Map<string, Promise<any>>();

export function useBookingData(authToken: string | null): UseBookingDataResult {
  const [services, setServices] = useState<BookingService[]>([]);
  const [scopeGroups, setScopeGroups] = useState<ScopeGroup[]>([]);
  const [extras, setExtras] = useState<BookingExtra[]>([]);
  const [frequencyOptions, setFrequencyOptions] = useState<FrequencyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousToken = useRef<string | null>(null);
  const hasInitiallyLoaded = useRef(false);

  const fetchData = async () => {
    if (!authToken) {
      setLoading(false);
      setError('Authentication token required');
      return;
    }

    // Check if we're already fetching data for this token
    const requestKey = `bookingData-${authToken}`;
    const existingRequest = inFlightRequests.get(requestKey);
    if (existingRequest) {
      try {
        await existingRequest;
        return;
      } catch {
        // If the existing request failed, we'll try again
      }
    }

    // Create new request promise
    const requestPromise = (async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch scope groups, services and extras in parallel
        const [scopeGroupsData, servicesData, extrasData] = await Promise.all([
          bookingDataService.getScopeGroups(authToken),
          bookingDataService.getServices(authToken),
          bookingDataService.getExtras(''), // Pass empty string as serviceId for now
        ]);
        
        // Then extract frequency options from the services data (no additional API call needed)
        const frequencyData = bookingDataService.getFrequencyOptionsFromServices(servicesData);
        
        setScopeGroups(scopeGroupsData);
        setServices(servicesData);
        setExtras(extrasData);
        setFrequencyOptions(frequencyData);
        hasInitiallyLoaded.current = true;
        
      } catch (err: any) {
        setError(err.message || 'Failed to load booking data');
        throw err;
      } finally {
        setLoading(false);
        // Clean up the in-flight request after a short delay
        setTimeout(() => {
          inFlightRequests.delete(requestKey);
        }, 100);
      }
    })();

    // Store the in-flight request
    inFlightRequests.set(requestKey, requestPromise);
    
    try {
      await requestPromise;
    } catch {
      // Error already handled above
    }
  };

  useEffect(() => {
    // Only fetch if token changed from null to a value or if it's a different token
    const tokenChanged = previousToken.current !== authToken;
    const isNewToken = !previousToken.current && authToken;
    
    if (tokenChanged && authToken) {
      previousToken.current = authToken;
      fetchData();
    } else if (!authToken && previousToken.current) {
      // Token was cleared (logout)
      previousToken.current = null;
      setScopeGroups([]);
      setServices([]);
      setExtras([]);
      setFrequencyOptions([]);
      setLoading(false);
      hasInitiallyLoaded.current = false;
    }
  }, [authToken]);

  return {
    services,
    scopeGroups,
    extras,
    frequencyOptions,
    loading,
    error,
    refetch: fetchData,
  };
}