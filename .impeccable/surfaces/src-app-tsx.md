---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/pages/Practice.tsx","src/pages/Mock.tsx","src/pages/Dashboard.tsx","src/pages/Settings.tsx"]
---

Scope: whole app shell (login, practice, mock exam, dashboard, settings). Mode: Operate. Code-led.

Audience/job: Downingtown East DECA members drilling cluster-exam questions on phones and Chromebooks.

## Direction contract

THESIS: The category standard, done carefully: a navy sidebar shell with white/grey work cards and gold primary actions. It refuses gimmicks; the chapter identity comes from the cougar, navy and gold, and the footer credit.

OWN-WORLD: Dark mode is the default: deep navy-black ground, slate cards, navy sidebar, gold (#f3bf2b) only for primary actions, the active nav marker and progress. Light mode: grey ground, white cards, the same navy sidebar. Inter for UI, tabular figures for every number. Cards are 16px radius, 1px hairline borders, no gradients.

STORY: The student signs in with their district email, picks a cluster from the sidebar, and is answering a question within one click. They always know their session time, accuracy and which cluster/exam a question came from.

FIRST VIEWPORT: Left navy sidebar (cougar + "East DECA Prep", cluster switcher, Practice / Mock exam / Dashboard / Settings, footer credit "by Advik Kashyap · Made for Downingtown East DECA"). Main column: daily-goal progress bar, then the question card with four answer rows, then a gold primary button. A fixed session bar sits at the bottom of the testing screens: session time, a hideable timer, session accuracy, the question's cluster and source exam. On mobile the sidebar becomes a top bar plus bottom tab bar, and the session bar sits above the tabs.

FORM: Category standard (user chose canon via steer, over the dealt Swipe Feed card); seed:92c4ae8bda8157a9

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
