# Echo — Project Documentation & Engineering Guide

## 1. Project Overview & Vision
**Echo** is an AI‑powered personalized daily newspaper that curates high‑signal editorial journalism around each reader’s unique curiosity while deliberately introducing serendipitous stories (the *Break the Echo* section).

- One **frozen edition** is generated per user each morning.
- The edition contains a lead story, secondary stories, briefs, and discovery articles.
- User interactions (like, skip, read) continuously adjust a lightweight **taste profile** stored in MongoDB.

---

## 2. Technology Stack & Directory Layout
- **Framework**: Next.js 16 (App Router, Turbopack, TypeScript, React 19)
- **Database**: MongoDB Atlas / local MongoDB (`mongodb://127.0.0.1:27017/echo`) via Mongoose with a cached connection helper.
- **Styling**: Tailwind CSS v4 + custom design tokens (crimson primary, warm paper secondary) and Google **Newsreader** serif typography.
- **LLM Engine**: **Google Gemini API** (`gemini-3.8-flash`) – accessed through `lib/gemini.ts`.
- **RSS Ingestion**: `rss-parser` + custom image cleaning (`lib/clean-images.ts`).

```
ai‑hackathon‑project/
├── app/
│   ├── api/
│   │   ├── stories/route.ts          # Personalized recent story rail API
│   │   ├── onboarding/
│   │   │   ├── articles/route.ts   # Curates next headline (uses Gemini when configured)
│   │   │   └── route.ts            # Final user creation + cookie set
│   │   ├── edition/
│   │   │   └── regenerate/route.ts # Regenerates today’s edition on demand
│   │   └── event/route.ts          # Logs likes, skips, clicks → weight updates
│   ├── onboarding/page.tsx          # 2‑step interactive onboarding UI
│   ├── EditionClientView.tsx        # Interactive newspaper reader UI
│   ├── NewsStoryRail.tsx             # Recent news story rail and viewer (web only)
│   ├── globals.css                  # Tailwind config + CSS variables
│   ├── layout.tsx                   # Root layout + Google fonts
│   └── page.tsx                     # Server‑side rendering of today’s edition
├── lib/
│   ├── curate‑onboarding.ts         # Core article selection logic (weights, Gemini tie-break)
│   ├── edition.ts                   # Builds edition layout from user profile
│   ├── feeds.ts                     # RSS source list (8 topics, 25+ feeds)
│   ├── format.ts                    # Human‑readable time‑ago, topic titles, etc.
│   ├── gemini.ts                    # Thin wrapper around Gemini generateContent API
│   ├── recommendation.ts            # Testable interest weighting and story ranking
│   ├── ingest.ts                    # Bulk RSS ingestion, deduplication
│   ├── clean‑images.ts              # Entity decoding & down‑sampling removal
│   └── mongo.ts                     # Cached singleton Mongoose connection
├── model/
│   └── index.ts                     # Mongoose schemas: User, Article, Edition, Event, LlmCache
├── models/                         # Re‑export shim for legacy imports
│   └── index.ts                     # `export * from "../model/index";`
├── tailwind.config.ts               # Primary & secondary colour palettes
└── SKILLS.md                        # Project documentation (this file)
```
---

## 3. Data Models (`model/index.ts`)
- **TOPICS** – fixed enum: `tech, ai, world, business, sports, science, health, culture`
- **User** – `name`, `interests` (learned Map of topic → weight 0‑1), `initialInterests` (onboarding baseline), `createdAt`
- **Article** – `url`, `title`, `source`, `topic`, publisher `snippet` and `sourceText`, cached AI `summary`, `image`, `publishedAt`, `fetchedAt`
- **Edition** – per‑user, per‑date snapshot with lead, secondary, briefs, and discovery article IDs.
- **Event** – interaction logs (`like`, `click`, `skip`, `read`) with an `origin` marker so onboarding votes are not double-counted as later feedback.

Weights are clamped between `0.00` and `1.00`. The update logic lives in `app/api/event/route.ts`.
---

## 4. Design System & Theme Palette
| Role | Colour (hex) | Usage |
|------|--------------|-------|
| **Primary (Crimson)** | `#c0152f` (base) <br> `#a31126` (hover) <br> `#fae9e7` (tint) <br> `#ebc2bc` (border) | Action buttons, progress bars, selected topic pills |
| **Secondary (Paper)** | `#f5f0e6` / `#f6f1e8` (page background) <br> `#ffffff` (card background) <br> `#ded7cb` (card border) <br> `#1a1917` (ink/primary text) <br> `#716c64` (metadata/secondary text) | Overall page, cards, footers |

**Typography** – Google **Newsreader** for headlines & masthead, **Geist** for UI labels.
---

## 5. Onboarding Flow (`app/onboarding/page.tsx`)
1. **Step 1 – Masthead & Topic Selection**
   - Collects user name.
   - Requires a minimum of three selected topics.
   - No DB write yet – everything lives in client state.
2. **Step 2 – Dynamic Headline Tapping**
   - Calls `/api/onboarding/articles` (POST) which runs `getNextOnboardingArticle`.
   - The server uses **Gemini** as a constrained tie-breaker for the best next article, after deterministic scoring from:
     - Selected topics (`0.7` weight each)
     - Other topics (`0.2` weight each)
     - Incremental `+0.15` for each liked article (capped at `1.0`).
   - Up to 8 headlines are shown (6 from chosen topics, 2 exploratory).
   - Likes/dislikes update client‑side arrays; the next request sends the cumulative lists.
3. **Finalisation** (`/api/onboarding/route.ts`)
   - Creates a `User` document with the computed interest map for a new browser, or updates the existing cookie-linked profile on re-onboarding so its edition archive stays attached.
   - Sets `echo_user_id` and `userId` HTTP-only cookies (1‑year TTL).
   - Redirects to the home page (`/`).
---

## 6. Daily Edition Engine (`app/today/page.tsx` & `lib/edition.ts`)
- **Authentication** – Reads the cookie; redirects to `/onboarding` if missing.
- **Dynamic Server Component** – Uses `await connectDB()` (via cached helper) to keep the request dynamic (avoids `new Date()` prerender error).
- **Layout**
  - **Lead** – Highest‑ranked story by reader topic weight, with freshness and usable presentation as smaller tie-breakers.
  - **More for you** – 4 secondary articles (2×2 grid).
  - **In brief** – 6 short reads.
  - **Break the Echo** – 2 low‑weight‑topic articles to broaden horizons.
  - **Today in 3 Things** – Gemini-generated bullet takeaways.
- **Article summaries** – Gemini summarizes selected stories from stored publisher RSS content. Summaries are cached on Article records; a publisher excerpt remains the fallback if AI is unavailable. Treat RSS text as untrusted source data.
- **Refresh behavior** – One edition is frozen per day. `algorithmVersion` upgrades an older same-day edition once after the ranking update; manual regeneration rebuilds it using current interests.
- **Interactions** – `Like`, `Skip`, `Read original`, `Regenerate`, `Download PDF`. Explicit likes/skips and recent reading signals recompute the learned interest map, which ranks the next edition.
- **Story rail** – The current edition page has a print-hidden, Instagram-style recent-news rail. `/api/stories` selects at most one story per topic from the last 7 days, only for topics whose learned interest exceeds 0.25. Topics appear from highest interest downward, and the top-ranked recent story is chosen within each topic. Readers can open the publisher, like a story, or ask for less like it; this feedback updates the same preference profile. Story links also use the approximate 30-second away-and-return read signal.
---

## 7. Learning Loop & Weight Calibration (`app/api/event/route.ts`)
```ts
const FEEDBACK_DELTAS = { click: 0.015, read: 0.07, like: 0.18, skip: -0.14 };
// Signals decay with a 45-day half-life, expire after 180 days, and clamp weights to 0..1.
```
Repeated actions on the same article in one edition are deduplicated. A like/skip toggle replaces the previous opinion for that story. A click is weak positive intent; leaving Echo to read for at least 30 seconds and returning is recorded as a stronger read signal. The next regenerated or daily edition uses the learned weights while preserving topic and publisher diversity.
---

## 8. Development Milestones (What we added today)
| Milestone | File(s) Affected | Description |
|-----------|----------------|-------------|
| **Tailwind config** | `tailwind.config.ts` | Added primary (`crimson`) and secondary (paper) color palettes; ensured `content` includes `app/**/*.{js,ts,jsx,tsx,mdx}`.
| **CSS variables** | `app/globals.css` | Injected `:root` tokens for the colours, linked config via `@config "../tailwind.config.ts"`.
| **Google fonts** | `app/layout.tsx` | Imported **Newsreader** serif and configured `--font-serif` variable.
| **MongoDB connection** | `lib/mongo.ts` | Implemented a cached singleton Mongoose connection compatible with Next.js serverless.
| **Model re‑export** | `models/index.ts` | Shim to satisfy imports that expect a `models` folder.
| **Onboarding article API** | `app/api/onboarding/articles/route.ts` | Parses request body, forwards to `getNextOnboardingArticle`, returns JSON.
| **Onboarding UI tweaks** | `app/onboarding/page.tsx` | Fixed missing default export, refined progress bar colours, added fallback image handling.
| **Build verification** | `npm run build` | Confirmed no TypeScript or runtime errors after the above changes.
| **Personalization and summaries** | `lib/edition.ts`, `lib/ingest.ts`, `model/index.ts` | Rank stories by reader weights, retain publisher text for grounding, and cache AI summaries.
| **Feedback alignment** | `app/api/event/route.ts`, `app/EditionClientView.tsx` | Validate edition membership and render the server’s saved topic weight.
| **Print pagination** | `app/globals.css` | Let long sections paginate and stack newspaper grids for letter-size printing.
---

## 9. Environment Variables (`.env.local`)
```ini
# MongoDB connection string
MONGODB_URI=mongodb://127.0.0.1:27017/echo

# Google AI Studio Gemini API key
GEMINI_API_KEY=your_gemini_api_key_here

# Public deployment origin used to form absolute social metadata URLs
NEXT_PUBLIC_SITE_URL=https://your-deployed-domain.example
```
---

## 10. Running the Project
```bash
# Install dependencies
npm install

# Start dev server
npm run dev   # http://localhost:3000

# Ingest RSS feeds (populate DB)
open http://localhost:3000/api/ingest   # or curl GET /api/ingest

# Onboard a new user
http://localhost:3000/onboarding

# View today’s edition after onboarding
http://localhost:3000/today
```
---

## 11. Implementation Log — 17 October 2026
- **PDF/print edition** – Uses A4 print styling that retains the newspaper palette and hides navigation and interaction controls. The “Download PDF” action opens the browser print dialog; choose **Save as PDF** there.
- **Public landing page** – Added a responsive editorial-style product landing page at `/`, with clear onboarding and returning-reader links. The authenticated daily paper now lives at `/today`; onboarding and newspaper navigation point there. The production build passes with both routes.
- **Landing page expansion** – Added an illustrated “Inside your edition” preview for the lead, quick reads, and discovery sections, plus an accessible expandable FAQ covering personalization, original articles, and PDF saving.
- **Recommendation and summary workflow** – Re-ranked stories by reader topic weights before freshness, removed image/snippet gates that excluded relevant stories, stored longer RSS source text, and added cached AI summaries grounded in publisher content. Older stories get a summary when their saved edition is opened. Legacy editions upgrade once through algorithm version 2.
- **Gemini migration and recommendation safeguards** – Replaced Groq calls with Gemini 3.8 Flash. Interest priorities, discovery topics, and ranking now use pure helpers; Gemini only breaks ties among already scored onboarding choices. If the preferred feeds are empty, the edition falls back to available stories.
- **Story rotation and regeneration** – Regenerate now excludes up to 300 recently shown article IDs recorded on the latest edition, then falls back to older stories only when fewer than 11 fresh preferred-topic candidates or two discovery candidates remain. Lead, secondary, brief, and discovery selections reduce repeated topics, publishers, and near-duplicate headlines. Onboarding gets a server-generated per-session shuffle so restarts offer a different selection while within-session seen IDs stay excluded. Regeneration waits for pending like/skip requests before rebuilding from the latest saved taste weights.
- **PDF page fill** – Removed the browser page margins, extended the warm paper background to page edges, and kept readable inset spacing inside the newspaper content.
- **Print preview follow-up** – The screenshot showed only the top summary printing because nested grid/flex content could be fragmented or clipped. Print styles now force the edition columns and nested flex content into visible, auto-height block flow, remove overflow/height constraints, and paint a full-page warm background behind the content. Verify the updated output in Chrome’s print preview; this environment has not visually rendered that preview.
- **Dedicated newspaper print layout** – Added `/print` for the current edition with an editorial masthead, full-width lead story, three-column story flow, digest panel, and A4 full-bleed print rules. The daily edition’s PDF action now opens this layout; archived editions keep printing their selected archived edition. This change was not tested or visually previewed at the user’s request; the next step is for the user to inspect `/print` and its browser print preview.
- **Echo brand and SEO metadata** – Added a reusable serif wordmark SVG, a crimson-dot favicon and Apple touch icon, and a generated 1200×630 Open Graph image. Root metadata now includes a descriptive title template, news-focused SEO description and keywords, Open Graph fields, and a large-image Twitter card. Set `NEXT_PUBLIC_SITE_URL` to the public deployment origin so social image URLs resolve correctly outside local development.
- **Reader cookie fallback on print** – `/print` and `/today` now validate the primary and legacy reader cookies in priority order and try the next valid profile ID if the first cookie no longer resolves to a saved reader/edition. This prevents a stale primary cookie from forcing a reader with a valid legacy cookie back into onboarding.
- **Keep archived readers out of onboarding** – `/onboarding` now checks whether a cookie-linked reader has saved editions and returns them to `/today`; `/today` and `/print` fall back to the latest saved edition when no current edition can be produced. Archive and dated-edition routes also try both reader cookies. A missing/cleared cookie still cannot identify a profile without a sign-in or recovery mechanism.
- **Feedback integrity** – Event requests use the reader cookie and verify either that a story belongs to the reader’s edition or that a standalone story is recent. The interest meter uses the saved server weight rather than a mismatched client-side estimate.
- **Profile reuse** – Re-onboarding from a browser with a valid reader cookie updates that reader’s name and interests rather than creating a second profile. Existing editions and event history stay associated with the same user; newly issued reader cookies are HTTP-only.
- **Edition menu** – Regenerate, archive, and confirmation-protected data deletion are grouped in the responsive More menu; Download PDF stays prominent in the utility bar.
- **Reader data deletion** – `/api/account` permanently deletes the cookie-linked user, editions, and feedback events, then removes both reader cookies. Shared articles and AI summary cache remain intact.
- **Mobile daily edition** – `/today` now stacks its utility controls on narrow screens, uses a two-column action grid, reduces small-screen padding and headline sizing, wraps article actions and metadata, and gives touch controls larger hit areas.
- **Adaptive recommendations** – Kept onboarding preferences as a baseline and rebuild learned topic weights from feedback in the last 180 days using a 45-day half-life. Clicks add only a small signal, reads add a stronger signal after an approximate 30-second away-and-return dwell, likes/skips are stronger and replace opposing opinions per story/edition, and duplicate same-type actions are ignored. Core topic ranking now requires a meaningful preference above 0.25, so a single casual click does not reshape the edition.
- **Recent news stories** – Added a personalized, circular story rail and full-screen viewer above today’s paper. Stories are drawn from the previous 7 days with at most one story per topic; only topics with learned interest above 0.25 appear, ordered from highest interest to lowest. The top-ranked recent story is selected within each topic. The rail can be navigated with keyboard arrows and is hidden in print. Likes, skips, and publisher clicks feed the same learning loop.
- **Print pagination** – Removed whole-section page-break locks, stacked nested grids in print, capped image heights, and kept article cards intact where possible.
- **Edition archive** – Added `/archive` and `/edition/[date]`, both scoped to the signed-in reader. The archive links to saved editions and uses the existing `listEditions` / `getEditionByDate` helpers. The home and archive views share `lib/edition-page-data.ts` so current and previous editions render consistently.
- **Daily RSS refresh** – Added `/api/cron/ingest` and `vercel.json` with a daily 01:00 UTC schedule. Configure `CRON_SECRET` in the deployment environment; the scheduled endpoint requires the matching bearer token. `/api/ingest` remains available for manual refresh while developing.
- **Archive prerendering fix** – `/archive` now calls Next.js `connection()` before querying saved editions, keeping database/date-dependent rendering at request time and resolving the unstable `new Date()` prerender error. The Gemini 429 in the supplied log indicates a separate API quota/rate limit and is not caused by archive rendering.
- **Open Graph image prerender fix** – Replaced the `<br />` inside the headline with two flex child spans, satisfying Satori's requirement that multi-child `<div>` elements declare a supported display mode. Build verification is left to the user.
- **Verification** – `npm run lint` passes with four existing warnings and `npx next build --webpack` passes, including the recent-history schema and onboarding session seed. The environment has no `GEMINI_API_KEY`; live Gemini responses are not verified. Print CSS changes still need a visual check in the local browser's Save as PDF preview.

## 12. Next Work & Known Limitations
- **Live verification** – In a local browser, confirm story freshness and personalization, test story viewer likes/skips, and verify the rail is hidden in PDF output. Compare recommendations after qualified reads and check toggled story opinions. Test reader data deletion, check `/today` at phone widths, revisit onboarding with an existing cookie, regenerate twice, and recheck Chrome’s PDF preview. Inspect the new `/print` layout and its A4 preview. Add `GEMINI_API_KEY` to `.env.local` (and deployment secrets) to verify live AI calls.
- **Scheduled deployment** – The cron runs only on a deployment platform that honors `vercel.json` schedules. Set `CRON_SECRET` in that environment before enabling scheduled ingestion.
- **Image CDN restrictions** – Some publishers block hot-linking; the app falls back to a placeholder when the request fails.
- **Gemini request latency** – Gemini is optional for recommendations (scored ranking is the fallback) and used to generate uncached summaries only when needed; cached summaries avoid repeated calls.
- **Hackathon materials** – Confirm the repository is public and prepare the product walkthrough and architecture diagram required for submission.

---

*This file (`SKILLS.md`) is automatically generated/updated by the Antigravity coding assistant to keep documentation in sync with the codebase.*
