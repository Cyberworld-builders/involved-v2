/**
 * PDF Export using Puppeteer (for Vercel serverless)
 * 
 * This is a fallback for production environments where Playwright doesn't work
 * Uses @sparticuz/chromium which is optimized for serverless environments
 */

// Puppeteer types

/**
 * Generate PDF from fullscreen report view URL using Puppeteer
 * 
 * @param viewUrl - Full URL to the fullscreen report view
 * @param cookies - Array of cookie objects for authentication
 * @param options - Additional options for PDF generation
 */
export async function generatePDFFromViewPuppeteer(
  viewUrl: string,
  cookies?: Array<{ name: string; value: string; domain?: string; path?: string }>,
  options?: {
    waitForSelector?: string
    waitForTimeout?: number
  }
): Promise<Buffer> {
  // Dynamic import to avoid bundling issues
  const puppeteer = await import('puppeteer-core')
  
  // Use @sparticuz/chromium for Vercel/serverless
  const isProduction = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
  
  let executablePath: string | undefined
  let args: string[] | undefined
  
  if (isProduction) {
    try {
      // Try @sparticuz/chromium-min first (includes necessary libraries, works better in Vercel)
      const chromium = await import('@sparticuz/chromium-min')
      // @sparticuz/chromium-min exports a default object with executablePath() and args
      executablePath = await chromium.default.executablePath()
      args = chromium.default.args
      console.log('[Puppeteer] Using @sparticuz/chromium-min for serverless')
    } catch {
      try {
        // Fallback to regular @sparticuz/chromium
        const chromium = await import('@sparticuz/chromium')
        executablePath = await chromium.default.executablePath()
        args = chromium.default.args
        console.log('[Puppeteer] Using @sparticuz/chromium for serverless')
      } catch (fallbackError) {
        console.warn('Failed to get @sparticuz/chromium executable:', fallbackError)
        // Will fail, but at least we tried
      }
    }
  }
  
  // Launch browser
  console.log('[Puppeteer] Launching browser...', { 
    isProduction, 
    hasExecutablePath: !!executablePath,
    argsCount: args?.length || 0 
  })
  
  interface LaunchOptions {
    headless: boolean
    executablePath?: string
    args?: string[]
  }
  
  const launchOptions: LaunchOptions = {
    headless: true,
  }
  
  if (executablePath) {
    launchOptions.executablePath = executablePath
  }
  
  if (args && args.length > 0) {
    launchOptions.args = args
  }
  
  // Additional args for Vercel/serverless environments
  if (isProduction) {
    launchOptions.args = [
      ...(launchOptions.args || []),
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process', // Important for serverless
    ]
  }
  
  const browser = await puppeteer.default.launch(launchOptions)
  console.log('[Puppeteer] Browser launched successfully')

  try {
    const url = new URL(viewUrl)
    const page = await browser.newPage()
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 })

    // Set authentication cookies if provided
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

    // Navigate to the fullscreen view
    await page.goto(viewUrl, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    })

    // Wait for React to hydrate and content to load
    if (options?.waitForSelector) {
      try {
        await page.waitForSelector(options.waitForSelector, { timeout: options.waitForTimeout || 30000 })
      } catch (e) {
        console.warn('Wait for selector failed, continuing...', e)
      }
    } else {
      // Default: wait for report loaded indicator
      try {
        await page.waitForSelector('[data-report-loaded]', { timeout: 30000 })
      } catch (e) {
        console.warn('Report loaded indicator not found, continuing...', e)
      }
    }

    // Wait for at least one page container
    try {
      await page.waitForSelector('.page-container', { timeout: 30000 })
    } catch {
      const pageContainerCount = await page.$$eval('.page-container', els => els.length).catch(() => 0)
      if (pageContainerCount === 0) {
        const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 200) || 'no body').catch(() => 'error')
        throw new Error(`No page containers found - report may not have loaded. Found ${pageContainerCount} containers. Body preview: ${bodyText}`)
      }
    }

    // Generate PDF with print media emulation
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0.5cm',
        right: '0.5cm',
        bottom: '0.5cm',
        left: '0.5cm',
      },
      preferCSSPageSize: false,
    })

    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
