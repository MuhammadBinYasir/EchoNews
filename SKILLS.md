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
- **LLM Engine**: **Groq Cloud** (`llama‑3.3‑70b‑versatile`) – accessed through `lib/groq.ts`.
- **RSS Ingestion**: `rss-parser` + custom image cleaning (`lib/clean-images.ts`).

```
ai‑hackathon‑project/
├── app/
│   ├── api/
│   │   ├── onboarding/
│   │   │   ├── articles/route.ts   # Curates next headline (uses Groq)
│   │   │   └── route.ts            # Final user creation + cookie set
│   │   ├── edition/
│   │   │   └── regenerate/route.ts # Regenerates today’s edition on demand
│   │   └── event/route.ts          # Logs likes, skips, clicks → weight updates
│   ├── onboarding/page.tsx          # 2‑step interactive onboarding UI
│   ├── EditionClientView.tsx        # Interactive newspaper reader UI
│   ├── globals.css                  # Tailwind config + CSS variables
│   ├── layout.tsx                   # Root layout + Google fonts
│   └── page.tsx                     # Server‑side rendering of today’s edition
├── lib/
│   ├── curate‑onboarding.ts         # Core article selection logic (weights, Groq)
│   ├── edition.ts                   # Builds edition layout from user profile
│   ├── feeds.ts                     # RSS source list (8 topics, 25+ feeds)
│   ├── format.ts                    # Human‑readable time‑ago, topic titles, etc.
│   ├── groq.ts                      # Thin wrapper around Groq HTTP API
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
- **User** – `name`, `interests` (Map of topic → weight 0‑1), `createdAt`
- **Article** – `url`, `title`, `source`, `topic`, `snippet`, `image`, `publishedAt`, `fetchedAt`
- **Edition** – per‑user, per‑date snapshot with lead, secondary, briefs, and discovery article IDs.
- **Event** – raw interaction logs (`like`, `click`, `skip`, `read`) used to adjust weights.

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
   - The server uses **Groq** to pick the *best* next article given:
     - Selected topics (`0.7` weight each)
     - Other topics (`0.2` weight each)
     - Incremental `+0.15` for each liked article (capped at `1.0`).
   - Up to 8 headlines are shown (6 from chosen topics, 2 exploratory).
   - Likes/dislikes update client‑side arrays; the next request sends the cumulative lists.
3. **Finalisation** (`/api/onboarding/route.ts`)
   - Creates a `User` document with the computed interest map.
   - Sets `echo_user_id` and `userId` cookies (1‑year TTL).
   - Redirects to the home page (`/`).
---

## 6. Daily Edition Engine (`app/page.tsx` & `lib/edition.ts`)
- **Authentication** – Reads the cookie; redirects to `/onboarding` if missing.
- **Dynamic Server Component** – Uses `await connectDB()` (via cached helper) to keep the request dynamic (avoids `new Date()` prerender error).
- **Layout**
  - **Lead** – Highest‑ranked article for the top‑weight topic.
  - **More for you** – 4 secondary articles (2×2 grid).
  - **In brief** – 6 short reads.
  - **Break the Echo** – 2 low‑weight‑topic articles to broaden horizons.
  - **Today in 3 Things** – Groq‑generated bullet takeaways.
- **Interactions** – `Like`, `Skip`, `Read original`, `Regenerate`, `Download PDF`. Each logs an `Event` which immediately updates the user’s interest map.
---

## 7. Learning Loop & Weight Calibration (`app/api/event/route.ts`)
```ts
const WEIGHT_DELTAS = { click: 0.10, like: 0.20, skip: -0.10, read: 0.05 };
// Updated weight is clamped between 0.00 and 1.00
```
All events feed back into the user document, influencing the next edition generation and the onboarding article selector.
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
---

## 9. Environment Variables (`.env.local`)
```ini
# MongoDB connection string
MONGODB_URI=mongodb://127.0.0.1:27017/echo

# Groq Cloud API key (accepts GROQ_API or GRQO_API)
GROQ_API=gsk_your_groq_api_key_here
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
http://localhost:3000/
```
---

## 11. Future Work & Known Limitations
- **Image CDN restrictions** – Some publishers block hot‑linking; we fallback to a placeholder when the request fails.
- **Groq request latency** – Currently ~200 ms; can be cached per‑user for the onboarding session.
- **Archive feature** – Implemented `getEditionByDate`, `listEditions` helpers and UI (`/archive` and `/edition/[date]`). Archive page is a Server Component.

---

*This file (`SKILLS.md`) is automatically generated/updated by the Antigravity coding assistant to keep documentation in sync with the codebase.*