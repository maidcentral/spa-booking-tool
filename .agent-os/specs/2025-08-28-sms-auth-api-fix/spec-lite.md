# SMS Phone Verification & API Authentication Fix - Lite Summary

Fix SMS phone verification to call external MaidCentral APIs directly without proxy interference, properly authenticate with SMS codes, and manage bearer tokens for subsequent API requests. The system should trigger SMS via token endpoint, authenticate with phone codes, and automatically include bearer tokens in API call headers.

## Key Points
- Remove proxy interference for authentication endpoints
- Ensure SMS triggers via direct external API calls
- Implement proper bearer token storage and header management