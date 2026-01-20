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
  // Launch browser
  const browser = await chromium.launch({
    headless: true,
  })

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

    // Navigate to the fullscreen view
    await page.goto(viewUrl, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })

    // Wait for React to hydrate and content to load
    try {
      // Wait for the report to be loaded
      await page.waitForSelector('[data-report-loaded]', { timeout: 30000 })
    } catch (e) {
      console.warn('Report loaded indicator not found, continuing...')
    }

    // Wait for at least one page container
    try {
      await page.waitForSelector('.page-container', { timeout: 30000 })
    } catch (e) {
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

    // Get the total height of all content
    const totalHeight = await page.evaluate(() => {
      // Calculate total height including all page containers and margins
      const pageContainers = document.querySelectorAll('.page-container')
      if (pageContainers.length === 0) return 1080
      
      let total = 0
      pageContainers.forEach((container) => {
        const rect = container.getBoundingClientRect()
        total += rect.height + 40 // 40px for margins (20px top + 20px bottom)
      })
      
      return Math.max(1080, total + 100) // Add some padding
    })

    console.log(`Total content height: ${totalHeight}px`)

    // Update viewport to ensure all content is visible
    // Use a very tall viewport so Playwright can capture all pages
    await page.setViewportSize({ width: 1920, height: Math.min(totalHeight, 50000) })
    
    // Wait a moment for viewport change to take effect
    await page.waitForTimeout(500)

    // Generate PDF with A4 size matching legacy dimensions
    // Use displayHeaderFooter: false to avoid browser headers
    // Note: Playwright's PDF generation will automatically handle page breaks based on CSS
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
      // Ensure we capture all content by using the full page height
      // Playwright will respect CSS page-break rules
    })

    await context.close()
    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}
