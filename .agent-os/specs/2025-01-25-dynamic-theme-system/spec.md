# Spec Requirements Document

> Spec: Dynamic Theme System
> Created: 2025-01-25
> Status: Planning

## Overview

Implement a dynamic theming system that allows MaidCentral partners to customize the booking widget's colors through URL parameters passed to the iframe. This feature enables partners to maintain brand consistency across their websites without requiring separate deployments or configurations.

## User Stories

### Partner Brand Customization

As a MaidCentral partner, I want to customize the booking widget's colors to match my website's branding, so that the booking experience feels integrated and maintains my brand identity.

The partner will add URL parameters to the iframe src attribute specifying three color values: primary color (for buttons and highlights), foreground color (for card backgrounds), and background color (for the widget background). When the booking widget loads, it will parse these parameters and apply the custom colors throughout the interface. If any color is invalid or missing, the widget will use default colors for those values.

### Multi-Site Color Management

As a partner with multiple websites, I want to use different color schemes for the same booking widget on different sites, so that each site maintains its unique visual identity.

Each website can specify different color parameters in the iframe URL, allowing the same booking widget instance to adapt to different brand requirements. The colors are applied per-load based on the URL parameters, ensuring that each embedded instance reflects the appropriate branding without requiring separate configurations or deployments.

## Spec Scope

1. **URL Parameter Parsing** - Extract and validate hex color codes from iframe URL parameters for primary, foreground, and background colors
2. **Dynamic CSS Application** - Apply parsed colors to all relevant UI components throughout the booking widget
3. **Fallback System** - Implement default colors when parameters are missing or invalid
4. **Security Validation** - Sanitize and validate all color inputs to prevent XSS or injection attacks

## Out of Scope

- Real-time color updates via postMessage API
- Color persistence across sessions or in databases
- Support for RGB, RGBA, or CSS color names
- Theme presets or color palette generation
- Admin interface for theme management

## Expected Deliverable

1. Partners can customize widget colors by adding URL parameters to the iframe src (e.g., ?primaryColor=%23FF0000&foregroundColor=%23FFFFFF&backgroundColor=%23F5F5F5)
2. The booking widget displays with custom colors immediately upon loading, with all buttons, cards, and backgrounds reflecting the specified theme
3. Invalid or missing color parameters gracefully fall back to default theme colors without breaking the widget functionality

## Spec Documentation

- Tasks: @.agent-os/specs/2025-01-25-dynamic-theme-system/tasks.md
- Technical Specification: @.agent-os/specs/2025-01-25-dynamic-theme-system/sub-specs/technical-spec.md