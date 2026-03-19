# Report Layout Reference

Reference images and specifications for Involved report PDF layout. Use these when implementing or adjusting report styling.

## Images

| File | Description |
|------|-------------|
| [`cover-page-logo-positioning.png`](./cover-page-logo-positioning.png) | Cover page: top banner, top logo, bottom Involved Talent logo |
| [`divider-correct-empower.png`](./divider-correct-empower.png) | **Preferred**: Title divider stops where title ends (SUB-DIMENSION: EMPOWER) |
| [`divider-incorrect-creative-problem-solving.png`](./divider-incorrect-creative-problem-solving.png) | **Avoid**: Title divider extends full-width to right margin (COMPETENCY: CREATIVE PROBLEM SOLVING) |
| [`client-feedback-creative-problem-solving.png`](./client-feedback-creative-problem-solving.png) | Client pen annotations on competency page — multiple issues |

---

## Client Feedback (Pen Annotations)

Reference: [`client-feedback-creative-problem-solving.png`](./client-feedback-creative-problem-solving.png)

| Annotation | Request | Status |
|------------|---------|--------|
| Arrow at end of "SOLVING" | "need to insert definition of competency here (for all comps)" | Pending |
| Oval around Self bar + x-axis | "Still messed up" — x-axis numbers (0,1,2,3,4,5) overlap the lowest bar | **In progress** |
| Arrow at left gap | "remove white space" between score and industry norm | Pending |
| Page 7 crossed out → 3 | "(fix page numbers)" | Addressed (commit d263022) |
| Bottom right note | "Same for all pages like this" | Applies to chart overlap across all competency/dimension pages |
| Top banner arrow | (Unclear — possibly header adjustment) | Addressed (commit 22a920a) |

---

## Cover Page Layout (Letter 8.5" × 11")

Reference: [`cover-page-logo-positioning.png`](./cover-page-logo-positioning.png)

### Top Banner & Logo

**Horizontal line (banner):**
- Vertical: y = 57px (~5.4% from top)
- Thickness: ~2px
- Left: x = 70px (~8.6%)
- Right: x = 575px (~70.5%)
- Width: ~505px (~61.9% of page)

**Top logo (Involved-Leader / Involved-360):**
- Left: ~587px (~71.9%)
- Right: ~744px (~91.2%)
- Top: ~55px (~5.2%)
- Bottom: ~77px (~7.3%)
- Size: ~157px × 22px (~19.2% × 2.1%)

### Bottom Involved Talent Logo

Reference: [`cover-page-logo-positioning.png`](./cover-page-logo-positioning.png)

- **Left edge:** ~61.4% from left
- **Right edge:** ~91.4% from left (right margin ~8.6%)
- **Top edge:** ~82.9% from top
- **Bottom edge:** ~91.2% from top (bottom margin ~8.8%)
- **Size:** ~2.55" × 0.91" (~30% × 8% of page)

---

## Title Divider Bar (Critical)

### Preferred Layout

Reference: [`divider-correct-empower.png`](./divider-correct-empower.png)

The divider bar under the main title (SUB-DIMENSION, COMPETENCY, etc.) must be **context-sensitive**:

- **Starts:** Left margin (aligned with title)
- **Ends:** Exactly where the title text ends (e.g. the "R" in "EMPOWER")
- **Length:** Matches title width, not page width
- **Style:** Thick dark navy line (~4–5px)

### Incorrect Layout (Avoid)

Reference: [`divider-incorrect-creative-problem-solving.png`](./divider-incorrect-creative-problem-solving.png)

- Divider extends full-width to the right margin
- Visually disconnected from the title
- Same length on every page regardless of title

### Implementation

Use `display: inline-block` with `borderBottom` on the title element so the border follows the text. Add `width: fit-content` if needed. Do not use a separate full-width bar element.

---

## Chart X-Axis Overlap (Critical)

Reference: [`client-feedback-creative-problem-solving.png`](./client-feedback-creative-problem-solving.png) — oval around "Self" bar and numbers 0, 1, 2.

### The Problem

The x-axis scale numbers (0, 1, 2, 3, 4, 5) are positioned **too high**. They overlap the bottom-most bar ("Self" in 360 reports). The numbers are rendered inside or on top of the last bar instead of below it.

### Root Cause

The x-axis labels use a fixed `paddingTop` (220px for 360 style) that does not account for the actual height of the bar region. When there are 5 bars (All Raters, Peer, Direct Report, Supervisor, Self), the bars extend to ~260px. The numbers at 220px sit inside the 5th bar.

### Required Fix

The x-axis numbers must be positioned **below** the bars with clear visual separation:

1. **Dynamic positioning**: `linePaddingTop` (or equivalent) must be `barsRegionHeight + gap`, where `barsRegionHeight = scores.length * (barHeight + rowGap)`.
2. **Minimum gap**: At least 15–20px between the bottom of the lowest bar and the top of the number text.
3. **Applies to**: Both 360 charts (`chartWidth: 563`) and Leader/Blocker charts (`chartWidth: 704`).

### Code Location

- **Component**: `src/components/reports/charts/horizontal-bar-chart.tsx` — `effectiveLinePadding` must be dynamic (`barsRegionHeight + scaleGap`), not fixed
- **CSS**: `src/app/dashboard/reports/[assignmentId]/view/report-styles.css` — `.chart .graph-lines .line` has `padding-top: 220px` (overridden by inline style when component provides correct value)

---

## Code Locations

- **Horizontal bar chart:** `src/components/reports/charts/horizontal-bar-chart.tsx`
- **Page header:** `src/components/reports/layout/page-header.tsx`
- **Cover page:** `src/components/reports/sections/cover-page.tsx`
- **360 report:** `src/components/reports/360-report-view-fullscreen.tsx`
- **Leader/Blocker report:** `src/components/reports/leader-blocker-report-view-fullscreen.tsx`
- **Design constants:** `src/lib/reports/report-design-constants.ts`
