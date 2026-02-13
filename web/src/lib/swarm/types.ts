/**
 * Swarm Types
 * 
 * Defines types for browser agents, sessions, and experiment results.
 */

import type { Persona } from '../persona';

/**
 * Actions an agent can take on a page
 */
export type AgentActionType = 
  | 'navigate'
  | 'click'
  | 'scroll'
  | 'hover'
  | 'type'
  | 'wait'
  | 'read'
  | 'leave'
  | 'convert';

/**
 * A single action taken by an agent
 */
export interface AgentAction {
  /** Type of action */
  type: AgentActionType;
  
  /** Target element (CSS selector or description) */
  target?: string;
  
  /** Additional details */
  details?: string;
  
  /** Timestamp */
  timestamp: number;
  
  /** Duration of action in ms */
  durationMs?: number;
  
  /** Agent's reasoning for this action */
  reasoning?: string;
}

/**
 * Metrics collected during a browsing session
 */
export interface SessionMetrics {
  /** Total time on page in ms */
  timeOnPage: number;
  
  /** Maximum scroll depth in pixels */
  scrollDepth: number;
  
  /** Maximum scroll depth as percentage of page */
  scrollDepthPercent: number;
  
  /** Number of clicks */
  clickCount: number;
  
  /** Number of hover events */
  hoverCount: number;
  
  /** Time spent reading (estimated from pauses) */
  readTimeMs: number;
  
  /** Number of times user hesitated before acting */
  hesitationCount: number;
  
  /** Number of rage clicks (rapid repeated clicks) */
  rageClicks: number;
  
  /** Elements that received attention */
  elementsEngaged: string[];
  
  /** Page load time in ms */
  loadTimeMs: number;
}

/**
 * Result of a single agent session
 */
export interface AgentSession {
  /** Unique session ID */
  id: string;
  
  /** Persona used for this session */
  persona: Persona;
  
  /** Variant ID (control, variant_a, etc.) */
  variantId: string;
  
  /** URL browsed */
  url: string;
  
  /** All actions taken */
  actions: AgentAction[];
  
  /** Collected metrics */
  metrics: SessionMetrics;
  
  /** Did the agent convert? */
  converted: boolean;
  
  /** What triggered conversion (if applicable) */
  conversionTrigger?: string;
  
  /** Why the agent left (if didn't convert) */
  exitReason?: string;
  
  /** Agent's overall impression */
  impression?: 'positive' | 'neutral' | 'negative';
  
  /** Qualitative feedback from agent */
  feedback?: string;
  
  /** Session start time */
  startedAt: number;
  
  /** Session end time */
  endedAt: number;
  
  /** Any errors during session */
  errors?: string[];
}

/**
 * Configuration for a single agent run
 */
export interface AgentRunConfig {
  /** URL to browse */
  url: string;
  
  /** Persona to simulate */
  persona: Persona;
  
  /** Variant ID for tracking */
  variantId: string;
  
  /** CSS/JS changes to inject (for variants) */
  changes?: {
    css?: string;
    js?: string;
  };
  
  /** What counts as a conversion */
  conversionGoal: ConversionGoal;
  
  /** Maximum session duration in seconds */
  maxDurationSec?: number;
  
  /** Whether to capture screenshots */
  captureScreenshots?: boolean;
}

/**
 * Definition of what counts as a conversion
 */
export interface ConversionGoal {
  /** Type of conversion */
  type: 'click' | 'submit' | 'navigate' | 'custom';
  
  /** Target selector or URL pattern */
  target: string;
  
  /** Human-readable description */
  description: string;
}

/**
 * Configuration for a swarm experiment
 */
export interface ExperimentConfig {
  /** Unique experiment ID */
  id: string;
  
  /** Experiment name */
  name: string;
  
  /** URL to test */
  url: string;
  
  /** Variants to test */
  variants: ExperimentVariant[];
  
  /** Conversion goal */
  conversionGoal: ConversionGoal;
  
  /** Personas to use */
  personas: Persona[];
  
  /** Sessions per variant */
  sessionsPerVariant: number;
  
  /** Maximum concurrent sessions */
  maxConcurrent?: number;
}

/**
 * A variant in an experiment
 */
export interface ExperimentVariant {
  /** Variant ID */
  id: string;
  
  /** Variant name */
  name: string;
  
  /** Is this the control? */
  isControl: boolean;
  
  /** CSS changes */
  css?: string;
  
  /** JS changes */
  js?: string;
}

/**
 * Status of a running experiment
 */
export interface ExperimentStatus {
  /** Experiment ID */
  experimentId: string;
  
  /** Current state */
  state: 'pending' | 'running' | 'analyzing' | 'completed' | 'failed';
  
  /** Progress (0-100) */
  progress: number;
  
  /** Completed sessions */
  completedSessions: number;
  
  /** Total sessions */
  totalSessions: number;
  
  /** Sessions by variant */
  sessionsByVariant: Record<string, number>;
  
  /** Current error if any */
  error?: string;
  
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
}

/**
 * Results of a completed experiment
 */
export interface ExperimentResults {
  /** Experiment ID */
  experimentId: string;
  
  /** All sessions */
  sessions: AgentSession[];
  
  /** Results by variant */
  variantResults: Record<string, VariantResult>;
  
  /** Winning variant ID (null if no clear winner) */
  winner: string | null;
  
  /** Statistical confidence (0-100) */
  confidence: number;
  
  /** Is result statistically significant? */
  isSignificant: boolean;
  
  /** Key insights */
  insights: string[];
  
  /** Recommendations */
  recommendations: string[];
}

/**
 * Aggregated results for a single variant
 */
export interface VariantResult {
  /** Variant ID */
  variantId: string;
  
  /** Number of sessions */
  sessions: number;
  
  /** Number of conversions */
  conversions: number;
  
  /** Conversion rate (0-100) */
  conversionRate: number;
  
  /** Average time on page in ms */
  avgTimeOnPage: number;
  
  /** Average scroll depth percent */
  avgScrollDepth: number;
  
  /** Average clicks per session */
  avgClicks: number;
  
  /** Bounce rate (left quickly) */
  bounceRate: number;
  
  /** Common exit reasons */
  topExitReasons: Array<{ reason: string; count: number }>;
  
  /** Common conversion triggers */
  topConversionTriggers: Array<{ trigger: string; count: number }>;
  
  /** Engagement score (0-100) */
  engagementScore: number;
}
