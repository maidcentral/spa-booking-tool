'use client';

import { useState, useEffect, useRef } from 'react';
import { bookingDataService, type ScopeGroup } from '@/app/services/api/booking-data';

interface UseBookingDataResult {
  scopeGroups: ScopeGroup[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Dedupe concurrent fetches for the same token so StrictMode double-invokes
// and parallel components don't hit the API twice.
const inFlightRequests = new Map<string, Promise<ScopeGroup[]>>();

export function useBookingData(authToken: string | null): UseBookingDataResult {
  const [scopeGroups, setScopeGroups] = useState<ScopeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousToken = useRef<string | null>(null);

  const fetchData = async () => {
    if (!authToken) {
      setLoading(false);
      setError('Authentication token required');
      return;
    }

    const requestKey = `scopeGroups-${authToken}`;
    const existing = inFlightRequests.get(requestKey);
    if (existing) {
      try {
        setScopeGroups(await existing);
        setLoading(false);
        return;
      } catch {
        // fall through and retry
      }
    }

    const promise = bookingDataService.getScopeGroups(authToken);
    inFlightRequests.set(requestKey, promise);

    try {
      setLoading(true);
      setError(null);
      setScopeGroups(await promise);
    } catch (err: any) {
      setError(err.message || 'Failed to load booking data');
    } finally {
      setLoading(false);
      setTimeout(() => inFlightRequests.delete(requestKey), 100);
    }
  };

  useEffect(() => {
    if (previousToken.current !== authToken && authToken) {
      previousToken.current = authToken;
      fetchData();
    } else if (!authToken && previousToken.current) {
      previousToken.current = null;
      setScopeGroups([]);
      setLoading(false);
    }
  }, [authToken]);

  return { scopeGroups, loading, error, refetch: fetchData };
}
