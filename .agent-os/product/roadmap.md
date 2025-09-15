# Product Roadmap

## Phase 0: Already Completed

The following features have been implemented:

- [x] Multi-step booking form with service selection - Interactive UI for choosing cleaning services
- [x] Dynamic pricing calculator - Real-time price calculation with extras and frequency discounts
- [x] Form validation and error handling - Comprehensive client-side validation with user-friendly errors
- [x] Responsive layout with accessibility - Mobile-first design following WCAG guidelines
- [x] Mock data structure - Service categories, extras, and pricing models defined
- [x] Radix UI component integration - Professional UI components with consistent behavior
- [x] Framer Motion animations - Smooth transitions and micro-interactions

## Phase 1: Core MVP Enhancement

**Goal:** Complete the foundational booking functionality with API integration
**Success Criteria:** Partners can embed a fully functional booking widget with basic customization

### Features

- [ ] API Integration Layer - Connect to MaidCentral backend for dynamic configuration `M`
- [ ] Partner Configuration System - Support partner-specific services, pricing, and settings `L`
- [ ] Basic Theming System - Implement color and logo customization `M`
- [ ] Booking Submission Handler - Complete booking flow with API submission `S`
- [ ] Error Handling & Validation - Robust client-side and API error management `M`

### Dependencies

- MaidCentral API endpoints for partner configuration
- Partner onboarding process definition
- Iframe security and communication protocols

## Phase 2: Advanced Customization

**Goal:** Enable full white-label customization and BookingKoala feature parity
**Success Criteria:** Partners can fully customize the booking experience to match their brand

### Features

- [ ] Advanced Theming Engine - Complete CSS customization with theme editor `L`
- [ ] Dynamic Question Builder - Partner-configurable form fields and validation `L`
- [ ] Pricing Rules Engine - Complex pricing calculations with multiple discount types `XL`
- [ ] Scheduling Constraints - Partner-specific availability and booking rules `L`
- [ ] Multi-Language Support - Localization for different markets `M`
- [ ] Mobile Optimization - Enhanced mobile experience and touch interactions `M`

### Dependencies

- Theme editor UI/UX design
- Partner feedback on customization needs
- Localization strategy definition

## Phase 3: Scale and Integration

**Goal:** Support hundreds of partner deployments with enterprise features
**Success Criteria:** System handles 500+ concurrent partner instances with sub-second load times

### Features

- [ ] Performance Monitoring - Real-time analytics and performance tracking `M`
- [ ] A/B Testing Framework - Partner-level conversion optimization `L`
- [ ] Advanced Analytics - Booking funnel analysis and optimization insights `L`
- [ ] Webhook Integration - Real-time booking notifications to partner systems `M`
- [ ] Admin Dashboard - Partner self-service configuration portal `XL`
- [ ] White-Label Documentation - Partner implementation guides `S`

### Dependencies

- Analytics platform selection
- Admin portal design and architecture
- Partner training and support processes

## Effort Estimates

- `XS` - Extra Small (< 1 day)
- `S` - Small (1-2 days)
- `M` - Medium (3-5 days)
- `L` - Large (1-2 weeks)
- `XL` - Extra Large (3+ weeks)