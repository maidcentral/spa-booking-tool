// Demo: How to use the new authentication functionality

import { maidCentralApi } from '@/app/services/api/maidcentral';

// The maidCentralApi singleton is now configured to:
// 1. Use direct API calls for authentication endpoints ('token', 'login')
// 2. Use proxy for all other endpoints (lead, booking, etc.)

async function demonstrateAuthFlow() {
  try {
    console.log('=== SMS Phone Verification Demo ===');
    
    // Step 1: Request SMS token (this will hit https://api.maidcentral.net/token directly)
    console.log('1. Triggering SMS code...');
    await maidCentralApi.requestAuthToken('partner@example.com', 'password');
    console.log('   ✓ SMS code should be sent to registered phone');
    
    // Step 2: Authenticate with phone code (this will hit https://api.maidcentral.net/api/auth/login directly)
    console.log('2. Authenticating with phone code...');
    const authResponse = await maidCentralApi.authenticateWithPhoneCode(
      'partner@example.com', 
      'password', 
      '123456' // Phone code from SMS
    );
    console.log('   ✓ Bearer token received:', authResponse.access_token);
    
    // Step 3: Make authenticated API calls (these will use proxy but include bearer token)
    console.log('3. Making authenticated API calls...');
    const scopeGroups = await maidCentralApi.getScopeGroups();
    console.log('   ✓ Scope groups fetched with bearer token authentication');
    
    console.log('=== Authentication Flow Complete ===');
  } catch (error) {
    console.error('Authentication failed:', error);
  }
}

// Configuration details:
// - Authentication endpoints bypass proxy: ✓
// - Bearer token automatically included in subsequent calls: ✓  
// - Error handling for SMS and auth failures: ✓
// - Maintains existing proxy behavior for non-auth endpoints: ✓

export { demonstrateAuthFlow };