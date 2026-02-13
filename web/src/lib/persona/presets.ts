/**
 * Preset Personas
 * 
 * Ready-to-use persona templates representing common user archetypes.
 * These can be used directly or as starting points for customization.
 */

import type { Persona, PersonaPreset } from './types';

/**
 * Generate a unique ID for a persona
 */
const generateId = () => `persona_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Preset persona definitions
 */
export const PERSONA_PRESETS: Record<PersonaPreset, Omit<Persona, 'id'>> = {
  'impatient-mobile': {
    name: 'Mobile Mike',
    description: 'Scrolling on phone during commute. Has 30 seconds max before getting distracted.',
    demographics: {
      ageRange: '25-34',
      techSavviness: 'high',
      device: 'mobile',
      connectionSpeed: 'moderate',
    },
    behavior: {
      patience: 2,
      thoroughness: 2,
      clickiness: 6,
      scrollSpeed: 9,
      frustrationTolerance: 3,
      skepticism: 5,
    },
    intent: {
      goal: 'Quick answer or purchase',
      urgency: 7,
      priorKnowledge: 'some',
      conversionTriggers: ['Clear CTA above fold', 'Fast checkout', 'Apple Pay'],
      dealbreakers: ['Slow load', 'Tiny buttons', 'Long forms'],
    },
    agentInstructions: 'Scroll fast. If you don\'t find what you need in 10 seconds, leave. Tap on prominent buttons. Get frustrated by popups.',
  },

  'thorough-researcher': {
    name: 'Research Rachel',
    description: 'Making a big decision. Will read every word, check reviews, and compare alternatives.',
    demographics: {
      ageRange: '35-44',
      techSavviness: 'high',
      device: 'desktop',
      connectionSpeed: 'fast',
    },
    behavior: {
      patience: 9,
      thoroughness: 10,
      clickiness: 7,
      scrollSpeed: 3,
      frustrationTolerance: 8,
      skepticism: 7,
    },
    intent: {
      goal: 'Fully understand product before committing',
      urgency: 3,
      priorKnowledge: 'some',
      conversionTriggers: ['Detailed specs', 'Comparison tables', 'Case studies', 'Reviews'],
      dealbreakers: ['Missing information', 'No reviews', 'Vague claims'],
    },
    agentInstructions: 'Read everything. Scroll slowly. Click on "Learn more" links. Look for pricing details, reviews, and specifications. Open multiple tabs if possible.',
  },

  'skeptical-buyer': {
    name: 'Skeptical Steve',
    description: 'Been burned before. Looking for red flags and proof that this is legit.',
    demographics: {
      ageRange: '45-54',
      techSavviness: 'medium',
      device: 'desktop',
      connectionSpeed: 'fast',
    },
    behavior: {
      patience: 6,
      thoroughness: 8,
      clickiness: 5,
      scrollSpeed: 4,
      frustrationTolerance: 5,
      skepticism: 10,
    },
    intent: {
      goal: 'Verify legitimacy before purchase',
      urgency: 4,
      priorKnowledge: 'none',
      conversionTriggers: ['Trust badges', 'Real testimonials with names', 'Money-back guarantee', 'BBB rating'],
      dealbreakers: ['Fake-looking reviews', 'No contact info', 'Pressure tactics', 'Hidden fees'],
    },
    agentInstructions: 'Look for trust signals. Scroll to footer to check for contact info, privacy policy. Be suspicious of too-good-to-be-true claims. Look for real customer names in reviews.',
  },

  'impulse-shopper': {
    name: 'Impulse Irene',
    description: 'Saw an ad, clicked through. Ready to buy if it looks good and the price is right.',
    demographics: {
      ageRange: '25-34',
      techSavviness: 'high',
      device: 'mobile',
      connectionSpeed: 'fast',
    },
    behavior: {
      patience: 4,
      thoroughness: 2,
      clickiness: 9,
      scrollSpeed: 7,
      frustrationTolerance: 4,
      skepticism: 3,
    },
    intent: {
      goal: 'Quick purchase if it matches expectations from ad',
      urgency: 8,
      priorKnowledge: 'some',
      conversionTriggers: ['Limited time offer', 'Free shipping', 'Easy checkout', 'Matches ad promise'],
      dealbreakers: ['Price higher than expected', 'Complicated checkout', 'Required account creation'],
    },
    agentInstructions: 'Look for the main CTA immediately. Check the price. If it matches expectations, try to buy. Get frustrated by obstacles to checkout.',
  },

  'price-conscious': {
    name: 'Budget Ben',
    description: 'Knows what they want, hunting for the best deal. Will compare prices across sites.',
    demographics: {
      ageRange: '35-44',
      techSavviness: 'high',
      device: 'desktop',
      connectionSpeed: 'fast',
    },
    behavior: {
      patience: 7,
      thoroughness: 6,
      clickiness: 6,
      scrollSpeed: 5,
      frustrationTolerance: 6,
      skepticism: 6,
    },
    intent: {
      goal: 'Find the best value for money',
      urgency: 4,
      priorKnowledge: 'expert',
      conversionTriggers: ['Clear pricing', 'Discount codes', 'Price comparison', 'Free shipping threshold'],
      dealbreakers: ['Hidden costs', 'No price visible', 'Expensive shipping'],
    },
    agentInstructions: 'Find pricing immediately. Look for discounts, promo codes, or sales. Compare value to what you know about competitors. Check shipping costs before deciding.',
  },

  'tech-confused': {
    name: 'Confused Carol',
    description: 'Not comfortable with technology. Needs clear guidance and simple language.',
    demographics: {
      ageRange: '55-64',
      techSavviness: 'low',
      device: 'desktop',
      connectionSpeed: 'moderate',
    },
    behavior: {
      patience: 5,
      thoroughness: 4,
      clickiness: 3,
      scrollSpeed: 2,
      frustrationTolerance: 4,
      skepticism: 5,
    },
    intent: {
      goal: 'Accomplish task without getting confused',
      urgency: 5,
      priorKnowledge: 'none',
      conversionTriggers: ['Clear instructions', 'Phone number to call', 'Simple forms', 'Big buttons'],
      dealbreakers: ['Jargon', 'Too many options', 'Small text', 'No human support option'],
    },
    agentInstructions: 'Move slowly. Get confused by complex layouts. Look for help or contact options. Prefer simple, obvious actions. Hesitate before clicking unfamiliar buttons.',
  },

  'accessibility-user': {
    name: 'Screen Reader Sam',
    description: 'Uses assistive technology. Relies on proper heading structure and alt text.',
    demographics: {
      ageRange: '35-44',
      techSavviness: 'high',
      device: 'desktop',
      connectionSpeed: 'fast',
    },
    behavior: {
      patience: 7,
      thoroughness: 6,
      clickiness: 4,
      scrollSpeed: 3,
      frustrationTolerance: 5,
      skepticism: 5,
    },
    intent: {
      goal: 'Navigate and purchase using keyboard/screen reader',
      urgency: 5,
      priorKnowledge: 'some',
      conversionTriggers: ['Proper heading structure', 'Alt text on images', 'Keyboard navigation', 'Skip links'],
      dealbreakers: ['Inaccessible forms', 'No alt text', 'Mouse-only interactions', 'Auto-playing media'],
    },
    agentInstructions: 'Navigate using keyboard only. Check if focus states are visible. Try to understand page structure from headings. Note any accessibility barriers.',
  },

  'return-visitor': {
    name: 'Return Rita',
    description: 'Has been here before. Knows the layout, looking for something specific.',
    demographics: {
      ageRange: '25-34',
      techSavviness: 'high',
      device: 'desktop',
      connectionSpeed: 'fast',
    },
    behavior: {
      patience: 5,
      thoroughness: 3,
      clickiness: 7,
      scrollSpeed: 6,
      frustrationTolerance: 6,
      skepticism: 4,
    },
    intent: {
      goal: 'Complete a specific action they came back for',
      urgency: 7,
      priorKnowledge: 'expert',
      conversionTriggers: ['Familiar layout', 'Quick access to account', 'Saved preferences'],
      dealbreakers: ['Site redesign confusion', 'Lost cart', 'Having to re-enter info'],
    },
    agentInstructions: 'Navigate confidently. Go directly to what you need. Get frustrated if things have moved. Expect the site to remember you.',
  },

  'distracted-browser': {
    name: 'Distracted Dave',
    description: 'Browsing during work, between meetings, or while watching TV. Easily interrupted.',
    demographics: {
      ageRange: '25-34',
      techSavviness: 'high',
      device: 'desktop',
      connectionSpeed: 'fast',
    },
    behavior: {
      patience: 3,
      thoroughness: 2,
      clickiness: 5,
      scrollSpeed: 8,
      frustrationTolerance: 3,
      skepticism: 4,
    },
    intent: {
      goal: 'Quick browse, might save for later',
      urgency: 2,
      priorKnowledge: 'none',
      conversionTriggers: ['Save for later', 'Email to self', 'Quick add to cart'],
      dealbreakers: ['Requires full attention', 'Long forms', 'No easy save option'],
    },
    agentInstructions: 'Scroll quickly. Get distracted and look away periodically. Might not finish what you started. Look for ways to save or bookmark.',
  },

  'power-user': {
    name: 'Power User Pete',
    description: 'Knows what they want, hates unnecessary steps. Will find shortcuts.',
    demographics: {
      ageRange: '25-34',
      techSavviness: 'high',
      device: 'desktop',
      connectionSpeed: 'fast',
    },
    behavior: {
      patience: 2,
      thoroughness: 3,
      clickiness: 8,
      scrollSpeed: 7,
      frustrationTolerance: 2,
      skepticism: 6,
    },
    intent: {
      goal: 'Complete purchase with minimum friction',
      urgency: 9,
      priorKnowledge: 'expert',
      conversionTriggers: ['Keyboard shortcuts', 'Minimal steps', 'Auto-fill', 'Express checkout'],
      dealbreakers: ['Unnecessary steps', 'Upsell interruptions', 'Slow animations', 'Required account'],
    },
    agentInstructions: 'Move fast. Skip intros. Look for the fastest path to checkout. Get very frustrated by unnecessary steps or interruptions.',
  },
};

/**
 * Get a preset persona by key
 */
export function getPresetPersona(preset: PersonaPreset): Persona {
  const template = PERSONA_PRESETS[preset];
  return {
    id: generateId(),
    ...template,
  };
}

/**
 * Get all preset personas
 */
export function getAllPresetPersonas(): Persona[] {
  return (Object.keys(PERSONA_PRESETS) as PersonaPreset[]).map(getPresetPersona);
}

/**
 * Get a random sample of preset personas
 */
export function getRandomPresetPersonas(count: number): Persona[] {
  const allPresets = Object.keys(PERSONA_PRESETS) as PersonaPreset[];
  const shuffled = [...allPresets].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(getPresetPersona);
}
