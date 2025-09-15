# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL API RULES

**NEVER make up or assume API endpoints exist!**
- ALL external API endpoints must be confirmed by the user
- ONLY use endpoints documented in `/API_ENDPOINTS.md`
- When an endpoint is needed, ASK the user for the correct endpoint
- Do NOT guess endpoint paths based on patterns or conventions
- All MaidCentral API endpoints must be explicitly provided

## Project Overview

MaidCentral Booking Tool - A Next.js 15.5.0 application built with React 19, TypeScript 5, and Tailwind CSS v4 for managing booking functionality.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Architecture

### Technology Stack
- **Framework**: Next.js 15.5.0 with App Router
- **UI Library**: React 19.1.0
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4 with PostCSS
- **Build Tool**: Turbopack (enabled for faster builds)
- **Code Quality**: ESLint v9 with Next.js configuration

### Project Structure
```
/app                 # Next.js App Router directory
  ├── layout.tsx     # Root layout wrapper
  ├── page.tsx       # Home page component
  ├── globals.css    # Global styles with Tailwind imports
  ├── components/    # Reusable React components
  ├── pages/         # Additional page components
  └── services/      # Business logic and API services
```

### Key Conventions
- **Import Alias**: Use `@/*` for root-level imports (e.g., `import { Component } from '@/app/components/Component'`)
- **TypeScript**: Strict mode enabled, ensure proper typing for all components and functions
- **Styling**: Use Tailwind CSS utility classes; custom styles in component-specific CSS modules if needed
- **Components**: Place in `/app/components/` with PascalCase naming

### Development Notes
- Turbopack is enabled for faster development builds
- CSS uses modern Tailwind v4 syntax with `@import "tailwindcss"`
- No test framework currently configured - consider adding Jest or Vitest when needed
- Project uses React 19 and Next.js 15 - ensure compatibility when adding dependencies

## Agent Workflow System

### Overview
This project includes specialized AI agents to enhance development productivity and code quality. The workflow automatically optimizes prompts and delegates tasks to specialized agents.

### Available Agents

#### 1. UI/UX Specialist Agent
- **Purpose**: Creates beautiful, accessible UI components using Next.js and Metronic
- **Activation**: Automatically triggered by UI-related keywords (component, design, layout, etc.)
- **Features**: Figma integration, accessibility compliance, responsive design patterns
- **Documentation**: `/agents/ui-ux-specialist.md`

#### 2. Prompt Optimizer Agent  
- **Purpose**: Automatically enhances all prompts for maximum clarity and context
- **Activation**: Runs on every prompt before execution (can bypass with `[raw]` prefix)
- **Features**: Context enrichment, task decomposition, requirement clarification
- **Documentation**: `/agents/prompt-optimizer.md`

#### 3. Workflow Orchestrator
- **Purpose**: Coordinates multiple agents for complex multi-step tasks
- **Features**: Parallel execution, conditional routing, error recovery
- **Documentation**: `/agents/workflow-orchestrator.md`

### Agent Commands
```bash
# Run specific agents
npm run agent:ui          # UI/UX specialist
npm run agent:optimize     # Prompt optimizer
npm run agent:workflow     # Workflow orchestrator

# Start MCP servers
npm run mcp:start         # All MCP servers
npm run mcp:figma         # Figma integration
npm run mcp:browser       # Browser automation

# Execute workflows
npm run workflow:component     # UI component creation
npm run workflow:feature      # Feature implementation
npm run workflow:optimize     # Performance optimization
```

### Workflow Automation

#### Automatic Prompt Optimization
Every prompt you submit is automatically:
1. Analyzed for intent and context
2. Enhanced with project-specific information
3. Broken down into actionable subtasks
4. Enriched with technical requirements

To bypass optimization, prefix your prompt with:
- `[raw]` - Skip all optimization
- `[minimal]` - Light optimization only
- `[expert]` - Assume context is known

#### UI Component Workflow
When creating UI components, the system:
1. Optimizes your prompt with UI/UX requirements
2. Researches current design trends
3. Generates accessible, performant components
4. Follows Metronic design patterns
5. Includes proper TypeScript types
6. Adds loading and error states

### Configuration

#### MCP Servers
Configured in `.mcp.json`:
- **figma**: Design-to-code conversion
- **browser**: UI testing automation
- **prompt-optimizer**: Prompt enhancement
- **web-research**: UI/UX trend research
- **git**: Workflow automation

#### Environment Variables
Required environment variables in `.env.local`:
```bash
FIGMA_PERSONAL_ACCESS_TOKEN=    # For Figma integration
ANTHROPIC_API_KEY=               # For prompt optimization
```

See `.env.example` for complete list.

### Prompt Templates
Pre-configured templates in `/prompts/templates.json` for:
- Component creation
- Bug fixes
- Feature implementation
- Refactoring
- Testing
- API development
- Performance optimization

### Best Practices

#### Working with Agents
1. Let the prompt optimizer enhance your requests automatically
2. Use specific keywords to trigger specialized agents
3. For complex tasks, let the workflow orchestrator handle coordination
4. Review agent documentation in `/agents/` for capabilities

#### UI/UX Development
1. Reference Figma designs when available
2. Follow Metronic component patterns
3. Ensure WCAG 2.1 AA accessibility
4. Test responsive layouts
5. Include loading and error states

#### Performance Considerations
1. Agents run in parallel when possible
2. Results are cached to avoid redundant work
3. MCP servers start on-demand
4. Workflows have built-in retry logic