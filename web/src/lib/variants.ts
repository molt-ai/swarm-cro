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

export function generateCSSOverride(variants: Variant[]): string {
  let css = '/* SwarmCRO Generated Optimizations */\n\n';

  for (const variant of variants) {
    css += `/* ${variant.name} */\n`;
    for (const change of variant.changes) {
      if (change.cssOverride) {
        css += `${change.selector} {\n  ${change.cssOverride}\n}\n\n`;
      }
    }
  }

  return css;
}
