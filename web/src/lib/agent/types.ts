/**
 * Core types for the SwarmCRO Agent System
 */

// Persona that drives agent behavior
export interface AgentPersona {
  id: string;
  demographics: {
    age: number;
    gender: 'male' | 'female' | 'other';
    income: 'low' | 'medium' | 'high';
    education: 'high_school' | 'college' | 'graduate';
    location: string;
  };
  psychographics: {
    techSavvy: number;      // 1-10
    priceSensitive: number; // 1-10
    brandLoyal: number;     // 1-10
    impulsive: number;      // 1-10
    cautious: number;       // 1-10
  };
  goals: string[];           // What they're trying to accomplish
  frustrations: string[];    // What annoys them
  behaviorPatterns: {
    scrollSpeed: 'slow' | 'medium' | 'fast';
    readingStyle: 'thorough' | 'skimmer' | 'scanner';
    decisionSpeed: 'quick' | 'deliberate' | 'hesitant';
  };
}

// Current state of an agent during a session
export interface AgentState {
  sessionId: string;
  persona: AgentPersona;
  currentUrl: string;
  pageContent: PageContent;
  scrollPosition: number;
  timeOnPage: number;      // ms
  actionsPerformed: AgentAction[];
  converted: boolean;
  exitReason?: string;
}

// Structured representation of page content
export interface PageContent {
  title: string;
  url: string;
  headings: { level: number; text: string; selector: string }[];
  paragraphs: { text: string; selector: string }[];
  buttons: { text: string; selector: string; type: 'primary' | 'secondary' | 'link' }[];
  forms: { id: string; fields: string[]; submitButton: string }[];
  images: { alt: string; selector: string }[];
  links: { text: string; href: string; selector: string }[];
  testimonials: { text: string; author?: string; selector: string }[];
  prices: { value: string; selector: string }[];
}

// Actions an agent can take
export type AgentActionType = 
  | 'scroll'
  | 'click'
  | 'hover'
  | 'type'
  | 'wait'
  | 'read'
  | 'leave';

export interface AgentAction {
  type: AgentActionType;
  target?: string;         // Selector or description
  value?: string;          // For type action
  timestamp: number;
  reasoning: string;       // Why the agent took this action
  duration?: number;       // ms
}

// Result of a single agent session
export interface AgentSessionResult {
  sessionId: string;
  persona: AgentPersona;
  variant: string;         // 'control' or variant id
  startTime: number;
  endTime: number;
  actions: AgentAction[];
  converted: boolean;
  conversionType?: 'click_cta' | 'submit_form' | 'purchase' | 'signup';
  exitReason: string;
  metrics: {
    timeOnPage: number;
    scrollDepth: number;
    elementsInteracted: number;
    hesitationCount: number;
  };
}

// A/B Test Variant
export interface Variant {
  id: string;
  name: string;
  description: string;
  changes: VariantChange[];
}

export interface VariantChange {
  type: 'modify' | 'add' | 'remove' | 'reorder';
  target: string;          // Selector
  property?: string;       // For modify
  newValue?: string;       // New content/style
  html?: string;           // For add
  position?: 'before' | 'after' | 'replace';
}

// Experiment configuration
export interface Experiment {
  id: string;
  name: string;
  url: string;
  hypothesis: string;
  control: Variant;
  variants: Variant[];
  sampleSize: number;
  trafficAllocation: Record<string, number>;  // variant_id -> percentage
  conversionGoal: string;
  status: 'draft' | 'running' | 'completed';
  results?: ExperimentResults;
}

// Experiment results
export interface ExperimentResults {
  totalSessions: number;
  variantResults: Record<string, {
    sessions: number;
    conversions: number;
    conversionRate: number;
    avgTimeOnPage: number;
    avgScrollDepth: number;
    bounceRate: number;
  }>;
  winner?: string;
  confidence: number;
  statisticalSignificance: boolean;
  insights: string[];
}

// Researcher Agent output
export interface ResearcherAnalysis {
  experimentId: string;
  summary: string;
  keyFindings: string[];
  hypotheses: {
    hypothesis: string;
    rationale: string;
    expectedImpact: 'low' | 'medium' | 'high';
    proposedVariant: Variant;
  }[];
  recommendations: string[];
}
