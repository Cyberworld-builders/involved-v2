/**
 * Report Design Constants
 * 
 * Matches legacy report system branding, colors, typography, and spacing
 * Based on legacy pdf.css and report templates
 */

export const REPORT_COLORS = {
  // Primary Colors
  primaryBlue: '#55a1d8',
  darkBlue: '#272842',
  darkBlueAlt: '#383b62', // Used for Involving-Stakeholders bars
  orangeRed: '#f26950',
  lightGray: '#c0c9cf',
  veryLightGray: '#e8ebed',
  white: '#ffffff',
  
  // Text Colors
  textPrimary: '#272842',
  textSecondary: '#666666',
  
  // Whitelabel Colors (Client ID 29 - Angela)
  whitelabel: {
    primary: '#595655',
    dark: '#7a4d4d',
    accent: '#c6a097',
  },
} as const

export const REPORT_TYPOGRAPHY = {
  // Cover Page
  coverTitle: {
    main: '95px', // "REPORT" word
    assessment: '36px', // Assessment name
    for: '34px', // "for" text
  },
  
  // Page Titles
  pageTitle: {
    large: '69px', // Main page titles
    medium: '50px', // Alt page titles
    small: '34px', // Alt2 page titles
  },
  
  // Body Text
  body: {
    fontSize: '14.8px',
    lineHeight: '27.05px',
    letterSpacing: '0.5px',
  },
  
  // Leader Info Text
  leaderInfo: {
    fontSize: '15.5px',
    lineHeight: '22px',
    big: '18px',
  },
  
  // Small Text
  small: {
    fontSize: '11px',
    lineHeight: '14px',
  },
  
  // Score Displays
  score: {
    large: '91px', // Large score display
    medium: '34px', // Medium score display
    small: '20px', // Small score display
  },
  
  // Footer
  footer: {
    fontSize: '14px',
    letterSpacing: '0.3px',
  },
} as const

export const REPORT_SPACING = {
  // Page Dimensions (A4 at 100 DPI)
  pageWidth: 850,
  pageHeight: 1100,
  
  // Padding
  pagePaddingTop: 59,
  pagePaddingBottom: 59,
  pagePaddingLeft: 73,
  pagePaddingRight: 73,
  
  // Content Area
  contentWidth: 704, // 850 - (73 * 2)
  contentHeight: 960, // Approximate content height
  
  // Margins
  sectionMargin: 20,
  sectionMarginLarge: 40,
  
  // Chart Dimensions
  chartHeight: 190,
  chartBarsHeight: 230,
  scoreDisplayHeight: 230,
} as const

export const REPORT_LAYOUT = {
  // Header
  headerLineHeight: 4, // 4px blue line
  logoWidth: 125,
  logoWidthRight: 134,
  
  // Footer
  footerWidth: 704,
  
  // Cover Page
  coverTitleTop: 285,
  coverShapesTop: 226,
  
  // Page Breaks
  pageBreakAfter: 'always',
} as const

export type ReportColorKey = keyof typeof REPORT_COLORS
export type WhitelabelColorKey = keyof typeof REPORT_COLORS.whitelabel
