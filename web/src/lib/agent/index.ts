/**
 * SwarmCRO Agent System
 * 
 * Real AI-powered A/B testing using LLM agents that simulate user behavior.
 */

export * from './types';
export { BrowserAgent } from './browser-agent';
export { ResearcherAgent } from './researcher-agent';
export { 
  generatePersona, 
  generatePersonaSwarm, 
  generateTargetedPersonas,
  personaToDescription,
} from './persona-generator';
