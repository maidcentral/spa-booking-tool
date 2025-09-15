import type { ScopeGroup, ApiResponse } from '@/app/types/api';

export class ScopeGroupService {
  private baseUrl = '/api/scope-groups';

  /**
   * Fetch all available scope groups
   * This method automatically handles authentication using cached tokens
   */
  async getScopeGroups(): Promise<ScopeGroup[]> {
    try {
      // Use fetch to call our local Next.js API endpoint
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      const data: ApiResponse<ScopeGroup[]> = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch scope groups');
      }
      
      return data.data || [];
    } catch (error: any) {
      // Re-throw with better error message
      if (error.message?.includes('401')) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (error.message?.includes('403')) {
        throw new Error('Access denied. You may not have permission to view scope groups.');
      }
      
      if (error.message?.includes('404')) {
        throw new Error('Scope groups endpoint not found.');
      }
      
      if (error.name === 'TypeError' || error.message?.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      throw new Error(error.message || 'Failed to fetch scope groups');
    }
  }

  /**
   * Fetch scope groups with client-side caching
   * @param forceRefresh - If true, bypasses cache and fetches fresh data
   */
  async getScopeGroupsCached(forceRefresh: boolean = false): Promise<ScopeGroup[]> {
    const cacheKey = 'maidcentral-scope-groups';
    const cacheDuration = 5 * 60 * 1000; // 5 minutes
    
    if (!forceRefresh && typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          const isExpired = Date.now() - timestamp > cacheDuration;
          
          if (!isExpired) {
            return data as ScopeGroup[];
          }
        } catch (error) {
        }
      }
    }
    
    // Fetch fresh data
    const scopeGroups = await this.getScopeGroups();
    
    // Cache the results
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: scopeGroups,
          timestamp: Date.now()
        }));
      } catch (error) {
      }
    }
    
    return scopeGroups;
  }

  /**
   * Clear cached scope groups
   */
  clearCache(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('maidcentral-scope-groups');
    }
  }

  /**
   * Get a specific scope group by ID
   */
  async getScopeGroup(id: string): Promise<ScopeGroup | null> {
    const scopeGroups = await this.getScopeGroups();
    return scopeGroups.find(sg => sg.id === id) || null;
  }

  /**
   * Get active scope groups only
   */
  async getActiveScopeGroups(): Promise<ScopeGroup[]> {
    const scopeGroups = await this.getScopeGroups();
    return scopeGroups.filter(sg => sg.isActive);
  }
}

// Export singleton instance
export const scopeGroupService = new ScopeGroupService();