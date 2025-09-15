# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-28-sms-auth-api-fix/spec.md

> Created: 2025-08-28
> Version: 1.0.0

## External API Endpoints

### POST https://api.maidcentral.net/token

**Purpose:** Trigger SMS verification code to registered partner phone number
**Method:** POST
**Headers:** 
- Content-Type: application/json
**Body:**
```json
{
  "email": "partner@example.com",
  "password": "partner_password"
}
```
**Response:** Success confirmation (SMS is sent out-of-band)
**Errors:** 
- 401: Invalid credentials
- 429: Too many SMS requests
- 500: SMS delivery failure

### POST https://api.maidcentral.net/api/auth/login

**Purpose:** Authenticate with SMS code and receive bearer token
**Method:** POST  
**Headers:**
- Content-Type: application/json
**Body:**
```json
{
  "email": "partner@example.com", 
  "password": "partner_password",
  "phoneCode": "123456"
}
```
**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```
**Errors:**
- 401: Invalid credentials or phone code
- 422: Missing or malformed phone code
- 429: Too many authentication attempts

## Internal API Changes

### Modified Endpoints

#### GET/POST /api/auth/* (Internal Routes)
**Purpose:** Remove proxy behavior for authentication, route directly to external APIs
**Changes:** 
- Configure authentication routes to bypass internal proxy
- Pass through requests directly to MaidCentral API
- Handle external API responses without modification

## Controllers

### AuthenticationController (New/Modified)
- `triggerSmsCode()` - Direct call to external token endpoint
- `authenticateWithCode()` - Submit phone code and receive bearer token
- `refreshToken()` - Handle token refresh when expired
- `logout()` - Clear authentication state and invalidate token

## Authentication Header Format

All authenticated requests to MaidCentral APIs must include:
```
Authorization: Bearer {token}
```

Where `{token}` is the JWT token received from the login endpoint.