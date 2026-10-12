# Green direction (R4.7 proposal): what was redesigned, and how to extend it

Written for Aziz. It explains the redesign on PR #3, how it is built, and how to bring the advisor, admin and client screens into the same design. Nothing here is merged until you decide.

---

## 1. Status and your decision

| Screen                          | State on PR #3                         | Parts  |
| ------------------------------- | -------------------------------------- | ------ |
| `/` landing                     | green direction                        | Part 7 |
| `/login`                        | green direction                        | Part 8 |
| `/supervisor`                   | green direction, **shell and content** | Part 9 |
| `/advisor`, `/admin`, `/client` | your teal palette, unchanged           | —      |

The palette comes from Fedi's mockups (GPT and Figma). It is inspired by retail-bank charters but carries no bank name, logo or font.

**What you can decide:**

1. **Keep it** and extend it to the other roles, following section 6.
2. **Keep only some screens.** Each phase's commits stand on their own. The supervisor's are `c609dd6` → `f579396`.
3. **Revert.** Nothing outside these screens depends on the green files.

---

## 2. What changed on `/supervisor`

| Area                | Before                                                               | After                                                                                                                                                          |
| ------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar             | 240 px navy, workspace switcher, help card, account card with logout | 208 px dark green gradient with glowing swooshes, the 4 real nav items with icons, glass « Espace superviseur » card. Logout stays in the header account menu. |
| Top bar             | 76 px, « CallVerse / Vue d’ensemble », role badge                    | 52 px white bar, title only, « SV » avatar menu                                                                                                                |
| Page                | grey paper                                                           | mint wash with a soft glow at the top right                                                                                                                    |
| Heading             | 29 px title, small live line and button                              | 34 px title, 15 px sub-copy, live line with a green dot, 38 px « Actualiser »                                                                                  |
| KPI                 | four plain cards                                                     | four tiles: icon well, title, 36 px value, caption, decorative arcs. The abandon tile is rose.                                                                 |
| Queues              | table and indicator row                                              | icon-well heading, count chip, tinted table head, coloured dots, count pills, indicators in a tinted strip, footnote with an info icon                         |
| Alerts              | empty block                                                          | icon-well heading, illustrated empty state over a mint wave; alerts unchanged                                                                                  |
| Conversations       | toolbar, 10 columns, « Ouvrir » buttons                              | search field with an icon, the same filters, the same 10 columns, a 32 px arrow button per row (same name, same action)                                        |
| Contact             | stacked card                                                         | one row: icon well, title and sub-copy, field and green button                                                                                                 |
| Opened conversation | default card                                                         | the same grammar; focus lands on it with the app's ring                                                                                                        |

**Behaviour is unchanged.** Data loading, filters, paging, refresh, STOMP updates, opening a conversation, alerts and KPI are the same. The API trace of every supervisor step was compared with the old build and is identical (14 steps).

**Small fixes that came with it:**

- « Attente la plus longue » showed raw seconds (« 336372 s »); it now reads « 3 j 21 h ». Waits under an hour read « 43 s » or « 5 min 23 s ».
- The visually hidden « Actions » header escaped the table's scroll box and widened the page below 1440 px (1197 px wide at 1100). The table wrapper is now its containing block.
- The account menu's name starts with the visible initials (« SV, menu du compte »), so axe 4.14's WCAG 2.5.3 check passes.
- Straight apostrophes in « Résolues aujourd'hui », « Abandonnées aujourd'hui » and « Taux d'abandon » are now typographic (’).

---

## 3. How it is built

### Files

| File                                    | Role                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/styles/tokens.css`             | The `--lp-*` tokens (section 4). App tokens unchanged.                                                                                |
| `src/app/styles/shell-green.css`        | Styles `AppShell variant="green"`; every rule under `.cv-shell-green`.                                                                |
| `src/app/styles/supervisor.css`         | The dashboard. Shared classes are restyled under `.cv-supervisor`; its own classes are rendered only by `src/components/supervisor/`. |
| `src/components/AppShell.tsx`           | New `variant?: "green"` prop. Without it, every role renders the same DOM and classes as before.                                      |
| `src/components/shell/navItems.ts`      | Sidebar items per role (moved out of `AppShell`).                                                                                     |
| `src/components/shell/GreenSidebar.tsx` | `SidebarArt` (decorative swooshes) and `SpaceCard` (the glass card, copy per role in `spaceByRole`).                                  |
| `src/components/supervisor/`            | `CardHeading`, `KpiTiles`, `QueuesCard`, `AlertsCard`, `SupervisedConversations`, `ConversationFilters`                               |
| `src/lib/supervision.ts`                | `waitLabel`, `percentLabel` (tested)                                                                                                  |
| `tests/integration.test.mjs`            | Contrast tests for every new text, icon and ring on its real background, read from the stylesheet                                     |

### Cascade order (`globals.css`)

`tokens → base → shell → components → workspace → app-responsive → shell-green → supervisor → landing… → login… → loader → refinements`

The green files sit after the app files, so equal-specificity rules win. Their selectors carry one more class (`.cv-shell-green …`, `.cv-supervisor …`), so they also win over `refinements.css`, which comes later. Tailwind v4 utilities live in cascade layers; our CSS is unlayered and always wins over them.

### Why everything is scoped

Every page loads one shared stylesheet. A rule like `.cv-card { … }` would restyle all four roles. Scoping each rule under a class that only one screen renders keeps the other screens identical. We proved it by measurement on 45 snapshots of the other screens: 0 computed-style differences, 0 API-trace differences (section 8).

---

## 4. Design system

### Tokens

| Token                                         | Value                 | Use                                                                                  |
| --------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| `--lp-night-deep` → `--lp-night`              | `#022a26` → `#02302b` | sidebar gradient                                                                     |
| `--lp-night-2`                                | `#0b4e44`             | glows on dark                                                                        |
| `--lp-glow`                                   | `#1df5bc`             | wordmark bars, swooshes (never text)                                                 |
| `--lp-mist`                                   | `#a5d1cb`             | text on dark (9.2:1 on the night)                                                    |
| `--lp-wash`                                   | `#eff6f2`             | **new:** page background, table heads, tinted strips                                 |
| `--lp-ink`                                    | `#05262e`             | titles, values, names (15.9:1 on white)                                              |
| `--lp-muted`                                  | `#4e7480`             | secondary text (5.1:1 on white, 4.6:1 on the wash). **Never on `--lp-mint`** (4.43). |
| `--lp-brand`                                  | `#067a61`             | icons, chip text (4.6:1 on mint)                                                     |
| `--lp-brand-strong` → `--lp-brand-soft`       | `#056f58` → `#0a8466` | primary button gradient (white 6.1 / 4.7)                                            |
| `--lp-mint` / `--lp-mint-strong`              | `#e3f3ec` / `#c5eedd` | icon wells, chips, decorative art                                                    |
| `--lp-deep`                                   | `#11504a`             | secondary button text, live line, notices                                            |
| `--lp-accent`                                 | `#29a387`             | status dots (the text carries the meaning)                                           |
| `--lp-border`                                 | `#dbe9e4`             | card borders, hairlines                                                              |
| `--rose` (app)                                | `#bc4557`             | abandon / fraud accents                                                              |
| `--focus-ring` / `--focus-ring-on-dark` (app) | `#087f70` / `#4db6a4` | focus rings, light and dark                                                          |

### Type (Manrope for text, Space Grotesk for display; both already loaded)

| Style                            | Size / weight                                                     |
| -------------------------------- | ----------------------------------------------------------------- |
| Page title `h1`                  | Space Grotesk 34 px / 700, line-height 1.05, `text-wrap: balance` |
| Eyebrow                          | 11 px / 700 caps, 0.04 em                                         |
| Sub-copy                         | 15 px                                                             |
| Card title `h2`                  | Space Grotesk 17 px / 600; sub-copy 13 px muted                   |
| KPI value                        | Space Grotesk 36 px / 700, proportional figures                   |
| Body, table cells, inputs        | 13 px; tables use `tabular-nums`                                  |
| Table heads, captions, footnotes | 12 px                                                             |
| Badges                           | 11 px (app badges)                                                |

**Scale:** 1 mockup pixel = 1 CSS pixel; widths are fluid. The page is checked at 1920 × 880 and 100 % zoom.

### Components (all in `supervisor.css`)

| Piece            | Recipe                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| Card             | white, 1 px `--lp-border`, radius 14, shadow `0 1px 2px #0b3b310a, 0 10px 28px #0b3b310d`                          |
| Card heading     | 40 px round mint icon well (`--lp-brand` icon) + title + sub-copy, then a count chip or an action (`CardHeading`)  |
| Primary button   | gradient brand-strong → brand-soft, radius 10, **1 px transparent border** (same height as the bordered secondary) |
| Secondary button | white, `--lp-border`, text `--lp-deep`, icon `--lp-brand`                                                          |
| Icon button      | 36 × 36 (32 in table rows), radius 10, `--lp-border`                                                               |
| Input / select   | 36 px, radius 8, `--lp-border`, placeholder `--lp-muted`; search has a 16 px icon inside (`.cv-search`)            |
| Count chip       | mint background, `--lp-brand` text, 12 px bold, tabular                                                            |
| Table            | head on `--lp-wash`, 12 px muted; rows 32–38 px, hairline `--lp-border`; the wrapper is `position: relative`       |
| Tinted strip     | `--lp-wash`, radius 10, columns split by hairlines (`.cv-indicators`)                                              |
| KPI tile         | grid: icon well + title on row 1; value under the icon, caption beside it; art `aria-hidden` in the corner         |
| Empty state      | icon, bold line, muted line, a decorative wave below the text                                                      |

### Decoration rules

- CSS and inline SVG only, no image files.
- Everything decorative is `aria-hidden`. SVG gradient stops take tokens through `style={{ stopColor: "var(--token)" }}`, because SVG attributes reject `var()`.
- **No art that reads as data.** The mockup's KPI bars looked like a rising trend over counts of 0 and 1, so we drew arcs and dots instead.
- Text never sits on a decoration darker than what its contrast test covers. A KPI caption over its art is tested on the art's blended colour.

---

## 5. Accessibility rules we kept

- Text 4.5:1, icons and rings 3:1. Each pair is a test in `tests/integration.test.mjs`, with its colours read from the stylesheet. Add a test for every new pair before writing the rule (watch it fail first).
- One `h1` per page; landmarks and table captions kept.
- **WCAG 2.5.3 (label in name):** if a control has visible text, its `aria-label` must start with it (« SV, menu du compte »).
- **No ⋮ for a single action.** A kebab means « menu ». Use a named button: an icon button with `aria-label` and `title`, as in the conversation rows.
- **No fake navigation.** The mockup showed « Clients », « Équipes », « Statistiques » and « Paramètres », which have no routes, so they are not drawn. The desktop hamburger isn't drawn either.
- Focus rings: `--focus-ring` on light, `--focus-ring-on-dark` in the sidebar. A container that receives focus by script gets the app ring, not the browser's black outline.
- `.sr-only` inside a scrolling box needs a positioned ancestor, or it widens the page.
- Desktop sizes sit in `@media (min-width: 901px)`, so the drawer and stacking rules in `app-responsive.css` still work on small screens.

---

## 6. How to bring another screen into the green direction

The steps are the same for the advisor, admin and client.

1. **Shell.** Pass `variant="green"` to `AppShell` on that page, and add the role's card copy to `spaceByRole` in `src/components/shell/GreenSidebar.tsx`. Pick the nav icons in `navItems.ts`. Keep only items that lead somewhere real.
2. **Shared content rules.** Once a second screen goes green, move the generic rules out of `supervisor.css` into a new `green-components.css` under one class, for example `.cv-green`:
   - cards, buttons, inputs, icon buttons, count chips;
   - table head and rows, card heading and icon well, notices.

   Put `.cv-green` on each green page's content wrapper. `supervisor.css` keeps only dashboard-specific rules (KPI tiles, queues, alerts, contact row). `CardHeading` can move to `src/components/` at the same time.

3. **Screen file.** Add `advisor.css` (or `admin.css`, `client.css`) after `supervisor.css` in `globals.css`, with every rule under the screen's own root class, as `supervisor.css` does.
4. **Contrast tests first.** Add the new text and ring pairs to the green test, see them fail, then write the CSS.
5. **Measure.** Compare the other screens before and after (section 8); they must not move.
6. **When every screen is green:** fold `shell-green.css` into `shell.css`, make `--lp-*` the app tokens, and drop the variant prop.

### Notes per screen

| Screen  | What to restyle                                                                                                             | Watch out for                                                                                                                                                                                                                           |
| ------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Advisor | inbox (queue buttons and conversation items), chat panel (header, bubbles, composer), customer column (cards), action forms | Queue buttons have `aria-label="Fraude 2"`, which fails WCAG 2.5.3 in axe 4.14; make the name start with the visible text. The chat panel's fixed heights (`.cv-chat-panel`) are in `workspace.css` and `app-responsive.css`.           |
| Admin   | tabs, users table and detail panel, forms in each tab                                                                       | `FrontDesk` (« Accueil » tab) is shared with the supervisor, whose one-row layout is built in CSS on its markup. A `layout` prop on `FrontDesk` would be cleaner; `IntegrationTools.tsx` is 330 lines and should be split when touched. |
| Client  | conversation-id form, `ConversationPanel`, incidents                                                                        | `ConversationPanel` is shared by three roles: restyle it under each page's scope (as the supervisor does), not in its own file, until all three are green.                                                                              |

---

## 7. Known gaps and open items

- **`AppShell` has six `green` branches.** If a second variant ever appears, sidebar-footer and header slots would be cleaner. With one direction, deleting the old shell at the end (step 6) removes them.
- **axe 4.14** still flags `.cv-account-trigger` on the advisor, admin and client, and the advisor's queue buttons. The fix is the supervisor's naming, applied per screen.
- **Input focus** in the whole app is a border-colour change plus a faint halo (`base.css`). It is visible, but weaker than the 3 px ring on buttons.
- **Paging** on `/supervisor` cannot be exercised with the demo data (16 conversations, page size 20).
- **Not run:** Safari and Firefox, screen readers (NVDA, VoiceOver), real data volumes beyond the demo set.
- The conversations table keeps « Messages » and « Dernier message ». They fit at 1366 px and above (tighter cells below 1600 px); at 1100 the table scrolls inside its card, as before.

---

## 8. How « nothing else changed » was measured

Fedi's scripts (not in the repo, to keep audit tools out of `package.json`) drive headless Chrome against a production build.

**The comparison.** It logs in through the form, visits 17 states at 1920, 1440 and 1100 px, and compares the old build with the new one:

- **States:** public 2, advisor 3, supervisor 2, admin 7, client 3.
- **Computed styles:** about 80 properties plus the box, for every element.
- **Screenshots:** full-page, compared with pixelmatch.
- **API traces:** the request set per step, plus STOMP subscriptions.
- **Calibration:** two runs of one build give 0 / 0 / 0. The clock is frozen, motion is reduced, and counters and clock times are normalised. The text caret is hidden: it blinks.

**Results** (measured on `ac965e1`, the content commit):

- **Other screens:** 45 snapshots, 0 style differences, 0 trace differences. The only pixels that differed were a blinking caret in one client input (1 × 18 px), proven by re-running.
- **Supervisor behaviour:** 14 steps (search, 4 filters, dates, invalid range, both refresh buttons, opening a conversation, contact lookup) with identical API traces and identical rendered state. 0 non-GET requests.
- **Fit:** no horizontal overflow and nothing past its container at 1920 × 880, 1920 × 1080, 1536 × 864, 1440 × 900, 1366 × 768 and 1100 × 900.
- **axe:** 4.13 and 4.14 report 0 on the supervisor at 1440 and 1920. (Before, 4.14 flagged the account menu.)
- **Mockup match:** 95.3 % of pixels within tolerance at the mockup's 1536 × 1024 (sidebar 95.5, header 98.9, heading 90.3, KPI 94.2, queues 96.8, alerts 97.1, conversations 95.1, contact 93.9); element boxes within 3 px.

The review fixes after `ac965e1` were each built and tested on their own. ⚠️ The full comparison was not re-run on the final head.
