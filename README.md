# East DECA Prep

DECA cluster exam practice for **Downingtown East DECA**, built from official past exams. It covers seven
clusters, each with its own question bank built from the PDFs in `exams/<cluster>/`:

| Cluster | Folder | Unique questions |
|---|---|---|
| Finance | `finance` | 1,531 |
| Marketing | `marketing` | 1,076 |
| Business Management & Administration | `business-admin` | 1,038 |
| Hospitality & Tourism | `hospitality` | 1,032 |
| Entrepreneurship | `entrepreneurship` | 1,020 |
| Principles of Business Administration (all Principles events) | `principles` | 1,047 |
| Personal Financial Literacy | `pfl` | 942 |

- **Accounts**: sign in with email + password. Only `@student.dasd.org` and `@dasd.org` addresses can sign up
  (checked in the browser and enforced by the database). Nothing is visible without signing in.
- **Synced progress**: answers, bookmarks, mock exams and settings are stored in Supabase per account and per
  cluster, so they follow you across devices. Changes made offline are queued and saved when you reconnect.
- **Smart practice** (default) brings back missed questions on a 1/3/7-day spaced-repetition schedule,
  then weights picks toward your weakest instructional areas and PIs, then unseen questions.
  It tracks a daily goal and a streak.
- **Custom practice** filters by instructional area, exam, PI, missed only, unseen only or bookmarked.
- **Mock exams**: 100 questions in 60 minutes with no feedback until you submit. Replay a real exam in
  its original order, or take a shuffled mix that matches the real area distribution. Flag questions,
  jump between them, then review results by area with full rationales. An exam in progress resumes on another device.
- **Session bar** on practice and mock screens: session time, a timer you can hide, session accuracy, and the
  cluster and exam each question came from.
- **Dashboard**: accuracy, a weakness heatmap with PI drill-down, your weakest 5 PIs, and a mock score trend.
- **Settings**: account, daily goal, timer, dark/light/system theme (dark by default), export/import, reset.

Made by Advik Kashyap for Downingtown East DECA.

## First-time Supabase setup

Follow [docs/supabase-setup.md](docs/supabase-setup.md): run `supabase/schema.sql`, set the auth URLs, and
connect an email sender so students receive their confirmation emails.

## Run it

Requires Node 20.19+ or 22.12+ (tested on Node 22).

```bash
npm install
npm run dev        # http://localhost:5173
```

For an optimized local build:

```bash
npm run build
npm run preview    # http://localhost:4173
```

The question banks in `data/clusters/` are committed, so the app works right after cloning. You don't need to parse anything first.

### Keyboard shortcuts

| Where | Keys |
|---|---|
| Practice | `A`–`D` or `1`–`4` answer · `Enter` next · `S` bookmark |
| Mock exam | `A`–`D` / `1`–`4` choose (changeable) · `←` `→` previous/next · `Enter` next · `F` flag |

## Add a new exam PDF

PDFs live in one folder per cluster: `exams/finance/`, `exams/marketing/`, `exams/business-admin/`,
`exams/hospitality/`, `exams/entrepreneurship/`, `exams/principles/` (the Business Administration Core
exam, used for every Principles event) and `exams/pfl/` (Personal Financial Literacy). Each folder
becomes its own question bank.

1. Drop the PDF into the right `exams/<cluster>/` folder. Any filename works. For a new cluster,
   create a new folder.
2. Run `npm run parse -- <cluster>` (for example `npm run parse -- marketing`), or `npm run parse` to
   rebuild every cluster. This rewrites `data/clusters/<cluster>.json` and `docs/parse-reports/<cluster>.md`.
3. Open `docs/parse-reports/<cluster>.md` and check the new exam's row: it should show 100 questions and
   100 key entries. Anything the parser could not read cleanly is listed under **Problems**. Those
   questions get `needsReview: true` and are hidden in the app unless you turn them on in Settings.
4. If a PI prefix is new, the report says `unknown PI prefix XX`. Add it to `scripts/pi-areas.json`
   (one map shared by all clusters) and re-run.
5. A new cluster's running header (e.g. `Test 1330 BUSINESS MANAGEMENT AND ADMINISTRATION EXAM—KEY 4`)
   must be listed in `CLUSTER_NAME` in `scripts/lib/parser.ts`. Otherwise the header text leaks into
   questions and the report shows many flagged questions.
6. Optional: to change an auto-detected exam name, add `exams/<cluster>/manifest.json`:
   ```json
   { "my-file.pdf": { "id": "2026-icdc", "label": "2026 ICDC", "year": 2026, "level": "ICDC" } }
   ```
7. Run `npm test`, then commit `exams/<cluster>/`, `data/clusters/<cluster>.json` and
   `docs/parse-reports/<cluster>.md`.

The parser expects the standard MBA Research layout: questions 1–100, then a key with `N. L`, the
rationale, and `SOURCE: XX:NNN …` lines. The 2023+ PFL keys cite a National Standards strand instead
(`SOURCE: Managing Credit Grade 8`), which is stored as the PI code. See `docs/exam-format.md` for
the details and quirks.
Byte-identical duplicate PDFs in a folder are skipped automatically. Questions that appear in several
exams of the same cluster are merged.

**Scanned (image-only) PDFs** have no text layer. The parser skips them and says so in the report.
OCR such a file first (for example `ocrmypdf in.pdf out.pdf`), then put the OCR'd copy in `exams/<cluster>/`.

To inspect a PDF's raw text with x positions, run `npm run extract-raw` (or `npm run extract-raw -- <cluster>`),
which writes `scratch/raw/<cluster>/*.txt`.

## Tests

```bash
npm test           # unit tests: parser, storage, smart selection, mock builder, data sanity (run from PowerShell on Windows)
npm run build      # type-check + production build
npm run smoke      # end-to-end in headless Chromium against a fake Supabase (run after build); screenshots -> scratch/shots/
                   # first time on a new machine: npx playwright install chromium
```

## Project layout

```
exams/<cluster>/       source PDFs, one folder per cluster
scripts/parse-exams.ts npm run parse [cluster]: PDFs -> data/clusters/<cluster>.json + docs/parse-reports/<cluster>.md
scripts/lib/           pdf-lines (pdfjs text + positions), parser (state machine), build (validate/dedupe)
scripts/pi-areas.json  PI prefix -> instructional area mapping
data/clusters/         generated question banks, one per cluster (committed, loaded on demand)
supabase/schema.sql    database tables, row level security and the district-email sign-up check
src/lib/supabase.ts    Supabase client · src/lib/auth.ts sign in/up/out · src/lib/sync.ts load + save queue
src/lib/storage.ts     in-memory progress store for the current cluster (plus export/import)
src/data/clusters.ts   the cluster list · src/data/bank.ts the open cluster's questions
src/lib/smart.ts       smart-mode selection · src/lib/stats.ts statistics · src/lib/mock.ts mock exams
src/pages/             Login, Practice, Mock, Dashboard, Settings
docs/                  exam-format.md, parse-reports/, supabase-setup.md
PRODUCT.md             product and brand notes used for design work
DECISIONS.md           judgment calls made while building
```
