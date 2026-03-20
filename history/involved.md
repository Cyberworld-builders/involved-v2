# Log of Initiatives for Involved V2

you were using:
admin@demo.com
Test123$

so it sounds like the reason the client didn't see any changes was because there were undeployed changes. and a reason why he might still not see some of them is because the report was generated before the changes were made and is cached in a way and will need to be rerun to pick up the changes. also, he might still not notice the dimention definitions becuase they may actually not be defined. but other than that he should see many updates.

do you have the context of what all the client last reported when we started this branch? we had a client pipeline in gusclaw that had mixed results but it did manage to create many issues even if the prs didn't quite address everything without a human touch given the nature of the changes (style, layout, etc.). check the gus memory and the recent issues and the client pipeline for insight into what all was requested in terms of bug fixes and revisions. we want to try and compare this to the commit history and the current state of the code and address anything we missed.

on the front page of the reports, the involved logo is too high. our latest example is https://involved-v2.cyberworldbuilders.dev/reports/3eda9e70-c171-475b-820e-295910470e0b/view. we've gotten it a lot lower but it looks like he wants it all the way down to the bottom of the page.

page two has some text that mentions "norms". this should be changed to "geonorms".

ok i see what's happening. on the titles that are long enough to wrap, it goes full width. i don't have an example in the "clean" report that wraps so it's unclear what to do in this scenario. maybe we should actually make the title smaller to try and avoid wrapping. 

Replacing the single-rater image with the marked-up version and updating the README: removing it from "preferred" references and documenting it as a problem example.

Updating the README: the single-rater asset is a problem example with markup; only the five-rater image remains the preferred reference.

README.md
+22
-7
| [`client-feedback-creative-problem-solving.png`](./client-feedback-creative-problem-solving.png) | Client pen annotations on competency page — multiple issues || [`reference-preferred-tight-chart-to-norms-single-rater.png`](./reference-preferred-tight-chart-to-norms-single-rater.png) | **Preferred spacing**: single rater row — tight gap from x-axis (0–5) to GEONORM / summary row || [`reference-preferred-tight-chart-to-norms-five-raters.png`](./reference-preferred-tight-chart-to-norms-five-raters.png) | **Preferred spacing**: five rater rows — tight gap from x-axis to industry norm + group average row |
| [`reference-preferred-tight-chart-to-norms-single-rater.png`](./reference-preferred-tight-chart-to-norms-single-rater.png) | **Preferred spacing**: single rater row — tight gap from x-axis (0–5) to GEONORM / summary row || [`client-feedback-creative-problem-solving.png`](./client-feedback-creative-problem-solving.png) | Client pen annotations on competency page — multiple issues || [`client-feedback-vertical-spacing-single-rater-markup.png`](./client-feedback-vertical-spacing-single-rater-markup.png) | **Problem (avoid)**: Creative Problem Solving, single rater — **markup** flags **too much** vertical space (legend→chart **and** axis→GEONORM). Not a “good” reference. || [`reference-preferred-tight-chart-to-norms-five-raters.png`](./reference-preferred-tight-chart-to-norms-five-raters.png) | **Preferred spacing**: five rater rows — tight gap from x-axis to industry norm + group average row |
README.md
+1
-1
Reference: [`client-feedback-creative-problem-solving.png`](./client-feedback-creative-problem-solving.png)
Reference: [`client-feedback-creative-problem-solving.png`](./client-feedback-creative-problem-solving.png)References: [`client-feedback-creative-problem-solving.png`](./client-feedback-creative-problem-solving.png) (pen), [`client-feedback-vertical-spacing-single-rater-markup.png`](./client-feedback-vertical-spacing-single-rater-markup.png) (spacing markup, single rater)
README.md
+1
| Top banner arrow | (Unclear — possibly header adjustment) | Addressed (commit 22a920a) |
| Top banner arrow | (Unclear — possibly header adjustment) | Addressed (commit 22a920a) || Vertical spacing markup (single rater) | Arrow **1**: less space between growth legend and chart; arrow **2**: less space between x-axis and GEONORM | **Pending** — see [Problem: Excessive vertical spacing](#problem-excessive-vertical-spacing-single-rater-markup) |
Here’s what changed:

Image
Removed reference-preferred-tight-chart-to-norms-single-rater.png (it was treated as “good” but had no markup and was the wrong story).
Added client-feedback-vertical-spacing-single-rater-markup.png from
image-96e14c4c-67d7-4da8-830f-a73727eceaf1.png — Creative Problem Solving, single rater, with arrows for the bad spacing.
README
Images table: single-rater file is documented as problem / avoid, not preferred; only reference-preferred-tight-chart-to-norms-five-raters.png is called out for preferred chart-to-norms spacing.
New section “Problem: Excessive vertical spacing (single rater, markup)”: explains this is what’s wrong, with a table for markup 1 (legend → chart) and markup 2 (axis → GEONORM) and pointers to 360-report-view-fullscreen / chart height / norms.
“Preferred: Chart-to-norms…”: narrowed to the five-rater shot as the good reference; technical notes updated (bar-count sensitivity now cites the new markup image; added legend-to-chart note; contrast bullet lists both client-feedback PNGs vs the five-rater target).
Client Feedback table: second reference + a Pending row for the two spacing arrows.
So: tight “good” example = five-rater file only; single-rater with arrows = problem example with explicit markup locations.


we need a way to export all data for a survey as system agnostic structured data. then we need a way to re-create system data from the export object.

we might do this: take a snapshot, restore to the most recent backup, export the data (we need a good way to export survey data as system agonstic data anyway). at that poitn we can export the survey data as an object, then restore back to the snapshot we just took. then import the survey data export on top of that. what do you think? is that better than what you proposed? or the same?

ok maybe we went a little overboard on removing whitespace. now the score labels are bunching up on the chart please advise in this md

### 2026-03-20 — Report: “bunching” after tightening whitespace (chart vs norms row)

**What people are seeing:** The **0–5 x-axis numbers** sit very close to—or **overlap**—the **norms row** below (“GEONORM…”, “AVG SCORE…”). It can look like the **“5” tick collides with the “GROUP” / footer text**, or that “score labels” are crammed against the chart. That’s usually **vertical clearance**, not the horizontal bar labels (Peer, Self, etc.).

**Why it happened:** We removed dead space in three places: legacy `.norms { top: 70px }`, `alignItems: flex-start` on the score+chart row, and possibly smaller `margin-top` on norms. Together, the **chart’s axis band** and the **norms row** can occupy the same vertical band in the PDF/view.

**What to do (pick one or combine lightly — don’t bring back the old 70px gap):**

1. **Norms row:** Add a **small** top margin only if needed, e.g. `marginTop: '6px'`–`'12px'` on `div.norms` in `360-report-view-fullscreen.tsx` — enough to clear descenders/axis ticks, not a huge band.
2. **Chart component:** In `horizontal-bar-chart.tsx` / `chart-axis-layout.ts`, bump **`X_AXIS_LABEL_GAP_PX`** slightly (e.g. +4–8px) so tick labels sit **lower** with a predictable gap above the norms row.
3. **Norms row horizontal:** If the issue is **footer divider / text** crowding the chart grid, that’s separate from vertical tightening — norms use `max-content` + a dedicated divider; don’t confuse with axis overlap.

**Principle:** Treat **axis-to-norms** as its own minimum clearance (~one line height); treat **chart-to-norms** tightening as separate from **legend-to-chart** tightening.

it's still too high. so, these charts may vary in how tall they are so the scores should really be positioned directly below wherever that ends. this should fix the remaining overlap and be flexible for different chart heights. also, there appears to be two verticle divider lines between the scores now. 

### 2026-03-20 — Norms under chart column + single divider (follow-up)

**Request:** (1) Position GEONORM / group scores **directly below the bar chart** so variable chart heights don’t leave the footer overlapping the x-axis ticks. (2) **Two vertical lines** between the two score blocks — remove duplicate.

**What we changed (involved-v2):**

1. **DOM / layout:** Wrapped `HorizontalBarChart` and `div.norms` in a **column** (`flexDirection: 'column'`) inside the **chart area only** (`width: chartAreaWidth360` = 563px), beside the left score column. Norms are no longer a full-width sibling below the whole score+chart row, so they always sit **immediately under** the chart’s bottom (including axis), not under a taller flex row box.

2. **Double divider:** Legacy `report-styles.css` had `.norm-group.group { border-left: 2px ... }` **and** React rendered a separate 2px divider `div`. **Removed the CSS border-left**; only the React divider remains.

**Refs:** `src/components/reports/360-report-view-fullscreen.tsx`, `src/app/dashboard/reports/[assignmentId]/view/report-styles.css`, `REPORT_SPACING.chartAreaWidth360` in `report-design-constants.ts`.

### 2026-03-20 — Axis ticks vs GEONORM overlap (code, not docs-only)

**Issue:** 0–5 tick labels and GEONORM row were **vertically colliding** — `.bars` / `.graph` height was only `barsRegion + X_AXIS_LABEL_GAP_PX`, but tick `<span>`s sit **below** that padding with CSS `margin-top: 14px` + inline `top: 4px`, so labels extended **past** the container while the norms row started right after.

**Fix (implemented):** `computeGraphContainerHeight()` adds **`X_AXIS_TICK_TEXT_RESERVE_PX` (34)** so the chart wrapper is tall enough for the full tick block. `linePaddingTop` unchanged — tick position relative to bars stays the same.

**Earlier same day:** `ScoreDisplay` renamed to **`report-score-display`** so legacy `.chart .score` (`height: 230px`, `padding-top: 100px`) does not apply; that was a separate bug from axis/norms overlap.

**Refs:** `src/lib/reports/chart-axis-layout.ts`, `src/components/reports/charts/horizontal-bar-chart.tsx`.

### 2026-03-20 — Tighter axis ticks, centered norms, PDF duplicate divider

**Feedback:** (1) 0–5 numbers still too low vs bars — want them **directly under** the axis. (2) **Center** GEONORM / group blocks on **full page** width, not only under the chart column. (3) **Double vertical lines** — second line was **`border-left` on `.norm-group.group`** in the **(reports)** PDF stylesheet, not the dashboard one.

**Changes:**

1. **`chart-axis-layout.ts`** — `X_AXIS_LABEL_GAP_PX` **26 → 16**; `X_AXIS_TICK_TEXT_RESERVE_PX` **34 → 22** (container still clears norms).
2. **`horizontal-bar-chart.tsx`** — Tick `<span>` **`marginTop: 0`**, **`top: 2px`** (overrides CSS `margin-top: 14px` on `.line > span`) so labels sit tighter under the bars.
3. **`360-report-view-fullscreen.tsx`** — Norms row **outside** the score+chart flex: full-width wrapper with **`justifyContent: 'center'`**; norms **`maxWidth: contentWidth`**, **`justifyContent: 'center'`**. **`norm-group.group`** inline **`borderLeft: 'none'`, `paddingLeft: 0`**.
4. **`src/app/(reports)/reports/[assignmentId]/view/report-styles.css`** — Removed **`border-left`** and **`padding-left`** from `.norm-group.group` (matched dashboard; PDF had been doubling the React divider).

**Refs:** `chart-axis-layout.ts`, `horizontal-bar-chart.tsx`, `360-report-view-fullscreen.tsx`, both `report-styles.css` paths.

### 2026-03-20 — Score vs chart vertical center; norms divider between blocks

**Feedback:** (1) Large **overall score** on the left sat **too high** — should be **vertically centered** with the bar chart. (2) **Vertical divider** between GEONORM and group scores should sit **on the midpoint** between the **two** score blocks, not offset.

**Changes (`360-report-view-fullscreen.tsx`):**

1. Score + chart row: **`alignItems: 'flex-start'` → `'center'`** so the score column centers against the chart height.
2. **`score-container`:** **`alignItems: 'center'`** (was `flex-start`) so the big number is centered in its column.
3. When **`geonorm !== null`:** norms row uses **`display: flex`** with **`flex: 1`** left and right **wrappers** — industry **`justifyContent: 'flex-end'`**, group **`justifyContent: 'flex-start'`**, fixed-width divider **between** — so the line is **horizontally centered between** the two clusters. When **`geonorm === null`**, single GEONORM block stays **centered** as before.

### 2026-03-20 — Norms: more gap below chart; center cards in each half

**Feedback:** (1) A bit **more space** between the **chart** and the **norms** row. (2) Divider was **geometrically** centered but looked off because the **right** card sat flush to the divider — **match** the **visual** space card-to-divider on **both** sides.

**Changes (`360-report-view-fullscreen.tsx`):**

1. Norms **outer** wrapper **`marginTop`**: **`8px` → `16px` → `20px`** (spacing under chart).
2. **`geonorm`** two-column row: each **`flex: 1`** half **`justifyContent: 'center'`** (replacing **`flex-end`** / **`flex-start`**) so each **norm-group** is **centered** in its half — balanced slack **toward the divider** and **toward the outer** margin.

review the changes we just made in involved.md and in the staged and unstaged changes and commit, push and deploy staging.