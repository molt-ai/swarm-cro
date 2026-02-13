import { NextRequest, NextResponse } from 'next/server';
import { ResearcherAgent } from '@/lib/agent/researcher-agent';
import { extractSiteLite } from '@/lib/extractor-lite';

export const maxDuration = 60;

/**
 * POST /api/analyze
 * Analyze a page and generate optimization hypotheses
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    console.log(`[Analyze] Extracting and analyzing ${url}`);
    const startTime = Date.now();

    // Extract page content
    const extraction = await extractSiteLite(url);

    // Build page content summary for the researcher
    const pageContent = `
Title: ${extraction.title}
URL: ${extraction.url}

Headings:
${extraction.elements.headings.map(h => `- ${h}`).join('\n')}

CTAs/Buttons:
${extraction.elements.ctas.map(c => `- ${c}`).join('\n')}

Forms: ${extraction.elements.forms}
Images: ${extraction.elements.images}
Links: ${extraction.elements.links}

Body Text Preview:
${extraction.bodyText.substring(0, 1500)}
`;

    // Generate hypotheses
    const researcher = new ResearcherAgent();
    const hypotheses = await researcher.generateHypotheses(url, pageContent);

    // Create variants from top hypotheses
    const variants = await Promise.all(
      hypotheses.slice(0, 2).map(async (h) => {
        const variant = await researcher.createVariantFromHypothesis(
          h.hypothesis,
          pageContent
        );
        return {
          ...variant,
          hypothesis: h.hypothesis,
          rationale: h.rationale,
          expectedImpact: h.expectedImpact,
        };
      })
    );

    const duration = Date.now() - startTime;
    console.log(`[Analyze] Generated ${hypotheses.length} hypotheses in ${duration}ms`);

    return NextResponse.json({
      success: true,
      url,
      pageAnalysis: {
        title: extraction.title,
        headings: extraction.elements.headings,
        ctas: extraction.elements.ctas,
        forms: extraction.elements.forms,
      },
      hypotheses: hypotheses.map(h => ({
        hypothesis: h.hypothesis,
        rationale: h.rationale,
        expectedImpact: h.expectedImpact,
      })),
      proposedVariants: variants,
      duration,
    });
  } catch (error) {
    console.error('[Analyze] Error:', error);
    return NextResponse.json(
      { error: 'Analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Page Analysis API',
    usage: 'POST with { "url": "https://example.com" }',
    returns: 'CRO hypotheses and proposed test variants',
  });
}
