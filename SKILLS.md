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