# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Downingtown East High School DECA chapter members (high school students) studying on their own for the
DECA cluster exam at District, State and ICDC competitions. They use phones and school Chromebooks, often
in short sessions between classes or at home. Advisors with @dasd.org accounts can use the app the same
way as students and get no extra privileges.

## Product Purpose

East DECA Prep is cluster-exam practice built from official past DECA exams. Students drill questions,
take timed 100-question mock exams, and see where they are weak by instructional area and Performance
Indicator. Success means a student walks into competition having seen the real question style and fixed
their weakest areas.

## Positioning

It is the chapter's own tool. It is built from real past exams with their official answer rationales and
PI codes, and its smart practice uses spaced repetition plus weakness weighting rather than random drilling.
It is private to Downingtown Area School District accounts.

## Operating Context

- Clusters: Finance, Marketing, Business Management & Administration, Hospitality & Tourism,
  Entrepreneurship, Principles of Business Administration (all Principles events share one exam), and
  Personal Financial Literacy. Each cluster has its own question bank and its own progress.
- Exam format: 100 multiple-choice questions (A–D) in 60 minutes; each question has an answer key
  rationale, a PI code (e.g. FI:071) and an instructional area.
- Modes: smart practice (default), custom practice filters, timed mock exams (real-exam replay or mixed),
  dashboard with area heatmap and weakest PIs, settings.
- Keyboard shortcuts matter on Chromebooks: A–D / 1–4 to answer, Enter for next, S bookmark, F flag.

## Capabilities and Constraints

- Vite + React + Tailwind v4 static site hosted on GitHub Pages; hash routing.
- Accounts via Supabase email + password. Only @student.dasd.org and @dasd.org addresses can sign up,
  enforced server-side. Nothing is visible without signing in.
- Progress (attempts, bookmarks, mocks, settings) is stored in Supabase per account and syncs across devices.
- Question banks are bundled into the site build (deliberate choice; the UI is gated, not the data).

## Brand Commitments

- Name: **East DECA Prep** (formerly "kash2finance").
- Logo: the Downingtown East cougar, `deast_logo.png` (blue and gold cougar head with a tan outline).
- Colors (set by the owner): white/grey primary, dark blue secondary, gold accents.
- Footer credit is required on every screen: "by Advik Kashyap" and "Made for Downingtown East DECA".

## Evidence on Hand

- Official past exam PDFs in `exams/` (Finance today; other clusters to be added by the owner).
- Parsed question bank in `data/questions.json` (1,531 unique Finance questions as of 2026-09).
- No testimonials, scores or usage statistics exist; do not invent any.

## Product Principles

1. The questions and rationales are the product. Nothing gets in the way of reading a question and answering it.
2. Honest feedback: stats never imply a score that hasn't been earned (e.g. unattempted areas never look like a result).
3. Built for short sessions on small screens and Chromebook keyboards.
4. Chapter pride without noise: the cougar and the colors say "ours", and the study tool stays calm.

## Accessibility & Inclusion

Color is never the only signal (heatmap cells print their numbers). Full keyboard operation for practice and mocks.
Respect light/dark preference.
