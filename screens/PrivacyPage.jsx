import React from 'react';

const LAST_UPDATED = '10 July 2026';
const CONTACT_EMAIL = 'privacy@plumio.my';

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-bold text-gray-900 border-l-4 border-[#A855F7] pl-3">
        {title}
      </h2>
      <div className="text-sm text-gray-600 leading-relaxed flex flex-col gap-2">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-2xl mx-auto px-5 py-8 pb-16">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-gray-400 mt-1">Last updated: {LAST_UPDATED}</p>
          <p className="text-sm text-gray-500 mt-3 leading-relaxed">
            Plumio is committed to protecting your personal data in accordance with the{' '}
            <strong>Personal Data Protection Act 2010 (PDPA)</strong> of Malaysia. This
            Privacy Policy explains what data we collect, how we use it, and your rights.
          </p>
        </div>

        <div className="flex flex-col gap-8">

          <Section title="1. Data We Collect">
            <p>We collect the following categories of personal data when you use Plumio:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li><strong>Account data</strong> — name, email address, profile photo</li>
              <li><strong>Transaction data</strong> — listings you post, purchases, escrow records</li>
              <li><strong>Location data</strong> — approximate location (only when you enable "Near Me" search)</li>
              <li><strong>Device data</strong> — browser type, IP address, app version</li>
              <li><strong>Communications</strong> — messages sent through Plumio's chat feature</li>
            </ul>
            <p>
              We do not collect payment card numbers. Wallet top-ups and withdrawals are
              processed through third-party payment gateways that maintain their own
              data protection standards.
            </p>
          </Section>

          <Section title="2. How We Use Your Data">
            <p>Plumio uses your personal data for the following purposes:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>To create and manage your Plumio account</li>
              <li>To facilitate transactions and the Secure Escrow process</li>
              <li>To display relevant listings based on your location or preferences</li>
              <li>To send transactional notifications (order updates, payment confirmations)</li>
              <li>To detect fraud, prevent abuse, and enforce our Terms of Service</li>
              <li>To improve platform features and user experience</li>
            </ul>
            <p>
              We will not send marketing communications without your explicit consent, and
              you may opt out at any time in Settings.
            </p>
          </Section>

          <Section title="3. Data Sharing">
            <p>
              We do not sell your personal data. We share your data only in the following
              limited circumstances:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>
                <strong>With the other party in a transaction</strong> — your display name and
                agreed delivery information are shared with the buyer or seller to complete a trade
              </li>
              <li>
                <strong>With service providers</strong> — we use Supabase (hosted in Singapore)
                for authentication and database services, bound by data processing agreements
              </li>
              <li>
                <strong>With law enforcement</strong> — where required by Malaysian law or a
                valid court order
              </li>
            </ul>
          </Section>

          <Section title="4. PDPA Compliance">
            <p>
              As a Malaysian platform, Plumio complies with the Personal Data Protection
              Act 2010 (PDPA). Under the PDPA, you have the right to:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li><strong>Access</strong> the personal data we hold about you</li>
              <li><strong>Correct</strong> inaccurate or incomplete personal data</li>
              <li><strong>Withdraw consent</strong> for the processing of your personal data</li>
              <li><strong>Request deletion</strong> of your account and associated data</li>
            </ul>
            <p>
              To exercise any of these rights, please contact us at the email address below.
              We will respond within 21 days as required by the PDPA.
            </p>
          </Section>

          <Section title="5. Cookies & Local Storage">
            <p>
              Plumio uses browser local storage to maintain your login session and
              remember your preferences (such as your last search filters). We do not use
              third-party advertising cookies.
            </p>
          </Section>

          <Section title="6. Data Retention">
            <p>
              We retain your account data for as long as your account is active. If you delete
              your account, we will remove your personal data within <strong>30 days</strong>,
              except where we are legally required to retain certain records (such as
              transaction logs for financial compliance purposes).
            </p>
          </Section>

          <Section title="7. Data Security">
            <p>
              We implement industry-standard security measures including encrypted data
              transmission (HTTPS/TLS), row-level security on our database, and regular
              security reviews. However, no online service can guarantee absolute security —
              please keep your account credentials confidential.
            </p>
          </Section>

          <Section title="8. Children's Privacy">
            <p>
              Plumio is not intended for users under the age of 18. We do not knowingly
              collect personal data from children. If you believe a child has provided us
              with personal data, please contact us immediately and we will delete it.
            </p>
          </Section>

          <Section title="9. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of
              significant changes via the app or email. Continued use of Plumio after
              an update constitutes your acceptance of the revised policy.
            </p>
          </Section>

          <Section title="10. Contact Us">
            <p>
              For any privacy-related inquiries, data access requests, or complaints,
              please contact our Privacy Officer at{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-[#A855F7] hover:underline font-medium"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
            <p>
              If you are unsatisfied with our response, you may lodge a complaint with the
              Department of Personal Data Protection Malaysia (JPDP) at{' '}
              <span className="font-medium text-gray-700">www.pdp.gov.my</span>.
            </p>
          </Section>

        </div>

        {/* Footer note */}
        <div className="mt-10 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center leading-relaxed">
            Plumio processes personal data under the Personal Data Protection Act 2010 (Malaysia).
            &copy; {new Date().getFullYear()} Plumio. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
