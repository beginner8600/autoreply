import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — AutoReply",
  description: "How AutoReply collects, uses, and protects your data.",
};

const UPDATED = "May 20, 2026";
const CONTACT = "bwtnaresh@gmail.com";

export default function PrivacyPolicy() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <Link
        href="/"
        className="text-sm font-semibold text-orange-600 hover:text-orange-700"
      >
        ← Back to AutoReply
      </Link>

      <h1 className="mt-6 text-4xl font-semibold tracking-tight">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-stone-500">Last updated: {UPDATED}</p>

      <div className="mt-8 space-y-8 text-stone-700 leading-7">
        <section>
          <h2 className="text-xl font-semibold text-stone-900">Overview</h2>
          <p className="mt-2">
            AutoReply (&quot;the Service&quot;, &quot;we&quot;, &quot;us&quot;) is a tool that lets an
            Instagram Business or Creator account owner automatically respond to
            comments on their own posts with a direct message. This policy
            explains what data we collect, why, and how you can have it removed.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900">
            Information we collect
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-6">
            <li>
              <strong>Account information.</strong> When you sign up, we store
              your email address and a securely hashed password.
            </li>
            <li>
              <strong>Instagram connection data.</strong> When you connect an
              Instagram account, we receive and store your Instagram account ID,
              username, and an access token issued by Meta. The token is used
              only to operate the automations you configure.
            </li>
            <li>
              <strong>Comment events.</strong> When someone comments on a post
              you have set up an automation for, Meta sends us a webhook
              containing the comment text, the comment ID, the commenter&apos;s
              Instagram ID and username, and the related media ID.
            </li>
            <li>
              <strong>Automation and delivery records.</strong> The automations
              you create and a log of the messages sent on your behalf.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900">
            How we use information
          </h2>
          <p className="mt-2">
            We use this data solely to provide the Service: to detect comments
            on your posts, match them against the triggers you configured, and
            send the direct message reply you defined. We do not sell your data,
            and we do not use it for advertising or profiling.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900">
            Data sharing
          </h2>
          <p className="mt-2">
            We share data only with the infrastructure providers required to run
            the Service — our application host, database host, and Meta&apos;s
            Instagram Graph API. We do not share your data with any other third
            party.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900">
            Data retention and deletion
          </h2>
          <p className="mt-2">
            You can disconnect an Instagram account or delete your account at any
            time, which removes the associated tokens, automations, and event
            records. To request deletion of all your data, email us at{" "}
            <a
              href={`mailto:${CONTACT}`}
              className="font-semibold text-orange-600 hover:text-orange-700"
            >
              {CONTACT}
            </a>
            . We honor data deletion requests received through Meta&apos;s data
            deletion callback as well. Requests are processed within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900">Security</h2>
          <p className="mt-2">
            Access tokens and passwords are stored with industry-standard
            protections. All traffic to the Service is encrypted over HTTPS.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900">Contact</h2>
          <p className="mt-2">
            Questions about this policy or your data can be sent to{" "}
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
