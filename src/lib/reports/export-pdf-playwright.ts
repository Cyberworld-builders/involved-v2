/**
 * PDF Export using Playwright
 * 
 * Renders the fullscreen report view and converts to PDF
 * This ensures PDFs are identical to the fullscreen view
 */

import { chromium } from 'playwright-core'

/**
 * Generate PDF from fullscreen report view URL
 * 
 * @param viewUrl - Full URL to the fullscreen report view
 * @param cookies - Array of cookie objects for authentication
 * @param options - Additional options for PDF generation
 */
export async function generatePDFFromView(
  viewUrl: string,
  cookies?: Array<{ name: string; value: string; domain?: string; path?: string }>,
  options?: {
    waitForSelector?: string
    waitForTimeout?: number
  }
): Promise<Buffer> {
  console.log('[Playwright] Starting PDF generation from view URL:', viewUrl)
  
  // Use serverless-optimized Chromium for Vercel/AWS Lambda
  // In local development, use the default Playwright browser
  // Use dynamic import to avoid webpack bundling issues
  const isProduction = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
  
  let executablePath: string | undefined
  let args: string[] | undefined
  
  // Note: In production (Vercel), we use Puppeteer instead (see export-pdf-puppeteer.ts)
  // Playwright is only used for local development where the default browser works
  // No need to configure serverless Chromium here since this code path is only for local dev
  
  // Launch browser
  console.log('[Playwright] Launching browser...', { isProduction, hasExecutablePath: !!executablePath })
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath && { executablePath }),
    ...(args && { args }),
  })
  console.log('[Playwright] Browser launched successfully')

  try {
    const url = new URL(viewUrl)
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    })

    // Set authentication cookies if provided
    if (cookies && cookies.length > 0) {
      await context.addCookies(
        cookies.map(cookie => ({
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

    const page = await context.newPage()

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'export-pdf-playwright.ts:73',message:'About to navigate to view URL',data:{viewUrl,hasCookies:!!cookies,cookieCount:cookies?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    // Navigate to the fullscreen view
    console.log('[Playwright] Navigating to view URL...')
    await page.goto(viewUrl, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    console.log('[Playwright] Navigation complete, final URL:', page.url())

    // #region agent log
    const finalUrl = page.url()
    const pageTitle = await page.title().catch(() => 'unknown')
    const pageContent = await page.content().catch(() => 'error getting content')
    const contentLength = pageContent?.length || 0
    fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'export-pdf-playwright.ts:80',message:'After navigation',data:{finalUrl,pageTitle,contentLength,hasPageContainer:pageContent?.includes('page-container'),hasReportLoaded:pageContent?.includes('data-report-loaded')},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    // Wait for React to hydrate and content to load
    try {
      // Wait for the report to be loaded
      await page.waitForSelector('[data-report-loaded]', { timeout: 30000 })
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'export-pdf-playwright.ts:88',message:'Report loaded indicator found',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'export-pdf-playwright.ts:91',message:'Report loaded indicator not found',data:{error:e instanceof Error?e.message:'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.warn('Report loaded indicator not found, continuing...')
    }

    // Wait for at least one page container
    try {
      await page.waitForSelector('.page-container', { timeout: 30000 })
      // #region agent log
      const pageContainerCount = await page.$$eval('.page-container', els => els.length).catch(() => 0)
      fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'export-pdf-playwright.ts:100',message:'Page containers found',data:{count:pageContainerCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
    } catch (e) {
      // #region agent log
      const pageContainerCount = await page.$$eval('.page-container', els => els.length).catch(() => 0)
      const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 200) || 'no body').catch(() => 'error')
      fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'export-pdf-playwright.ts:106',message:'No page containers found',data:{pageContainerCount,bodyTextPreview:bodyText,finalUrl:page.url()},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      throw new Error('No page containers found - report may not have loaded')
    }

    // Get expected page count from data attribute if available
    const expectedPageCount = await page.evaluate(() => {
      const container = document.querySelector('[data-report-pages]')
      if (container) {
        const count = container.getAttribute('data-report-pages')
        return count ? parseInt(count, 10) : null
      }
      return null
    })
    
    if (expectedPageCount) {
      console.log(`Expected ${expectedPageCount} pages in report`)
    }

    // Wait for all images to load
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images).map((img) => {
          if (img.complete) return Promise.resolve()
          return new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = resolve // Continue even if image fails
            setTimeout(resolve, 5000) // Timeout after 5s
          })
        })
      )
    })

    // Wait for React to finish rendering all pages
    // Check for page containers multiple times to ensure all are rendered
    let previousCount = 0
    let stableCount = 0
    const maxWaitIterations = expectedPageCount ? 20 : 10 // Wait longer if we know expected count
    
    for (let i = 0; i < maxWaitIterations; i++) {
      await page.waitForTimeout(500)
      const currentCount = await page.evaluate(() => {
        return document.querySelectorAll('.page-container').length
      })
      
      console.log(`Iteration ${i + 1}: Found ${currentCount} page containers${expectedPageCount ? ` (expected ${expectedPageCount})` : ''}`)
      
      // If we have expected count and match, we're done
      if (expectedPageCount && currentCount >= expectedPageCount) {
        console.log(`All expected pages loaded (${currentCount}/${expectedPageCount})`)
        break
      }
      
      if (currentCount === previousCount && currentCount > 0) {
        stableCount++
        if (stableCount >= 3) {
          // Count has been stable for 3 checks, assume all pages are loaded
          console.log(`Page count stable at ${currentCount} for 3 iterations`)
          break
        }
      } else {
        stableCount = 0
      }
      
      previousCount = currentCount
    }

    // Scroll to bottom to ensure all pages are rendered
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })

    // Wait a bit for any lazy-loaded content
    await page.waitForTimeout(2000)

    // Scroll back to top
    await page.evaluate(() => {
      window.scrollTo(0, 0)
    })

    // Additional wait for all content to be fully rendered
    await page.waitForTimeout(2000)

    // Wait for network to be idle
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 })
    } catch (e) {
      console.warn('Network idle timeout, continuing...')
    }

    // Count how many page containers we have
    const pageCount = await page.evaluate(() => {
      return document.querySelectorAll('.page-container').length
    })

    console.log(`Found ${pageCount} page containers for PDF generation`)

    if (pageCount === 0) {
      throw new Error('No page containers found in the report')
    }

    // Inject CSS to fix layout issues for PDF generation FIRST
    // This must happen before measurements so margins are removed
    await page.addStyleTag({
      content: `
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
        /* Remove margins from page containers for PDF - prevents overflow */
        .page-container {
          margin-top: 0 !important;
          margin-bottom: 0 !important;
        }
        /* Ensure cover page doesn't overflow - use page-break-before on second page instead */
        .page-container:first-child {
          page-break-after: auto !important;
        }
        .page-container:nth-child(2) {
          page-break-before: always !important;
        }
        /* Remove page-break-after from last page to prevent blank page at end */
        .page-container:last-child {
          page-break-after: auto !important;
        }
        /* Fix footer positioning - ensure it's at the bottom accounting for page-wrapper padding */
        .page-footer {
          bottom: 0 !important;
          position: absolute !important;
        }
        /* Ensure page-wrapper doesn't overflow container */
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
          /* Remove margins in print media as well */
          .page-container {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }
          /* Ensure cover page doesn't overflow - use page-break-before on second page instead */
          .page-container:first-child {
            page-break-after: auto !important;
          }
          .page-container:nth-child(2) {
            page-break-before: always !important;
          }
          /* Remove page-break-after from last page to prevent blank page at end */
          .page-container:last-child {
            page-break-after: auto !important;
          }
          /* Fix footer positioning in print */
          .page-footer {
            bottom: 0 !important;
            position: absolute !important;
          }
          /* Ensure page-wrapper doesn't overflow container */
          .page-wrapper {
            padding-bottom: 59px !important;
          }
        }
      `
    })
    
    // Wait for CSS to apply
    await page.waitForTimeout(200)

    // Get the total height of all content and detailed measurements
    const pageMeasurements = await page.evaluate(() => {
      // #region agent log
      const logData = {
        location: 'export-pdf-playwright.ts:171',
        message: 'Measuring page containers AFTER margin removal',
        data: { containerCount: 0, measurements: [] as Array<Record<string, unknown>> },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'post-fix',
        hypothesisId: 'A'
      };
      fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(()=>{});
      // #endregion
      
      // Calculate total height - margins should now be 0
      const pageContainers = document.querySelectorAll('.page-container')
      if (pageContainers.length === 0) return { totalHeight: 1080, measurements: [] }
      
      const measurements: Array<{index: number, height: number, marginTop: number, marginBottom: number, computedHeight: string, totalHeight: number}> = []
      let total = 0
      
      pageContainers.forEach((container, index) => {
        const rect = container.getBoundingClientRect()
        const styles = window.getComputedStyle(container)
        const marginTop = parseInt(styles.marginTop) || 0
        const marginBottom = parseInt(styles.marginBottom) || 0
        const computedHeight = styles.height
        const totalHeight = rect.height + marginTop + marginBottom
        
        measurements.push({
          index,
          height: rect.height,
          marginTop,
          marginBottom,
          computedHeight,
          totalHeight
        })
        
        total += totalHeight
      })
      
      // #region agent log
      const logData2 = {
        location: 'export-pdf-playwright.ts:205',
        message: 'Page container measurements complete (post-fix)',
        data: { containerCount: pageContainers.length, measurements, totalHeight: total },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'post-fix',
        hypothesisId: 'A'
      };
      fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData2)}).catch(()=>{});
      // #endregion
      
      return { totalHeight: Math.max(1080, total + 100), measurements }
    })

    const totalHeight = pageMeasurements.totalHeight
    console.log(`Total content height: ${totalHeight}px`)
    
    // #region agent log
    const logData3 = {
      location: 'export-pdf-playwright.ts:217',
      message: 'Container height analysis (post-fix)',
      data: { 
        containerCount: pageMeasurements.measurements.length,
        avgHeight: pageMeasurements.measurements.reduce((sum, m) => sum + m.height, 0) / pageMeasurements.measurements.length,
        minHeight: Math.min(...pageMeasurements.measurements.map(m => m.height)),
        maxHeight: Math.max(...pageMeasurements.measurements.map(m => m.height)),
        avgTotalHeight: pageMeasurements.measurements.reduce((sum, m) => sum + m.totalHeight, 0) / pageMeasurements.measurements.length,
        measurements: pageMeasurements.measurements.slice(0, 5) // First 5 for analysis
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'post-fix',
      hypothesisId: 'A'
    };
    fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData3)}).catch(()=>{});
    // #endregion


    // Emulate print media to ensure print styles are applied
    // This is critical for CSS page-break rules to work
    await page.emulateMedia({ media: 'print' })
    
    // Wait for print styles to apply
    await page.waitForTimeout(500)

    // Update viewport to ensure all content is visible
    // Use a very tall viewport so Playwright can capture all pages
    // Note: totalHeight now reflects containers without margins (1100px each instead of 1140px)
    await page.setViewportSize({ width: 1920, height: Math.min(totalHeight, 50000) })
    
    // Wait a moment for viewport change to take effect
    await page.waitForTimeout(500)

    // Check PDF page dimensions and page break CSS before generating
    // Focus on first few pages (cover + TOC) to diagnose blank page issue
    const pdfPageInfo = await page.evaluate(() => {
      // #region agent log
      const logData = {
        location: 'export-pdf-playwright.ts:270',
        message: 'Checking footer positioning and last page break',
        data: { 
          containerCount: document.querySelectorAll('.page-container').length,
          layoutPadding: null as Record<string, unknown> | null,
          firstPagePosition: null as Record<string, unknown> | null,
          lastPageInfo: null as Record<string, unknown> | null,
          footerPositions: [] as Array<Record<string, unknown>>,
          pageBreakStyles: [] as Array<Record<string, unknown>>
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run4',
        hypothesisId: 'K'
      };
      
      // Check layout container padding
      const layoutContainer = document.querySelector('.report-view-container')
      const innerContainer = layoutContainer?.querySelector('div')
      if (layoutContainer) {
        const layoutStyles = window.getComputedStyle(layoutContainer)
        const innerStyles = innerContainer ? window.getComputedStyle(innerContainer) : null
        logData.data.layoutPadding = {
          outerPaddingTop: layoutStyles.paddingTop,
          outerPaddingBottom: layoutStyles.paddingBottom,
          innerPaddingTop: innerStyles?.paddingTop || null,
          innerPaddingBottom: innerStyles?.paddingBottom || null,
          totalTopPadding: (parseInt(layoutStyles.paddingTop) || 0) + (parseInt(innerStyles?.paddingTop || '0') || 0)
        }
      }
      
      const containers = document.querySelectorAll('.page-container')
      
      // Get first page position
      const firstPage = containers[0]
      if (firstPage) {
        const firstRect = firstPage.getBoundingClientRect()
        const firstStyles = window.getComputedStyle(firstPage)
        logData.data.firstPagePosition = {
          top: firstRect.top,
          left: firstRect.left,
          height: firstRect.height,
          marginTop: firstStyles.marginTop,
          marginBottom: firstStyles.marginBottom,
          computedTop: firstStyles.top,
          offsetTop: (firstPage as HTMLElement).offsetTop
        }
      }
      
      // Get last page info
      const lastPage = containers[containers.length - 1]
      if (lastPage) {
        const lastStyles = window.getComputedStyle(lastPage)
        const lastRect = lastPage.getBoundingClientRect()
        logData.data.lastPageInfo = {
          index: containers.length - 1,
          pageBreakAfter: lastStyles.pageBreakAfter || lastStyles.breakAfter,
          height: lastRect.height,
          marginBottom: lastStyles.marginBottom
        }
      }
      
      // Get footer positions for first 3 pages
      const footerPositions = Array.from(containers).slice(0, 3).map((container, i) => {
        const footer = container.querySelector('.page-footer')
        if (footer) {
          const footerStyles = window.getComputedStyle(footer)
          const footerRect = footer.getBoundingClientRect()
          const containerRect = container.getBoundingClientRect()
          return {
            pageIndex: i,
            footerBottom: footerStyles.bottom,
            footerPosition: footerStyles.position,
            footerTop: footerRect.top,
            containerBottom: containerRect.bottom,
            distanceFromBottom: containerRect.bottom - footerRect.bottom
          }
        }
        return { pageIndex: i, footer: null }
      })
      
      // Get detailed info for first 3 pages
      const pageBreakStyles = Array.from(containers).slice(0, 3).map((container, i) => {
        const styles = window.getComputedStyle(container)
        const rect = container.getBoundingClientRect()
        return {
          index: i,
          isFirst: i === 0,
          isLast: i === containers.length - 1,
          top: rect.top,
          height: rect.height,
          marginTop: styles.marginTop,
          marginBottom: styles.marginBottom,
          pageBreakAfter: styles.pageBreakAfter || styles.breakAfter
        }
      })
      
      logData.data.pageBreakStyles = pageBreakStyles
      logData.data.footerPositions = footerPositions
      fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(()=>{});
      // #endregion
      
      // A4 dimensions in pixels at 96 DPI: 210mm × 297mm = 794px × 1123px
      // But Playwright uses points: A4 = 595.276 × 841.890 points
      // At 72 DPI (standard for PDF): A4 = 595.276 × 841.890 points ≈ 794px × 1123px at 96 DPI
      const containerHeight = 1100
      const marginTop = parseInt(pageBreakStyles[0]?.marginTop || '0') || 0
      const marginBottom = parseInt(pageBreakStyles[0]?.marginBottom || '0') || 0
      const containerWithMargins = containerHeight + marginTop + marginBottom
      
      return {
        a4HeightPx: 1123, // Approximate A4 height in pixels at 96 DPI
        a4HeightPoints: 841.890, // A4 height in points
        containerHeight,
        containerWithMargins,
        marginTop,
        marginBottom
      }
    })
    
    // #region agent log
    const logData4 = {
      location: 'export-pdf-playwright.ts:300',
      message: 'PDF page dimension analysis - after footer and last page fixes',
      data: {
        a4HeightPx: pdfPageInfo.a4HeightPx,
        containerHeight: pdfPageInfo.containerHeight,
        containerWithMargins: pdfPageInfo.containerWithMargins,
        marginTop: pdfPageInfo.marginTop,
        marginBottom: pdfPageInfo.marginBottom,
        exceedsA4: pdfPageInfo.containerWithMargins > pdfPageInfo.a4HeightPx,
        overflow: pdfPageInfo.containerWithMargins - pdfPageInfo.a4HeightPx
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run4',
      hypothesisId: 'K'
    };
    fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData4)}).catch(()=>{});
    // #endregion

    // Generate PDF with A4 size matching legacy dimensions
    // Use displayHeaderFooter: false to avoid browser headers
    // Note: Playwright's PDF generation will automatically handle page breaks based on CSS
    // The print media emulation ensures CSS page-break rules are respected
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
      preferCSSPageSize: false,
      scale: 1,
      displayHeaderFooter: false,
      // Ensure we capture all content - Playwright will respect CSS page-break rules
      // when print media is emulated
    })
    
    // #region agent log
    const logData5 = {
      location: 'export-pdf-playwright.ts:330',
      message: 'PDF generation complete - after footer and last page fixes',
      data: { pdfBufferSize: pdfBuffer.length },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run4',
      hypothesisId: 'K'
    };
    fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData5)}).catch(()=>{});
    // #endregion

    await context.close()
    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}
