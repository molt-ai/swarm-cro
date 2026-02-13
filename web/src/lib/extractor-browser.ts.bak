import { chromium, Browser, Page } from 'playwright';

export interface ExtractionResult {
  url: string;
  title: string;
  html: string;
  css: string;
  screenshot?: string; // base64
  meta: {
    description?: string;
    viewport?: string;
    charset?: string;
  };
  elements: {
    headings: string[];
    ctas: string[];
    forms: number;
    images: number;
    links: number;
  };
}

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await chromium.launch({
      headless: true,
    });
  }
  return browserInstance;
}

export async function extractSite(url: string): Promise<ExtractionResult> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate and wait for network idle
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Extract page data
    const data = await page.evaluate(() => {
      // Get all stylesheets as inline CSS
      const styleSheets = Array.from(document.styleSheets);
      let css = '';
      styleSheets.forEach(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || []);
          rules.forEach(rule => {
            css += rule.cssText + '\n';
          });
        } catch (e) {
          // Cross-origin stylesheets can't be accessed
        }
      });

      // Get inline styles too
      const styleElements = document.querySelectorAll('style');
      styleElements.forEach(el => {
        css += el.textContent + '\n';
      });

      // Get meta info
      const metaDesc = document.querySelector('meta[name="description"]');
      const metaViewport = document.querySelector('meta[name="viewport"]');
      const metaCharset = document.querySelector('meta[charset]');

      // Analyze elements
      const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
        .slice(0, 10)
        .map(h => h.textContent?.trim() || '');
      
      const ctas = Array.from(document.querySelectorAll('button, [type="submit"], .btn, .cta, a.button'))
        .slice(0, 10)
        .map(el => el.textContent?.trim() || '');

      return {
        title: document.title,
        html: document.documentElement.outerHTML,
        css,
        meta: {
          description: metaDesc?.getAttribute('content') || undefined,
          viewport: metaViewport?.getAttribute('content') || undefined,
          charset: metaCharset?.getAttribute('charset') || undefined,
        },
        elements: {
          headings,
          ctas,
          forms: document.querySelectorAll('form').length,
          images: document.querySelectorAll('img').length,
          links: document.querySelectorAll('a').length,
        }
      };
    });

    // Take screenshot
    const screenshotBuffer = await page.screenshot({ 
      type: 'jpeg', 
      quality: 70,
      fullPage: false 
    });
    const screenshot = screenshotBuffer.toString('base64');

    return {
      url,
      ...data,
      screenshot,
    };
  } finally {
    await context.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
