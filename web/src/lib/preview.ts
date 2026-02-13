import { chromium } from 'playwright';
import { analyzePsychology, generatePsychologyCSS } from './psychology';

export interface PreviewResult {
  original: string; // base64 screenshot
  optimized: string; // base64 screenshot with CSS applied
}

export async function generatePreviewScreenshots(
  html: string,
  cssOverrides: string
): Promise<PreviewResult> {
  const browser = await chromium.launch({ headless: true });
  
  try {
    // Original screenshot
    const originalContext = await browser.newContext({
      viewport: { width: 375, height: 667 }, // iPhone SE size
    });
    const originalPage = await originalContext.newPage();
    await originalPage.setContent(html, { waitUntil: 'networkidle' });
    const originalScreenshot = await originalPage.screenshot({
      type: 'jpeg',
      quality: 85,
      fullPage: false,
    });
    await originalContext.close();

    // Optimized screenshot (with CSS injected)
    const optimizedHtml = injectCSSIntoHTML(html, cssOverrides);
    const optimizedContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const optimizedPage = await optimizedContext.newPage();
    await optimizedPage.setContent(optimizedHtml, { waitUntil: 'networkidle' });
    const optimizedScreenshot = await optimizedPage.screenshot({
      type: 'jpeg',
      quality: 85,
      fullPage: false,
    });
    await optimizedContext.close();

    return {
      original: originalScreenshot.toString('base64'),
      optimized: optimizedScreenshot.toString('base64'),
    };
  } finally {
    await browser.close();
  }
}

export function injectCSSIntoHTML(html: string, css: string): string {
  const styleTag = `
<style id="swarmcro-optimizations">
/* SwarmCRO Optimizations */
${css}

/* Visual indicators for optimized elements */
[data-swarmcro-optimized] {
  outline: 2px solid rgba(34, 197, 94, 0.5) !important;
}
</style>`;

  if (html.includes('</head>')) {
    return html.replace('</head>', `${styleTag}\n</head>`);
  } else if (html.includes('<body')) {
    return html.replace('<body', `${styleTag}\n<body`);
  } else {
    return styleTag + html;
  }
}

// Generate targeted CSS based on page analysis
export function generateTargetedCSS(analysis: {
  headings: string[];
  ctas: string[];
  forms: number;
}): string {
  // Run psychology analysis
  const psychAnalysis = analyzePsychology({
    headings: analysis.headings || [],
    ctas: analysis.ctas || [],
  });

  let css = `/* SwarmCRO Auto-Generated Optimizations */
/* Psychology Score: ${psychAnalysis.foggScore.overall}/100 (M:${psychAnalysis.foggScore.motivation} A:${psychAnalysis.foggScore.ability} P:${psychAnalysis.foggScore.prompt}) */
/* Detected: ${psychAnalysis.detected.map(d => d.principle).join(', ') || 'None'} */
/* Missing: ${psychAnalysis.missing.slice(0, 3).map(m => m.principle).join(', ')} */

`;

  // Add psychology-based CSS
  css += generatePsychologyCSS(psychAnalysis);

  // Headline optimizations
  css += `
/* Enhanced Headlines */
h1, .hero-title, [class*="heading"] {
  font-weight: 700 !important;
  line-height: 1.15 !important;
  letter-spacing: -0.02em !important;
}

h1 {
  font-size: clamp(1.75rem, 5vw, 2.5rem) !important;
}
`;

  // CTA optimizations based on found CTAs
  css += `
/* Optimized Call-to-Action */
button[type="submit"],
.btn-primary,
.cta,
[class*="button"]:not(.btn-secondary):not(.btn-outline),
a[href*="signup"],
a[href*="start"],
a[href*="try"],
a[href*="get"] {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%) !important;
  color: white !important;
  padding: 0.875rem 1.75rem !important;
  font-weight: 600 !important;
  font-size: 1rem !important;
  border-radius: 0.5rem !important;
  border: none !important;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35) !important;
  transition: all 0.2s ease !important;
  text-decoration: none !important;
}

button[type="submit"]:hover,
.btn-primary:hover,
.cta:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.45) !important;
}
`;

  // Form optimizations if forms exist
  if (analysis.forms > 0) {
    css += `
/* Streamlined Form */
form {
  max-width: 400px;
}

form input:not([type="submit"]):not([type="checkbox"]):not([type="radio"]),
form select,
form textarea {
  padding: 0.75rem 1rem !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 0.375rem !important;
  font-size: 1rem !important;
  width: 100% !important;
  transition: border-color 0.2s !important;
}

form input:focus,
form select:focus,
form textarea:focus {
  border-color: #7c3aed !important;
  outline: none !important;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1) !important;
}

form label {
  font-weight: 500 !important;
  font-size: 0.875rem !important;
  margin-bottom: 0.25rem !important;
  display: block !important;
}
`;
  }

  // Social proof and trust signals
  css += `
/* Trust Signals */
.testimonial,
.review,
.rating,
[class*="trust"],
[class*="proof"] {
  background: rgba(34, 197, 94, 0.05) !important;
  border-left: 3px solid #22c55e !important;
  padding: 1rem !important;
  border-radius: 0 0.5rem 0.5rem 0 !important;
}

/* Urgency & Scarcity */
.price,
.discount,
.offer,
[class*="deal"],
[class*="limited"] {
  color: #dc2626 !important;
  font-weight: 600 !important;
}

/* Reduce friction - hide distracting elements */
.popup,
.modal-backdrop,
.chat-widget,
[class*="banner"]:not(.hero-banner) {
  opacity: 0.3 !important;
}
`;

  return css;
}
