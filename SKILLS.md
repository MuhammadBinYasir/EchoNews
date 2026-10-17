STACK: Next.js (App Router, TypeScript), MongoDB Atlas via Mongoose. Models live in
`models/index.ts`. Always call `await connectDB()` (`lib/mongo.ts`) before using a model.
Topics are a fixed lowercase enum: tech, ai, world, business, sports, science, health, culture.

1. User
Fields: name (string), interests (Map<string, number>, topic -> weight 0..1), createdAt.
Purpose: identifies the reader and holds their taste profile. The user _id is stored in a cookie.
Written: at onboarding (initial weights) and after every like/skip/click (learn.ts updates weights).
Read: to rank each edition, show "Prepared for [name]", and render the "Your interests" panel.
Notes: update with $inc on "interests.<topic>" and clamp to 0..1 in code. Use .lean() on reads.

2. Article
Fields: url (unique), title, source, topic (enum), snippet, image, publishedAt, fetchedAt.
Purpose: shared pool of news from RSS, the same for all users.
Written: by the ingestion job (/api/ingest) using upsert on url so duplicates are skipped.
Read: by the ranking step to pick candidates, and by the reader/PDF pages to render articles.
Indexes: unique on url, and { topic, publishedAt } for fast per-topic recent queries.

3. Edition
Fields: userId, date ("YYYY-MM-DD"), number, layout { lead, secondary[], briefs[], echo[] }
(all are Article ObjectIds), threeThings (string[]), createdAt.
Purpose: one generated paper per user per day. Stores only article ids, so past editions stay frozen.
Written: by generate/regenerate, via upsert on { userId, date }.
Read: by /edition/[date], /archive, and the print route used for the PDF.
Notes: "echo" is the "Break the Echo" section (articles from the user's lowest-weight topics).
The unique index { userId, date } enforces one edition per user per day.
Populate layout ids with the Article model when rendering.

4. Event
Fields: userId, articleId, editionId, topic (copied from the article), type (click|like|skip|read), ts.
Purpose: raw log of reader behavior, the input to the learning loop.
Written: on every button press via POST /api/event. Do this alongside the weight update.
Read: to learn from history and to avoid repeating articles seen in recent editions.
Weights: click +0.10, like +0.20, skip -0.10, read>30s +0.05.

5. LlmCache
Fields: key (unique, a hash of the prompt/input), response (any), createdAt.
Purpose: stores LLM outputs so the same request is never paid for twice.
Written: after each LLM call (e.g. "Today in 3 Things", summaries).
Read: before each LLM call. If the key exists, return the cached response.
Notes: with MOCK_LLM=true, skip the API entirely and return fake data.

/* ------------------------------------------------------------------ */
/* Onboarding Flow & Checkpoints                                      */
/* ------------------------------------------------------------------ */

Route: /onboarding (app/onboarding/page.tsx)
Flow: 2-step editorial onboarding. No user record is written to MongoDB until Step 2 completes.

- Step 1 of 2: Masthead & Topics
  - Asks for reader's name ("What should we call you?").
  - User selects 3 or more topics from TOPICS (tech, ai, world, business, sports, science, health, culture).
  - State (name, selected topics) is held in client memory; clicking "Find my headlines →" transitions to Step 2.

- Step 2 of 2: Tapping Headlines & Taste Calibration
  - Fetches 8 candidate articles via POST /api/onboarding/articles:
    * Curated by `lib/curate-onboarding.ts`: strictly filters for articles with real publisher images and rich snippets (eliminating text-only/noise posts).
    * Relevancy scoring: scores title and snippet against topic-specific editorial keywords to rank the most compelling headlines.
    * High-definition images: decodes XML entities (e.g. `&#038;` -> `&`) and removes aggressive thumbnail downscaling / crop params (e.g. `crop=0,0,100,100`), serving the publisher's full-resolution image with `referrerPolicy="no-referrer"`.
    * 6 articles from the user's selected topics (balanced distribution).
    * 2 articles from non-selected topics ("room for a little surprise" / "Break the Echo").
    * Local Ollama LLM (`qwen3.5:4b` at http://127.0.0.1:11434) is queried to fine-tune headline selection, with fast, resilient fallback to algorithmic relevance ranking.
  - User reviews headlines one-by-one with "Dislike article" or "Like article" (or "Skip for now").
  - Card stack features an editorial newspaper design with live publisher photography, source attribution, reading time, and topic tags.

- Initial Interest Weights & Single DB Write:
  - When all headlines are reviewed (or user skips), client sends POST /api/onboarding with { name, topics, likedArticleIds, dislikedArticleIds }.
  - Formula:
    * Each selected topic gets an initial weight of 0.70.
    * Every other topic gets an initial weight of 0.20.
    * For each liked article, its topic is looked up and receives +0.15 (clamped to max 1.00).
  - Creates the User in MongoDB and logs initial Event records for the learning loop.
  - Sets `echo_user_id` and `userId` cookies (1 year duration, path: "/").

- Theme & Design System:
  - Configured in `tailwind.config.ts` and `app/globals.css`.
  - Primary brand: Crimson `#c0152f` (hover: `#a31126`, light: `#fae9e7`, border: `#ebc2bc`).
  - Secondary brand: Newspaper cream/linen `#f5f0e6`, borders `#ded7cb`, text `#1a1917`, muted `#716c64`.
  - Typography: Newsreader serif (`--font-serif`) for masthead and headlines; Geist sans for clean labels.