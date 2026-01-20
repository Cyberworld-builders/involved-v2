/**
 * Report Asset Helper
 * 
 * Similar to legacy getAsset() helper function
 * Returns appropriate asset path for PDF vs HTML contexts
 */

import path from 'path'

/**
 * Get report asset path
 * 
 * @param assetPath - Relative path from /public/images/reports/ (e.g., 'logo-small.png')
 * @param isPDF - Whether this is for PDF generation (absolute path) or HTML (URL)
 * @returns Absolute file path for PDF, or relative URL for HTML
 */
export function getReportAsset(assetPath: string, isPDF: boolean): string {
  if (isPDF) {
    // For PDF generation, return absolute path
    // In server context, we need the full path to the file
    const publicPath = path.join(process.cwd(), 'public', 'images', 'reports', assetPath)
    return publicPath
  }
  
  // For HTML, return relative URL
  return `/images/reports/${assetPath}`
}

/**
 * Get report asset URL (for HTML/Image components)
 * Always returns URL path
 */
export function getReportAssetUrl(assetPath: string): string {
  return `/images/reports/${assetPath}`
}
