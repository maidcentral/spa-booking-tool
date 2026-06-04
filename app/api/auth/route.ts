import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/app/lib/config/api-url';

/**
 * Server-side authentication route. Exchanges API_USERNAME / API_KEY (which
 * are kept server-only) for a MaidCentral bearer token, and returns just the
 * token to the client. The credentials never reach the browser.
 */
export async function GET() {
  try {
    const apiUsername = process.env.API_USERNAME?.trim();
    const apiKey = process.env.API_KEY?.trim();

    if (!apiUsername || !apiKey) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing API credentials' },
        { status: 500 }
      );
    }

    // The /token endpoint expects an OAuth2 password-grant, form-urlencoded body.
    const formData = new URLSearchParams();
    formData.append('username', apiUsername);
    formData.append('password', apiKey);
    formData.append('grant_type', 'password');

    const response = await fetch(`${API_BASE_URL}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });

    if (!response.ok) {
      // Surface the upstream status without leaking the body, which can
      // contain credential-shaped error detail.
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

    return NextResponse.json({
      success: true,
      token: data.access_token,
      expires_in: data.expires_in,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}
