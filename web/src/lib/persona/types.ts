/**
 * Persona Types
 * 
 * Defines the structure of user personas that drive agent behavior.
 * Each persona represents a distinct type of user with specific
 * characteristics that influence how they interact with a page.
 */

/**
 * Core demographics that shape user expectations and behavior
 */
export interface PersonaDemographics {
  /** Age range affects tech familiarity and patience */
  ageRange: '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
  
  /** Tech comfort level */
  techSavviness: 'low' | 'medium' | 'high';
  
  /** Primary device - affects viewport and interaction patterns */
  device: 'mobile' | 'tablet' | 'desktop';
  
  /** Connection quality - affects patience with load times */
  connectionSpeed: 'slow' | 'moderate' | 'fast';
}

/**
 * Behavioral traits that determine interaction patterns
 */
export interface PersonaBehavior {
  /** How quickly they give up (1-10, 10 = very patient) */
  patience: number;
  
  /** How thoroughly they read content (1-10, 10 = reads everything) */
  thoroughness: number;
  
  /** How likely to click on things (1-10, 10 = clicks everything) */
  clickiness: number;
  
  /** How fast they scroll (1-10, 10 = speed scroller) */
  scrollSpeed: number;
  
  /** Likelihood of rage clicking when frustrated (1-10) */
  frustrationTolerance: number;
  
  /** How skeptical of marketing claims (1-10, 10 = very skeptical) */
  skepticism: number;
}

/**
 * The user's goals and context for visiting the page
 */
export interface PersonaIntent {
  /** Primary goal (what they're trying to accomplish) */
  goal: string;
  
  /** How urgent is their need (1-10, 10 = very urgent) */
  urgency: number;
  
  /** Prior knowledge about the product/service */
  priorKnowledge: 'none' | 'some' | 'expert';
  
  /** What would make them convert */
  conversionTriggers: string[];
  
  /** What would make them leave */
  dealbreakers: string[];
}

/**
 * Complete persona definition
 */
export interface Persona {
  /** Unique identifier */
  id: string;
  
  /** Human-readable name for the persona */
  name: string;
  
  /** Brief description of who this person is */
  description: string;
  
  /** Demographic characteristics */
  demographics: PersonaDemographics;
  
  /** Behavioral patterns */
  behavior: PersonaBehavior;
  
  /** Goals and context */
  intent: PersonaIntent;
  
  /** Optional: specific instructions for the browsing agent */
  agentInstructions?: string;
}

/**
 * Request to generate personas for an experiment
 */
export interface PersonaGenerationRequest {
  /** Description of the target audience */
  targetAudience: string;
  
  /** What the page is selling/offering */
  productContext: string;
  
  /** What counts as a conversion */
  conversionGoal: string;
  
  /** Number of personas to generate */
  count: number;
  
  /** Whether to include edge cases (frustrated users, etc.) */
  includeEdgeCases?: boolean;
}

/**
 * Preset persona templates
 */
export type PersonaPreset = 
  | 'impatient-mobile'      // Quick scanner on phone, low patience
  | 'thorough-researcher'   // Reads everything, compares options
  | 'skeptical-buyer'       // Needs proof, looks for red flags
  | 'impulse-shopper'       // Fast decisions, triggered by urgency
  | 'price-conscious'       // Hunting for deals, compares prices
  | 'tech-confused'         // Struggles with complex UIs
  | 'accessibility-user'    // Uses assistive technology
  | 'return-visitor'        // Has been here before, knows layout
  | 'distracted-browser'    // Multitasking, easily interrupted
  | 'power-user';           // Knows shortcuts, impatient with slow UX
