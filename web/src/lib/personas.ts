// Persona generation for synthetic users
// Based on AgentA/B paper methodology

export interface Persona {
  id: string;
  demographics: {
    ageGroup: '18-24' | '25-34' | '35-44' | '45-54' | '55+';
    gender: 'male' | 'female' | 'other';
    location: 'urban' | 'suburban' | 'rural';
    income: 'low' | 'middle' | 'high';
  };
  behaviors: {
    techSavviness: 'low' | 'medium' | 'high';
    shoppingStyle: 'impulse' | 'researcher' | 'comparison' | 'loyalist';
    attentionSpan: 'short' | 'medium' | 'long';
    priceSensitivity: 'low' | 'medium' | 'high';
    trustLevel: 'skeptical' | 'neutral' | 'trusting';
  };
  goals: string[];
  frustrations: string[];
  deviceType: 'mobile' | 'desktop' | 'tablet';
}

// Distribution weights based on typical e-commerce demographics
const distributions = {
  ageGroup: {
    '18-24': 0.15,
    '25-34': 0.30,
    '35-44': 0.25,
    '45-54': 0.18,
    '55+': 0.12,
  },
  gender: {
    male: 0.48,
    female: 0.50,
    other: 0.02,
  },
  location: {
    urban: 0.45,
    suburban: 0.40,
    rural: 0.15,
  },
  income: {
    low: 0.30,
    middle: 0.50,
    high: 0.20,
  },
  techSavviness: {
    low: 0.25,
    medium: 0.50,
    high: 0.25,
  },
  shoppingStyle: {
    impulse: 0.20,
    researcher: 0.35,
    comparison: 0.30,
    loyalist: 0.15,
  },
  attentionSpan: {
    short: 0.40,
    medium: 0.40,
    long: 0.20,
  },
  priceSensitivity: {
    low: 0.20,
    medium: 0.50,
    high: 0.30,
  },
  trustLevel: {
    skeptical: 0.30,
    neutral: 0.45,
    trusting: 0.25,
  },
  deviceType: {
    mobile: 0.60,
    desktop: 0.35,
    tablet: 0.05,
  },
};

const goals = [
  'Find the best deal',
  'Quick checkout',
  'Research before buying',
  'Compare options',
  'Get expert recommendations',
  'Find social proof',
  'Understand the product',
  'Check return policy',
  'Find contact info',
  'Read reviews',
];

const frustrations = [
  'Too many steps',
  'Hidden fees',
  'Slow loading',
  'Confusing navigation',
  'No clear pricing',
  'Too much text',
  'Pop-ups',
  'Required account creation',
  'No mobile optimization',
  'Lack of trust signals',
];

function weightedRandom<T extends string>(distribution: Record<T, number>): T {
  const rand = Math.random();
  let cumulative = 0;
  
  for (const [key, weight] of Object.entries(distribution) as [T, number][]) {
    cumulative += weight;
    if (rand <= cumulative) {
      return key;
    }
  }
  
  // Fallback to first key
  return Object.keys(distribution)[0] as T;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function generatePersona(id: string): Persona {
  const ageGroup = weightedRandom(distributions.ageGroup);
  const techSavviness = weightedRandom(distributions.techSavviness);
  
  // Adjust tech savviness based on age
  let adjustedTech = techSavviness;
  if (ageGroup === '55+' && techSavviness === 'high') {
    adjustedTech = Math.random() > 0.5 ? 'medium' : 'high';
  }
  if (ageGroup === '18-24' && techSavviness === 'low') {
    adjustedTech = Math.random() > 0.5 ? 'medium' : 'low';
  }

  return {
    id,
    demographics: {
      ageGroup,
      gender: weightedRandom(distributions.gender),
      location: weightedRandom(distributions.location),
      income: weightedRandom(distributions.income),
    },
    behaviors: {
      techSavviness: adjustedTech,
      shoppingStyle: weightedRandom(distributions.shoppingStyle),
      attentionSpan: weightedRandom(distributions.attentionSpan),
      priceSensitivity: weightedRandom(distributions.priceSensitivity),
      trustLevel: weightedRandom(distributions.trustLevel),
    },
    goals: pickRandom(goals, 2 + Math.floor(Math.random() * 2)),
    frustrations: pickRandom(frustrations, 2 + Math.floor(Math.random() * 2)),
    deviceType: weightedRandom(distributions.deviceType),
  };
}

export function generatePersonaSwarm(count: number): Persona[] {
  return Array.from({ length: count }, (_, i) => 
    generatePersona(`persona_${i + 1}`)
  );
}

export function personaToPrompt(persona: Persona): string {
  return `You are simulating a user with the following characteristics:

DEMOGRAPHICS:
- Age: ${persona.demographics.ageGroup}
- Gender: ${persona.demographics.gender}
- Location: ${persona.demographics.location}
- Income level: ${persona.demographics.income}

BEHAVIOR:
- Tech savviness: ${persona.behaviors.techSavviness}
- Shopping style: ${persona.behaviors.shoppingStyle}
- Attention span: ${persona.behaviors.attentionSpan}
- Price sensitivity: ${persona.behaviors.priceSensitivity}
- Trust level: ${persona.behaviors.trustLevel}

GOALS: ${persona.goals.join(', ')}
FRUSTRATIONS: ${persona.frustrations.join(', ')}
DEVICE: ${persona.deviceType}

Act naturally based on these traits. Make decisions about whether to:
- Continue browsing
- Click on elements
- Fill out forms
- Convert (complete desired action)
- Abandon the page

Be realistic - not everyone converts.`;
}
