# Spec Requirements Document

> Spec: Layout Toggle Feature
> Created: 2025-09-09

## Overview

Implement a configurable UI layout toggle that allows the booking tool to switch between multi-step wizard flow and single-page continuous scroll layout through an environment variable. This feature maintains the exact same visual design, fonts, and user experience while adapting the navigation pattern to support both stepped and continuous flow presentations.

## User Stories

### Partner Configuration Story

As a MaidCentral partner, I want to configure my booking widget layout preference through an environment variable, so that I can choose the navigation pattern that best fits my customer base and website design.

The partner will set `MULTI_STEP_LAYOUT=true` for the current multi-step wizard experience, or `MULTI_STEP_LAYOUT=false` for a single-page continuous scroll experience. Both layouts maintain identical visual styling, form fields, and API interactions, ensuring consistency regardless of the chosen layout.

### End User Experience Story

As a customer booking a cleaning service, I want to complete my booking through either a guided step-by-step process or a single continuous form, so that I can book services in the way that feels most natural to me.

When multi-step is enabled, users click "Continue" to navigate between distinct steps. When single-page is enabled, users scroll naturally through all sections with visual dividers, experiencing the same form fields and validations in a continuous flow.

## Spec Scope

1. **Environment Variable Configuration** - Add MULTI_STEP_LAYOUT boolean flag to control layout rendering mode
2. **Single-Page Layout Component** - Create continuous scroll version maintaining identical styling and functionality
3. **Section Dividers** - Implement visual separators between logical sections in single-page layout
4. **Real-time Validation** - Optimize field validation and price updates for immediate feedback in both layouts
5. **Layout Switching Logic** - Implement conditional rendering based on environment variable at build time

## Out of Scope

- Changes to existing UI design, fonts, colors, or visual styling
- Modifications to API calls or data flow
- Progress indicators for single-page layout
- Jump navigation between sections
- Mobile-specific layout adjustments
- Dynamic runtime switching between layouts

## Expected Deliverable

1. Environment variable MULTI_STEP_LAYOUT functioning correctly with true/false values
2. Multi-step layout (true) displays exactly as current implementation without any changes
3. Single-page layout (false) displays all booking steps in continuous scroll with section dividers and optimized real-time validation