import { NextRequest, NextResponse } from 'next/server'
import { LeadCreateRequest } from '@/app/types/api'

const API_BASE_URL = process.env.MAIDCENTRAL_API_URL || 'https://api.maidcentral.net'
const API_USERNAME = process.env.MAIDCENTRAL_USERNAME || ''
const API_PASSWORD = process.env.MAIDCENTRAL_PASSWORD || ''
const API_PHONE_CODE = process.env.MAIDCENTRAL_PHONE_CODE || ''

async function getAuthToken(): Promise<string | null> {
  try {
    // Step 1: Trigger SMS
    const tokenBody = new URLSearchParams({
      username: API_USERNAME,
      password: API_PASSWORD,
      grant_type: 'password'
    })
    
    try {
      await fetch(`${API_BASE_URL}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenBody.toString()
      })
    } catch (error) {
      // Expected to fail and trigger SMS
}
    
    // Step 2: Authenticate with phone code
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Email: API_USERNAME,
        Password: API_PASSWORD,
        RememberMe: true,
        code: API_PHONE_CODE,
        Provider: 'Phone Code'
      })
    })
    
    if (!loginResponse.ok) {
      throw new Error('Authentication failed')
    }
    
    const authData = await loginResponse.json()
    return authData.access_token
  } catch (error) {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: LeadCreateRequest = await request.json()
    
    // Validate required fields
    if (!body.FirstName || !body.LastName || !body.Email || !body.Phone || !body.PostalCode) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields' 
        },
        { status: 400 }
      )
    }
    
    // Get authentication token
    const token = await getAuthToken()
    
    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication failed' 
        },
        { status: 401 }
      )
    }
    
    // Make the API call to create/update lead
    const response = await fetch(`${API_BASE_URL}/api/Lead/CreateOrUpdate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        SendLeadEmail: body.SendLeadEmail ?? false,
        TriggerWebhook: body.TriggerWebhook ?? false,
        FirstName: body.FirstName,
        LastName: body.LastName,
        Email: body.Email,
        Phone: body.Phone,
        PostalCode: body.PostalCode
      })
    })
    
    const responseText = await response.text()
    
    if (!response.ok) {
      let errorMessage = 'Failed to create lead'
      try {
        const errorData = JSON.parse(responseText)
        errorMessage = errorData.Message || errorData.error || errorMessage
      } catch {
        // If response is not JSON, use default message
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage 
        },
        { status: response.status }
      )
    }
    
    // Parse response
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      // If response is not JSON, treat it as success with no data
      responseData = { success: true }
    }
    
    return NextResponse.json({
      success: true,
      data: responseData
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    )
  }
}