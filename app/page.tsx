import Image from "next/image";
import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Your interests, in focus",
    copy: "Choose what matters to you. Echo gathers the stories worth your attention into one thoughtful edition.",
  },
  {
    number: "02",
    title: "Room for the unexpected",
    copy: "A little discovery belongs in every good paper. Find new perspectives beyond your usual headlines.",
  },
  {
    number: "03",
    title: "A paper that learns",
    copy: "Like what speaks to you and skip what doesn’t. Your daily paper gets closer to your curiosity over time.",
  },
];

const paperSections = [
  {
    label: "THE BIG READ",
    title: "A lead story chosen for you.",
    copy: "Start with a thoughtful headline from a topic you care about.",
  },
  {
    label: "MORE FOR YOU",
    title: "Follow the threads that matter.",
    copy: "A handpicked mix of stories across your interests.",
  },
  {
    label: "IN BRIEF",
    title: "The quick reads, all together.",
    copy: "Short reads make it easier to catch up at your own pace.",
  },
  {
    label: "BREAK THE ECHO",
    title: "Leave a little room to wander.",
    copy: "Meet a few stories from outside your usual reading habits.",
  },
];

const faqs = [
  {
    question: "How does Echo personalize my paper?",
    answer: "You choose topics during onboarding. Likes, skips, and reading activity then help adjust what Echo selects for future editions.",
  },
  {
    question: "Can I read the original articles?",
    answer: "Yes. Each story links to its original publisher, so you can continue reading at the source.",
  },
  {
    question: "Can I keep a copy of my paper?",
    answer: "Use Download PDF on an edition to save a print-ready copy from your browser’s print dialog.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f1e8] text-[#1a1917]">
      <div className="mx-auto max-w-[1320px] px-6 md:px-12">
        <header className="flex h-[82px] items-center justify-between border-b border-[#ded7cb]">
          <Link href="/" aria-label="Echo home" className="font-serif text-[34px] font-bold leading-none tracking-tight">
            Echo<span className="text-[#c0152f]">.</span>
          </Link>
          <nav className="hidden items-center gap-9 text-[13px] text-[#716c64] md:flex">
            <a href="#the-paper" className="transition-colors hover:text-[#c0152f]">The paper</a>
            <a href="#how-it-works" className="transition-colors hover:text-[#c0152f]">How it works</a>
            <a href="#inside-the-paper" className="transition-colors hover:text-[#c0152f]">Inside your edition</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/today" className="hidden text-[13px] text-[#716c64] transition-colors hover:text-[#c0152f] sm:inline">I have an edition</Link>
            <Link href="/onboarding" className="rounded-[2px] bg-[#c0152f] px-4 py-2.5 text-[12px] font-semibold tracking-wide text-white transition-colors hover:bg-[#a31126] sm:px-5">
              Get started <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </header>

        <section id="the-paper" className="grid items-center gap-12 py-14 md:grid-cols-[0.94fr_1.06fr] md:gap-10 md:py-20 lg:py-24">
          <div className="relative z-10 max-w-[590px]">
            <div className="mb-7 flex items-center gap-3">
              <span className="h-px w-9 bg-[#c0152f]" />
              <p className="text-[10px] font-bold tracking-[0.2em] text-[#c0152f]">A MORE HUMAN WAY TO FOLLOW THE NEWS</p>
            </div>
            <h1 className="font-serif text-[clamp(3.6rem,8vw,6.7rem)] leading-[0.91] tracking-[-0.055em]">
              The world,<br />
              <span className="italic text-[#c0152f]">edited for you.</span>
            </h1>
            <p className="mt-8 max-w-[455px] text-[16px] leading-[1.8] text-[#625d55] md:text-[17px]">
              Your interests. The stories that matter. One beautiful morning paper—made for the way you see the world.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <Link href="/onboarding" className="group inline-flex items-center gap-7 rounded-[2px] bg-[#c0152f] px-6 py-4 text-[13px] font-semibold tracking-wide text-white shadow-[0_8px_24px_rgba(192,21,47,0.15)] transition-all hover:-translate-y-0.5 hover:bg-[#a31126]">
                Make your morning paper <span className="text-lg transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
              </Link>
              <span className="text-[11px] tracking-wide text-[#8a8378]">A few minutes to make it yours</span>
            </div>
            <div className="mt-12 flex items-center gap-4 border-t border-[#ded7cb] pt-5 text-[11px] text-[#716c64]">
              <span className="font-serif text-[20px] italic text-[#c0152f]">01</span>
              <span>Set your interests</span><span className="text-[#b5ab9c]">/</span>
              <span>Meet your daily edition</span><span className="text-[#b5ab9c]">/</span>
              <span>Keep discovering</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[650px] md:ml-auto">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#e9dfcc] blur-2xl md:h-56 md:w-56" />
            <div className="absolute -bottom-7 -left-7 h-48 w-48 rounded-full bg-[#f0d8d2] blur-3xl" />
            <div className="relative aspect-[1.08/1] overflow-hidden rounded-[3px] border-[8px] border-[#fcfaf7] shadow-[0_28px_80px_rgba(42,39,35,0.18)] md:aspect-[1.12/1]">
              <Image
                src="/vintage_workshop_radio.jpg"
                alt="A vintage radio being carefully restored in a sunlit workshop"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 55vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#17130f]/70 via-transparent to-[#17130f]/5" />
              <div className="absolute left-5 top-5 rounded-full border border-white/50 bg-[#f6f1e8]/90 px-3 py-1.5 text-[9px] font-bold tracking-[0.17em] text-[#1a1917] backdrop-blur-sm">
                YOUR WORLD, IN PRINT
              </div>
              <div className="absolute bottom-6 left-6 right-6 text-white md:bottom-8 md:left-8 md:right-8">
                <p className="mb-2 text-[9px] font-bold tracking-[0.2em] text-[#f3c2b8]">A DAILY RITUAL, REIMAGINED</p>
                <p className="max-w-[400px] font-serif text-[32px] leading-[1.06] md:text-[42px]">Less noise.<br />More meaning.</p>
              </div>
            </div>

            <div className="absolute -bottom-9 right-4 w-[min(78%,350px)] border border-[#ded7cb] bg-[#fcfaf7] p-4 shadow-[0_18px_48px_rgba(42,39,35,0.14)] sm:-right-5 sm:p-5 md:-bottom-10 md:-right-7">
              <div className="flex items-center justify-between border-b border-[#ded7cb] pb-2">
                <span className="font-serif text-[21px] font-bold">Echo<span className="text-[#c0152f]">.</span></span>
                <span className="text-[8px] font-bold tracking-[0.16em] text-[#716c64]">YOUR DAILY EDITION</span>
              </div>
              <p className="mt-3 text-[8px] font-bold tracking-[0.15em] text-[#c0152f]">TODAY IN 3 THINGS</p>
              <p className="mt-1 font-serif text-[18px] leading-tight sm:text-[21px]">A clearer view of what matters.</p>
              <div className="mt-3 flex gap-1.5" aria-hidden="true">
                <span className="h-1 w-1/3 bg-[#c0152f]" /><span className="h-1 w-1/3 bg-[#ded7cb]" /><span className="h-1 w-1/3 bg-[#ded7cb]" />
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-t border-[#ded7cb] py-16 md:py-20">
          <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-2 text-[10px] font-bold tracking-[0.19em] text-[#c0152f]">A PAPER THAT FEELS LIKE YOURS</p>
              <h2 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">Curiosity, with a point of view.</h2>
            </div>
            <p className="max-w-[370px] text-[13px] leading-relaxed text-[#716c64]">Not another endless feed. A considered collection of stories, brought together for you each day.</p>
          </div>

          <div className="grid border-y border-[#ded7cb] md:grid-cols-3 md:divide-x md:divide-[#ded7cb]">
            {features.map((feature) => (
              <article key={feature.number} className="py-7 md:px-7 md:py-8 first:md:pl-0 last:md:pr-0">
                <p className="mb-5 font-serif text-[20px] italic text-[#c0152f]">{feature.number}</p>
                <h3 className="font-serif text-[25px]">{feature.title}</h3>
                <p className="mt-3 max-w-[330px] text-[13px] leading-[1.75] text-[#716c64]">{feature.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="inside-the-paper" className="border-t border-[#ded7cb] py-16 md:py-20">
          <div className="mb-10 max-w-[700px]">
            <p className="mb-2 text-[10px] font-bold tracking-[0.19em] text-[#c0152f]">A LITTLE OF WHAT YOU LOVE. A LITTLE OF WHAT’S NEW.</p>
            <h2 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">A whole paper, shaped around your day.</h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
            <div className="relative overflow-hidden bg-[#201d19] p-7 text-[#fcfaf7] md:p-10">
              <div className="absolute -right-14 -top-14 h-48 w-48 rounded-full border border-white/10" />
              <div className="absolute -right-7 -top-7 h-32 w-32 rounded-full border border-white/10" />
              <div className="relative flex items-center justify-between border-b border-white/20 pb-3">
                <span className="font-serif text-3xl font-bold">Echo<span className="text-[#e35b67]">.</span></span>
                <span className="text-[9px] font-bold tracking-[0.16em] text-[#c9bfb1]">A PAPER OF YOUR OWN</span>
              </div>
              <div className="relative py-7">
                <p className="text-[9px] font-bold tracking-[0.18em] text-[#e48789]">TODAY IN 3 THINGS</p>
                <h3 className="mt-3 max-w-[420px] font-serif text-[32px] leading-[1.08] md:text-[42px]">The stories behind the headlines.</h3>
                <p className="mt-3 max-w-[400px] text-[12px] leading-relaxed text-[#c9bfb1]">A concise opening view, followed by the articles and ideas worth a closer look.</p>
              </div>
              <div className="relative grid grid-cols-3 gap-3 border-t border-white/20 pt-4">
                {[
                  ["01", "Your lead story"],
                  ["02", "Quick reads"],
                  ["03", "New perspectives"],
                ].map(([number, label]) => (
                  <div key={number}>
                    <p className="font-serif text-xl text-[#e48789]">{number}</p>
                    <p className="mt-1 text-[10px] leading-snug text-[#e9e1d7]">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 sm:gap-x-8">
              {paperSections.map((item, index) => (
                <article key={item.label} className="border-b border-[#ded7cb] py-5 first:pt-0 sm:py-6">
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <p className="text-[9px] font-bold tracking-[0.16em] text-[#c0152f]">{item.label}</p>
                    <span className="font-serif text-sm italic text-[#9a9184]">0{index + 1}</span>
                  </div>
                  <h3 className="font-serif text-[23px] leading-tight">{item.title}</h3>
                  <p className="mt-2 text-[12px] leading-relaxed text-[#716c64]">{item.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="questions" className="border-t border-[#ded7cb] py-16 md:py-20">
          <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr] md:gap-16">
            <div>
              <p className="mb-2 text-[10px] font-bold tracking-[0.19em] text-[#c0152f]">GOOD TO KNOW</p>
              <h2 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">A few questions.</h2>
              <p className="mt-4 max-w-[280px] text-[13px] leading-relaxed text-[#716c64]">The essentials before you start your first edition.</p>
            </div>
            <div className="border-t border-[#ded7cb]">
              {faqs.map((item) => (
                <details key={item.question} className="group border-b border-[#ded7cb] py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-serif text-[20px] marker:hidden">
                    {item.question}
                    <span className="font-sans text-xl text-[#c0152f] transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="max-w-[620px] pt-3 pr-8 text-[13px] leading-[1.8] text-[#716c64]">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-14 flex flex-col items-start justify-between gap-6 bg-[#eee8dc] px-6 py-8 md:mb-20 md:flex-row md:items-center md:px-10 md:py-9">
          <div>
            <p className="mb-2 text-[9px] font-bold tracking-[0.18em] text-[#c0152f]">YOUR FIRST EDITION STARTS HERE</p>
            <h2 className="font-serif text-3xl md:text-[38px]">Make room for a better read.</h2>
          </div>
          <Link href="/onboarding" className="inline-flex shrink-0 items-center gap-5 border-b border-[#c0152f] pb-2 text-[13px] font-semibold text-[#c0152f] transition-colors hover:text-[#a31126]">
            Build your edition <span aria-hidden="true">↗</span>
          </Link>
        </section>

        <footer className="flex flex-col gap-3 border-t border-[#ded7cb] py-6 text-[11px] text-[#716c64] sm:flex-row sm:items-center sm:justify-between">
          <span className="font-serif text-[20px] font-bold text-[#1a1917]">Echo<span className="text-[#c0152f]">.</span></span>
          <span>The news that speaks to you. The world that keeps surprising you.</span>
          <Link href="/today" className="transition-colors hover:text-[#c0152f]">Go to today’s edition →</Link>
        </footer>
      </div>
    </main>
  );
}
