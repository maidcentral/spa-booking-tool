# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-08-28-sms-auth-api-fix/spec.md

> Created: 2025-08-28
> Status: Ready for Implementation

## Tasks

- [ ] 1. Configure Direct API Access for Authentication
  - [ ] 1.1 Write tests for direct API configuration bypass
  - [ ] 1.2 Modify MaidCentralApiService to support endpoint-specific proxy bypass
  - [ ] 1.3 Add configuration flags for direct vs proxied API calls
  - [ ] 1.4 Update authentication endpoints to always use direct external calls
  - [ ] 1.5 Verify all tests pass

- [ ] 2. Fix SMS Trigger Flow
  - [ ] 2.1 Write tests for SMS trigger without .env phone code dependency
  - [ ] 2.2 Remove .env phone code requirement from token endpoint calls
  - [ ] 2.3 Ensure /token endpoint always hits https://api.maidcentral.net/token directly
  - [ ] 2.4 Add proper error handling for SMS delivery failures
  - [ ] 2.5 Test SMS trigger flow with real external API
  - [ ] 2.6 Verify all tests pass

- [ ] 3. Implement Bearer Token Management
  - [ ] 3.1 Write tests for bearer token storage and retrieval
  - [ ] 3.2 Create secure token storage mechanism in authentication service
  - [ ] 3.3 Implement automatic Authorization header injection for API calls
  - [ ] 3.4 Add token expiration handling and refresh logic
  - [ ] 3.5 Update all MaidCentral API calls to include bearer token
  - [ ] 3.6 Verify all tests pass

- [ ] 4. Enhance Authentication State Management
  - [ ] 4.1 Write tests for authentication state transitions
  - [ ] 4.2 Implement authentication status tracking (unauthenticated, SMS sent, authenticated)
  - [ ] 4.3 Add authentication state persistence across browser sessions
  - [ ] 4.4 Create logout functionality that clears authentication state
  - [ ] 4.5 Add authentication status hooks for components
  - [ ] 4.6 Verify all tests pass

- [ ] 5. Improve Error Handling and User Experience
  - [ ] 5.1 Write tests for authentication error scenarios
  - [ ] 5.2 Add comprehensive error handling for network failures
  - [ ] 5.3 Implement user-friendly error messages for SMS and authentication issues
  - [ ] 5.4 Add retry mechanisms for failed authentication attempts
  - [ ] 5.5 Create graceful token expiration handling with re-authentication prompts
  - [ ] 5.6 Test complete authentication flow end-to-end
  - [ ] 5.7 Verify all tests pass