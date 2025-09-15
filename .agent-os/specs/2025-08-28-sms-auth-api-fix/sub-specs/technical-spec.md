# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-28-sms-auth-api-fix/spec.md

> Created: 2025-08-28
> Version: 1.0.0

## Technical Requirements

### API Configuration Changes
- Modify `MaidCentralApiService` to bypass proxy for authentication endpoints specifically
- Add configuration flag to control direct vs proxied API calls per endpoint type
- Ensure `https://api.maidcentral.net/token` and `https://api.maidcentral.net/api/auth/login` always use direct calls

### Authentication Flow Implementation
- Remove dependency on .env phone code for SMS triggering
- Implement proper bearer token storage in authentication service
- Add automatic token refresh logic when tokens expire
- Include Authorization header with "Bearer {token}" format in all authenticated requests

### State Management Requirements
- Track authentication status (unauthenticated, SMS sent, authenticated)
- Store bearer token securely in memory/session storage
- Provide authentication status to components that need it
- Clear authentication state on logout or token expiration

### Error Handling Specifications
- Handle network failures when calling external APIs
- Provide clear error messages for SMS delivery issues
- Handle invalid phone code scenarios with retry options
- Manage token expiration gracefully with re-authentication prompts

## Approach

### 1. Direct API Configuration
- Create separate axios instances for direct external API calls
- Implement endpoint routing logic that determines when to bypass proxy
- Add environment variables for external API base URLs

### 2. Token Management Service
- Implement JWT token storage with expiration tracking
- Create token validation and refresh mechanisms
- Add automatic header injection for authenticated requests

### 3. Authentication State Context
- Use React Context API for global authentication state management
- Provide hooks for components to access authentication status
- Implement state persistence across browser sessions

## External Dependencies

**axios** - Already in project for HTTP client functionality
**Justification:** Required for making direct API calls with proper header management and error handling