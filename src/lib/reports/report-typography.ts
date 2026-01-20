/**
 * Report Typography Configuration
 * 
 * Matches legacy Avant Garde font system
 * Uses system fonts that closely approximate Avant Garde
 */

export const REPORT_FONTS = {
  // Font Families
  regular: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  demi: "'Helvetica Neue', Helvetica, Arial, sans-serif", // Use font-weight: 600-700
  oblique: "'Helvetica Neue', Helvetica, Arial, sans-serif", // Use font-style: italic
  demiOblique: "'Helvetica Neue', Helvetica, Arial, sans-serif", // Use font-weight: 600-700, font-style: italic
  
  // Fallback for PDF (Helvetica is standard in PDF)
  pdfRegular: 'Helvetica',
  pdfDemi: 'Helvetica-Bold',
  pdfOblique: 'Helvetica-Oblique',
} as const

export const REPORT_FONT_WEIGHTS = {
  regular: 400,
  demi: 600, // Can use 700 for stronger emphasis
  bold: 700,
} as const

export const REPORT_FONT_STYLES = {
  normal: 'normal',
  italic: 'italic',
  oblique: 'oblique',
} as const

/**
 * Get font family string for a given variant
 */
export function getReportFontFamily(variant: 'regular' | 'demi' | 'oblique' | 'demiOblique', isPDF = false): string {
  if (isPDF) {
    switch (variant) {
      case 'regular':
        return REPORT_FONTS.pdfRegular
      case 'demi':
        return REPORT_FONTS.pdfDemi
      case 'oblique':
        return REPORT_FONTS.pdfOblique
      case 'demiOblique':
        return REPORT_FONTS.pdfDemi // PDF doesn't support bold+italic easily
      default:
        return REPORT_FONTS.pdfRegular
    }
  }
  
  return REPORT_FONTS.regular
}

/**
 * Get font weight for a given variant
 */
export function getReportFontWeight(variant: 'regular' | 'demi' | 'oblique' | 'demiOblique'): number {
  if (variant === 'demi' || variant === 'demiOblique') {
    return REPORT_FONT_WEIGHTS.demi
  }
  return REPORT_FONT_WEIGHTS.regular
}

/**
 * Get font style for a given variant
 */
export function getReportFontStyle(variant: 'regular' | 'demi' | 'oblique' | 'demiOblique'): string {
  if (variant === 'oblique' || variant === 'demiOblique') {
    return REPORT_FONT_STYLES.italic
  }
  return REPORT_FONT_STYLES.normal
}
