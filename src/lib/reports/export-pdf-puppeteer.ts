/**
 * PDF Export using Puppeteer (for Vercel serverless and local fallback)
 *
 * Uses @sparticuz/chromium for serverless environments.
 * Ports the multi-page rendering logic from the ECS pdf-service.
 */

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
  .page-container:nth-child(2) {
    page-break-before: always !important;
  }
  /* Do not set bottom — PageFooter uses inline bottom:-130px to sit in the margin below .page-wrapper;
     bottom:0 !important was overriding that and made PDF page numbers sit too high vs HTML. */
  .page-footer {
    position: absolute !important;
  }
  .page-wrapper {
    padding-bottom: 64px !important;
  }
  @media print {
    .page-container {
      page-break-after: always !important;
      page-break-inside: avoid !important;
    }
    .page-container:last-child {
      page-break-after: auto !important;
    }
  }
`

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function generatePDFFromViewPuppeteer(
  viewUrl: string,
  cookies?: Array<{ name: string; value: string; domain?: string; path?: string }>,
  options?: {
    waitForSelector?: string
    waitForTimeout?: number
  }
): Promise<Buffer> {
  const puppeteer = await import('puppeteer-core')

  const isProduction = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME

  let executablePath: string | undefined
  let args: string[] | undefined

  if (isProduction) {
    try {
      const chromiumPkg = await import('@sparticuz/chromium')
      const chromium = chromiumPkg.default
      chromium.setGraphicsMode = false
      executablePath = await chromium.executablePath()
      args = chromium.args
      console.log('[Puppeteer] Using @sparticuz/chromium for serverless')
    } catch (err) {
      console.error('[Puppeteer] Failed to load @sparticuz/chromium:', err instanceof Error ? err.message : String(err))
    }
  }

  console.log('[Puppeteer] Launching browser...', {
    isProduction,
    hasExecutablePath: !!executablePath,
  })

  const launchArgs = [
    ...(args || []),
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process',
    '--no-zygote',
    '--disable-software-rasterizer',
    '--disable-extensions',
  ]

  const browser = await puppeteer.default.launch({
    headless: true,
    ...(executablePath && { executablePath }),
    args: launchArgs,
  })
  console.log('[Puppeteer] Browser launched')

  try {
    const url = new URL(viewUrl)
    const page = await browser.newPage()

    await page.setViewport({ width: 1920, height: 1080 })

    // Set authentication cookies
    if (cookies && cookies.length > 0) {
      await page.setCookie(
        ...cookies.map(cookie => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain || url.hostname,
          path: cookie.path || '/',
          httpOnly: cookie.name.includes('sb-'),
          secure: url.protocol === 'https:',
          sameSite: 'Lax' as const,
        }))
      )
    }

    // Navigate and wait for full load
    await page.goto(viewUrl, {
      waitUntil: 'networkidle0',
      timeout: 45000,
    })

    // Wait for report loaded indicator
    const selector = options?.waitForSelector ?? '[data-report-loaded]'
    try {
      await page.waitForSelector(selector, { timeout: options?.waitForTimeout ?? 20000 })
    } catch {
      console.warn('[Puppeteer] Report loaded indicator not found, continuing')
    }

    // Wait for at least one page container
    try {
      await page.waitForSelector('.page-container', { timeout: 20000 })
    } catch {
      const count = await page.$$eval('.page-container', els => els.length).catch(() => 0)
      if (count === 0) {
        const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 200) || 'no body').catch(() => 'error')
        throw new Error(`No .page-container found. Body: ${bodyText}`)
      }
    }

    // Get expected page count from data attribute
    const expectedPageCount = await page.evaluate(() => {
      const container = document.querySelector('[data-report-pages]')
      if (container) {
        const count = container.getAttribute('data-report-pages')
        return count ? parseInt(count, 10) : null
      }
      return null
    })
    console.log('[Puppeteer] Expected pages:', expectedPageCount)

    // Wait for images to load
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images).map((img) => {
          if (img.complete) return Promise.resolve()
          return new Promise<void>((resolve) => {
            img.onload = () => resolve()
            img.onerror = () => resolve()
            setTimeout(() => resolve(), 5000)
          })
        })
      )
    )

    // Wait for all page containers to stabilize
    let previousCount = 0
    let stableCount = 0
    const maxWait = expectedPageCount ? 20 : 10
    for (let i = 0; i < maxWait; i++) {
      await delay(500)
      const currentCount = await page.evaluate(() => document.querySelectorAll('.page-container').length)
      if (expectedPageCount && currentCount >= expectedPageCount) {
        console.log('[Puppeteer] All expected pages loaded:', currentCount)
        break
      }
      if (currentCount === previousCount && currentCount > 0) {
        stableCount++
        if (stableCount >= 3) {
          console.log('[Puppeteer] Page count stable at', currentCount)
          break
        }
      } else {
        stableCount = 0
      }
      previousCount = currentCount
    }

    // Scroll to trigger lazy rendering
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await delay(1500)
    await page.evaluate(() => window.scrollTo(0, 0))
    await delay(1500)

    const pageCount = await page.evaluate(() => document.querySelectorAll('.page-container').length)
    console.log('[Puppeteer] Final page count:', pageCount)

    // Inject print CSS
    await page.addStyleTag({ content: PRINT_CSS })
    await page.addStyleTag({ content: `.partial-report-banner { display: none !important; }` })
    await delay(200)

    // Measure total content height
    const totalHeight = await page.evaluate(() => {
      const containers = document.querySelectorAll('.page-container')
      if (containers.length === 0) return 1080
      let total = 0
      containers.forEach((container) => {
        const rect = container.getBoundingClientRect()
        const styles = window.getComputedStyle(container)
        const marginTop = parseInt(styles.marginTop, 10) || 0
        const marginBottom = parseInt(styles.marginBottom, 10) || 0
        total += rect.height + marginTop + marginBottom
      })
      return Math.max(1080, total + 100)
    })

    // Emulate print media
    await page.emulateMediaType('print')
    await delay(500)

    // Set tall viewport so all content is visible
    const viewportHeight = Math.min(totalHeight, 50000)
    await page.setViewport({ width: 1920, height: viewportHeight })
    await delay(500)

    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
      preferCSSPageSize: false,
    })

    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
