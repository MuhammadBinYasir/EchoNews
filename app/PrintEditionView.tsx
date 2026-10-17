import Link from "next/link";
import { formatTimeAgo, formatTopicName } from "@/lib/format";
import PrintActionButton from "./PrintActionButton";

interface ArticleItem {
  _id: string;
  title: string;
  source: string;
  topic: string;
  summary?: string;
  snippet?: string;
  image?: string;
  url: string;
  publishedAt?: string;
}

interface EditionData {
  date: string;
  number: number;
  threeThings: string[];
  layout: {
    lead: ArticleItem | null;
    secondary: ArticleItem[];
    briefs: ArticleItem[];
    echo: ArticleItem[];
  };
}

function PrintArticle({ article, brief = false }: { article: ArticleItem; brief?: boolean }) {
  const summary = article.summary?.trim() || article.snippet?.trim();

  return (
    <article className={`print-story${brief ? " print-story-brief" : ""}`}>
      <p className="print-story-topic">{formatTopicName(article.topic)}</p>
      <h3><a href={article.url}>{article.title}</a></h3>
      <p className="print-story-source">
        {article.source}{article.publishedAt ? ` · ${formatTimeAgo(article.publishedAt)}` : ""}
      </p>
      {summary && <p className="print-story-summary">{summary}</p>}
    </article>
  );
}

export default function PrintEditionView({
  user,
  edition,
}: {
  user: { name: string };
  edition: EditionData;
}) {
  const { lead, secondary, briefs, echo } = edition.layout;
  const totalStories = (lead ? 1 : 0) + secondary.length + briefs.length + echo.length;

  return (
    <div className="print-page min-h-screen bg-[#f5f0e6] text-[#1a1917]">
      <nav className="print-toolbar mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/today" className="text-sm text-[#716c64] underline decoration-[#ded7cb] underline-offset-4">
          ← Back to today’s edition
        </Link>
        <PrintActionButton />
      </nav>

      <main className="print-edition mx-auto max-w-5xl px-5 pb-12 sm:px-8">
        <header className="print-masthead">
          <div className="flex items-center justify-between gap-3 border-b border-[#1a1917] pb-2 text-[9px] font-bold uppercase tracking-[0.2em]">
            <span>The Daily Edition</span>
            <span>{edition.date}</span>
          </div>
          <div className="print-brand-row">
            <h1 className="print-brand">Echo<span>.</span></h1>
            <p className="print-prepared">Prepared for <strong>{user.name}</strong><br />{totalStories} stories · Your interests · A wider world</p>
          </div>
          <div className="flex justify-between border-y border-[#ded7cb] py-2 text-[8px] font-semibold uppercase tracking-[0.16em] text-[#716c64]">
            <span>Your edition</span>
            <span>Edition No. {String(edition.number).padStart(3, "0")}</span>
          </div>
        </header>

        {lead && (
          <section className="print-lead">
            <p className="print-kicker">The lead · {formatTopicName(lead.topic)}</p>
            <h2><a href={lead.url}>{lead.title}</a></h2>
            <p className="print-story-source">{lead.source}{lead.publishedAt ? ` · ${formatTimeAgo(lead.publishedAt)}` : ""}</p>
            {lead.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="print-lead-image" src={lead.image} alt="" referrerPolicy="no-referrer" />
            )}
            {(lead.summary?.trim() || lead.snippet?.trim()) && (
              <p className="print-lead-summary">{lead.summary?.trim() || lead.snippet?.trim()}</p>
            )}
          </section>
        )}

        {edition.threeThings.length > 0 && (
          <section className="print-digest">
            <div className="print-digest-heading">
              <h2>Today in 3 things</h2>
              <span>The short version, before the long read</span>
            </div>
            <ol>
              {edition.threeThings.slice(0, 3).map((item, index) => (
                <li key={`${index}-${item}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{item}</p></li>
              ))}
            </ol>
          </section>
        )}

        <section className="print-columns" aria-label="The rest of your edition">
          {secondary.length > 0 && <h2 className="print-section-heading">More for you</h2>}
          {secondary.map((article) => <PrintArticle key={article._id} article={article} />)}
          {briefs.length > 0 && <h2 className="print-section-heading">In brief</h2>}
          {briefs.map((article) => <PrintArticle key={article._id} article={article} brief />)}
          {echo.length > 0 && <h2 className="print-section-heading">Break the Echo</h2>}
          {echo.map((article) => <PrintArticle key={article._id} article={article} />)}
        </section>

        <footer className="print-footer">
          Echo · The news that speaks to you · Edition {String(edition.number).padStart(3, "0")}
        </footer>
      </main>
    </div>
  );
}
