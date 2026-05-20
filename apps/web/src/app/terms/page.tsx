import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — AutoReply",
  description: "The terms governing your use of AutoReply.",
};

const UPDATED = "May 20, 2026";
const CONTACT = "bwtnaresh@gmail.com";

export default function TermsOfService() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <Link
        href="/"
        className="text-sm font-semibold text-orange-600 hover:text-orange-700"
      >
        ← Back to AutoReply
      </Link>

      <h1 className="mt-6 text-4xl font-semibold tracking-tight">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-stone-500">Last updated: {UPDATED}</p>

      <div className="mt-8 space-y-8 text-stone-700 leading-7">
        <section>
          <h2 className="text-xl font-semibold text-stone-900">
            Acceptance of terms
          </h2>
          <p className="mt-2">
            By creating an account or using AutoReply (&quot;the Service&quot;), you
            agree to these terms. If you do not agree, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900">The service</h2>
          <p className="mt-2">
            AutoReply lets you connect an Instagram Business or Creator account
            and automatically reply to comments on your own posts with a direct
            message. You are responsible for the content of the automated
            messages you configure.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900">
            Acceptable use
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-6">
            <li>
              You may only connect Instagram accounts that you own or are
              authorized to manage.
            </li>
            <li>
              You must not use the Service to send spam, harassment, or content
              that violates Meta&apos;s Platform Terms or Community Guidelines.
            </li>
            <li>
              You must comply with all applicable laws and Instagram&apos;s terms
              when using the Service.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900">
            Third-party platforms
          </h2>
          <p className="mt-2">
            The Service relies on Meta&apos;s Instagram Graph API. Your use of
            connected Instagram accounts is also governed by Meta&apos;s terms.
            We are not affiliated with or endorsed by Meta.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900">
            Disclaimer and limitation of liability
          </h2>
          <p className="mt-2">
            The Service is provided &quot;as is&quot; without warranties of any kind.
            We are not liable for any indirect or consequential damages arising
            from your use of the Service, including any action taken by Meta on
            your account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900">
            Termination
          </h2>
          <p className="mt-2">
            You may stop using the Service and delete your account at any time.
            We may suspend access for violations of these terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900">Contact</h2>
          <p className="mt-2">
            Questions about these terms can be sent to{" "}
            <a
              href={`mailto:${CONTACT}`}
              className="font-semibold text-orange-600 hover:text-orange-700"
            >
              {CONTACT}
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
