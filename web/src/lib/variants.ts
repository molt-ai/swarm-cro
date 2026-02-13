import Anthropic from '@anthropic-ai/sdk';

export interface Variant {
  id: string;
  name: string;
  hypothesis: string;
  changes: VariantChange[];
  expectedImpact: string;
}

export interface VariantChange {
  type: 'copy' | 'layout' | 'color' | 'cta' | 'social-proof' | 'urgency' | 'form';
  selector?: string;
  original?: string;
  modified: string;
  cssOverride?: string;
}

export interface PageAnalysis {
  title: string;
  headings: string[];
  ctas: string[];
  forms: number;
  meta: {
    description?: string;
  };
}

const client = new Anthropic();

export async function generateVariants(
  url: string,
  analysis: PageAnalysis,
  numVariants: number = 3
): Promise<Variant[]> {
  const prompt = `You are a CRO (Conversion Rate Optimization) expert. Analyze this page and generate ${numVariants} A/B test variants.

PAGE INFO:
- URL: ${url}
- Title: ${analysis.title}
- Meta Description: ${analysis.meta.description || 'None'}
- Main Headings: ${analysis.headings.join(', ') || 'None found'}
- CTAs found: ${analysis.ctas.join(', ') || 'None found'}
- Number of forms: ${analysis.forms}

Generate ${numVariants} distinct variant ideas. Each should:
1. Have a clear hypothesis based on CRO best practices
2. Include specific changes (copy, layout, CTA, etc.)
3. Estimate potential impact

Respond in JSON format:
{
  "variants": [
    {
      "id": "variant_1",
      "name": "Clear Value Proposition",
      "hypothesis": "Users will convert better with a clearer headline",
      "changes": [
        {
          "type": "copy",
          "selector": "h1",
          "original": "Original headline",
          "modified": "New compelling headline",
          "cssOverride": null
        }
      ],
      "expectedImpact": "+15-25% conversion"
    }
  ]
}

Focus on high-impact changes:
- Headline clarity and urgency
- CTA button text and prominence
- Social proof elements
- Form simplification
- Trust signals
- Mobile optimization`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Extract JSON from response
  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  // Parse JSON from the response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.variants;
}

export function generateCSSOverride(variants: Variant[], winningVariantId?: string): string {
  let css = '/* SwarmCRO Generated Optimizations */\n\n';

  const variant = winningVariantId 
    ? variants.find(v => v.id === winningVariantId) 
    : variants[0];

  if (!variant) return css;

  css += `/* Variant: ${variant.name} */\n`;
  css += `/* Hypothesis: ${variant.hypothesis} */\n\n`;

  for (const change of variant.changes) {
    if (change.cssOverride && change.selector) {
      css += `${change.selector} {\n  ${change.cssOverride}\n}\n\n`;
    }
  }

  // Add some default optimizations if no CSS overrides
  if (!variant.changes.some(c => c.cssOverride)) {
    css += `/* Recommended optimizations */

/* Increase CTA visibility */
button, [type="submit"], .btn, .cta {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Improve headline contrast */
h1, h2 {
  letter-spacing: -0.02em;
  line-height: 1.2;
}

/* Add urgency indicator */
.price, .offer, .deal {
  color: #22c55e;
  font-weight: 600;
}

/* Reduce visual clutter */
.secondary, .aside, [class*="sidebar"] {
  opacity: 0.7;
}
`;
  }

  return css;
}

export function generateMockCSS(): string {
  return `/* SwarmCRO Optimizations - Winning Variant */

/* Headline Enhancement */
h1 {
  font-size: 1.15em !important;
  font-weight: 700 !important;
  line-height: 1.2 !important;
  color: #1a1a1a !important;
}

/* CTA Button Optimization */
button[type="submit"],
.btn-primary,
.cta-button,
a.button {
  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%) !important;
  color: white !important;
  padding: 14px 28px !important;
  font-weight: 600 !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4) !important;
  transform: scale(1.02);
  transition: all 0.2s ease !important;
}

/* Social Proof Badge */
.testimonial,
.review,
.rating {
  border: 2px solid #22c55e !important;
  background: rgba(34, 197, 94, 0.05) !important;
  padding: 12px !important;
  border-radius: 8px !important;
}

/* Form Simplification */
form input:not([type="submit"]),
form select {
  padding: 12px 16px !important;
  border-radius: 6px !important;
  border: 1px solid #e5e7eb !important;
}

/* Trust Signals */
.trust-badge,
.secure,
.guarantee {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  color: #059669 !important;
}
`;
}
