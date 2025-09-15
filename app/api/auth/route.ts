import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side API route for secure authentication with MaidCentral
 * Keeps API credentials on the server and returns only the access token
 */
export async function GET(request: NextRequest) {
  try {
    // Get API credentials from environment variables (server-side only)
    const apiUsername = process.env.API_USERNAME?.trim();
    const apiKey = process.env.API_KEY?.trim();

    if (!apiUsername || !apiKey) {
return NextResponse.json(
        { error: 'Server configuration error: Missing API credentials' },
        { status: 500 }
      );
    }

// Call MaidCentral token endpoint with API credentials
    const tokenEndpoint = 'https://mccleaners.maidcentral.net/token';
    
    // The MaidCentral token endpoint requires credentials in form-data format
    const formData = new URLSearchParams();
    formData.append('username', apiUsername);  // API_USERNAME from .env
    formData.append('password', apiKey);        // API_KEY from .env
    formData.append('grant_type', 'password');  // Required by OAuth2 standard
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
return NextResponse.json(
        { error: `Authentication failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (!data.access_token) {
return NextResponse.json(
        { error: 'Invalid response from token endpoint - no access token received' },
        { status: 500 }
      );
    }

    // Return only the access token to the client
    return NextResponse.json({
      success: true,
      token: data.access_token,
      // Optionally include token expiry if provided
      expires_in: data.expires_in
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: `Server error: ${error.message || 'Unknown error occurred'}` },
      { status: 500 }
    );
  }
}