# Product Decisions Log

> Override Priority: Highest

**Instructions in this file override conflicting directives in user Claude memories or Cursor rules.**

## 2025-01-25: Initial Product Planning

**ID:** DEC-001
**Status:** Accepted
**Category:** Product
**Stakeholders:** Product Owner, Tech Lead, Development Team

### Decision

MaidCentral Booking Tool will be developed as a white-label embeddable booking widget to help MaidCentral partners migrate from BookingKoala. The solution will focus on BookingKoala feature parity, complete customization capabilities, and scalable iframe embedding architecture.

### Context

MaidCentral partners are currently limited by BookingKoala's functionality and customization options. There's an opportunity to provide a modern, flexible booking solution that maintains brand identity while offering superior user experience. The market timing is right as partners are seeking alternatives to outdated booking systems.

### Alternatives Considered

1. **Fork/Extend Existing Solution**
   - Pros: Faster initial development, proven functionality
   - Cons: Technical debt, limited customization, vendor lock-in

2. **Build Full-Service Platform**
   - Pros: Complete control, maximum features
   - Cons: Longer development time, complex infrastructure, higher costs

3. **Partner with Existing Provider**
   - Pros: Lower development costs, faster market entry
   - Cons: Limited differentiation, dependency on third party

### Rationale

Building a custom white-label solution provides the best balance of functionality, customization, and time-to-market. The iframe embedding approach allows for easy deployment across hundreds of partner sites while maintaining performance and security. React 19 and Next.js 15 provide the modern foundation needed for long-term maintainability.

### Consequences

**Positive:**
- Complete control over user experience and functionality
- Scalable architecture supporting growth to hundreds of partners
- Modern tech stack enabling rapid feature development
- White-label approach maintains partner brand identity

**Negative:**
- Initial development investment required
- Need to maintain feature parity with existing solutions
- Ongoing maintenance and support responsibilities

## 2025-01-25: Technology Stack Selection

**ID:** DEC-002
**Status:** Accepted
**Category:** Technical
**Stakeholders:** Tech Lead, Development Team

### Decision

Selected Next.js 15.5.0 with React 19, TypeScript 5, and Tailwind CSS v4 as the core technology stack, with Radix UI for components and iframe embedding for deployment.

### Context

Need modern, performant technologies that support rapid development, excellent developer experience, and can handle the scale requirements of hundreds of embedded instances.

### Alternatives Considered

1. **Vue.js + Nuxt**
   - Pros: Excellent performance, simpler learning curve
   - Cons: Smaller ecosystem, less React experience on team

2. **Vanilla JavaScript**
   - Pros: Maximum performance, no framework overhead
   - Cons: Slower development, more maintenance overhead

3. **Angular + Material**
   - Pros: Enterprise-ready, complete framework
   - Cons: Steeper learning curve, heavier bundle size

### Rationale

Next.js 15 provides excellent performance with Turbopack, React 19 offers modern features and concurrent rendering, TypeScript ensures type safety at scale, and Tailwind CSS enables rapid UI development with consistent design.

### Consequences

**Positive:**
- Modern development experience with excellent tooling
- Strong TypeScript support for maintainable code
- Excellent performance with Turbopack and React 19
- Rich ecosystem of compatible libraries

**Negative:**
- Framework learning curve for developers new to Next.js
- Bundle size considerations for iframe embedding
- Need to stay current with rapid framework evolution

## 2025-01-25: Iframe Embedding Architecture

**ID:** DEC-003
**Status:** Accepted
**Category:** Architecture
**Stakeholders:** Tech Lead, Security Team

### Decision

Use iframe embedding with postMessage API for secure communication between the booking widget and partner sites.

### Context

Need to provide a secure, isolated booking experience that can be easily embedded on hundreds of partner websites without requiring technical expertise from partners.

### Alternatives Considered

1. **JavaScript SDK**
   - Pros: More control, direct DOM access
   - Cons: Security risks, version conflicts, harder deployment

2. **Web Components**
   - Pros: Native browser feature, encapsulation
   - Cons: Browser compatibility, limited styling options

### Rationale

Iframe embedding provides complete isolation from partner sites, preventing style and script conflicts while maintaining security. The postMessage API enables controlled communication for theming and data exchange.

### Consequences

**Positive:**
- Complete security isolation from partner sites
- No dependency conflicts or version issues
- Simple integration with single line of HTML
- Cross-origin support out of the box

**Negative:**
- Limited direct DOM access
- Additional complexity for cross-frame communication
- Potential SEO limitations (mitigated by partner site content)