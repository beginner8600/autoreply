import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <section className="overflow-hidden rounded-[2.5rem] border border-stone-200 bg-white/80 shadow-2xl shadow-orange-100">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.5),_transparent_35%),linear-gradient(135deg,#1c1917,#44403c)] px-8 py-12 text-white lg:px-12 lg:py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-200">
              AutoReply
            </p>
            <h1 className="mt-6 max-w-2xl text-5xl font-semibold tracking-tight">
              Turn Instagram comments into DM conversations, automatically.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-stone-200">
              Connect your Instagram Business account, choose a post, and set a
              trigger. When someone comments, AutoReply sends them a private
              message instantly — so you never miss a lead.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-100"
                href="/register"
              >
                Get started
              </Link>
              <Link
                className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                href="/login"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="px-8 py-12 lg:px-12 lg:py-16">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Connect",
                  body: "Link your Instagram Business or Creator account in a few clicks.",
                },
                {
                  title: "Choose a post",
                  body: "Pick which of your posts should respond to comments.",
                },
                {
                  title: "Set a trigger",
                  body: "Reply to every comment, or only those with specific keywords.",
                },
                {
                  title: "Auto-reply",
                  body: "Each matching comment gets an instant, personalized direct message.",
                },
              ].map((item) => (
                <article
                  key={item.title}
                  className="rounded-[1.75rem] border border-stone-200 bg-stone-50 p-5"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-700">
                    {item.title}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-stone-700">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-8 rounded-[2rem] border border-orange-200 bg-[#fff7ed] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-700">
                Why it matters
              </p>
              <p className="mt-3 text-base leading-7 text-stone-700">
                A comment is a moment of interest. AutoReply responds while that
                interest is still warm — moving the conversation into DMs where
                it can actually convert.
              </p>
            </div>

            <p className="mt-6 text-xs text-stone-500">
              <Link href="/privacy" className="hover:text-orange-700">
                Privacy Policy
              </Link>
              {" · "}
              <Link href="/terms" className="hover:text-orange-700">
                Terms of Service
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
