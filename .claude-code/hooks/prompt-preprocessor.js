#!/usr/bin/env node

/**
 * Claude Code Prompt Preprocessor Hook
 * Automatically optimizes every prompt before execution
 */

const fs = require('fs');
const path = require('path');

// Load prompt templates
const templatesPath = path.join(__dirname, '../../prompts/templates.json');
const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));

// Project context that's always added
const PROJECT_CONTEXT = {
  framework: "Next.js 15.5.0",
  ui: "React 19.1.0",
  styling: "Tailwind CSS v4",
  components: "Metronic v9",
  typescript: "Strict mode",
  structure: {
    components: "/app/components",
    services: "/app/services",
    pages: "/app/pages"
  }
};

// Keywords that trigger specific agents
const AGENT_TRIGGERS = {
  uiux: ['component', 'design', 'layout', 'ui', 'ux', 'interface', 'button', 'form', 'modal', 'card', 'responsive', 'mobile', 'desktop'],
  performance: ['optimize', 'slow', 'performance', 'speed', 'fast', 'efficient', 'cache', 'bundle', 'lazy'],
  testing: ['test', 'spec', 'coverage', 'tdd', 'unit', 'integration', 'e2e', 'jest', 'vitest'],
  api: ['api', 'endpoint', 'route', 'rest', 'graphql', 'fetch', 'axios', 'request', 'response'],
  database: ['database', 'db', 'query', 'migration', 'schema', 'model', 'orm', 'sql']
};

/**
 * Main optimization function
 */
function optimizePrompt(userPrompt) {
  // Check for bypass prefixes
  if (userPrompt.startsWith('[raw]')) {
    return userPrompt.substring(5).trim();
  }
  
  if (userPrompt.startsWith('[minimal]')) {
    return addMinimalContext(userPrompt.substring(9).trim());
  }
  
  if (userPrompt.startsWith('[expert]')) {
    return userPrompt.substring(8).trim();
  }
  
  // Full optimization pipeline
  const intent = analyzeIntent(userPrompt);
  const template = selectTemplate(intent);
  const context = gatherContext(intent, userPrompt);
  const enhanced = enhancePrompt(userPrompt, template, context);
  const structured = structurePrompt(enhanced, intent);
  
  return structured;
}

/**
 * Analyze prompt intent
 */
function analyzeIntent(prompt) {
  const lowercasePrompt = prompt.toLowerCase();
  const intent = {
    type: 'general',
    agents: [],
    keywords: []
  };
  
  // Check for UI/UX intent
  if (AGENT_TRIGGERS.uiux.some(keyword => lowercasePrompt.includes(keyword))) {
    intent.type = 'ui_ux';
    intent.agents.push('ui-ux-specialist');
  }
  
  // Check for performance intent
  if (AGENT_TRIGGERS.performance.some(keyword => lowercasePrompt.includes(keyword))) {
    intent.type = 'performance';
    intent.agents.push('performance-optimizer');
  }
  
  // Check for testing intent
  if (AGENT_TRIGGERS.testing.some(keyword => lowercasePrompt.includes(keyword))) {
    intent.type = 'testing';
    intent.agents.push('test-specialist');
  }
  
  // Check for API intent
  if (AGENT_TRIGGERS.api.some(keyword => lowercasePrompt.includes(keyword))) {
    intent.type = 'api';
    intent.agents.push('api-developer');
  }
  
  // Check for database intent
  if (AGENT_TRIGGERS.database.some(keyword => lowercasePrompt.includes(keyword))) {
    intent.type = 'database';
    intent.agents.push('database-specialist');
  }
  
  // Extract keywords
  const allKeywords = Object.values(AGENT_TRIGGERS).flat();
  intent.keywords = allKeywords.filter(keyword => lowercasePrompt.includes(keyword));
  
  return intent;
}

/**
 * Select appropriate template
 */
function selectTemplate(intent) {
  if (templates[intent.type]) {
    return templates[intent.type];
  }
  
  // Map intent types to template keys
  const templateMap = {
    'ui_ux': 'ui_ux',
    'performance': 'performance_optimization',
    'testing': 'testing',
    'api': 'api_development',
    'database': 'database_operation'
  };
  
  return templates[templateMap[intent.type]] || templates.component_creation;
}

/**
 * Gather relevant context
 */
function gatherContext(intent, prompt) {
  const context = {
    ...PROJECT_CONTEXT,
    intent: intent.type,
    agents: intent.agents,
    keywords: intent.keywords,
    timestamp: new Date().toISOString()
  };
  
  // Add specific context based on intent
  if (intent.type === 'ui_ux') {
    context.designSystem = 'Metronic v9';
    context.accessibility = 'WCAG 2.1 AA';
    context.responsive = 'Mobile-first';
  }
  
  if (intent.type === 'performance') {
    context.metrics = 'Core Web Vitals';
    context.bundler = 'Turbopack';
    context.optimization = 'Code splitting, lazy loading';
  }
  
  if (intent.type === 'testing') {
    context.framework = 'Jest/Vitest';
    context.coverage = '80% minimum';
    context.pattern = 'AAA (Arrange, Act, Assert)';
  }
  
  return context;
}

/**
 * Enhance prompt with template and context
 */
function enhancePrompt(prompt, template, context) {
  let enhanced = prompt;
  
  // Add template enhancements
  if (template && template.enhancements) {
    enhanced += '\n\nAdditional Requirements:';
    template.enhancements.forEach(enhancement => {
      enhanced += `\n- ${enhancement}`;
    });
  }
  
  // Add context information
  enhanced += '\n\nProject Context:';
  enhanced += `\n- Framework: ${context.framework}`;
  enhanced += `\n- UI Library: ${context.ui}`;
  enhanced += `\n- Styling: ${context.styling}`;
  enhanced += `\n- Component Library: ${context.components}`;
  
  if (context.designSystem) {
    enhanced += `\n- Design System: ${context.designSystem}`;
  }
  
  if (context.accessibility) {
    enhanced += `\n- Accessibility: ${context.accessibility}`;
  }
  
  // Add file structure hints
  enhanced += '\n\nFile Structure:';
  enhanced += `\n- Components: ${context.structure.components}`;
  enhanced += `\n- Services: ${context.structure.services}`;
  enhanced += `\n- Pages: ${context.structure.pages}`;
  
  return enhanced;
}

/**
 * Structure the final prompt
 */
function structurePrompt(enhanced, intent) {
  let structured = '## Optimized Request\n\n';
  
  // Add agent delegation if needed
  if (intent.agents.length > 0) {
    structured += `**Recommended Agents**: ${intent.agents.join(', ')}\n\n`;
  }
  
  // Add the enhanced prompt
  structured += enhanced;
  
  // Add verification steps
  structured += '\n\n## Verification Steps:';
  structured += '\n1. Ensure TypeScript types are properly defined';
  structured += '\n2. Verify code follows project conventions';
  structured += '\n3. Check for accessibility compliance';
  structured += '\n4. Test responsive behavior';
  structured += '\n5. Run linting and fix any issues';
  
  return structured;
}

/**
 * Minimal context addition (for [minimal] prefix)
 */
function addMinimalContext(prompt) {
  return `${prompt}

Tech Stack: Next.js 15.5.0, React 19.1.0, TypeScript, Tailwind CSS v4, Metronic v9`;
}

// Read input from stdin
let input = '';
process.stdin.on('data', chunk => {
  input += chunk;
});

process.stdin.on('end', () => {
  const optimized = optimizePrompt(input.trim());
  console.log(optimized);
});

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error('Error in prompt preprocessor:', error);
  // Output original prompt on error
  console.log(input);
  process.exit(0);
});