/**
 * Generate PDF from report view URL using Puppeteer and system Chromium.
 * Designed for containerized (ECS/Docker) environment.
 */
import puppeteer from 'puppeteer';

const CHROMIUM_PATH = process.env.PUPPETEER_EXECUTABLE_PATH ?? '/usr/bin/chromium';

export interface PDFOptions {
  waitForSelector?: string;
  waitForTimeout?: number;
}

/**
 * Generate PDF from fullscreen report view URL.
 * Uses service_role_token on the view URL for auth (no cookies).
 */
export async function generatePDFFromView(
  viewUrl: string,
  options?: PDFOptions
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROMIUM_PATH,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--no-zygote',
      '--disable-software-rasterizer',
      '--disable-extensions',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    await page.goto(viewUrl, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });

    const selector = options?.waitForSelector ?? '[data-report-loaded]';
    const timeout = options?.waitForTimeout ?? 30000;
    try {
      await page.waitForSelector(selector, { timeout });
    } catch {
      console.warn('[PDF] Wait for selector failed, continuing:', selector);
    }

    try {
      await page.waitForSelector('.page-container', { timeout: 30000 });
    } catch {
      const count = await page.$$eval('.page-container', (els) => els.length).catch(() => 0);
      if (count === 0) {
        const bodyPreview = await page.evaluate(() => document.body?.innerText?.slice(0, 200) ?? 'no body').catch(() => 'error');
        throw new Error(`No .page-container found. Body preview: ${bodyPreview}`);
      }
    }

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
      preferCSSPageSize: false,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
