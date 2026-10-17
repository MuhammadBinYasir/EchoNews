# Echo — Project Documentation & Engineering Guide

## 1. Project Overview & Vision
**Echo** is an AI-powered personalized daily newspaper designed to cut through information overload and deliver high-signal editorial journalism shaped around the reader's unique curiosity — while deliberately making room for serendipity ("Break the Echo").

Every morning, Echo compiles **one frozen daily edition** per user:
- The lead story and primary sections match the reader's deepest interests.
- Key takeaways are synthesized into **"Today in 3 Things"**.
- A dedicated **"Break the Echo"** section injects intriguing stories from outside the user's usual bubble.
- Every like, skip, and click dynamically recalibrates the user's taste profile for future editions.

---

## 2. Technology Stack & Directory Structure
- **Framework**: Next.js 16 (App Router, Turbopack, TypeScript, React 19).
- **Database**: MongoDB Atlas / local MongoDB (`mongodb://127.0.0.1:27017/echo`) via Mongoose.
- **Styling**: Tailwind CSS v4 with bespoke editorial tokens and Google Newsreader serif typography.
- **AI / LLM Engine**: Groq Cloud API (`llama-3.3-70b-versatile` via `process.env.GROQ_API` / `GRQO_API`) delivering ultra-fast (~200ms) curation and takeaway synthesis.
- **RSS Ingestion**: `rss-parser` with custom media namespaces, entity decoding, and thumbnail cleaning.

```
ai-hackathon-project/
├── app/
│   ├── api/
│   │   ├── edition/
│   │   │   └── regenerate/route.ts  # Regenerates today's paper on demand
│   │   ├── event/route.ts           # Handles Like, Skip, and Click signals (+ weight adjustments)
│   │   ├── ingest/route.ts          # Triggers RSS feed polling across 25+ sources
│   │   └── onboarding/
│   │       ├── articles/route.ts    # Curates the dynamic next headline for taste onboarding
│   │       └── route.ts             # Final single-transaction user creation & cookie setting
│   ├── onboarding/page.tsx          # 2-step interactive onboarding flow
│   ├── EditionClientView.tsx        # Client interactive newspaper reader (events, PDF, regenerate)
│   ├── globals.css                  # Tailwind v4 theme variables and editorial styles
│   ├── layout.tsx                   # Root HTML structure with Google Newsreader serif font
│   └── page.tsx                     # Dynamic Server Component rendering today's personalized edition
├── lib/
│   ├── clean-images.ts              # Decodes XML entities and strips CDN downsampling parameters
│   ├── curate-onboarding.ts         # Dynamic 1-by-1 headline curation with Groq LLM integration
│   ├── edition.ts                   # Daily edition layout generator, ranker, and compiler
│   ├── feeds.ts                     # Curated list of high-quality RSS feeds across 8 topics
│   ├── format.ts                    # Client-safe formatting utilities (time ago, topic titles, interests map)
│   ├── groq.ts                      # Groq API client with resilient timeout handling
│   ├── ingest.ts                    # RSS parsing, deduplication, and database ingestion
│   └── mongo.ts                     # Cached singleton MongoDB connection for Next.js serverless
├── model/
│   └── index.ts                     # Mongoose schemas: User, Article, Edition, Event, LlmCache
└── tailwind.config.ts               # Theme extensions (Crimson primary, warm paper secondary)
```

---

## 3. Data Models & Schemas (`model/index.ts`)

### Fixed Topics Enum
```typescript
export const TOPICS = [
  "tech", "ai", "world", "business", "sports", "science", "health", "culture"
] as const;
```

### 1. User
- **Fields**:
  - `name` (string, required, trimmed): The name displayed on the masthead ("Prepared for Alex").
  - `interests` (Map<string, number>, topic -> weight `0.00` to `1.00`): Reader's taste profile.
  - `createdAt` (Date).
- **Purpose**: Identifies the reader and holds their evolving topic preferences.
- **Identity**: User `_id` is stored in the `echo_user_id` and `userId` cookies (1-year lifespan).
- **Notes**: Weights update on every button press with `$inc` and are clamped between `0.0` and `1.0`.

### 2. Article
- **Fields**:
  - `url` (string, unique, required): Canonical article URL (used for upsert deduplication).
  - `title` (string, required): Clean headline.
  - `source` (string, required): Publication name (e.g., "BBC News", "The Verge", "Nature").
  - `topic` (enum: TOPICS, required).
  - `snippet` (string): Text excerpt from article body or summary.
  - `image` (string, optional): Full-resolution image URL.
  - `publishedAt` (Date, required): Timestamp of publication.
  - `fetchedAt` (Date).
- **Indexes**: Unique on `url`, compound index on `{ topic: 1, publishedAt: -1 }`.

### 3. Edition
- **Fields**:
  - `userId` (ObjectId, ref: "User", required).
  - `date` (string, required): `"YYYY-MM-DD"`.
  - `number` (number, required): Sequential issue number (e.g., 1 for "EDITION NO. 001").
  - `layout`:
    - `lead`: ObjectId (ref: "Article", the Big Read).
    - `secondary`: [ObjectId] (4 articles in "More for you" 2x2 grid).
    - `briefs`: [ObjectId] (6 articles in "In brief" sidebar).
    - `echo`: [ObjectId] (2 articles in "Break the Echo").
  - `threeThings`: [string] (3 synthesized takeaway bullets).
  - `createdAt` (Date).
- **Indexes**: Unique on `{ userId: 1, date: -1 }` (enforcing one frozen edition per day).

### 4. Event
- **Fields**: `userId`, `articleId`, `editionId`, `topic`, `type` (`click` | `like` | `skip` | `read`), `ts`.
- **Purpose**: Raw log of reader interactions that drives the active learning loop.
- **Signal Weights**:
  - `like`: **+0.20**
  - `click` ("Read original"): **+0.10**
  - `read` (>30 seconds): **+0.05**
  - `skip`: **-0.10**

---

## 4. Design System & Theme Palette

The UI adopts a tactile, high-end editorial newspaper aesthetic inspired by vintage print publications:

- **Primary (Crimson)**:
  - Base: `#c0152f` (used for the `Echo.` period, action buttons, progress bars, and active badges).
  - Hover: `#a31126`.
  - Light/Tint: `#fae9e7` (selected cards and pills).
  - Border: `#ebc2bc`.
- **Secondary (Warm Newsprint Paper & Ink)**:
  - Page Background: `#f5f0e6` / `#f6f1e8` (warm linen/cream tone).
  - Card Background: `#ffffff` with subtle `#ded7cb` borders and soft shadow.
  - Ink Charcoal: `#1a1917` (rich newsprint black).
  - Muted Editorial Gray: `#716c64` (secondary metadata, timestamps).
- **Typography**:
  - Headlines & Masthead: **Google Newsreader** serif (`--font-serif`) for timeless editorial gravitas.
  - Labels & Metadata: **Geist Sans** (`--font-sans`) with letter-spacing tracking.

---

## 5. Ingestion Pipeline & Image Optimization

### Feed Ingestion (`lib/ingest.ts` & `lib/feeds.ts`)
- Ingests articles from 25+ trusted publications (The Verge, MIT Tech Review, BBC News, Nature, ScienceDaily, NPR, The Guardian, etc.).
- Uses `Promise.allSettled` so that slow or broken RSS feeds never crash the ingestion run.
- Deduplicates via MongoDB bulk upserts (`$setOnInsert` on `url`).

### Image Quality & Entity Decoding (`lib/clean-images.ts`)
1. **XML Entity Decoding**: RSS feeds from WordPress and major outlets encode query ampersands as `&#038;` or `&amp;` (e.g. `?quality=90&#038;crop=0,0,100,100`). Browsers treat `#` as an in-page fragment hash, breaking the request. The cleaner converts all instances to valid `&`.
2. **Stripping Downsampling Filters**: Aggressive thumbnail crop parameters (such as `&crop=0,0,100,100`, `resize=...`, `w=150`) are stripped so the browser receives the **original full-resolution photo**.
3. **Referrer Policy**: Cards render images with `referrerPolicy="no-referrer"` so news CDNs do not block hotlinking from `localhost` with 403 Forbidden.

---

## 6. Onboarding Flow (`app/onboarding/page.tsx`)

A 2-step journey where **no user record is created in MongoDB until the user completes the flow**.

### Step 1: Masthead & Topic Selection
- Asks for the reader's name ("What should we call you?").
- The reader selects **3 or more topics** from the 8-topic grid.
- State is held in client memory. Clicking "Find my headlines →" transitions to Step 2 without hitting the database.

### Step 2: Dynamic 1-by-1 Headline Tapping
Instead of dumping a batch of articles, the system presents **1 article at a time** in an adaptive loop:
- **Progress Tracking**: Reviews up to 8 total headlines (`HEADLINE 01 / 08`, `HEADLINE 02 / 08`, etc.).
- **Dynamic Like Matching**: When the user taps **"Like article"**, its topic (+5) and title keywords (+4) are boosted. The server queries candidate articles matching those specific interests.
- **Dynamic Dislike Filtering**: When the user taps **"Dislike article"**, that topic and angle are penalized (-8) to pivot to other selected interests.
- **Groq Intelligence**: Groq (`llama-3.3-70b-versatile` via `lib/groq.ts`) inspects candidate headlines against accumulated likes/dislikes and selects the best next headline in ~200ms.
- **Discovery Injection**: At steps 7 and 8, the system introduces exploratory articles from unchosen topics.
- **Skip Option**: The user can click "Skip for now — take me to my edition" at any time to immediately finalize.

### Initial Weight Formula & Single Deferred Write (`/api/onboarding`)
When all headlines are reviewed (or skipped):
1. **Starting Weights**:
   - Each selected topic starts at **0.70**.
   - Every other topic starts at **0.20**.
2. **Liked Headline Adjustments**:
   - For every liked article, its topic is looked up and receives **+0.15** (clamped to a max of **1.00**).
3. **Database Write**:
   - Creates the `User` in MongoDB in a single final write.
   - Logs initial `Event` records for the learning loop.
   - Sets `echo_user_id` and `userId` cookies (1-year duration).
   - Redirects the reader to `/` (their freshly generated paper).

---

## 7. Daily Edition Engine (`app/page.tsx` & `lib/edition.ts`)

When an onboarded reader visits `/`:

1. **Authentication Check**: Reads `echo_user_id` cookie. If missing or invalid, redirects to `/onboarding`.
2. **Dynamic Runtime**: Uses `await connection()` from `next/server` to declare dynamic per-user execution, preventing static prerender conflicts with `new Date()` and cookies in Next.js 16.
3. **Layout Compilation**:
   - **Lead Article (The Big Read)**: Top-ranked article from the user's primary interest.
   - **More for you**: 4 secondary articles arranged in a 2x2 grid.
   - **Your interests Panel**: Real-time progress bars showing the reader's **top 6 topics in descending order** with actual percentages (e.g. `85%`, `70%`).
   - **In brief**: 6 quick reads with time ago calculations.
   - **Break the Echo**: 2 curated articles from the user's **lowest-weight topics** to expand their horizons.
   - **Today in 3 Things**: 3 concise takeaways generated from the top stories of the edition.
4. **100% Real Data**:
   - No fake authors or desks; shows the real source publication (`BBC News`, `The Verge`).
   - Shows calculated times ago (`3 hours ago`, `Yesterday`) from `publishedAt`.
   - Snippet text hides cleanly when empty.
   - Real edition numbering (`EDITION NO. 001`).
5. **Interactive Controls**:
   - **[ Read original ]**: Opens publisher link in a new tab and logs a `click` event.
   - **[ Like ]**: Turns crimson red, logs a `like` event (`+0.20`), and smoothly increments the topic progress bar.
   - **[ Skip ]**: Dims the card and logs a `skip` event (`-0.10`).
   - **[ ⟳ Regenerate ]**: Calls `POST /api/edition/regenerate` to compile fresh stories.
   - **[ ⬇ Download PDF ]**: Triggers `window.print()` formatted for clean newspaper print output.

---

## 8. Learning Loop & Weight Calibration (`app/api/event/route.ts`)

Every button click updates the reader's taste model:
```typescript
const WEIGHT_DELTAS = {
  click: 0.10,
  like:  0.20,
  skip: -0.10,
  read:  0.05,
};

// Weight is clamped between 0.00 and 1.00
const updated = Math.max(0.0, Math.min(1.0, parseFloat((current + delta).toFixed(2))));
```

The next time an edition is generated or regenerated, the new weights directly influence article candidate scoring, lead story selection, and the "Break the Echo" discovery pool.

---

## 9. Environment Variables (`.env.local`)
```ini
# MongoDB Connection URI
MONGODB_URI=mongodb://127.0.0.1:27017/echo

# Groq Cloud API Key (supports GROQ_API or GRQO_API)
GROQ_API=gsk_your_groq_api_key_here
```

---

## 10. Development & Verification
- **Run Dev Server**: `npm run dev` (starts on `http://localhost:3000`).
- **Ingest RSS Feeds**: Open `http://localhost:3000/api/ingest` in the browser or trigger via GET request.
- **Onboarding Flow**: Navigate to `http://localhost:3000/onboarding`.
- **Daily Edition**: Navigate to `http://localhost:3000/`.
- **Production Build Validation**: `npm run build` (verified clean compilation with Turbopack and TypeScript).