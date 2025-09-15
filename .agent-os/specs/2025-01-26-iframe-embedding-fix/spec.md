# Spec Requirements Document

> Spec: Iframe Embedding Fix
> Created: 2025-01-26

## Overview

Fix the 500 Internal Server Error that occurs when embedding the MaidCentral booking tool as an iframe on external sites. Enable unrestricted cross-origin iframe embedding to support partner integration needs while maintaining URL parameter customization capabilities.

## User Stories

### Partner Website Integration

As a MaidCentral partner, I want to embed the booking tool on my website using an iframe, so that customers can book services directly without leaving my site.

The partner copies the provided iframe code with custom color parameters, adds it to their website HTML, and the booking tool loads seamlessly with their brand colors. Currently, attempting this results in a 500 error preventing the tool from loading.

### Marketing Page Embedding

As a marketing manager, I want to test the booking widget on various landing pages across different domains, so that I can optimize conversion rates.

The manager needs to quickly embed the booking tool on multiple test sites (localhost, staging, production) without configuration changes. The tool should accept theme parameters via URL for instant customization.

## Spec Scope

1. **Cross-Origin Support** - Enable the application to be embedded in iframes from any origin without restrictions
2. **Error Resolution** - Fix the 500 Internal Server Error occurring when URL parameters are present in iframe context
3. **Security Headers Configuration** - Properly configure X-Frame-Options and Content Security Policy headers
4. **URL Parameter Handling** - Ensure theme parameters (primary, foreground, background) work correctly in iframe context
5. **Development and Production Support** - Enable embedding in both HTTP (development) and HTTPS (production) environments

## Out of Scope

- Authentication or domain whitelisting (any domain should be able to embed)
- Advanced iframe communication/postMessage implementation
- Responsive sizing communication between parent and iframe
- Analytics or tracking of iframe embeds

## Expected Deliverable

1. The booking tool loads successfully when embedded as an iframe from any external domain
2. URL parameters for theming are properly parsed and applied within the iframe context
3. No console errors or 500 status codes when accessing the tool via iframe with parameters