/**
 * Psychology & Persuasion Principles for CRO
 * Based on Cialdini, Fogg, Kahneman, and behavioral economics research
 */

// Cialdini's 6 Principles of Persuasion
export const CIALDINI_PRINCIPLES = {
  reciprocity: {
    name: 'Reciprocity',
    description: 'People feel obligated to return favors',
    tactics: [
      'Offer free value before asking (guides, tools, trials)',
      'Give unexpected bonuses or extras',
      'Personalize the experience',
      'Lead with generosity in copy',
    ],
    cssPatterns: [
      { selector: '.free-trial, .free-offer, [class*="bonus"]', highlight: true },
    ],
    detectIn: ['free', 'bonus', 'gift', 'complimentary', 'no cost', 'on us'],
  },
  
  commitment: {
    name: 'Commitment & Consistency',
    description: 'People want to act consistently with prior commitments',
    tactics: [
      'Start with small asks (micro-conversions)',
      'Use progress indicators',
      'Get public commitments (reviews, shares)',
      'Remind users of past actions',
    ],
    cssPatterns: [
      { selector: '.progress, .step, [class*="wizard"]', highlight: true },
    ],
    detectIn: ['step', 'progress', 'continue', 'you started', 'almost done'],
  },
  
  socialProof: {
    name: 'Social Proof',
    description: 'People look to others to determine correct behavior',
    tactics: [
      'Show customer counts and testimonials',
      'Display real-time activity (X people viewing)',
      'Highlight popular choices',
      'Show logos of trusted clients',
    ],
    cssPatterns: [
      { selector: '.testimonial, .review, .rating, .social-proof, [class*="customer"]', enhance: true },
    ],
    detectIn: ['customers', 'users', 'people', 'reviews', 'rated', 'trusted by', 'join'],
  },
  
  authority: {
    name: 'Authority',
    description: 'People defer to credible experts',
    tactics: [
      'Show credentials and certifications',
      'Feature expert endorsements',
      'Display media mentions (As seen in...)',
      'Use professional design and imagery',
    ],
    cssPatterns: [
      { selector: '.certification, .badge, .award, [class*="trust"], [class*="secure"]', enhance: true },
    ],
    detectIn: ['certified', 'award', 'expert', 'featured in', 'as seen', 'official', 'verified'],
  },
  
  liking: {
    name: 'Liking',
    description: 'People say yes to those they like',
    tactics: [
      'Use friendly, conversational copy',
      'Show real team photos',
      'Find common ground with audience',
      'Use attractive, relatable imagery',
    ],
    cssPatterns: [
      { selector: '.team, .about, [class*="founder"]', enhance: true },
    ],
    detectIn: ['we', 'our team', 'meet', 'story', 'mission', 'believe'],
  },
  
  scarcity: {
    name: 'Scarcity',
    description: 'People want what is limited or exclusive',
    tactics: [
      'Show limited time offers',
      'Display stock/availability',
      'Create exclusive access',
      'Use countdown timers',
    ],
    cssPatterns: [
      { selector: '.countdown, .timer, .limited, [class*="urgent"], [class*="hurry"]', urgency: true },
    ],
    detectIn: ['limited', 'only', 'left', 'ends', 'exclusive', 'hurry', 'last chance', 'few remaining'],
  },
};

// Cognitive Biases for Conversion
export const COGNITIVE_BIASES = {
  anchoring: {
    name: 'Anchoring',
    description: 'First piece of information heavily influences decisions',
    application: 'Show higher price first, then discounted price',
    detect: ['was', 'now', 'save', 'originally', 'compare at'],
  },
  
  lossAversion: {
    name: 'Loss Aversion',
    description: 'Losses hurt ~2x more than equivalent gains feel good',
    application: 'Frame as what they\'ll lose by not acting',
    detect: ['don\'t miss', 'lose', 'risk', 'protect', 'secure'],
  },
  
  decoyEffect: {
    name: 'Decoy Effect',
    description: 'Adding an inferior option makes target option more attractive',
    application: 'Structure pricing tiers strategically',
    detect: ['most popular', 'best value', 'recommended'],
  },
  
  choiceOverload: {
    name: 'Choice Overload (Paradox of Choice)',
    description: 'Too many options leads to decision paralysis',
    application: 'Limit options to 3-4, highlight recommended',
    detect: ['choose', 'select', 'options', 'plans'],
  },
  
  endowmentEffect: {
    name: 'Endowment Effect',
    description: 'People value things more once they own them',
    application: 'Let users try/customize before buying',
    detect: ['your', 'customize', 'personalize', 'try', 'demo'],
  },
  
  framing: {
    name: 'Framing Effect',
    description: 'How info is presented affects decisions',
    application: '95% success rate > 5% failure rate',
    detect: ['success', 'satisfaction', 'guaranteed'],
  },
};

// Fogg Behavior Model: B = MAP (Motivation × Ability × Prompt)
export const FOGG_MODEL = {
  motivation: {
    factors: ['Pleasure/Pain', 'Hope/Fear', 'Social acceptance/rejection'],
    boosters: [
      'Emphasize benefits over features',
      'Create emotional connection',
      'Show transformation stories',
      'Use aspirational imagery',
    ],
  },
  
  ability: {
    factors: ['Time', 'Money', 'Physical effort', 'Mental effort', 'Social deviance', 'Non-routine'],
    boosters: [
      'Reduce form fields',
      'Simplify language (8th grade level)',
      'Add progress indicators',
      'Provide defaults',
      'Remove unnecessary steps',
    ],
  },
  
  prompt: {
    types: ['Spark (low motivation)', 'Facilitator (low ability)', 'Signal (high both)'],
    boosters: [
      'Make CTA highly visible',
      'Use action-oriented copy',
      'Place prompts at decision points',
      'Time prompts appropriately',
    ],
  },
};

// Analyze page for psychology elements
export function analyzePsychology(elements: {
  headings: string[];
  ctas: string[];
  bodyText?: string;
}): PsychologyAnalysis {
  const text = [
    ...elements.headings,
    ...elements.ctas,
    elements.bodyText || '',
  ].join(' ').toLowerCase();

  const detected: DetectedPrinciple[] = [];
  const missing: MissingPrinciple[] = [];

  // Check each Cialdini principle
  for (const [key, principle] of Object.entries(CIALDINI_PRINCIPLES)) {
    const found = principle.detectIn.some(term => text.includes(term.toLowerCase()));
    if (found) {
      detected.push({
        principle: principle.name,
        type: 'cialdini',
        strength: 'present',
      });
    } else {
      missing.push({
        principle: principle.name,
        type: 'cialdini',
        suggestion: principle.tactics[0],
        impact: key === 'socialProof' || key === 'scarcity' ? 'high' : 'medium',
      });
    }
  }

  // Check cognitive biases
  for (const [key, bias] of Object.entries(COGNITIVE_BIASES)) {
    const found = bias.detect.some(term => text.includes(term.toLowerCase()));
    if (found) {
      detected.push({
        principle: bias.name,
        type: 'cognitive-bias',
        strength: 'present',
      });
    }
  }

  // Calculate Fogg score
  const foggScore = calculateFoggScore(elements);

  return {
    detected,
    missing,
    foggScore,
    recommendations: generateRecommendations(missing, foggScore),
  };
}

function calculateFoggScore(elements: { headings: string[]; ctas: string[] }): FoggScore {
  // Simple heuristic scoring
  const motivation = Math.min(100, elements.headings.length * 20 + 30);
  const ability = Math.max(0, 100 - elements.ctas.length * 10); // fewer CTAs = easier
  const prompt = elements.ctas.length > 0 ? 70 : 20;

  return {
    motivation,
    ability,
    prompt,
    overall: Math.round((motivation + ability + prompt) / 3),
  };
}

function generateRecommendations(
  missing: MissingPrinciple[],
  foggScore: FoggScore
): string[] {
  const recs: string[] = [];

  // High-impact missing principles
  const highImpact = missing.filter(m => m.impact === 'high');
  for (const m of highImpact.slice(0, 2)) {
    recs.push(`Add ${m.principle}: ${m.suggestion}`);
  }

  // Fogg model gaps
  if (foggScore.motivation < 50) {
    recs.push('Boost motivation: Add emotional benefits and transformation stories');
  }
  if (foggScore.ability < 50) {
    recs.push('Reduce friction: Simplify forms and remove unnecessary steps');
  }
  if (foggScore.prompt < 50) {
    recs.push('Strengthen CTA: Make call-to-action more visible and compelling');
  }

  return recs;
}

// Types
interface DetectedPrinciple {
  principle: string;
  type: 'cialdini' | 'cognitive-bias';
  strength: 'strong' | 'present' | 'weak';
}

interface MissingPrinciple {
  principle: string;
  type: 'cialdini' | 'cognitive-bias';
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
}

interface FoggScore {
  motivation: number;
  ability: number;
  prompt: number;
  overall: number;
}

export interface PsychologyAnalysis {
  detected: DetectedPrinciple[];
  missing: MissingPrinciple[];
  foggScore: FoggScore;
  recommendations: string[];
}

// Generate psychology-informed CSS suggestions
export function generatePsychologyCSS(analysis: PsychologyAnalysis): string {
  let css = `/* Psychology-Informed Optimizations */\n\n`;

  // Social proof enhancement
  if (analysis.missing.some(m => m.principle === 'Social Proof')) {
    css += `/* Social Proof - Make testimonials stand out */
.testimonial, .review, .rating, [class*="proof"] {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%) !important;
  border-left: 4px solid #22c55e !important;
  padding: 1rem 1.25rem !important;
  border-radius: 0 0.5rem 0.5rem 0 !important;
  margin: 1rem 0 !important;
}
`;
  }

  // Scarcity/urgency
  if (analysis.missing.some(m => m.principle === 'Scarcity')) {
    css += `
/* Scarcity - Create urgency */
.price, .offer, [class*="deal"], [class*="discount"] {
  color: #dc2626 !important;
  font-weight: 600 !important;
}

.countdown, .timer, .limited {
  background: #fef2f2 !important;
  border: 1px solid #fecaca !important;
  padding: 0.5rem 1rem !important;
  border-radius: 0.375rem !important;
  color: #dc2626 !important;
  font-weight: 500 !important;
}
`;
  }

  // Authority/trust
  css += `
/* Authority - Enhance trust signals */
.badge, .certification, [class*="trust"], [class*="secure"], img[alt*="logo"] {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1)) !important;
}

/* Commitment - Progress indicators */
.progress, .step, [class*="wizard"] {
  --progress-color: #7c3aed;
}
`;

  // CTA optimization based on Fogg prompt score
  if (analysis.foggScore.prompt < 70) {
    css += `
/* Stronger Call-to-Action (Fogg: Prompt) */
button[type="submit"],
.cta,
.btn-primary,
a[href*="signup"],
a[href*="start"],
a[href*="buy"],
a[href*="get"] {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%) !important;
  color: white !important;
  padding: 0.875rem 2rem !important;
  font-weight: 600 !important;
  font-size: 1.0625rem !important;
  border-radius: 0.5rem !important;
  border: none !important;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4), 0 0 0 0 rgba(124, 58, 237, 0.4) !important;
  transition: all 0.2s ease !important;
  animation: pulse-subtle 2s infinite !important;
}

@keyframes pulse-subtle {
  0%, 100% { box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4), 0 0 0 0 rgba(124, 58, 237, 0.4); }
  50% { box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4), 0 0 0 4px rgba(124, 58, 237, 0.1); }
}
`;
  }

  return css;
}
