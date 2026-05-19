import Link from "next/link";

import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
      <div className="grid w-full gap-10 rounded-[2.5rem] border border-stone-200 bg-white/80 p-8 shadow-2xl shadow-orange-100 lg:grid-cols-[1.1fr_0.9fr] lg:p-12">
        <section className="rounded-[2rem] bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.35),_transparent_40%),linear-gradient(135deg,#1c1917,#44403c)] p-8 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-200">
            AutoIG
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Turn comment intent into DM conversations before it cools off.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-stone-200">
            Start with the smallest possible loop: connect an account, pick a
            post, capture a comment, send a private reply.
          </p>
        </section>

        <section className="self-center">
          <h2 className="text-3xl font-semibold tracking-tight text-stone-950">
            Sign in
          </h2>
          <p className="mt-3 text-base text-stone-600">
            Use email/password for the first cut. Social login can wait until
            you have proof the automation converts.
          </p>
          <div className="mt-8">
            <AuthForm mode="login" />
          </div>
          <p className="mt-6 text-sm text-stone-600">
            Need an account?{" "}
            <Link className="font-semibold text-orange-700" href="/register">
              Create one
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
