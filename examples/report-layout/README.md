# Report Layout Reference

Reference images and specifications for Involved report PDF layout. Use these when implementing or adjusting report styling.

## Images

| File | Description |
|------|-------------|
| [`cover-page-logo-positioning.png`](./cover-page-logo-positioning.png) | Cover page: top banner, top logo, bottom Involved Talent logo |
| [`divider-correct-empower.png`](./divider-correct-empower.png) | **Preferred**: Title divider stops where title ends (SUB-DIMENSION: EMPOWER) |
| [`divider-incorrect-creative-problem-solving.png`](./divider-incorrect-creative-problem-solving.png) | **Avoid**: Title divider extends full-width to right margin (COMPETENCY: CREATIVE PROBLEM SOLVING) |
| [`client-feedback-creative-problem-solving.png`](./client-feedback-creative-problem-solving.png) | Client pen annotations on competency page — multiple issues |
| [`client-feedback-vertical-spacing-single-rater-markup.png`](./client-feedback-vertical-spacing-single-rater-markup.png) | **Problem (avoid)**: Creative Problem Solving, single rater — **markup** flags **too much** vertical space (legend→chart **and** axis→GEONORM). Not a “good” reference. |
| [`reference-preferred-tight-chart-to-norms-five-raters.png`](./reference-preferred-tight-chart-to-norms-five-raters.png) | **Preferred spacing**: five rater rows — tight gap from x-axis to industry norm + group average row |

---

## Problem: Excessive vertical spacing (single rater, markup)

Reference: [`client-feedback-vertical-spacing-single-rater-markup.png`](./client-feedback-vertical-spacing-single-rater-markup.png)

This screenshot is an example of **what’s wrong**, not a target layout. Hand-drawn arrows call out **two** separate spacing problems on the same competency page (Creative Problem Solving, one “All Raters” bar):

| Markup | Location | Issue |
|--------|----------|--------|
| **1** | Between the **growth legend** (“Indicates Significant Growth Opportunity”) and the **top** of the bar chart / large score | Too much vertical gap — tighten margins on the chart section title block (`marginBottom` on the “Your Current Scores…” title), and/or `marginTop` on the score+chart row, in `360-report-view-fullscreen.tsx`. |
| **2** | Between the **x-axis labels** (0–5) and the **GEONORM** summary row | Too much vertical gap — same class of fixes as other chart-to-norms notes: chart wrapper height (`horizontal-bar-chart.tsx`, `REPORT_SPACING` floors), and small `margin-top` on the norms row. |

**Do not** use this file as the “good” single-rater example; use [`reference-preferred-tight-chart-to-norms-five-raters.png`](./reference-preferred-tight-chart-to-norms-five-raters.png) for **tight chart-to-norms** spacing, and apply the same principles when there is only one rater row.

---

## Preferred: Chart-to-norms vertical spacing (reference)

The **five-rater** screenshot below is the **target** for how much vertical space should appear **between** the bottom of the horizontal bar chart (including the 0–5 axis labels) and the **summary row** below (industry norm, “average for this group,” etc.). The layout should feel **compact**: roughly **one line of text** (~14–20px) of separation, not a large white band.

### Visual reference (good example)

| File | Scenario | What “good” looks like |
|------|----------|-------------------------|
| [`reference-preferred-tight-chart-to-norms-five-raters.png`](./reference-preferred-tight-chart-to-norms-five-raters.png) | **Competency: Leadership Adaptability** — five rater rows, growth flags | Gap from x-axis numbers to **industry norm** and **average for this group** is minimal (~height of one label line); the two norms read as **one footer strip** directly under the chart. |

### Technical notes (for implementation)

1. **Height model** — The chart component (`horizontal-bar-chart.tsx`) sizes the `.bars` / `.graph` wrapper using bar count, axis gap, and legacy `Math.max` floors (`chartBarsHeight`, `chartHeight`). Any **extra height** on that wrapper below the painted axis becomes **visible whitespace** above the norms row. Prefer a height that ends **just below** the tick labels, or split **bars** and **axis** into separate rows so the wrapper does not over-reserve space.
2. **Bar-count sensitivity** — With **one** rater row, `barsRegionHeight` is small; a fixed minimum height (e.g. 230px) can create a **large** empty region under the axis (see markup **2** on [`client-feedback-vertical-spacing-single-rater-markup.png`](./client-feedback-vertical-spacing-single-rater-markup.png)). **Do not** leave a tall blank area when few bars are present.
3. **Legend-to-chart gap** — Large `marginBottom` on the centered chart title (“Your Current Scores By Ratee Source”) contributes to markup **1**; reduce only if hierarchy still reads clearly.
4. **Norms row** — Keep **`margin-top`** on the norms block small (e.g. **0–4px**) after overlap fixes; align the norms row with the **chart column** (`padding-left: chartScoreColumnWidth`, `justify-content: flex-start`) so the summary sits under the bars, not floating in the center of the full content width.
5. **Contrast** — [`client-feedback-creative-problem-solving.png`](./client-feedback-creative-problem-solving.png) and [`client-feedback-vertical-spacing-single-rater-markup.png`](./client-feedback-vertical-spacing-single-rater-markup.png) show **undesired** spacing. Use [`reference-preferred-tight-chart-to-norms-five-raters.png`](./reference-preferred-tight-chart-to-norms-five-raters.png) as the spacing **target** for chart-to-norms tightness.

---

## Client Feedback (Pen Annotations)

References: [`client-feedback-creative-problem-solving.png`](./client-feedback-creative-problem-solving.png) (pen), [`client-feedback-vertical-spacing-single-rater-markup.png`](./client-feedback-vertical-spacing-single-rater-markup.png) (spacing markup, single rater)

| Annotation | Request | Status |
|------------|---------|--------|
| Arrow at end of "SOLVING" | "need to insert definition of competency here (for all comps)" | **Addressed** — dimension description/definition renders as HTML below title (TipTap content from `fields`) |
| Oval around Self bar + x-axis | "Still messed up" — x-axis numbers (0,1,2,3,4,5) overlap the lowest bar | **Addressed** — dynamic axis padding in `chart-axis-layout.ts` + `horizontal-bar-chart.tsx` |
| Arrow at left gap | "remove white space" between score and industry norm | **Addressed** — norms row `padding-left` aligns with bar chart (`chartScoreColumnWidth`), `justify-content: flex-start` |
| Page 7 crossed out → 3 | "(fix page numbers)" | Addressed (commit d263022) |
| Bottom right note | "Same for all pages like this" | Applies to chart overlap across all competency/dimension pages |
| Top banner arrow | (Unclear — possibly header adjustment) | Addressed (commit 22a920a) |
| Vertical spacing markup (single rater) | Arrow **1**: less space between growth legend and chart; arrow **2**: less space between x-axis and GEONORM | **Pending** — see [Problem: Excessive vertical spacing](#problem-excessive-vertical-spacing-single-rater-markup) |

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

- **Layout math**: `src/lib/reports/chart-axis-layout.ts` — `computeBarsRegionHeight`, `computeAxisLinePaddingTop`, `X_AXIS_LABEL_GAP_PX` (≥15–20px gap per spec)
- **Component**: `src/components/reports/charts/horizontal-bar-chart.tsx` — inline `paddingTop` on grid lines from axis layout helpers (no fixed 220px)
- **CSS**: `src/app/dashboard/reports/[assignmentId]/view/report-styles.css` — `.chart .graph-lines .line` has no fixed `padding-top` (inline wins)

---

## Code Locations

- **Horizontal bar chart:** `src/components/reports/charts/horizontal-bar-chart.tsx`
- **Chart axis layout (tests):** `src/lib/reports/chart-axis-layout.ts`, `src/__tests__/lib/reports/chart-axis-layout.test.ts`
- **360 norms alignment + competency HTML:** `src/components/reports/360-report-view-fullscreen.tsx`
- **Page header:** `src/components/reports/layout/page-header.tsx`
- **Cover page:** `src/components/reports/sections/cover-page.tsx`
- **360 report:** `src/components/reports/360-report-view-fullscreen.tsx`
- **Leader/Blocker report:** `src/components/reports/leader-blocker-report-view-fullscreen.tsx`
- **Design constants:** `src/lib/reports/report-design-constants.ts`
