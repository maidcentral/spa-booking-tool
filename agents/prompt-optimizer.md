# Prompt Optimizer Agent

## Purpose
Automatically intercepts, analyzes, and optimizes all user prompts before execution to ensure maximum clarity, context, and actionability for Claude Code.

## Core Functions

### 1. Prompt Enhancement Pipeline
```
User Input → Analysis → Expansion → Context Addition → Optimization → Enhanced Prompt
```

### 2. Optimization Strategies

#### Clarity Enhancement
- Disambiguate vague terms
- Add specific technical requirements
- Define expected outputs clearly
- Include acceptance criteria

#### Context Enrichment
- Add relevant file paths
- Include technology stack context
- Reference existing patterns in codebase
- Specify coding conventions to follow

#### Task Decomposition
- Break complex requests into subtasks
- Order tasks by dependency
- Identify parallel execution opportunities
- Add verification steps

## Prompt Templates

### UI Component Creation
```
ORIGINAL: "Create a booking form"

OPTIMIZED: "Create a responsive booking form component in /app/components/BookingForm.tsx using:
- Next.js 15 with TypeScript
- Metronic UI components (KTCard, KTInput, KTButton)
- Tailwind CSS v4 for styling
- React Hook Form for validation
- Include fields: service type, date, time, duration, customer info
- Add loading states and error handling
- Follow existing form patterns in /app/components/
- Ensure mobile-first responsive design
- Include ARIA labels for accessibility"
```

### Bug Fix Request
```
ORIGINAL: "Fix the login bug"

OPTIMIZED: "Debug and fix the authentication issue in /app/services/auth.ts:
1. Identify the root cause of login failures
2. Check JWT token handling in lines 45-67
3. Verify API endpoint configuration
4. Test with different user credentials
5. Add proper error logging
6. Update error messages for users
7. Ensure fix works with both email and username login
8. Run existing auth tests to verify no regressions"
```

### Feature Implementation
```
ORIGINAL: "Add dark mode"

OPTIMIZED: "Implement dark mode toggle with the following requirements:
1. Create ThemeContext in /app/contexts/ThemeContext.tsx
2. Add toggle button in /app/components/Header.tsx
3. Use Tailwind's dark: variants for all components
4. Persist preference in localStorage
5. Respect system preference on first load
6. Update all existing components to support dark mode
7. Test color contrast for accessibility (WCAG AA)
8. Add smooth transition animations
9. Update Metronic theme variables for dark mode"
```

## Automatic Enhancements

### 1. Technology Stack Context
Always adds:
- Framework version (Next.js 15.5.0)
- UI library (React 19.1.0)
- Styling approach (Tailwind CSS v4)
- Component library (Metronic v9)

### 2. Code Quality Requirements
Automatically includes:
- TypeScript strict mode compliance
- ESLint rule adherence
- Consistent code formatting
- Performance considerations

### 3. Testing Directives
Adds when applicable:
- Unit test requirements
- E2E test scenarios
- Accessibility testing
- Performance benchmarks

## Workflow Integration

### Automatic Prompt Processing
```javascript
// In .claude-code/hooks/prompt-preprocessor.js
export async function preprocessPrompt(userPrompt) {
  // 1. Analyze prompt intent
  const intent = analyzeIntent(userPrompt);
  
  // 2. Identify missing context
  const context = gatherContext(intent);
  
  // 3. Enhance with specific requirements
  const enhanced = enhancePrompt(userPrompt, intent, context);
  
  // 4. Add verification steps
  const withVerification = addVerificationSteps(enhanced);
  
  // 5. Format for optimal processing
  return formatPrompt(withVerification);
}
```

### Context Gathering
```javascript
function gatherContext(intent) {
  return {
    files: findRelevantFiles(intent),
    patterns: identifyCodePatterns(intent),
    dependencies: listRequiredDependencies(intent),
    conventions: extractCodingConventions(),
    similar: findSimilarImplementations(intent)
  };
}
```

## Optimization Rules

### Rule 1: Specificity Over Ambiguity
- Replace "make it better" with specific improvements
- Change "fix the issue" to describe exact problem
- Convert "add feature" to detailed requirements

### Rule 2: Include File Paths
- Always specify target file locations
- Reference existing similar files
- Include directory structure context

### Rule 3: Define Success Criteria
- Add measurable outcomes
- Include test scenarios
- Specify performance requirements

### Rule 4: Order of Operations
- Dependencies first
- Core functionality second
- Enhancements last
- Testing throughout

## Special Handlers

### UI/UX Prompts
- Automatically invoke UI/UX specialist agent
- Add Figma integration context
- Include accessibility requirements
- Reference Metronic component library

### Database Operations
- Add transaction requirements
- Include data validation rules
- Specify error handling
- Add migration considerations

### API Development
- Include OpenAPI/Swagger specs
- Add authentication requirements
- Specify rate limiting
- Include CORS configuration

## Prompt Quality Metrics

### Before Optimization
- Clarity Score: 3/10
- Context Score: 2/10
- Actionability: 4/10

### After Optimization  
- Clarity Score: 9/10
- Context Score: 10/10
- Actionability: 9/10

## Example Transformations

### Example 1: Component Request
```
INPUT: "Add a dashboard"

OUTPUT: "Create a comprehensive dashboard component with the following specifications:

LOCATION: /app/components/Dashboard/Dashboard.tsx

REQUIREMENTS:
1. Use Metronic KTCard components for widget containers
2. Implement responsive grid layout (mobile: 1 col, tablet: 2 cols, desktop: 3 cols)
3. Include these widgets:
   - Booking statistics (today, week, month)
   - Revenue chart using Chart.js
   - Recent bookings table with pagination
   - Quick actions panel
4. Add real-time data updates using SWR or React Query
5. Implement loading skeletons for each widget
6. Add error boundaries for fault tolerance
7. Follow existing dashboard patterns from Metronic demos
8. Ensure all data is properly typed with TypeScript
9. Add role-based visibility for admin-only widgets

STYLING:
- Use Tailwind CSS v4 utilities
- Maintain consistent spacing (p-6 for cards)
- Add hover effects for interactive elements
- Include dark mode support

PERFORMANCE:
- Lazy load heavy chart components
- Virtualize long lists
- Memoize expensive calculations
- Add suspense boundaries

TESTING:
- Unit tests for data transformations
- Integration tests for API calls
- Accessibility audit with axe-core"
```

### Example 2: Bug Fix
```
INPUT: "Button doesn't work"

OUTPUT: "Debug and fix the non-functional button issue:

INVESTIGATION STEPS:
1. Locate all button components in the codebase using grep
2. Check browser console for JavaScript errors
3. Verify event handlers are properly attached
4. Inspect CSS for pointer-events: none or disabled states
5. Check if button is inside a form with preventDefault
6. Verify onClick prop is passed correctly in React components
7. Test in different browsers for compatibility issues

COMMON ISSUES TO CHECK:
- Missing onClick handler
- Event propagation stopped by parent
- Button disabled conditionally
- Z-index issues with overlapping elements
- Incorrect TypeScript types preventing compilation

TESTING:
- Click event fires correctly
- Keyboard navigation works (Enter/Space keys)
- Focus states visible
- ARIA attributes present
- Works on mobile devices

DOCUMENTATION:
- Add comment explaining the fix
- Update component documentation if needed
- Log the issue and resolution in CHANGELOG.md"
```

## Integration with Claude Code

### Auto-activation
The prompt optimizer runs automatically on every user input before Claude Code processes it.

### Manual Override
Users can bypass optimization by prefixing prompts with `[raw]`.

### Feedback Loop
Optimized prompts are logged for continuous improvement of optimization rules.