import React from 'react';

const LAST_UPDATED = '10 July 2026';
const CONTACT_EMAIL = 'legal@plumio.my';

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

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-2xl mx-auto px-5 py-8 pb-16">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Terms of Service</h1>
          <p className="text-xs text-gray-400 mt-1">Last updated: {LAST_UPDATED}</p>
          <p className="text-sm text-gray-500 mt-3 leading-relaxed">
            Welcome to Plumio. By accessing or using the Plumio platform, you agree to be bound
            by these Terms of Service. Please read them carefully before using our services.
          </p>
        </div>

        <div className="flex flex-col gap-8">

          <Section title="1. Acceptance of Terms">
            <p>
              By creating an account or using Plumio, you confirm that you are at least 18 years
              old (or the age of majority in your jurisdiction) and that you agree to these Terms.
              If you do not agree, please do not use the platform.
            </p>
            <p>
              These Terms apply to all users of Plumio, including buyers, sellers, and guests.
            </p>
          </Section>

          <Section title="2. User Accounts">
            <p>
              You must provide accurate information when creating an account. You are responsible
              for maintaining the confidentiality of your login credentials and for all activity
              that occurs under your account.
            </p>
            <p>
              Plumio reserves the right to suspend or terminate accounts that violate these Terms,
              engage in fraudulent activity, or disrupt the marketplace.
            </p>
          </Section>

          <Section title="3. Listings & Transactions">
            <p>
              Sellers are solely responsible for the accuracy, legality, and condition of their
              listed items. Listings must not misrepresent the item's condition, origin, or any
              other material characteristic.
            </p>
            <p>
              Once a buyer initiates a purchase, both parties agree to complete the transaction in
              good faith through Plumio's Secure Escrow flow.
            </p>
            <p>
              Plumio charges a platform fee of <strong>RM 2.00</strong> per successful trade,
              deducted upon confirmed handoff via the Secure QR code process.
            </p>
          </Section>

          <Section title="4. Escrow & PlumioPay">
            <p>
              Plumio holds buyer payments in escrow until the seller and buyer confirm the
              handoff using the in-app QR verification. Funds are released to the seller only
              after both parties confirm the transaction.
            </p>
            <p>
              Top-up and withdrawal of PlumioPay wallet funds are subject to processing times
              and applicable banking procedures. Plumio is not a licensed bank or financial
              institution.
            </p>
          </Section>

          <Section title="5. Prohibited Items & Conduct">
            <p>You may not list or trade any of the following on Plumio:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>Counterfeit, stolen, or illegally obtained goods</li>
              <li>Weapons, drugs, or controlled substances</li>
              <li>Items prohibited under Malaysian law</li>
              <li>Digital goods, software keys, or intangible assets</li>
              <li>Misleading or deceptive listings</li>
            </ul>
            <p>
              Harassment, hate speech, or abuse of other users is strictly prohibited and may
              result in immediate account termination.
            </p>
          </Section>

          <Section title="6. Intellectual Property">
            <p>
              All content, logos, and designs on Plumio are the intellectual property of Plumio
              or its licensors. You may not reproduce, distribute, or create derivative works
              without prior written consent.
            </p>
            <p>
              By uploading photos or content to Plumio, you grant Plumio a non-exclusive,
              royalty-free licence to display that content on the platform.
            </p>
          </Section>

          <Section title="7. Limitation of Liability">
            <p>
              Plumio acts as a marketplace facilitator. We do not guarantee the quality,
              safety, or legality of items listed. To the maximum extent permitted by Malaysian
              law, Plumio shall not be liable for any indirect, incidental, or consequential
              damages arising from use of the platform.
            </p>
            <p>
              Our total liability to you for any claim shall not exceed the transaction value
              of the specific trade in dispute.
            </p>
          </Section>

          <Section title="8. Governing Law">
            <p>
              These Terms are governed by and construed in accordance with the laws of
              Malaysia. Any disputes shall be subject to the exclusive jurisdiction of the
              courts of Malaysia.
            </p>
          </Section>

          <Section title="9. Changes to These Terms">
            <p>
              Plumio may update these Terms at any time. Continued use of the platform after
              changes are posted constitutes your acceptance of the revised Terms. We will
              notify users of material changes via the app or email.
            </p>
          </Section>

          <Section title="10. Contact Us">
            <p>
              For any questions about these Terms, please contact our legal team at{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-[#A855F7] hover:underline font-medium"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

        </div>

        {/* Footer note */}
        <div className="mt-10 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center leading-relaxed">
            Plumio is a peer-to-peer marketplace platform operating under Malaysian law.
            &copy; {new Date().getFullYear()} Plumio. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
