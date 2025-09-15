# Spec Requirements Document

> Spec: SMS Phone Verification & API Authentication Fix
> Created: 2025-08-28

## Overview

Fix the existing SMS phone verification and API authentication system to properly connect to external MaidCentral APIs without proxy interference. The system should trigger SMS codes via the token endpoint, authenticate using phone codes, receive bearer tokens, and use those tokens for subsequent API calls.

## User Stories

### SMS Code Request Flow

As a partner administrator, I want to trigger an SMS verification code by calling the external MaidCentral token endpoint directly, so that I can receive authentication codes on my registered phone number without proxy interference.

The system calls `https://api.maidcentral.net/token` with partner credentials, triggering an SMS to the registered phone. No phone code is required in .env for this step - it should always hit the external endpoint to send the SMS.

### Phone Code Authentication

As a partner administrator, I want to authenticate using my SMS code to receive a bearer token, so that I can access protected MaidCentral API resources.

After receiving the SMS code, the system submits it to `https://api.maidcentral.net/api/auth/login` and receives a bearer authentication token that will be used for all subsequent API calls.

### Bearer Token Management

As a developer, I want the bearer token to be automatically included in all API requests, so that authenticated endpoints work seamlessly throughout the application.

The authentication service stores and manages the bearer token, automatically including it in API request headers and handling token refresh when needed.

## Spec Scope

1. **Direct API Configuration** - Configure endpoints to bypass proxy and hit external MaidCentral APIs directly
2. **SMS Trigger Fix** - Ensure token endpoint always triggers SMS regardless of .env phone code presence  
3. **Bearer Token Integration** - Implement proper bearer token storage and usage for API requests
4. **Authentication State Management** - Track authentication status and token validity
5. **Error Handling** - Handle SMS delivery failures, invalid codes, and token expiration

## Out of Scope

- Modifying MaidCentral backend API endpoints
- Creating new authentication UI components
- Multi-factor authentication beyond SMS
- Token encryption or advanced security measures
- Rate limiting for authentication attempts

## Expected Deliverable

1. SMS code successfully triggered by direct call to external api.maidcentral.net/token endpoint
2. Authentication completes with phone code and returns valid bearer token
3. Bearer token is automatically included in headers for all subsequent API calls to MaidCentral endpoints

## Spec Documentation

- Tasks: @.agent-os/specs/2025-08-28-sms-auth-api-fix/tasks.md
- Technical Specification: @.agent-os/specs/2025-08-28-sms-auth-api-fix/sub-specs/technical-spec.md
- API Specification: @.agent-os/specs/2025-08-28-sms-auth-api-fix/sub-specs/api-spec.md