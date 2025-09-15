# MaidCentral Partner Setup Guide

This guide will help you set up your own instance of the MaidCentral Booking Tool for your cleaning service business.

## Prerequisites

- Node.js 18+ installed
- Valid MaidCentral partner credentials
- Access to your registered phone for SMS verification

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/your-org/maidcentral-booking-tool.git
cd maidcentral-booking-tool
npm install
```

### 2. Configure Credentials

1. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your partner credentials:
   ```env
   NEXT_PUBLIC_API_BASE_URL=https://api.maidcentral.net
   NEXT_PUBLIC_API_MOCKING_ENABLED=false

   MAIDCENTRAL_EMAIL=your-partner-email@example.com
   MAIDCENTRAL_PASSWORD=your-secure-password
   MAIDCENTRAL_PHONE_CODE=
   ```

### 3. Initial Authentication Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. **Important**: Leave `MAIDCENTRAL_PHONE_CODE` empty initially. The first time you run the app, it will:
   - Attempt to authenticate with your email/password
   - Trigger a 6-digit SMS code to be sent to your registered phone
   - Show an error message indicating the phone code is required

3. Check your phone for the SMS code (usually arrives within 30 seconds)

4. Update `.env.local` with the received code:
   ```env
   MAIDCENTRAL_PHONE_CODE=123456
   ```

5. Refresh the page - authentication should now succeed!

## Understanding the Authentication Flow

The booking tool uses a secure 2-step authentication process:

### Step 1: Token Request
- Sends your credentials to `/token` endpoint
- Returns a 400 error (this is expected!)
- Triggers SMS code to your registered phone

### Step 2: Login with Code
- Sends credentials + SMS code to `/api/auth/login`
- Returns bearer token with 12-hour expiration
- Token is automatically refreshed as needed

## Development vs Production

### Development Mode
Set `NEXT_PUBLIC_API_MOCKING_ENABLED=true` to use mock data without authentication. Useful for:
- Frontend development
- Testing UI components
- Demonstrating the booking flow

### Production Mode
Set `NEXT_PUBLIC_API_MOCKING_ENABLED=false` to use real MaidCentral API with authentication.

## Security Best Practices

### Environment Variables
- **Never** commit `.env.local` to version control
- Keep credentials secure and don't share them
- Use different credentials for different environments

### Server-Side Authentication
- All authentication happens server-side via Next.js API routes
- Credentials are never exposed to the browser
- Tokens are cached securely on the server

## Obtaining MaidCentral Credentials

To get your partner credentials:

1. **Contact MaidCentral Support**
   - Email: support@maidcentral.com
   - Phone: [Support Phone Number]
   - Mention you need "API partner credentials"

2. **Provide Business Information**
   - Business name and location
   - Existing MaidCentral account details (if any)
   - Intended use (website booking integration)

3. **Phone Number Verification**
   - Ensure the phone number on file can receive SMS
   - This number will be used for 2FA codes

## Troubleshooting

### "Missing phone code" Error
**Problem**: App shows "Missing phone code" error

**Solution**: 
1. Check that `MAIDCENTRAL_PHONE_CODE` is set in `.env.local`
2. Verify the code is correct (6 digits)
3. Code expires after 15 minutes - request a new one if needed

### "Authentication failed" Error
**Problem**: Invalid credentials error

**Solution**:
1. Verify email/password are correct in `.env.local`
2. Check if your MaidCentral account is active
3. Contact support if credentials should be working

### "Network Error" Issues
**Problem**: Cannot reach MaidCentral API

**Solution**:
1. Check internet connection
2. Verify `NEXT_PUBLIC_API_BASE_URL=https://api.maidcentral.net`
3. Check if MaidCentral API is down (contact support)

### Phone Code Not Received
**Problem**: SMS code not arriving

**Solution**:
1. Wait up to 2 minutes (codes can be delayed)
2. Check spam/blocked messages
3. Verify phone number on file with MaidCentral support
4. Try requesting a new code by restarting the app

## Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Variables for Production

Set these environment variables on your hosting platform:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.maidcentral.net
MAIDCENTRAL_EMAIL=your-partner-email@example.com
MAIDCENTRAL_PASSWORD=your-secure-password
MAIDCENTRAL_PHONE_CODE=123456
```

**Note**: You may need to update the phone code periodically if tokens expire completely.

### Recommended Hosting Platforms

- **Vercel** (recommended for Next.js)
- **Netlify**
- **AWS Amplify**
- **Railway**

## Embedding the Booking Widget

Once deployed, you can embed the booking tool in your website:

```html
<iframe 
  src="https://your-booking-tool.vercel.app" 
  width="100%" 
  height="800"
  frameborder="0">
</iframe>
```

## API Rate Limits

- Token requests: 5 per hour per IP
- Booking submissions: 100 per hour per partner
- General API calls: 1000 per hour per partner

Contact MaidCentral support if you need higher limits.

## Support

### Self-Service
- Check this documentation
- Review browser console for error details
- Verify environment variables are set correctly

### Contact Support
- **MaidCentral API Issues**: support@maidcentral.com
- **Booking Tool Issues**: Create issue on GitHub repository
- **Integration Help**: Contact your MaidCentral account manager

## Updates and Maintenance

### Updating the Booking Tool

```bash
git pull origin main
npm install
npm run build
```

### Monitoring

The booking tool includes built-in logging. Check your hosting platform's logs for:
- Authentication failures
- API errors
- Performance issues

### Token Refresh

Tokens automatically refresh every 11 hours. If you see authentication errors:
1. Check your hosting platform is still running
2. Verify credentials haven't changed
3. Check if phone code needs updating

---

## Quick Reference

| Environment Variable | Purpose | Required |
|---------------------|---------|----------|
| `NEXT_PUBLIC_API_BASE_URL` | MaidCentral API endpoint | Yes |
| `NEXT_PUBLIC_API_MOCKING_ENABLED` | Use mock data | No |
| `MAIDCENTRAL_EMAIL` | Partner email | Yes |
| `MAIDCENTRAL_PASSWORD` | Partner password | Yes |
| `MAIDCENTRAL_PHONE_CODE` | SMS verification code | Yes |
| `PARTNER_ID` | Partner identifier | No |

**Need Help?** Contact support@maidcentral.com or create a GitHub issue.