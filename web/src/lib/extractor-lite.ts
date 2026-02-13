/**
 * Lightweight page extractor using fetch + cheerio
 * Works on Vercel serverless (no browser needed)
 */

import * as cheerio from 'cheerio';

export interface LiteExtractionResult {
  url: string;
  title: string;
  html: string;
  meta: {
    description?: string;
    ogImage?: string;
    ogTitle?: string;
  };
  elements: {
    headings: string[];
    ctas: string[];
    forms: number;
    images: number;
    links: number;
  };
  bodyText: string;
}

export async function extractSiteLite(url: string): Promise<LiteExtractionResult> {
  // Fetch the page HTML
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove scripts, styles, and other non-content elements for text extraction
  $('script, style, noscript, iframe, svg').remove();

  // Extract metadata
  const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';
  const description = $('meta[name="description"]').attr('content') || 
                      $('meta[property="og:description"]').attr('content');
  const ogImage = $('meta[property="og:image"]').attr('content');
  const ogTitle = $('meta[property="og:title"]').attr('content');

  // Extract headings
  const headings: string[] = [];
  $('h1, h2, h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 200) {
      headings.push(text);
    }
  });

  // Extract CTAs (buttons and action links)
  const ctas: string[] = [];
  $('button, [type="submit"], .btn, .cta, a.button, [class*="btn-"], [class*="Button"]').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 100 && text.length > 1) {
      ctas.push(text);
    }
  });

  // Also look for links with action words
  $('a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    const href = $(el).attr('href') || '';
    if (
      (text.includes('sign up') || text.includes('get started') || 
       text.includes('try') || text.includes('buy') || 
       text.includes('start') || text.includes('subscribe') ||
       href.includes('signup') || href.includes('register')) &&
      text.length < 50
    ) {
      ctas.push($(el).text().trim());
    }
  });

  // Count elements
  const forms = $('form').length;
  const images = $('img').length;
  const links = $('a').length;

  // Extract body text for analysis
  const bodyText = $('body').text()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000); // Limit to 5k chars

  return {
    url,
    title,
    html, // Return original HTML for reference
    meta: {
      description,
      ogImage,
      ogTitle,
    },
    elements: {
      headings: headings.slice(0, 15),
      ctas: [...new Set(ctas)].slice(0, 15), // Dedupe
      forms,
      images,
      links,
    },
    bodyText,
  };
}

// Generate a placeholder screenshot URL using external service
export function getScreenshotUrl(url: string): string {
  // Use a free screenshot API (or return placeholder)
  // Options: screenshotapi.net, urlbox.io, microlink.io
  const encoded = encodeURIComponent(url);
  
  // Microlink has a generous free tier
  return `https://api.microlink.io/?url=${encoded}&screenshot=true&meta=false&embed=screenshot.url`;
}

// Fallback: generate a simple placeholder
export function generatePlaceholderScreenshot(title: string, url: string): string {
  // Return a data URL with a simple placeholder
  // This is a 1x1 gray pixel as base64 - frontend will show "Preview unavailable"
  return '';
}
