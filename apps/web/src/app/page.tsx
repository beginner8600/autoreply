import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <section className="overflow-hidden rounded-[2.5rem] border border-stone-200 bg-white/80 shadow-2xl shadow-orange-100">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.5),_transparent_35%),linear-gradient(135deg,#1c1917,#44403c)] px-8 py-12 text-white lg:px-12 lg:py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-200">
              AutoIG
            </p>
            <h1 className="mt-6 max-w-2xl text-5xl font-semibold tracking-tight">
              Instagram comment automation built around the actual money step.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-stone-200">
              Capture a comment, match it to a trigger, queue the job, and send
              the private reply. That is the product. The rest is packaging.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-100"
                href="/register"
              >
                Start building
              </Link>
              <Link
                className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                href="/dashboard"
              >
                Open dashboard
              </Link>
            </div>
          </div>

          <div className="px-8 py-12 lg:px-12 lg:py-16">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Auth",
                  body: "Email/password onboarding for the first operator account.",
                },
                {
                  title: "Connect",
                  body: "Mock-first Instagram connection flow with live OAuth entry points.",
                },
                {
                  title: "Automate",
                  body: "Post-specific triggers for any comment or keyword match.",
                },
                {
                  title: "Deliver",
                  body: "Webhook intake plus BullMQ worker for private-reply DM jobs.",
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
                Critical blocker
              </p>
              <p className="mt-3 text-base leading-7 text-stone-700">
                Submit Meta Business Verification and App Review on May 19, 2026,
                not after the dashboard looks pretty. This repo lets you develop
                against mock mode while approvals are pending.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
