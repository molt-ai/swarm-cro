/**
 * Persona Generator - Creates realistic user personas for agent simulation
 * 
 * Based on research from AgentA/B paper and real demographic data.
 */

import type { AgentPersona } from './types';

// US demographic distribution (simplified)
const AGE_DISTRIBUTION = [
  { min: 18, max: 24, weight: 0.12 },
  { min: 25, max: 34, weight: 0.18 },
  { min: 35, max: 44, weight: 0.17 },
  { min: 45, max: 54, weight: 0.16 },
  { min: 55, max: 64, weight: 0.17 },
  { min: 65, max: 80, weight: 0.20 },
];

const INCOME_DISTRIBUTION = [
  { level: 'low', weight: 0.35 },      // <$50k
  { level: 'medium', weight: 0.40 },   // $50k-$100k
  { level: 'high', weight: 0.25 },     // >$100k
] as const;

const EDUCATION_DISTRIBUTION = [
  { level: 'high_school', weight: 0.40 },
  { level: 'college', weight: 0.35 },
  { level: 'graduate', weight: 0.25 },
] as const;

// Common user goals by site type
const GOALS_BY_INTENT = {
  shopping: [
    'find the best deal',
    'compare products',
    'read reviews before buying',
    'find a specific product',
    'discover new products',
  ],
  saas: [
    'solve a specific problem',
    'find a tool for my workflow',
    'compare features and pricing',
    'see if this is right for my team',
    'try before committing',
  ],
  content: [
    'learn something new',
    'find an answer to a question',
    'stay informed',
    'be entertained',
    'research a topic',
  ],
  service: [
    'get a quote',
    'understand what\'s offered',
    'contact someone for help',
    'book an appointment',
    'verify credibility',
  ],
};

// Common frustrations
const FRUSTRATIONS = [
  'too many popups and interruptions',
  'slow loading pages',
  'confusing navigation',
  'too much text to read',
  'hidden pricing',
  'aggressive sales tactics',
  'required signup before seeing content',
  'unclear value proposition',
  'mobile-unfriendly design',
  'lack of trust signals',
  'too many form fields',
  'no clear call to action',
];

/**
 * Generate a single persona with realistic attributes
 */
export function generatePersona(
  siteType: keyof typeof GOALS_BY_INTENT = 'saas'
): AgentPersona {
  // Sample demographics
  const age = sampleAge();
  const gender = Math.random() < 0.51 ? 'female' : 'male';
  const income = sampleWeighted(INCOME_DISTRIBUTION).level;
  const education = sampleWeighted(EDUCATION_DISTRIBUTION).level;

  // Psychographics correlate with demographics
  const techSavvy = calculateTechSavvy(age, education);
  const priceSensitive = calculatePriceSensitivity(income);
  const impulsive = Math.round(3 + Math.random() * 4); // 3-7
  const cautious = Math.round(10 - impulsive + (Math.random() * 2 - 1));
  const brandLoyal = Math.round(3 + Math.random() * 5);

  // Behavior patterns
  const behaviorPatterns = {
    scrollSpeed: techSavvy > 6 ? 'fast' : techSavvy > 3 ? 'medium' : 'slow',
    readingStyle: education === 'graduate' ? 'thorough' : 
                  techSavvy > 7 ? 'scanner' : 'skimmer',
    decisionSpeed: impulsive > 6 ? 'quick' : cautious > 6 ? 'hesitant' : 'deliberate',
  } as const;

  // Sample goals and frustrations
  const goals = sampleMultiple(GOALS_BY_INTENT[siteType], 2);
  const frustrations = sampleMultiple(FRUSTRATIONS, 3);

  return {
    id: `persona_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    demographics: {
      age,
      gender,
      income,
      education,
      location: 'United States', // Simplified
    },
    psychographics: {
      techSavvy,
      priceSensitive,
      brandLoyal,
      impulsive,
      cautious,
    },
    goals,
    frustrations,
    behaviorPatterns,
  };
}

/**
 * Generate multiple diverse personas
 */
export function generatePersonaSwarm(
  count: number,
  siteType: keyof typeof GOALS_BY_INTENT = 'saas'
): AgentPersona[] {
  return Array.from({ length: count }, () => generatePersona(siteType));
}

/**
 * Generate personas that match a target audience
 */
export function generateTargetedPersonas(
  count: number,
  target: {
    ageRange?: [number, number];
    income?: 'low' | 'medium' | 'high';
    minTechSavvy?: number;
    siteType?: keyof typeof GOALS_BY_INTENT;
  }
): AgentPersona[] {
  const personas: AgentPersona[] = [];
  let attempts = 0;
  const maxAttempts = count * 10;

  while (personas.length < count && attempts < maxAttempts) {
    const persona = generatePersona(target.siteType || 'saas');
    attempts++;

    // Filter based on target criteria
    if (target.ageRange) {
      if (persona.demographics.age < target.ageRange[0] || 
          persona.demographics.age > target.ageRange[1]) {
        continue;
      }
    }

    if (target.income && persona.demographics.income !== target.income) {
      continue;
    }

    if (target.minTechSavvy && persona.psychographics.techSavvy < target.minTechSavvy) {
      continue;
    }

    personas.push(persona);
  }

  // Fill remaining with random if needed
  while (personas.length < count) {
    personas.push(generatePersona(target.siteType || 'saas'));
  }

  return personas;
}

// Helper functions

function sampleAge(): number {
  const bucket = sampleWeighted(AGE_DISTRIBUTION);
  return bucket.min + Math.floor(Math.random() * (bucket.max - bucket.min + 1));
}

function sampleWeighted<T extends { weight: number }>(distribution: readonly T[]): T {
  const total = distribution.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * total;
  
  for (const item of distribution) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  
  return distribution[distribution.length - 1];
}

function sampleMultiple<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function calculateTechSavvy(age: number, education: string): number {
  let base = 5;
  
  // Age factor
  if (age < 30) base += 2;
  else if (age < 45) base += 1;
  else if (age > 60) base -= 2;
  
  // Education factor
  if (education === 'graduate') base += 1;
  else if (education === 'high_school') base -= 1;
  
  // Add randomness
  base += Math.round(Math.random() * 2 - 1);
  
  return Math.max(1, Math.min(10, base));
}

function calculatePriceSensitivity(income: 'low' | 'medium' | 'high'): number {
  const base = income === 'low' ? 8 : income === 'medium' ? 5 : 3;
  return Math.max(1, Math.min(10, base + Math.round(Math.random() * 2 - 1)));
}

/**
 * Convert persona to a natural language description for prompts
 */
export function personaToDescription(persona: AgentPersona): string {
  const p = persona;
  return `A ${p.demographics.age}-year-old ${p.demographics.gender} with ${p.demographics.education.replace('_', ' ')} education and ${p.demographics.income} income. 
Tech savvy: ${p.psychographics.techSavvy}/10, Price sensitive: ${p.psychographics.priceSensitive}/10, Impulsive: ${p.psychographics.impulsive}/10.
Goals: ${p.goals.join(', ')}.
Gets frustrated by: ${p.frustrations.join(', ')}.
Browsing style: ${p.behaviorPatterns.readingStyle} reader who scrolls ${p.behaviorPatterns.scrollSpeed} and makes ${p.behaviorPatterns.decisionSpeed} decisions.`;
}
