/**
 * Generate PDF from report view URL using Puppeteer and system Chromium.
 * Ports multi-page logic from src/lib/reports/export-pdf-playwright.ts so that
 * all .page-container sections render and print CSS page-breaks are applied.
 * Designed for containerized (ECS/Docker) environment.
 */
import puppeteer from 'puppeteer';

const CHROMIUM_PATH = process.env.PUPPETEER_EXECUTABLE_PATH ?? '/usr/bin/chromium';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface PDFOptions {
  waitForSelector?: string;
  waitForTimeout?: number;
}

const PRINT_CSS = `
  .report-view-container {
    position: static !important;
    overflow: visible !important;
    height: auto !important;
    display: block !important;
    top: auto !important;
    left: auto !important;
    right: auto !important;
    bottom: auto !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    margin: 0 !important;
  }
  .report-view-container > div {
    display: block !important;
    max-width: none !important;
    width: 100% !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    margin: 0 !important;
  }
  .page-container {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }
  .page-container:first-child {
    page-break-after: auto !important;
  }
  .page-container:nth-child(2) {
    page-break-before: always !important;
  }
  .page-container:last-child {
    page-break-after: auto !important;
  }
  .page-footer {
    bottom: 0 !important;
    position: absolute !important;
  }
  .page-wrapper {
    padding-bottom: 59px !important;
  }
  @media print {
    .report-view-container {
      position: static !important;
      overflow: visible !important;
      height: auto !important;
      display: block !important;
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      margin: 0 !important;
    }
    .report-view-container > div {
      display: block !important;
      max-width: none !important;
      width: 100% !important;
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      margin: 0 !important;
    }
    .page-container {
      margin-top: 0 !important;
      margin-bottom: 0 !important;
    }
    .page-container:first-child {
      page-break-after: auto !important;
    }
    .page-container:nth-child(2) {
      page-break-before: always !important;
    }
    .page-container:last-child {
      page-break-after: auto !important;
    }
    .page-footer {
      bottom: 0 !important;
      position: absolute !important;
    }
    .page-wrapper {
      padding-bottom: 59px !important;
    }
  }
`;

/**
 * Generate PDF from fullscreen report view URL.
 * Uses service_role_token on the view URL for auth (no cookies).
 * Waits for all .page-container sections, injects print CSS, emulates print media,
 * and sets a tall viewport so the full report is captured.
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

    // Expected page count from data attribute (optional)
    const expectedPageCount = await page.evaluate(() => {
      const container = document.querySelector('[data-report-pages]');
      if (container) {
        const count = container.getAttribute('data-report-pages');
        return count ? parseInt(count, 10) : null;
      }
      return null;
    });
    if (expectedPageCount) {
      console.log('[PDF] Expected page count:', expectedPageCount);
    }

    // Wait for images to load
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(() => resolve(), 5000);
          });
        })
      )
    );

    // Wait for all .page-container elements to be rendered (stability or expected count)
    let previousCount = 0;
    let stableCount = 0;
    const maxWaitIterations = expectedPageCount ? 20 : 10;
    for (let i = 0; i < maxWaitIterations; i++) {
      await delay(500);
      const currentCount = await page.evaluate(() => document.querySelectorAll('.page-container').length);
      if (expectedPageCount && currentCount >= expectedPageCount) {
        console.log('[PDF] All expected pages loaded:', currentCount);
        break;
      }
      if (currentCount === previousCount && currentCount > 0) {
        stableCount++;
        if (stableCount >= 3) {
          console.log('[PDF] Page count stable at', currentCount);
          break;
        }
      } else {
        stableCount = 0;
      }
      previousCount = currentCount;
    }

    // Scroll to bottom to trigger any lazy rendering, then back to top
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await delay(2000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await delay(2000);

    const pageCount = await page.evaluate(() => document.querySelectorAll('.page-container').length);
    if (pageCount === 0) {
      throw new Error('No .page-container elements found for PDF');
    }
    console.log('[PDF] Page containers for PDF:', pageCount);

    // Inject print layout CSS (must be before measuring height)
    await page.addStyleTag({ content: PRINT_CSS });
    await delay(200);

    // Measure total content height so we can set viewport to capture all pages
    const { totalHeight } = await page.evaluate(() => {
      const pageContainers = document.querySelectorAll('.page-container');
      if (pageContainers.length === 0) return { totalHeight: 1080 };
      let total = 0;
      pageContainers.forEach((container) => {
        const rect = container.getBoundingClientRect();
        const styles = window.getComputedStyle(container);
        const marginTop = parseInt(styles.marginTop, 10) || 0;
        const marginBottom = parseInt(styles.marginBottom, 10) || 0;
        total += rect.height + marginTop + marginBottom;
      });
      return { totalHeight: Math.max(1080, total + 100) };
    });

    // Emulate print media so CSS page-break rules apply
    await page.emulateMediaType('print');
    await delay(500);

    // Tall viewport so all content is "on screen" when generating PDF
    const viewportHeight = Math.min(totalHeight, 50000);
    await page.setViewport({ width: 1920, height: viewportHeight });
    await delay(500);

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
