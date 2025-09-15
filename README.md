# MaidCentral Booking Tool

A GitHub-cloneable Next.js booking form that integrates with the MaidCentral API to provide a professional cleaning service booking experience.

## Quick Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd maidcentral-booking-tool
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env.local` file in the root directory with your MaidCentral API credentials:
   ```bash
   # MaidCentral API Configuration
   API_USERNAME=your_maidcentral_email_api_username
   API_KEY=your_maidcentral_api_key

   # Layout Configuration (optional)
   NEXT_PUBLIC_MULTI_STEP_LAYOUT=true
   ```

   **Important:** Never commit your `.env.local` file to version control. Add it to your `.gitignore`.

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your booking tool:**
   Visit [http://localhost:3000](http://localhost:3000) to access your booking form.

## Features

- **Direct API Integration:** Makes direct calls to MaidCentral API without middleware
- **Interactive Login:** User-friendly login form with real-time SMS 2FA
- **Professional UI:** Modern, responsive booking form with accessibility features
- **Service Customization:** Real pricing, extras, and scheduling options
- **Lead Generation:** Integrates with MaidCentral's lead management system

## How It Works

1. **Setup:** Configure your MaidCentral API credentials in the `.env.local` file
2. **Authentication:** System automatically authenticates using your API credentials
3. **Service Loading:** Booking form loads your available services and pricing
4. **Customer Booking:** Customers can select services and submit booking requests
5. **Lead Integration:** Bookings are automatically sent to your MaidCentral account

## Troubleshooting

### Environment Configuration Issues
- Ensure your `.env.local` file is in the root directory
- Verify your MaidCentral API credentials are correct
- Check that all required environment variables are set
- Restart the development server after changing environment variables

### Authentication Issues
- Verify your `API_USERNAME` and `API_KEY` are valid
- Ensure your MaidCentral account has proper API access
- Check the browser console for detailed authentication error messages
- For phone code method: ensure `MAIDCENTRAL_PHONE_CODE` is current

### Services Not Loading
- Confirm your MaidCentral account has active services/scope groups
- Check that authentication is successful (look for "Authentication successful" in console)
- Verify API endpoints are accessible from your network
- Review browser console for API error details

## Development Commands

```bash
# Development server
npm run dev

# Build for production  
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Technical Stack

- **Framework:** Next.js 15.5.0 with App Router
- **UI Library:** React 19
- **Language:** TypeScript 5  
- **Styling:** Tailwind CSS v4
- **Build Tool:** Turbopack

