---
name: East DECA Prep
description: Cluster-exam practice for Downingtown East DECA, in the chapter's navy and cougar gold.
colors:
  sidebar-navy: "#12285c"
  sidebar-navy-night: "#0b1a3d"
  cougar-blue: "#2a4ea8"
  link-navy: "#213f8a"
  link-soft-blue: "#8dabe5"
  selection-blue: "#3d6bc9"
  sidebar-text: "#dbe5f8"
  sidebar-muted: "#b9cbf0"
  cougar-gold: "#f3bf2b"
  cougar-gold-hover: "#f7d054"
  cougar-gold-pressed: "#d9a514"
  ground-light: "#eceef3"
  card-light: "#ffffff"
  hairline-light: "#dde1ea"
  field-stroke: "#c3c9d6"
  muted-ink: "#636d84"
  muted-ink-night: "#939cb0"
  hairline-night: "#222a3c"
  card-night: "#161e30"
  ground-night: "#0c1322"
  ink: "#161e30"
  ink-night: "#eceef3"
  correct-emerald: "#059669"
  wrong-rose: "#e11d48"
  marker-amber: "#f59e0b"
  heat-weak: "#e66767"
  heat-mid: "#eceef3"
  heat-strong: "#5b86da"
  heat-weak-night: "#9e2f2f"
  heat-mid-night: "#2a3245"
  heat-strong-night: "#2c55a8"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.11
    letterSpacing: "-0.025em"
    fontFeature: "'cv11', 'ss01'"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: "-0.025em"
    fontFeature: "'cv11', 'ss01'"
  stem:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 500
    lineHeight: 1.625
    fontFeature: "'cv11', 'ss01'"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.5
    fontFeature: "'cv11', 'ss01'"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'cv11', 'ss01'"
  body-sm:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    fontFeature: "'cv11', 'ss01'"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
    fontFeature: "'cv11', 'ss01'"
  stat:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
    fontFeature: "'tnum', 'cv11', 'ss01'"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  sidebar: "256px"
  content-max: "896px"
components:
  button-primary:
    backgroundColor: "{colors.cougar-gold}"
    textColor: "{colors.sidebar-navy-night}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.cougar-gold-hover}"
  button-primary-active:
    backgroundColor: "{colors.cougar-gold-pressed}"
  button-secondary:
    backgroundColor: "{colors.card-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
  button-ghost:
    textColor: "{colors.muted-ink}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
  button-danger:
    backgroundColor: "{colors.wrong-rose}"
    textColor: "{colors.card-light}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
  card:
    backgroundColor: "{colors.card-light}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  card-night:
    backgroundColor: "{colors.card-night}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  answer-row:
    backgroundColor: "{colors.card-light}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
  input:
    backgroundColor: "{colors.card-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "10px 14px"
  nav-item-active:
    textColor: "{colors.card-light}"
    rounded: "{rounded.xl}"
    padding: "10px 12px"
  chip-toggle-on:
    backgroundColor: "{colors.cougar-blue}"
    textColor: "{colors.card-light}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  progress-fill:
    backgroundColor: "{colors.cougar-gold}"
    rounded: "{rounded.full}"
    height: "8px"
---

# Design System: East DECA Prep

## Overview

**Creative North Star: "The Chapter Study Hall"**

The category standard, done carefully. A navy sidebar holds the chapter's identity (the cougar mark, the name, the cluster switcher, the nav and the footer credit) and the main column holds plain work cards: a question, four answer rows, a gold button. Nothing competes with the question. The chapter feel comes from three things only: the cougar, navy and gold, and the credit line.

Dark is the default theme. Its ground is a night-blue near-black, cards one step lighter, the sidebar a deeper navy; every neutral is tinted toward that navy so dark mode reads as night blue rather than grey. Light mode swaps to a cool grey ground with white cards and keeps the same navy sidebar, so the shell is recognisable in either theme. Density is moderate and phone-first: students drill on phones and Chromebooks, so the primary action is always reachable and every number is easy to scan.

**Key Characteristics:**
- Navy shell, neutral work cards, gold reserved for the single forward action.
- Flat surfaces with 1px hairline borders; depth from tonal steps, not shadows.
- Inter throughout, tabular figures on every number.
- A fixed session bar on testing screens keeps time, accuracy and question source always in view.
- Required footer credit, "by Advik Kashyap / Made for Downingtown East DECA", on every signed-in and sign-in surface.

## Colors

Navy and cougar gold over a navy-tinted slate ramp, with emerald and rose carrying right and wrong.

### Primary
- **Sidebar Navy** (sidebar-navy): the shell in light mode: desktop sidebar, mobile top bar, mobile tab bar, sign-in brand panel, and the light `theme-color`.
- **Sidebar Navy Night** (sidebar-navy-night): the same shell in dark mode, also the text colour on gold buttons and the dark `theme-color`.
- **Cougar Blue** (cougar-blue): the logo blue. Selected-state fills (selected answer letter, chip-toggle on, switch on), focus ring in light mode, text caret in light mode, the mock-trend line in light mode.
- **Link Navy / Link Soft Blue** (link-navy, link-soft-blue): every inline link, light and dark respectively, semibold, underline on hover.
- **Sidebar Text / Sidebar Muted** (sidebar-text, sidebar-muted): inactive nav labels and secondary text on the navy shell (save status, credit). Nav icons sit one step deeper at brand-300.

### Secondary
- **Cougar Gold** (cougar-gold): primary buttons, the active-nav marker bar and active nav icon, the active mobile tab, progress fills, the dark-mode focus ring and caret, the cluster-select chevron, text selection (at 35% opacity). Hover lightens to cougar-gold-hover, press deepens to cougar-gold-pressed.

### Tertiary
- **Correct Emerald** (correct-emerald): a correct answer row (500 border, 50 / 950-at-50% fill, 600 letter disc), correct feedback panels, "goal met", the "saved" dot.
- **Wrong Rose** (wrong-rose): a wrong answer row, wrong feedback, errors, the danger button, the urgent mock timer, the "offline" dot.
- **Marker Amber** (marker-amber): personal markers only: a set bookmark, a flagged mock question, the "review" reason chip. Never a substitute for gold.

### Neutral
The ramp overrides Tailwind's slate in `@theme`, so every `slate-*` utility is navy-tinted.
- **Ground** (ground-light / ground-night): page background, light and dark.
- **Card** (card-light / card-night): cards, answer rows, inputs, the session bar (at 95% with a light backdrop blur).
- **Hairline** (hairline-light / hairline-night): card borders, dividers inside cards, table rules.
- **Field Stroke** (field-stroke): input borders and the secondary button ring in light mode.
- **Ink** (ink / ink-night): primary text.
- **Muted Ink** (muted-ink / muted-ink-night): secondary text, labels, metadata.

### Data
- **Heat Weak / Mid / Strong** (heat-*, with -night variants): the diverging weakness heatmap, red below the 70% target, neutral at target, blue above. They live as CSS variables (`--heat-weak`, `--heat-mid`, `--heat-strong`) that switch per theme, alongside `--series-1` for chart lines (cougar blue light, brand-400 dark).

### Named Rules
**The Gold Is a Verb Rule.** Gold marks only where you go next or how far you have come: the primary button, the active-nav marker, progress. Links, selection, headings and decoration never use gold. One gold button per view.

**The One Link Rule.** Every inline link uses the single link treatment: link navy in light, link soft blue in dark, semibold, underline on hover. Gold is never a link.

**The Night-Blue Neutral Rule.** Don't use Tailwind's stock greys or zinc. Every neutral comes from the navy-tinted slate ramp, so dark mode stays night blue.

**The Secondary-Text Floor Rule.** Secondary text stays at AA (4.5:1) on both grounds. The global stylesheet remaps slate-500 to slate-400 in dark and slate-400 to slate-500 in light. Keep that override, and use slate-500 / dark:slate-400 as the muted-text pair.

**The Confidence Rule.** A heatmap cell's colour strength scales with its attempt count, reaching full strength at 10 attempts, so a single lucky answer never paints a strong colour. An area with no data gets a diagonal hatch texture, never a colour, so "unattempted" can't be read as a score.

## Typography

**Display Font:** Inter (with ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto)
**Body Font:** Inter
**Label/Mono Font:** Inter for labels; the platform monospace only for PI codes and `kbd` keys.

**Character:** One sturdy UI face, used plainly. Weight does the work of hierarchy (400 / 500 / 600 / 700), with the `cv11` and `ss01` alternates set globally for a cleaner single-storey a and open digits.

### Hierarchy
- **Display** (700, 2.25rem, tight tracking): the product name on the sign-in brand panel at desktop width only (1.5rem on phones).
- **Headline** (700, 1.5rem, tight tracking): page titles (Dashboard, Mock exam, Settings) and sign-in form titles.
- **Stem** (500, 1.25rem from sm, 1.075rem on phones, relaxed 1.625 leading): the question stem, the most important text on any screen.
- **Title** (700, 1rem): card headings (Weakness heatmap, Weakest 5 PIs, Mock exam scores).
- **Body** (400, 1rem, 1.5) and **Body-sm** (400, 0.875rem): explanations, answer options, UI copy. Buttons use body-sm at 600.
- **Label** (500, 0.75rem): stat labels, session-bar labels (0.68rem there), metadata lines. Filter-group headers and table column heads are the only uppercase text (0.75rem, 600, wide tracking).
- **Stat** (700, 1.5rem, tabular): stat-card values; the mock result score goes to 2.25rem extra-bold.

### Named Rules
**The Tabular Number Rule.** Every number a student compares (times, counts, percentages, scores, table figures) uses tabular figures. Apply them to the numeric element, not the whole body.

**The Stem Leads Rule.** The question stem is the largest text in the work column. Nothing on a testing screen is set larger than it.

## Layout

App-shell grid. From lg up: a fixed 256px navy sidebar on the left and a centred main column capped at 896px (padding 16px / 24px / 40px by breakpoint). Below lg, the sidebar becomes a sticky navy top bar (cougar mark plus cluster select) and a fixed navy bottom tab bar of four icon-over-label tabs that respects the bottom safe-area inset.

Pages stack cards with a 16px gap. Card padding is 16px on phones and 24px from sm; compact cards (stats, the daily bar) use 12-16px. The rhythm is a 4px base (4 / 8 / 12 / 16 / 24). Stat grids run 2 columns on phones and 4 from sm; the heatmap does the same with 2px gutters.

Testing screens (practice, mock) add the fixed session bar: on phones it sits above the tab bar, from lg it runs along the bottom of the main column (clear of the sidebar). The main column's bottom padding grows so content never hides beneath it (208px on phones, 160px at sm, 112px at lg).

## Elevation & Depth

Flat by default. Depth comes from tonal steps: ground, then card, then hairline border, with the navy shell as its own plane. Dark mode separates the sidebar from the ground with a 1px inset white line at 6% instead of a shadow. Backdrop blur is reserved for pinned bars: the session bar and the mock exam's sticky header, both at 95% opacity.

### Shadow Vocabulary
- **Gold lift** (`box-shadow: 0 1px 2px rgb(11 26 61 / 0.18)`): primary buttons only; removed when disabled.
- **Segment lift** (`box-shadow: 0 1px 2px rgb(0 0 0 / 0.05)`): the selected segment in segmented controls; also the switch knob.
- **Tooltip** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): the floating chart tooltip, the only element that floats.

### Named Rules
**The Hairline-Not-Shadow Rule.** Cards and answer rows sit flat with a 1px border (2px for answer rows). Don't add drop shadows to cards.

## Shapes

Soft, consistent rounding that steps down with size. Cards are 16px. Buttons, answer rows, nav items, sign-in fields, feedback panels and the cluster select are 12px. Small controls (segmented tracks, compact inputs, the bookmark and flag buttons, the tooltip) are 8px; heatmap cells and segmented thumbs 6px; code tags, `kbd` and reason chips 4px. Pills (chip toggles, switches, progress bars, the answer-letter disc) are fully round. Borders are 1px hairlines everywhere except answer rows, which use 2px so state colour reads at a glance. No gradients on surfaces; the only patterned fill is the hatch texture marking heatmap areas with no data.

## Components

### Buttons
Solid, quiet, and clear about which one matters.
- **Shape:** gently rounded (12px), 10px 16px padding, 0.875rem semibold, 8px gap for a trailing arrow icon.
- **Primary:** cougar gold with night-navy text and the gold lift. One per view, carrying the forward action (Next question, Submit, Sign in, Practice these).
- **Hover / Focus:** 150ms colour transition; hover lightens the gold, press deepens it. Focus shows a 2px outline 2px off the edge (cougar blue in light, gold in dark).
- **Disabled:** slate fill, muted text, no shadow, not-allowed cursor.
- **Secondary:** card-coloured with a 1px inset field-stroke ring (slate-700 in dark).
- **Ghost:** text only in muted ink, slate hover fill.
- **Danger:** rose-600 with white text.

### Chips
- **Chip toggle (filters):** pill, 1px border, 0.75rem medium. Off is card-coloured with a field-stroke border and a blue border on hover; on is a solid cougar-blue fill with white text.
- **Reason chips:** 4px-rounded tinted tags (amber for review, rose for weak, sky for new, slate for refresh) in the question header.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** white in light, slate-900 in dark.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px hairline (slate-200 / slate-800).
- **Internal Padding:** 16px, 24px from sm.

### Inputs / Fields
- **Style:** 1px field-stroke border, card background, 12px radius on sign-in fields (8px on compact settings inputs), 10px 14px padding.
- **Focus:** border shifts to cougar blue (gold in dark) and the global focus outline. The caret matches: cougar blue in light, gold in dark.
- **Error:** a rose hint under the field and a rose-50 / rose-950 alert panel above the submit button.

### Navigation
- **Desktop sidebar:** navy panel; nav items 12px-rounded, 0.95rem medium, 20px stroke icons. Inactive items use sidebar text with brand-300 icons and a white-5% hover. The active item gets a white-10% fill, white text, a gold icon, and a 4px gold marker bar on its left edge.
- **Cluster select:** a translucent white field (10% fill, 15% border) on the navy with a gold chevron.
- **Mobile:** the navy top bar plus a bottom tab bar; tabs are icon over a 0.7rem semibold label, gold when active, sidebar-muted otherwise.
- **Segmented control:** an 8px slate-100 track (slate-800 in dark) with a raised white thumb (slate-950 in dark). Used for Smart/Custom, theme, and review filters.

### Answer Row (signature)
The core of the product. A full-width 12px-rounded button with a 2px border, a 28px round letter disc, the option text, and a faint keyboard hint (1-4) on larger screens. Rest: hairline border, blue border on hover. Selected (unrevealed): blue border with a 1px blue ring, blue letter disc. Revealed: the correct row turns emerald and a wrong pick turns rose, while the other rows fade to 70%. A feedback panel in the same state colour follows, with the explanation and a PI line (monospace code tag, instructional area, source exams).

### Session Bar (signature)
Fixed to the bottom of the practice and mock screens, card-coloured at 95% with a hairline top border and backdrop blur. It shows labelled tabular values: Session time, the per-question timer (or mock time left) with an eye toggle to hide it, Session accuracy (or progress), and the question's source (cluster and exam on sm+, cluster only on phones). In a mock's final urgent window, the timer forces itself visible and turns rose. On phones only, a full-width gold primary action sits above the stats so the forward action is never below the fold. The page's own button covers larger screens.

### Progress Bar
An 8px pill track (slate-200 / slate-800) with a gold fill that animates width over 500ms ease-out. It's the daily-goal bar, and a 4px variant shows mock progress.

### Heatmap Cell
A 6px-rounded tile at least 80px tall: area name, a tabular percentage, and attempts/seen. The fill comes from mixing the heat poles in oklab, scaled by confidence. Empty areas get the hatch texture with a hairline border. Hover adds a 2px slate ring; open adds a 2px ink ring.

## Do's and Don'ts

### Do:
- **Do** keep the navy shell (sidebar-navy, sidebar-navy-night in dark) on every signed-in and sign-in surface, with the cougar mark and the credit "by Advik Kashyap / Made for Downingtown East DECA" in the shell footer (or under the content on phones).
- **Do** give each view exactly one gold primary button; use secondary or ghost for everything else.
- **Do** use the single link treatment (link navy / link soft blue, semibold, underline on hover) for every inline link.
- **Do** set every compared number in tabular figures.
- **Do** show right and wrong with emerald and rose on borders, fills and the letter disc together, never colour on text alone.
- **Do** carry the primary action in the session bar on phones whenever a testing screen's own button could sit below the fold.
- **Do** keep secondary text on the slate-500 / dark:slate-400 pair so the global contrast override holds AA.
- **Do** scale data colour by confidence and mark missing data with texture, not colour.

### Don't:
- **Don't** use gold for links, headings, selection states, chips or decoration.
- **Don't** introduce stock Tailwind greys (gray, zinc, neutral) alongside the navy-tinted slate ramp.
- **Don't** add drop shadows to cards or answer rows; separate them with hairlines and tonal steps.
- **Don't** put gradients on surfaces, buttons or the shell. The diagonal hatch for empty heatmap data is the one sanctioned patterned fill.
- **Don't** set any text on a testing screen larger than the question stem.
- **Don't** use text glyphs for arrows, checks or close marks; use the inline stroke icons.
- **Don't** remove or restyle away the footer credit.
