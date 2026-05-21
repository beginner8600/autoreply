import Link from "next/link";

import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
      <div className="grid w-full gap-10 rounded-[2.5rem] border border-stone-200 bg-white/80 p-8 shadow-2xl shadow-orange-100 lg:grid-cols-[0.95fr_1.05fr] lg:p-12">
        <section className="self-center">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
            Create your account
          </h1>
          <p className="mt-3 text-base text-stone-600">
            Sign up with your email to start automating replies to your
            Instagram comments.
          </p>
          <div className="mt-8">
            <AuthForm mode="register" />
          </div>
          <p className="mt-6 text-sm text-stone-600">
            Already registered?{" "}
            <Link className="font-semibold text-orange-700" href="/login">
              Sign in
            </Link>
          </p>
        </section>

        <section className="rounded-[2rem] border border-stone-200 bg-stone-950 p-8 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">
            How it works
          </p>
          <ul className="mt-6 space-y-4 text-sm leading-7 text-stone-200">
            <li>Connect your Instagram Business or Creator account.</li>
            <li>Choose a post you want to automate.</li>
            <li>Set a trigger — every comment, or specific keywords.</li>
            <li>
              Each matching comment gets an instant, personalized direct
              message.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
