# DECISIONS

Judgment calls made while building without the owner available.

1. **Git remote.** `origin` is now `https://github.com/akashyap-1/deast_deca_cluster_prep.git`.
2. **Work on a branch, not `main`.** Commits go to `claude/kash2finance` so `main` stays as the
   owner left it. Merge with `git checkout main && git merge claude/kash2finance`.
3. **PDFs moved into `exams/`.** The PDFs were committed at the repo root and deleted in the
   working tree. The brief refers to an `exams` folder, so they were restored and `git mv`'d into `exams/`.
4. **20 files, not 11.** The folder has 20 PDFs, which are 17 distinct exams (two pairs are byte-identical).
   All distinct exams are used. Byte-identical files are skipped by content hash.
5. **Raw text dumps are committed** (`scratch/raw/`) so the format doc can be checked against them
   without re-running anything.
6. **Exam ids and labels are auto-detected** from the cover text: year, level (ICDC / State / District / Sample)
   and Test number. For example `2025-icdc` or `2024-sample-1286`. The year comes from "YYYY HS ICDC", then a year
   prefix in the filename, then the copyright year. To override, add `exams/manifest.json` with
   `{ "<file.pdf>": { "id": "...", "label": "...", "year": 2025, "level": "State" } }`.
7. **`CC` (Compliance) maps to Business Law.** CC is a legacy 2011-2013 PI prefix. Later exams moved
   compliance PIs into BL (e.g. BL:148 "Discuss the nature and scope of compliance in the finance industry").
8. **Missing PI descriptions are filled from other exams with the same PI code.** Such records get
   `piDescriptionFrom: <exam id>`, and the app shows where the description came from. PIs that no exam
   ever printed a description for keep an empty description. Descriptions are never invented.
9. **Deduplication key = normalized stem + sorted normalized options.** Reordered options still count as
   the same question. The first appearance (oldest exam) is kept, and `appearances` lists every exam/number.
   Same-stem questions with different options are kept as separate questions (11 such pairs).
   Replaying a real exam uses the kept copy, so its option letters may differ from that exam's printing.
10. **Test 1143 is in two files** (a 2017 sample and a district booklet). Both are kept. The second is marked
    `duplicateOf` and hidden from the mock-exam replay list.
11. **Tables in stems** (2 questions) are stored as `| cell | cell |` lines inside `question`, and the app
    renders them as HTML tables. These questions carry an informational note but are not flagged.
12. **Consistency check used for flagging:** the rationale always restates the correct option. If a rationale
    restated a different option, the question would be flagged needsReview. 1530/1531 match, and the one
    non-match is a typo in the source ("Understating" vs "Understanding"), so it is noted but not flagged.
13. **"Missed" means answered wrong at least once**, even if it was later answered right. Smart mode's
    spaced repetition decides when a missed question has been reviewed enough.
14. **The question bank is bundled into the app** (imported as a raw string and JSON-parsed at startup).
    The build then works offline with no fetches. The bundle is about 2.6 MB (635 kB gzipped), which is fine locally.
15. **Hash routing** (`#/practice`, `#/mock`, …) with no router dependency. This works from `vite preview`
    and any static server.
16. **Spaced repetition:** a miss schedules a review 1 day later. Each correct review moves it to the next
    interval (3 days, then 7). The third correct review graduates it. Another miss restarts at 1 day.
    Missed questions are held back until due, so a miss does not come back in the same session.
17. **Smart weighting:** weight = base × (1 + 3·weakArea + 3·weakPI)², where weak = 1 − smoothed accuracy
    ((correct+1)/(attempts+2)). base is 1 for unseen questions and 0.15 for ones already answered correctly,
    so unseen and weak-area questions dominate while occasional refreshers still appear.
18. **Streak = consecutive days on which the daily goal was met.** Today counts once the goal is met.
    If today's goal isn't met yet, the streak still shows the run up to yesterday.
19. **Mock-exam answers count as attempts** in accuracy stats, the daily goal and spaced repetition,
    because they are real answers.
20. **Mock mixed-exam distribution** = the average per-area share across all distinct real exams, scaled to
    100 with largest-remainder rounding (currently FI 25, PD 14, EI 11, FM 10, …).
21. **Mocks can't be paused.** The timer runs from the start time (like the real exam), so a reload resumes
    with the correct time left. When time runs out the exam submits automatically. Unanswered questions count as wrong.
22. **Mock attempts are timestamped at submit time**, with per-question time taken from the time spent
    viewing each question.
23. **Heatmap colour = diverging scale centred on 70%** (red below, gray at 70%, blue above). No attempts
    = a hatched cell with "—", so an unattempted area never reads as a score. Every cell also prints its
    accuracy and attempt count, so colour is never the only signal.
24. **Weakest PIs** need at least 2 attempts and at least one miss, and are ranked by smoothed accuracy.
    One unlucky answer doesn't top the list.
25. **Reset needs typing RESET**, and it keeps settings. Import asks for confirmation because it replaces
    all progress, and it validates the file first: bad files are rejected with a message and nothing is changed.
26. **Mocks can be abandoned** (from the Submit panel). Nothing is saved from an abandoned mock.
27. **`npm run smoke`** is an end-to-end check using Playwright. It is a dev dependency only and is not
    part of `npm test`, so the unit tests stay fast and need no browser.
28. **One question bank per cluster.** `exams/<cluster>/*.pdf` -> `data/clusters/<cluster>.json` and
    `docs/parse-reports/<cluster>.md`. Deduplication and exam ids are per cluster, so the same id (e.g.
    `2026-icdc-1341`) or the same question can appear in two clusters' files. `manifest.json` overrides are per folder.
29. **Running headers are matched by an upper-case cluster name** (`CLUSTER_NAME` in `scripts/lib/parser.ts`)
    plus a `Test NNNN` / `YYYY HS ICDC` / `SAMPLE` prefix, `EXAM` or `KEY`. A bare cluster name or a
    lower-case one is kept as content.
30. **Page drift is corrected.** The 2026 BA Core district PDF shifts its text block 1-2pt right on every page
    (options at x=59, 61, 67, 68 …). The parser re-learns the shift from each question's `A.` marker. Without this,
    18 questions were lost.
31. **Stem indent threshold raised from 22pt to 30pt.** 2026 ICDC booklets put question numbers at x=38 and the
    continuation at x=61 (23pt), which was misread as a table. No real table row in any exam sits in 23-30pt.
    Indented blocks of one-run lines (e.g. `Car value = $6,000`) are now kept as plain lines instead of a
    one-column table, and are not flagged.
32. **A right-column `C.`/`D.` marker glued to the left run** (`B. … bonds. D.` || `selecting …`) is moved back onto
    the right run (1 question, Hospitality 2021).
33. **New PI prefixes** use the MBA Research instructional-area names: CM Channel Management, IM Marketing-Information
    Management, KM Knowledge Management, MP Market Planning, PI Pricing, PJ Project Management, PM Product/Service
    Management, PR Promotion, QM Quality Management, SE Selling. Each was checked against the PI descriptions
    printed in the keys (e.g. `CM:001 Explain the nature and scope of channel management`).
34. **2023+ PFL exams cite National Standards for Personal Financial Education, not PI codes**
    (`SOURCE: Managing Credit Grade 8`). The strand + grade is stored as `piCode` (e.g. `"Managing Credit Grade 8"`)
    and the strand is the instructional area (Earning Income, Spending, Saving, Investing, Managing Credit,
    Managing Risk). Those questions have an empty `piDescription`, because none is printed. So the PFL bank mixes DECA areas
    (2018-2022, 2026 State) with strand areas (2023-2026 samples, district and ICDC).
35. **Bare Jump$tart codes in 2018-2022 PFL keys are dropped.** These keys have an extra `SOURCE: RM` / `SS` / `CD` /
    `EI` / `FD` / `IN` line between the PI and the reference. It is not a reference, so it is not stored.
36. **Exam levels follow the same rules as Finance.** Files named `…District Exam` become District even if the cover says
    SAMPLE. The BA Core `24-25_BA Core Exam.pdf` has no "district" in its name, so it is `2025-sample-1308`.
37. **Remaining flagged questions are real source problems and stay flagged:** BMA `2026-icdc-1341` Q27 (the rationale
    restates option B but the key says D) and PFL `2018-district-1166` Q35 (a net-worth table whose columns could
    not be recovered).

## Accounts, sync and clusters (2026-11)

38. **District-only sign-up is enforced in the database**, not just the form: a trigger on `auth.users` rejects
    any email that isn't `@student.dasd.org` or `@dasd.org`, and every table's row level security policy also
    requires a district email in the signed-in user's token. Email confirmation must stay on, or the domain
    check proves nothing.
39. **Progress is stored as rows, not one blob.** Attempts are append-only rows with client-generated ids, so two
    devices used at the same time never overwrite each other's answers. Settings and the in-progress mock are
    single rows where the last write wins.
40. **Writes go through a persistent queue** (`src/lib/sync.ts`, kept in localStorage per user). A network failure
    keeps the job and retries with backoff; a server refusal (a Postgres/PostgREST error code) skips the job so
    one bad row can't block everything after it. Opening a cluster first tries to flush the queue, then loads
    from the server, and falls back to this device's cached copy when offline.
41. **Settings are per account; everything else is per account and cluster.** Reset and import only touch
    the cluster you're in.
42. **Question banks stay bundled** (per the owner's choice): the screens are locked behind sign-in, but the JSON
    files are part of the public site build. Each cluster's bank is a separate chunk loaded when opened.
43. **Old local-only progress migrates once.** If the browser still has `kash2finance:v1` progress and the account
    has no Finance answers yet, it is uploaded on first sign-in.
44. **Dark mode is the default** (owner's request). Light and system remain in Settings.
45. **Heatmap confidence.** An area's color reaches full strength only after 10 attempts, so one lucky answer
    doesn't read as a strong area. Dashboard accuracy under 10 answers is labelled an early estimate.

